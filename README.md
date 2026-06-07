# Full-stack Crash Game

Implementacao do desafio tecnico Full-stack Crash Game. Jogo crash multiplayer com dois servicos backend NestJS, comunicacao assincrona via RabbitMQ, tempo real com WebSocket, carteira, autenticacao via Keycloak, Docker e frontend React.

> **Commit style:** Este repositorio segue o padrao global definido por Linus Torvalds (criador do git e do Linux) para mensagens de commit — imperativo, linha de assunto curta (ate 50 caracteres), corpo explicando o que e por que (nao como), e atomico (um cambio logico por commit). Acreditamos que um historico Git limpo e expressivo e parte essencial da engenharia de software.

## Stack

Bun 1.3, NestJS 11, TypeScript strict, PostgreSQL 18, RabbitMQ, Kong, Keycloak, WebSocket (Socket.IO), React 19 + Vite + TypeScript.

## Arquitetura

```text
               Browser
       REST actions | WebSocket events
                   v
               Kong API Gateway
           /games          /wallets
              |                |
              v                v
       Game Service      Wallet Service
       Round, Bet,       Wallet, Ledger,
       Crash, Fairness   Credit/Debit
              |                |
              +------ RabbitMQ +  (topic: crash.events)
              |                |
              v                v
         PostgreSQL       PostgreSQL

       Keycloak -> JWT validation in private endpoints
```

## Comandos

```bash
bun install              # Instala dependencias
bun run docker:up        # Sobe infra + servicos
bun run docker:down      # Para containers
bun run docker:prune     # Remove tudo
bun run test:unit        # Testes unitarios
bun run test:e2e         # Testes E2E
bun run test:unit:report # Testes unitarios com relatorio em test-runs/<timestamp>-unit/
```

Relatorios locais de teste ficam em `test-runs/` (gitignored), com `summary.json`, `output.log` e logs por workspace.

## Status do Projeto

### Etapa 02 - Project Setup

- [x] Root `package.json` com workspaces e scripts
- [x] `services/games` com scaffold NestJS (camadas DDD reservadas; presentation implementada)
- [x] `services/wallets` com scaffold NestJS (camadas DDD reservadas; presentation implementada)
- [x] `packages/shared` placeholder para contratos futuros
- [x] Smoke tests de health check (`GET /games/health`, `GET /wallets/health`)
- [x] `frontend/` placeholder com Vite + React
- [x] Docker Compose com PostgreSQL, RabbitMQ, Keycloak, Kong
- [x] Dockerfiles para game-service e wallet-service
- [x] Configuracao Kong (`docker/kong/kong.yml`)
- [x] Realm Keycloak (`docker/keycloak/realm-export.json`)
- [x] Init script PostgreSQL (`docker/postgres/init-databases.sql`)
- [x] `bun run docker:up` funcional — todos os containers rodando
- [x] `.env.example` para cada servico
- [x] `.gitignore`
- [x] `bun install` funcional

### Etapa 03 - Wallet Service

- [x] Dominio Wallet com saldo em centavos (`bigint`)
- [x] MoneyCents, LedgerEntry e erros de dominio
- [x] WalletService (criar, saldo, credito/debito internos)
- [x] Handlers internos para reserva, cashout e estorno
- [x] InMemoryWalletRepository para testes unitarios
- [x] PostgresWalletRepository + migration SQL
- [x] Testes unitarios de dominio e application (26 testes)
- [x] REST `POST /wallets` e `GET /wallets/me` (auth dev via header `X-Player-Id`; JWT no step 10)

### Etapa 04 - Service Events Contracts

- [x] `@crash/shared` com envelope tipado (`eventId`, `correlationId`, `timestamp`)
- [x] Eventos: BetPlaced/Reserved/Rejected, Cashout Requested/Paid/Rejected, BetLostSettled, WalletCredited/Debited
- [x] Exchange `crash.events` (topic) + filas `wallet-service.events` / `game-service.events`
- [x] Wallet consumer publica respostas; Game consumer aplica reservas/cashouts (step 08)
- [x] Idempotencia basica por `eventId` (`processed_events`)
- [x] `amountCents` serializado como string no wire format
- [x] Testes unitarios shared + messaging (40 testes no monorepo)

