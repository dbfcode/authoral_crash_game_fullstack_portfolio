# Full-stack Crash Game

Implementação do desafio: jogo crash multiplayer próprio com **Game Service** e **Wallet Service** (NestJS + Bun), comunicação assíncrona via **RabbitMQ**, tempo real com **WebSocket**, autenticação **Keycloak** e frontend **React + Vite**.

## Quick Start

```bash
bun install
bun run docker:up        # Sobe infra + serviços + frontend (sem passos manuais)
```

Abra **[http://localhost:3000](http://localhost:3000)** após o comando terminar.

**Cold start:** na primeira subida (build de imagens + Keycloak) pode levar **~1–2 min**. O frontend exibe *Iniciando aplicação…* até games, wallets e Keycloak responderem. Aguarde e recarregue se necessário — não indica falha funcional.

```bash
bun run docker:down      # Para containers (mantém volumes / Postgres)
bun run docker:prune     # Reset total (apaga volumes e imagens)
bun run test:unit        # Testes unitários
bun run test:e2e         # Testes E2E (requer docker:up)
bun run test:required:report   # Relatório eliminatório (unit + E2E + manifest)
bun run dev:frontend     # Frontend local :3000 (backends via Docker)
```

## Usuário de teste e URLs


| Item                    | Valor                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Login                   | `player` / `player123`                                                                          |
| Frontend                | [http://localhost:3000](http://localhost:3000)                                                  |
| Kong (REST)             | [http://localhost:8000](http://localhost:8000)                                                  |
| Game Service (direto)   | [http://localhost:4001](http://localhost:4001)                                                  |
| Wallet Service (direto) | [http://localhost:4002](http://localhost:4002)                                                  |
| WebSocket               | [http://localhost:4001/games](http://localhost:4001/games) (namespace Socket.IO)                |
| Keycloak                | [http://localhost:8080](http://localhost:8080) — realm `crash-game`, client `crash-game-client` |
| Saldo inicial           | R$ 5.000 (`WALLETS_INITIAL_BALANCE_CENTS=500000`)                                               |


Login OIDC (authorization code + PKCE) → `POST /wallets` cria carteira automaticamente.

## Stack

Bun 1.3 · NestJS 11 · TypeScript strict · PostgreSQL 18 · RabbitMQ · Kong · Keycloak · Socket.IO · React 19 + Vite + Tailwind.

## Arquitetura

```text
                    Browser (:3000)
              REST (Kong)  |  WebSocket (direto)
                    v      v
              Kong :8000    Game Service :4001
           /games    /wallets      |
              |          |         +-- Round engine, PF, WS
              v          v
         Game Service  Wallet Service
              |          |
              +---- RabbitMQ (crash.events) ----+
              |          |                      |
              v          v                      |
         PostgreSQL  PostgreSQL                |
              (games)   (wallets)              |
                                               |
         Keycloak :8080 -- JWT nos endpoints privados
```

- **Ações do jogador** (apostar, cashout): REST via Kong.
- **Push em tempo real** (multiplicador, apostas, fairness): WebSocket direto no Game Service (`:4001/games`).

## REST (via Kong `http://localhost:8000`)

### Wallet — `/wallets`


| Método | Endpoint      | Auth | Descrição                                |
| ------ | ------------- | ---- | ---------------------------------------- |
| `POST` | `/wallets`    | Sim  | Cria carteira para o jogador autenticado |
| `GET`  | `/wallets/me` | Sim  | Saldo e dados da carteira                |


Crédito/débito **não** são expostos via REST — ocorrem via RabbitMQ.

### Game — `/games`


| Método | Endpoint                        | Auth | Descrição                                    |
| ------ | ------------------------------- | ---- | -------------------------------------------- |
| `GET`  | `/games/health`                 | Não  | Health check                                 |
| `GET`  | `/games/rounds/current`         | Não  | Rodada atual (`committedRoundHash`, apostas) |
| `GET`  | `/games/rounds/history`         | Não  | Histórico paginado de rodadas                |
| `GET`  | `/games/rounds/:roundId/verify` | Não  | Verificação provably fair                    |
| `GET`  | `/games/bets/me`                | Sim  | Histórico de apostas do jogador              |
| `POST` | `/games/bet`                    | Sim  | Apostar na rodada atual                      |
| `POST` | `/games/bet/cashout`            | Sim  | Cash out no multiplicador atual              |


## WebSocket (server → client)

Conexão: `http://localhost:4001/games` · namespace Socket.IO.


| Evento                  | Campos principais                                                   | Seed revelada? |
| ----------------------- | ------------------------------------------------------------------- | -------------- |
| `round:snapshot`        | `roundId`, `committedRoundHash`, `nextRoundHash`, `bets`, `history` | Não            |
| `round:betting-started` | `roundId`, `committedRoundHash`                                     | Não            |
| `round:started`         | `roundId`, `currentMultiplier`                                      | Não            |
| `round:tick`            | `roundId`, `currentMultiplier`                                      | Não            |
| `round:crashed`         | `roundId`, `crashPoint`                                             | Não            |
| `round:settled`         | `roundId`, `revealedRoundSeed`, `nextRoundHash`, `crashPoint`       | **Sim**        |
| `round:history-updated` | `items[]` (`roundId`, `crashPoint`, `committedRoundHash`)           | Não            |
| `bet:placed`            | `betId`, `roundId`, `playerId`, `amountCents`, `status`             | Não            |
| `bet:cashout`           | `betId`, `multiplier`, `payoutCents`, `status`                      | Não            |
| `bet:removed`           | `betId`, `roundId`, `playerId`                                      | Não            |


Contratos tipados em `packages/shared/src/websocket/`.

## Provably Fair — hash chain

Algoritmo: `**algorithmVersion: "v1-chain"`** · código em `services/games/src/domain/provably-fair/`.

### Commit (antes da rodada)


| Público                                     | Secreto (servidor)    |
| ------------------------------------------- | --------------------- |
| `committedRoundHash` = SHA-256(`roundSeed`) | `roundSeed` da cadeia |


Exposto em: `round:betting-started`, `round:snapshot`, `GET /games/rounds/current` e painel PF no frontend. A seed **nunca** vaza antes do crash (validado em E2E `websocket-realtime.spec.ts`).

### Reveal (depois do crash)

Revelado em `round:settled` e `GET /games/rounds/:roundId/verify`:

- `revealedRoundSeed` (roundSeed)
- `crashPoint`
- `nextRoundHash` (= SHA-256 da seed da rodada seguinte)
- `previousRoundHash`, `nonce`, `clientSeed` (opcional)

### Cálculo do crash point

```
HMAC-SHA256(roundSeed, "${clientSeed}:${nonce}") → 13 hex → fórmula Bustabit-style
```

- ~**3%** de crashes instantâneos em **1.00x** (`h % 33 === 0` — house edge).
- Teto configurável: `GAMES_MAX_CRASH_MULTIPLIER` (default **100x**).

### Hash chain (anti-retroativo)

1. `SeedChain` **pré-gerada** (10.000 seeds) persistida em `chain_state`.
2. Rodada *i*: publica `roundHash`; após crash revela `roundSeed` e `nextRoundHash = SHA-256(seed[i+1])`.
3. Auditoria de encadeamento: `nextRoundHash` da rodada *i* deve igualar `committedRoundHash` da rodada *i+1* (`chainValid` em `/verify`).

**Limitação MVP:** cadeia pré-gerada no startup — impede alterar uma seed passada sem invalidar toda a chain; não é commit–reveal ad-hoc por rodada.

### Como auditar (avaliador)

1. Durante a fase de apostas, anote `committedRoundHash` (UI coluna Provably Fair ou WS).
2. Após o crash, chame:
  ```bash
   curl -s http://localhost:8000/games/rounds/{roundId}/verify | jq .
  ```
3. Confirme: `"valid": true`, `"crashValid": true`, `"chainValid": true`.
4. No frontend: painel PF verifica automaticamente as últimas rodadas; dropdown *Como verificar você mesmo* descreve SHA-256 + HMAC passo a passo.
5. Recálculo local: `verifyRound` e `computeCrashPoint` em `services/games/src/domain/provably-fair/` (mesma lógica do backend).

## Precisão monetária

- Valores em **centavos inteiros** (`amountCents` como string no JSON; `bigint` no domínio).
- Sem ponto flutuante para dinheiro.
- Saldo nunca negativo (invariante do domínio Wallet).

## Verificação rápida (smoke)

```bash
# Stack pronta?
curl -sf http://localhost:8000/games/health && echo " games OK"
curl -sf http://localhost:8000/wallets/health && echo " wallets OK"

# Rodada atual (hash comprometido visível)
curl -s http://localhost:8000/games/rounds/current | jq '.committedRoundHash'

# JWT + carteira
TOKEN=$(curl -s -X POST "http://localhost:8080/realms/crash-game/protocol/openid-connect/token" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=password" -d "client_id=crash-game-client" \
  -d "username=player" -d "password=player123" | jq -r .access_token)
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/wallets/me | jq .
```

Após uma rodada encerrada, substitua `{roundId}` em `/games/rounds/{roundId}/verify`.

## Checklist eliminatório

- [x] `bun run docker:up` sobe tudo sem passos manuais (Keycloak realm, Kong, migrations)
- [x] Gameplay funciona (apostar → multiplicador → cashout/crash → liquidação via broker)
- [x] Dois serviços separados comunicando via RabbitMQ
- [x] Sincronização em tempo real (múltiplas abas, mesmo `committedRoundHash` e ticks)
- [x] Precisão monetária (centavos inteiros, saldo nunca negativo)
- [x] Autenticação Keycloak — backend valida JWT nos endpoints privados
- [x] Testes unitários + E2E (`bun run test:required:report`)

## Checklist obrigatório (funcional)

- [x] Game Service — ciclo de rodada, apostas, crash, provably fair, WebSocket
- [x] Wallet Service — carteira, crédito/débito via eventos, REST protegido
- [x] Frontend — login OIDC, gráfico, apostas, cashout, histórico, saldo
- [x] Provably fair verificável (`/verify` + UI + hash chain)
- [x] Hash publicado antes da rodada; seed revelada só após crash
- [x] Uma aposta por jogador/rodada; limites R$ 1,00 – R$ 1.000,00

## Bonus / extras

- Painel Provably Fair com histórico das últimas 10 rodadas e guia de auto-verificação
- Tela de startup durante cold start Docker
- Script `test:required:report` com manifest de infra
- Layout 3 colunas (jogo | histórico | PF), toasts, feedback ganho/perda em tempo real

## Decisões, trade-offs e limitações


| Tópico            | Decisão                                                               |
| ----------------- | --------------------------------------------------------------------- |
| Ações vs push     | REST para ações; WebSocket apenas server→client                       |
| Consistência      | Saga RabbitMQ + idempotência por `eventId`; sem outbox                |
| Provably Fair     | `SeedChain` pré-gerada (MVP); encadeamento via `nextRoundHash`        |
| Crash             | Teto `GAMES_MAX_CRASH_MULTIPLIER` default 100x                        |
| Cold start        | ~1–2 min na 1ª subida; UI aguarda health checks                       |
| Persistência      | `pg` + SQL manual; Prisma não implementado                            |
| WebSocket         | Conexão direta `:4001`; upgrade via Kong não validado como primário   |
| Janela de apostas | Default 7s (`GAMES_BETTING_DURATION_MS` / `VITE_BETTING_DURATION_MS`) |


**Reset de estado:** `docker compose down` não apaga Postgres. Use `bun run docker:prune` ou `docker compose down -v` para começar do zero.

## Referências

- Provably Fair: `services/games/src/domain/provably-fair/`
- Contratos compartilhados: `packages/shared/`

