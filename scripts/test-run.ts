#!/usr/bin/env bun
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { join, relative } from 'path';

type TestKind = 'unit' | 'e2e' | 'all';

const ROOT = join(import.meta.dir, '..');
const TEST_RUNS_DIR = join(ROOT, 'test-runs');

const KIND_TO_SCRIPT: Record<TestKind, string> = {
  unit: 'test:unit',
  e2e: 'test:e2e',
  all: 'test',
};

interface WorkspaceResult {
  name: string;
  path: string;
  exitCode: number;
  durationMs: number;
  logFile: string;
}

interface RunSummary {
  timestamp: string;
  kind: TestKind;
  command: string;
  exitCode: number;
  durationMs: number;
  runDir: string;
  workspaces: WorkspaceResult[];
}

function formatTimestamp(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, '').replace(/:/g, '-');
}

function parseKind(arg: string | undefined): TestKind {
  if (arg === 'unit' || arg === 'e2e' || arg === 'all') {
    return arg;
  }
  console.error('Uso: bun scripts/test-run.ts <unit|e2e|all>');
  process.exit(1);
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

    if (!existsSync(fullBase)) {
      continue;
    }

    for (const entry of readdirSync(fullBase, { withFileTypes: true })) {
      if (!entry.isDirectory()) {
        continue;
      }

      const wsPath = join(fullBase, entry.name);
      const wsPkgPath = join(wsPath, 'package.json');

      if (!existsSync(wsPkgPath)) {
        continue;
      }

      const wsPkg = JSON.parse(readFileSync(wsPkgPath, 'utf-8')) as { name?: string };
      workspaces.push({
        name: wsPkg.name ?? entry.name,
        path: wsPath,
      });
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
    env: process.env,
  });

  const [stdout, stderr] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ]);
  const exitCode = await proc.exited;
  const output = [stdout, stderr].filter(Boolean).join('\n');

  return {
    exitCode,
    output,
    durationMs: Date.now() - start,
  };
}

function workspaceLogName(workspaceName: string): string {
  return workspaceName.replace(/^@crash\//, '').replace(/[^\w.-]/g, '_');
}

async function main(): Promise<void> {
  const kind = parseKind(process.argv[2]);
  const scriptName = KIND_TO_SCRIPT[kind];
  const startedAt = new Date();
  const runDirName = `${formatTimestamp(startedAt)}-${kind}`;
  const runDir = join(TEST_RUNS_DIR, runDirName);

  mkdirSync(runDir, { recursive: true });

  const workspaces = discoverWorkspaces();
  const workspaceResults: WorkspaceResult[] = [];
  const combinedOutput: string[] = [];
  const runStart = Date.now();

  for (const workspace of workspaces) {
    const wsPkg = JSON.parse(readFileSync(join(workspace.path, 'package.json'), 'utf-8')) as {
      scripts?: Record<string, string>;
    };

    if (!wsPkg.scripts?.[scriptName]) {
      continue;
    }

    const result = await runWorkspaceTest(workspace.path, scriptName);
    const logFileName = `${workspaceLogName(workspace.name)}.log`;
    const logFilePath = join(runDir, logFileName);
    const relPath = relative(ROOT, workspace.path).replace(/\\/g, '/');

    writeFileSync(logFilePath, result.output, 'utf-8');

    workspaceResults.push({
      name: workspace.name,
      path: relPath,
      exitCode: result.exitCode,
      durationMs: result.durationMs,
      logFile: logFileName,
    });

    combinedOutput.push(
      `=== ${workspace.name} (${relPath}) exit=${result.exitCode} ===`,
      result.output,
      '',
    );
  }

  const durationMs = Date.now() - runStart;
  const exitCode = workspaceResults.some((ws) => ws.exitCode !== 0) ? 1 : 0;
  const command = `bun run --workspaces ${scriptName}`;

  const summary: RunSummary = {
    timestamp: startedAt.toISOString(),
    kind,
    command,
    exitCode,
    durationMs,
    runDir: relative(ROOT, runDir).replace(/\\/g, '/'),
    workspaces: workspaceResults,
  };

  writeFileSync(join(runDir, 'output.log'), combinedOutput.join('\n'), 'utf-8');
  writeFileSync(join(runDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`, 'utf-8');

  console.log(`Relatorio salvo em ${summary.runDir}/`);
  console.log(`  summary.json — exit=${exitCode}, ${durationMs}ms`);
  console.log(`  output.log — saida combinada`);
  for (const ws of workspaceResults) {
    console.log(`  ${ws.logFile} — ${ws.name} (${ws.durationMs}ms, exit=${ws.exitCode})`);
  }

  process.exit(exitCode);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
