# Full-stack Crash Game

Implementacao do desafio tecnico Full-stack Crash Game. Jogo crash multiplayer com dois servicos backend NestJS, comunicacao assincrona via RabbitMQ, tempo real com WebSocket, carteira, autenticacao via Keycloak, Docker e frontend React.

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
              +------ RabbitMQ +
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
```

## Status do Projeto

### Etapa 02 - Project Setup

- [x] Root `package.json` com workspaces e scripts
- [x] `services/games` com scaffold NestJS + DDD
- [x] `services/wallets` com scaffold NestJS + DDD
- [x] `frontend/` placeholder com Vite + React
- [x] Docker Compose com PostgreSQL, RabbitMQ, Keycloak, Kong
- [x] Dockerfiles para game-service e wallet-service
- [x] Configuracao Kong (`docker/kong/kong.yml`)
- [x] Realm Keycloak (`docker/keycloak/realm-export.json`)
- [x] Init script PostgreSQL (`docker/postgres/init-databases.sh`)
- [x] `.env.example` para cada servico
- [x] `.gitignore`
- [x] `bun install` funcional

### Proximas etapas

1. **Wallet Service** — dominio, testes, endpoints
2. **Event Contracts** — eventos RabbitMQ
3. **Game Domain** — Round, Bet, lifecycle
4. **Provably Fair** — algoritmo e verificacao
5. **REST APIs** — endpoints do jogo
6. **Gameplay + Broker + Settlement** — integracao completa
7. **WebSocket** — tempo real
8. **Auth JWT** — Keycloak integration
9. **Testes finais + Docker**
10. **Frontend** — UI completa
11. **README final + entrega**

## Requisitos Obrigatorios

- [ ] Game Service separado
- [ ] Wallet Service separado
- [ ] Comunicacao assincrona via RabbitMQ
- [ ] Gameplay completo (apostar, multiplicador, cashout, crash, liquidacao)
- [ ] WebSocket server-to-client
- [ ] Dinheiro sem ponto flutuante, saldo nunca negativo
- [ ] Keycloak/OIDC
- [ ] Backend valida JWT
- [ ] Frontend funcional
- [ ] Docker Compose executavel por `bun run docker:up`
- [ ] Testes unitarios de dominio
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

## Decisoes Tecnicas

- Dinheiro em centavos inteiros (BIGINT), nunca `number` para valores monetarios
- REST para acoes do jogador, WebSocket apenas para push server-to-client
- Testes junto com cada bloco funcional (unitarios primeiro, E2E depois)
- Bonus apenas apos obrigatorios validados
- Comunicaçao entre servicos via RabbitMQ (event-driven)
