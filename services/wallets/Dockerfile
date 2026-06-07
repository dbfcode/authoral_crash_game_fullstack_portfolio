FROM oven/bun:latest AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared packages/shared
COPY services/wallets services/wallets

RUN bun install
WORKDIR /app/services/wallets
RUN bun run build

FROM oven/bun:latest AS run
WORKDIR /app/services/wallets
COPY --from=build /app/services/wallets/dist ./dist
COPY --from=build /app/services/wallets/node_modules ./node_modules
COPY --from=build /app/packages/shared /app/packages/shared
COPY --from=build /app/node_modules /app/node_modules
COPY services/wallets/package.json ./
EXPOSE 4002
CMD ["bun", "run", "start:prod"]
