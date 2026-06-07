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
- [ ] REST `POST /wallets` e `GET /wallets/me` (etapa 07 + auth)

### Etapa 04 - Service Events Contracts

- [x] `@crash/shared` com envelope tipado (`eventId`, `correlationId`, `timestamp`)
- [x] Eventos: BetPlaced/Reserved/Rejected, Cashout Requested/Paid/Rejected, BetLostSettled, WalletCredited/Debited
- [x] Exchange `crash.events` (topic) + filas `wallet-service.events` / `game-service.events`
- [x] Wallet consumer publica respostas; Game consumer stubs registram eventos
- [x] Idempotencia basica por `eventId` (`processed_events`)
- [x] `amountCents` serializado como string no wire format
- [x] Testes unitarios shared + messaging (40 testes no monorepo)

### Etapa 05 - Game Domain

- [x] Agregado `Round` com estados `betting`, `running`, `crashed`, `settled`
- [x] Entidade `Bet` com status `active`, `cashed_out`, `lost`
- [x] Value objects `MoneyCents`, `Multiplier` (centesimos, sem float)
- [x] Limites de aposta R$ 1,00 – R$ 1.000,00; uma aposta por jogador/rodada
- [x] Cashout com payout `aposta × multiplicador`; crash marca perdas
- [x] Testes unitarios de dominio (31 novos; 34 no `@crash/games`)
- [ ] Integracao broker (etapa 08)

### Etapa 06 - Provably Fair (hash chain)

- [x] `SeedChain` — cadeia pre-gerada de seeds com indice
- [x] `hashRoundSeed` — SHA-256 da seed (compromisso publico)
- [x] `computeCrashPoint` — HMAC-SHA256 deterministico (estilo Bustabit, ~3% instant 1.00x)
- [x] `verifyRound` + `verifyChainLink` — hash, crash e encadeamento
- [x] `FairnessProof` com `algorithmVersion: "v1-chain"`
- [x] Testes unitarios: vetor fixo, adulteracao hash/crash, chain quebrada
- [ ] Persistencia REST, runtime e UI (etapas 07–09, 14)

Ordem por rodada: `publishRoundHash → closeBets → computeCrash → run → revealSeedAndNextHash`.

Detalhes de auditoria para o README final: etapa 16.

### Proximas etapas

1. **REST APIs** — endpoints do jogo (`/verify`, hash chain)
2. **Gameplay + Broker + Settlement** — integracao completa com `SeedChain`
4. **WebSocket** — tempo real
5. **Auth JWT** — Keycloak integration
6. **Testes finais + Docker**
7. **Frontend** — UI completa
8. **README final + entrega**

## Requisitos Obrigatorios

- [ ] Game Service separado (dominio concluido; REST/gameplay nas etapas 07–08)
- [x] Wallet Service separado (dominio + persistencia; REST na etapa 07)
- [x] Comunicacao assincrona via RabbitMQ (contratos + pub/sub step 04; gameplay na 08)
- [ ] Gameplay completo (apostar, multiplicador, cashout, crash, liquidacao)
- [ ] WebSocket server-to-client
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
