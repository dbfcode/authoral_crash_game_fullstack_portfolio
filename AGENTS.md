# AGENTS.md

## Cursor Cloud specific instructions

### Product overview

Full-stack multiplayer Crash Game monorepo (Bun workspaces): React frontend, NestJS Game Service + Wallet Service, PostgreSQL, RabbitMQ, Keycloak, Kong. One-command stack: `bun run docker:up`.

### System prerequisites (not in update script)

These are installed once per VM snapshot, not refreshed on every agent session:

- **Bun 1.3** at `~/.bun/bin/bun` — ensure `export PATH="$HOME/.bun/bin:$PATH"` in your shell.
- **Docker** — in Cloud Agent VMs, systemd may not start `dockerd` automatically. If `docker` fails with permission/socket errors:
  1. Start daemon: `sudo dockerd > /tmp/dockerd.log 2>&1 &` (sleep ~3s)
  2. Fix socket: `sudo chmod 666 /var/run/docker.sock`
  3. Storage driver `fuse-overlayfs` is configured in `/etc/docker/daemon.json`

### Standard commands (see README.md)

| Task | Command |
|------|---------|
| Install deps | `bun install` |
| Start full stack | `bun run docker:up` |
| Stop stack | `bun run docker:down` |
| Reset DB/volumes | `bun run docker:prune` |
| Unit tests | `bun run test:unit` |
| E2E tests | `bun run test:e2e` (requires `docker:up`; may pause game/wallet containers) |
| Lint | `bun run lint` (placeholder `echo ok` in workspaces) |
| Frontend dev only | `bun run dev:frontend` (backends via Docker) |

### Services and ports

| Service | Port | Required |
|---------|------|----------|
| Frontend | 3000 | Yes |
| Kong (REST gateway) | 8000 | Yes |
| Game Service (+ WebSocket) | 4001 | Yes |
| Wallet Service | 4002 | Yes |
| Keycloak | 8080 | Yes |
| PostgreSQL | 5432 | Yes |
| RabbitMQ | 5672 | Yes |

Test login: `player` / `player123` · initial balance R$ 5.000.

### Gotchas

- **Cold start**: first `docker:up` (image build + Keycloak realm import) takes ~1–2 minutes. Frontend shows *Iniciando aplicação…* until health checks pass.
- **WebSocket** connects directly to Game Service (`:4001`), not through Kong.
- **Wallet creation**: `GET /wallets/me` returns 404 until `POST /wallets` or first login flow creates the wallet; the browser login flow handles this automatically.
- **E2E tests** spin embedded Nest apps and may `docker compose pause` game-service/wallet-service to avoid RabbitMQ queue conflicts — do not rely on those containers during E2E runs.
- **Postgres persistence**: `docker:down` keeps volumes; use `docker:prune` or `docker compose down -v` for a clean slate.

### Smoke verification

```bash
curl -sf http://localhost:8000/games/health
curl -sf http://localhost:8000/wallets/health
curl -sf http://localhost:3000/
```
