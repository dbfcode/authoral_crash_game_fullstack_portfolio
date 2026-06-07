#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

const ROOT = join(import.meta.dir, '..');
const REQUIRED_RUNS_DIR = join(ROOT, 'test-runs', 'required-tests');

const MANUAL_CHECKLIST = `# Manual checklist — Required Tests

Preencher apos \`bun run test:required:report\` (automatico nao cobre estes itens).

## WS duas abas sincronizadas

- [ ] Subir stack: \`bun run docker:up\`
- [ ] Abrir 2 clientes em \`http://localhost:4001/games\` (ou \`frontend/public/ws-test.html\` servido em :5173)
- [ ] Ambos recebem \`round:snapshot\` com o mesmo \`committedRoundHash\`
- [ ] Durante rodada, \`round:tick\` com mesmo \`currentMultiplier\`

## Kong proxy

- [ ] \`curl -s http://localhost:8000/games/rounds/current\` retorna 200 + JSON

## Smoke JWT (Etapa 10)

- [ ] Obter token password grant (player / player123)
- [ ] \`POST /wallets\` e \`GET /wallets/me\` com Bearer
- [ ] \`POST /games/bet\` com Bearer (201 ou 409 se rodada running)

## docker:up do zero

- [ ] \`docker compose down -v && bun run docker:up\` — sobe sem passos manuais

## Dinheiro sem float

- [ ] Unit money-cents / wallet passou no relatorio automatico

Notas:
`;

interface InfraProbe {
  name: string;
  target: string;
  ok: boolean;
  detail?: string;
}

interface WorkspaceResult {
  name: string;
  path: string;
  exitCode: number;
  durationMs: number;
  logFile: string;
}

interface RequiredRunSummary {
  timestamp: string;
  command: string;
  exitCode: number;
  durationMs: number;
  runDir: string;
  infra: InfraProbe[];
  unit: WorkspaceResult[];
  e2e: WorkspaceResult[];
}

function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '').replace(/:/g, '-');
}

function discoverWorkspaces(): Array<{ name: string; path: string }> {
  const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf-8')) as {
    workspaces?: string[];
  };
  const patterns = pkg.workspaces ?? [];
  const workspaces: Array<{ name: string; path: string }> = [];

  for (const pattern of patterns) {
    const base = pattern.replace(/\/\*$/, '');
    const fullBase = join(ROOT, base);
    if (!existsSync(fullBase)) continue;

    for (const entry of readdirSync(fullBase, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const wsPath = join(fullBase, entry.name);
      const wsPkgPath = join(wsPath, 'package.json');
      if (!existsSync(wsPkgPath)) continue;
      const wsPkg = JSON.parse(readFileSync(wsPkgPath, 'utf-8')) as { name?: string };
      workspaces.push({ name: wsPkg.name ?? entry.name, path: wsPath });
    }
  }

  return workspaces;
}

async function runWorkspaceTest(
  workspacePath: string,
  scriptName: string,
): Promise<{ exitCode: number; output: string; durationMs: number }> {
  const start = Date.now();
  const proc = Bun.spawn(['bun', 'run', scriptName], {
    cwd: workspacePath,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...process.env, SKIP_RABBITMQ_E2E: '0' },
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;

  return {
    exitCode,
    output: [stdout, stderr].filter(Boolean).join('\n'),
    durationMs: Date.now() - start,
  };
}

function workspaceLogName(workspaceName: string): string {
  return workspaceName.replace(/^@crash\//, '').replace(/[^\w.-]/g, '_');
}

async function probeTcp(host: string, port: number): Promise<boolean> {
  try {
    const socket = await Bun.connect({
      hostname: host,
      port,
      socket: {
        open(sock) {
          sock.end();
        },
        data() {},
        close() {},
        error() {},
      },
    });
    socket.end();
    return true;
  } catch {
    return false;
  }
}

async function probeHttp(url: string): Promise<{ ok: boolean; detail?: string }> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
    return { ok: response.ok, detail: `HTTP ${response.status}` };
  } catch (error) {
    return { ok: false, detail: error instanceof Error ? error.message : 'failed' };
  }
}

async function runInfraProbes(): Promise<InfraProbe[]> {
  const probes: InfraProbe[] = [];

  const postgresOk = await probeTcp('127.0.0.1', 5432);
  probes.push({ name: 'postgres', target: '127.0.0.1:5432', ok: postgresOk });

  const rabbitOk = await probeTcp('127.0.0.1', 5672);
  probes.push({ name: 'rabbitmq', target: '127.0.0.1:5672', ok: rabbitOk });

  const keycloakHttp = await probeHttp('http://127.0.0.1:8080/realms/crash-game');
  probes.push({
    name: 'keycloak',
    target: 'http://127.0.0.1:8080/realms/crash-game',
    ok: keycloakHttp.ok,
    detail: keycloakHttp.detail,
  });

  const gamesHealth = await probeHttp('http://127.0.0.1:4001/games/health');
  probes.push({
    name: 'game-service',
    target: 'http://127.0.0.1:4001/games/health',
    ok: gamesHealth.ok,
    detail: gamesHealth.detail,
  });

  const walletsHealth = await probeHttp('http://127.0.0.1:4002/wallets/health');
  probes.push({
    name: 'wallet-service',
    target: 'http://127.0.0.1:4002/wallets/health',
    ok: walletsHealth.ok,
    detail: walletsHealth.detail,
  });

  return probes;
}