### Etapa 05 - Game Domain

- [x] Agregado `Round` com estados `betting`, `running`, `crashed`, `settled`
- [x] Entidade `Bet` com status `pending`, `active`, `cashed_out`, `lost`, `rejected`
- [x] Value objects `MoneyCents`, `Multiplier` (centesimos, sem float)
- [x] Limites de aposta R$ 1,00 – R$ 1.000,00; uma aposta por jogador/rodada
- [x] Cashout com payout `aposta × multiplicador`; crash marca perdas
- [x] Testes unitarios de dominio (31 novos; 34 no `@crash/games`)
- [x] Integracao broker (etapa 08)

### Etapa 06 - Provably Fair (hash chain)

- [x] Modulo `services/games/src/domain/provably-fair/` (dominio puro, sem REST/WS)
- [x] `SeedChain` — cadeia pre-gerada de seeds com indice
- [x] `hashRoundSeed` — SHA-256 da seed (compromisso publico)
- [x] `computeCrashPoint` — HMAC-SHA256 deterministico (estilo Bustabit, ~3% instant 1.00x)
- [x] `verifyRound` + `verifyChainLink` — hash, crash e encadeamento
- [x] `FairnessProof` com `algorithmVersion: "v1-chain"`
- [x] Integracao conceitual: `Round.crash({ crashMultiplier: computeCrashPoint(...) })`
- [x] Testes unitarios (17 novos; 53 no `@crash/games` apos step 07)
- [x] Persistencia PostgreSQL + `GET /verify` (step 07)
- [x] Runtime completo via broker (step 08); WebSocket e UI (etapas 09, 14)

```text
Provably Fair — rodada i (FairnessProof + SeedChain)
====================================================

  Origem: SeedChain.commit(i) -> roundSeed[i] (secreta ate pos-crash)

  +------------------+---------------------------+---------------------------+
  | Fase             | Publico (cliente/API)     | Interno (servidor)        |
  +------------------+---------------------------+---------------------------+
  | betting          | roundHash                 | roundSeed                 |
  |                  | SHA256(roundSeed)         | nonce, clientSeed?        |
  +------------------+---------------------------+---------------------------+
  | closeBets        | —                         | computeCrashPoint()       |
  |                  |                           | HMAC(seed, client:nonce)  |
  +------------------+---------------------------+---------------------------+
  | running -> crash | multiplicador sobe        | crashPoint (fixo)         |
  +------------------+---------------------------+---------------------------+
  | pos-crash        | roundSeed (revelada)      | —                         |
  | (FairnessProof)  | crashPoint                |                           |
  |                  | nextRoundHash             |                           |
  |                  | previousRoundHash?        |                           |
  |                  | roundId                   |                           |
  |                  | algorithmVersion v1-chain |                           |
  +------------------+---------------------------+---------------------------+
  | verifyRound      | crashValid                | recalcula crashPoint      |
  |                  | chainValid                | nextRoundHash(i)=         |
  |                  |                           |   roundHash(i+1)          |
  +------------------+---------------------------+---------------------------+

  Encadeamento (hash chain):

    rodada i                rodada i+1
    --------                ----------
    roundHash  <----------  (publicado no betting de i+1)
    nextRoundHash --------> roundHash
    roundSeed               roundSeed (revelada so apos crash de i+1)
```

Ordem por rodada: `publishRoundHash → closeBets → computeCrash → run → revealSeedAndNextHash`.

Secao completa de auditoria para o jogador: etapa 16 (README final).

### Etapa 07 - REST APIs

- [x] Migration PostgreSQL `rounds` + `bets` com colunas fairness chain
- [x] `RoundRepository` / `BetRepository` (Postgres + InMemory para testes)
- [x] `GET /games/rounds/current` — `committedRoundHash`, `nextRoundHash`, apostas
- [x] `GET /games/rounds/history` — paginado
- [x] `GET /games/rounds/:roundId/verify` — `verifyRound` + `crashValid` + `chainValid`
- [x] `GET /games/bets/me`, `POST /games/bet`, `POST /games/bet/cashout`
- [x] `POST /wallets`, `GET /wallets/me`
- [x] Auth dev: header `X-Player-Id` em endpoints privados (JWT Keycloak no step 10)
- [x] `DomainExceptionFilter` — erros de dominio mapeados para HTTP
- [x] `RoundBootstrapService` — primeira rodada em `betting` com hash da `SeedChain`
- [x] Testes unitarios + E2E REST iniciados (2 novos unit games; E2E games + wallets)
- [x] Gameplay broker completo (step 08)

### Etapa 08 - Gameplay Broker Settlement

- [x] Persistencia `chain_state` — `SeedChain` sobrevive a restart
- [x] `RoundEngineService` — fases betting → closeBets → `computeCrashPoint` → running → crash → reveal
- [x] Multiplicador autoritativo com tick configuravel (`GAMES_*` env vars)
- [x] Apostas `pending` → broker `BetReserved`/`BetRejected` → `active`/removida
- [x] Cashout via broker com payout correto (`CashoutRequested` → `CashoutPaid`)
- [x] `BetLostSettled` publicado para apostas perdidas no crash
- [x] Hash comprometido antes de betting; seed revelada apenas pos-crash
- [x] Chain avanca deterministicamente; proxima rodada preparada com `nextRoundHash`
- [x] `GameEventHandlerService` + idempotencia `processed_events` no Game
- [x] Testes unitarios (round engine, handlers, chain persistence) + E2E broker
- [x] Flag `GAMES_DISABLE_ROUND_ENGINE=1` para testes REST sem timers

Variaveis de ambiente do runtime:

- `GAMES_BETTING_DURATION_MS` (default `5000`)
- `GAMES_MULTIPLIER_TICK_MS` (default `100`)
- `GAMES_MULTIPLIER_STEP_HUNDREDTHS` (default `5`)
- `GAMES_DISABLE_ROUND_ENGINE` (default `0`)

### Etapa 09 - WebSocket Realtime

- [x] Contratos WS tipados em `@crash/shared` (`packages/shared/src/websocket/`)
- [x] `GameGateway` Socket.IO namespace `/games` — push server→client only (sem `@SubscribeMessage`)
- [x] Port `GameRealtimePublisher` + implementacoes `SocketGameRealtimePublisher` / `NoopGameRealtimePublisher`
- [x] `round:snapshot` enviado no connect (rodada atual + historico recente)
- [x] Emissao de eventos de rodada e apostas a partir do engine, bootstrap, commands e handlers
- [x] `round-ws.mapper` — seed nunca vaza antes de `round:settled`
- [x] `GamesIoAdapter` — compatibilidade Bun + Socket.IO
- [x] `AppModule.register()` — env vars lidas no bootstrap (testes E2E isolados)
- [x] Testes unitarios (mapper, publisher) + E2E `websocket-realtime.spec.ts`
- [x] Flag `GAMES_DISABLE_WS=1` para testes REST sem gateway

**URLs de conexao (dev):**

| Destino | URL |
| ------- | --- |
| Game Service direto | `http://localhost:4001/games` (namespace Socket.IO) |
| Via Kong (HTTP upgrade) | `http://localhost:8000/games` — validar manualmente; fallback porta 4001 |

**Eventos WebSocket (fairness):**

| Evento | Campos principais | Seed revelada? |
| ------ | ----------------- | -------------- |
| `round:snapshot` | `roundId`, `committedRoundHash`, `bets`, `history` | Nao |
| `round:betting-started` | `roundId`, `committedRoundHash` | Nao |
| `round:started` | `roundId`, `currentMultiplier` | Nao |
| `round:tick` | `roundId`, `currentMultiplier` | Nao |
| `round:crashed` | `roundId`, `crashPoint` | Nao |
| `round:settled` | `roundId`, `revealedRoundSeed`, `nextRoundHash`, `crashPoint` | Sim |
| `round:history-updated` | `items[]` (`roundId`, `crashPoint`, `committedRoundHash`) | Nao |
| `bet:placed` | `betId`, `roundId`, `playerId`, `amountCents`, `status` | Nao |
| `bet:cashout` | `betId`, `multiplier`, `payoutCents`, `status` | Nao |
| `bet:removed` | `betId`, `roundId`, `playerId` | Nao |