async function pauseCompetingDockerServices(): Promise<void> {
  const proc = Bun.spawn(['docker', 'compose', 'stop', 'game-service', 'wallet-service'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await proc.exited;
}

async function resumeDockerServices(): Promise<void> {
  const proc = Bun.spawn(['docker', 'compose', 'start', 'game-service', 'wallet-service'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  await proc.exited;
}

async function runSuite(
  scriptName: 'test:unit' | 'test:e2e',
  logDir: string,
): Promise<{ results: WorkspaceResult[]; output: string[] }> {
  const workspaces = discoverWorkspaces();
  const results: WorkspaceResult[] = [];
  const output: string[] = [];

  for (const workspace of workspaces) {
    const wsPkg = JSON.parse(readFileSync(join(workspace.path, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    if (!wsPkg.scripts?.[scriptName]) continue;

    const result = await runWorkspaceTest(workspace.path, scriptName);
    const logFileName = `${workspaceLogName(workspace.name)}.log`;
    writeFileSync(join(logDir, logFileName), result.output, 'utf-8');
    const relPath = relative(ROOT, workspace.path).replace(/\\/g, '/');

    results.push({
      name: workspace.name,
      path: relPath,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      logFile: `${relative(ROOT, logDir).replace(/\\/g, '/')}/${logFileName}`,
    });

    output.push(
      `=== ${scriptName} ${workspace.name} (${relPath}) exit=${result.exitCode} ===`,
      result.output,
      '',
    );
  }

  return { results, output };
}

async function main(): Promise<void> {
  const startedAt = new Date();
  const runDir = join(REQUIRED_RUNS_DIR, formatTimestamp(startedAt));
  const unitDir = join(runDir, 'unit');
  const e2eDir = join(runDir, 'e2e');

  mkdirSync(unitDir, { recursive: true });
  mkdirSync(e2eDir, { recursive: true });

  const runStart = Date.now();
  const infra = await runInfraProbes();

  const unit = await runSuite('test:unit', unitDir);

  // E2E spin up embedded Nest apps that consume the same RabbitMQ queues as Docker.
  let e2ePausedDocker = false;
  try {
    await pauseCompetingDockerServices();
    e2ePausedDocker = true;
    await new Promise((resolve) => setTimeout(resolve, 2000));
  } catch {
    console.warn('AVISO: nao foi possivel pausar game-service/wallet-service — E2E pode falhar');
  }

  let e2e: Awaited<ReturnType<typeof runSuite>>;
  try {
    e2e = await runSuite('test:e2e', e2eDir);
  } finally {
    if (e2ePausedDocker) {
      await resumeDockerServices().catch(() => undefined);
    }
  }

  const combinedOutput = [
    '=== INFRA PROBES ===',
    JSON.stringify(infra, null, 2),
    '',
    '=== UNIT ===',
    ...unit.output,
    '=== E2E ===',
    ...e2e.output,
  ].join('\n');

  const durationMs = Date.now() - runStart;
  const infraOk = infra.every((p) => p.ok);
  const testsOk =
    ![...unit.results, ...e2e.results].some((ws) => ws.exitCode !== 0);
  const exitCode = infraOk && testsOk ? 0 : 1;

  const summary: RequiredRunSummary = {
    timestamp: startedAt.toISOString(),
    command: 'bun run test:required:report',
    exitCode,
    durationMs,
    runDir: relative(ROOT, runDir).replace(/\\/g, '/'),
    infra,
    unit: unit.results,
    e2e: e2e.results,
  };

  writeFileSync(join(runDir, 'output.log'), combinedOutput, 'utf-8');
  writeFileSync(join(runDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf-8');
  writeFileSync(
    join(runDir, 'manifest.json'),
    `${JSON.stringify({ timestamp: startedAt.toISOString(), infra, e2ePausedDocker }, null, 2)}\n`,
    'utf-8',
  );
  writeFileSync(join(runDir, 'manual-checklist.md'), MANUAL_CHECKLIST, 'utf-8');

  console.log(`Relatorio required-tests: ${summary.runDir}/`);
  console.log(`  manifest.json — infra ${infraOk ? 'OK' : 'FALHA'}`);
  console.log(`  summary.json — exit=${exitCode}, ${durationMs}ms`);
  for (const probe of infra) {
    console.log(`  probe ${probe.name}: ${probe.ok ? 'OK' : 'FAIL'} (${probe.detail ?? probe.target})`);
  }
  for (const ws of [...unit.results, ...e2e.results]) {
    console.log(`  ${ws.logFile} — exit=${ws.exitCode} (${ws.durationMs}ms)`);
  }

  if (!infraOk) {
    console.warn('\nAVISO: infra incompleta — E2E pode ter skipado. Rode: bun run docker:up');
  }

  process.exit(exitCode);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