Variaveis de ambiente adicionais:

- `GAMES_DISABLE_WS` (default `0`) — desliga gateway WS
- `GAMES_WS_CORS_ORIGIN` (default `*`) — origens CORS do Socket.IO

**Validacao manual (duas abas):**

1. Subir infra + Game Service (`bun run docker:up` ou `cd services/games && bun run dev`)
2. Abrir duas abas no browser console ou cliente Socket.IO
3. Conectar ambas em `http://localhost:4001/games`
4. Confirmar `round:snapshot` com o mesmo `committedRoundHash`
5. Durante a rodada, ambas recebem `round:tick` com o mesmo `currentMultiplier`

### Proximas etapas

1. **Auth JWT** — Keycloak integration (substituir `X-Player-Id`)
2. **Testes finais + Docker**
3. **Frontend** — UI completa (hash visivel, link verify, grafico crash)
4. **README final + entrega**

## Requisitos Obrigatorios

- [x] Game Service separado (REST + runtime gameplay broker)
- [x] Wallet Service separado (dominio + persistencia + REST; JWT no step 10)
- [x] Comunicacao assincrona via RabbitMQ (contratos + pub/sub step 04; gameplay na 08)
- [x] Gameplay completo (apostar, multiplicador, cashout, crash, liquidacao via broker)
- [x] WebSocket server-to-client
- [ ] Dinheiro sem ponto flutuante, saldo nunca negativo
- [ ] Keycloak/OIDC
- [ ] Backend valida JWT
- [ ] Frontend funcional
- [ ] Docker Compose executavel por `bun run docker:up`
- [x] Testes unitarios de dominio (Wallet + Game + Provably Fair; REST/gameplay nas etapas 07–08)
- [ ] Testes E2E dos fluxos criticos
- [ ] README com instrucoes, decisoes, trade-offs e checklist

## Endpoints Planejados

Wallet:

- `POST /wallets`
- `GET /wallets/me`

Game:

- `GET /games/rounds/current`
- `GET /games/rounds/history`
- `GET /games/rounds/:roundId/verify`
- `GET /games/bets/me`
- `POST /games/bet`
- `POST /games/bet/cashout`

## Docker Build

**Abordagem atual (A):** Cada serviço tem seu próprio `Dockerfile` e o contexto de build é seu diretório (`services/games/`, `services/wallets/`). O `package.json` é copiado primeiro, `bun install` roda, e depois o resto do código é copiado. O `bun.lock` (raiz do monorepo) não entra no contexto de build — as versões são resolvidas do registry. Simples e funcional para dev local.

**Alternativa futura (B — monorepo-aware):** Mudar o contexto de build para a raiz do monorepo e ajustar os `Dockerfile` para navegar até o serviço específico. Isso permitiria usar o `bun.lock` global (builds reproduzíveis com `--frozen-lockfile`) e compartilhar o cache de camadas entre serviços. Postergado por enquanto porque:
- A abordagem A já funciona e atende ao requisito eliminatório (`bun run docker:up`)
- A abordagem B adicionaria complexidade de Docker multistage com contextos compartilhados sem benefício imediato
- Será revisitada se o lockfile se provar necessário para consistência entre dev e produção

## Decisoes Tecnicas

- Dinheiro em centavos inteiros (BIGINT), nunca `number` para valores monetarios
- REST para acoes do jogador, WebSocket apenas para push server-to-client
- TDD pratico (RED → GREEN → REFACTOR) em dominio/backend; ver `.cursor/rules/tdd-workflow.mdc`
- Testes junto com cada bloco funcional (unitarios primeiro, E2E depois); `bun run test:unit` deve passar
- Bonus apenas apos obrigatorios validados
- Comunicaçao entre servicos via RabbitMQ (event-driven, exchange `crash.events`)
- Idempotencia de eventos por `eventId`; cents como string no JSON; sem outbox (step 04)
- Provably Fair (step 06): `SeedChain` pre-gerada; persistencia fairness em `rounds` (step 07); `verifyRound` reutiliza `computeCrashPoint`; runtime chain no step 08 (`RoundEngineService`)

Diagrama completo do fluxo: secao **Etapa 06** acima.
