FROM oven/bun:latest AS build
WORKDIR /app

COPY package.json bun.lock ./
COPY packages/shared packages/shared
COPY services/games services/games

RUN bun install
WORKDIR /app/services/games
RUN bun run build

FROM oven/bun:latest AS run
WORKDIR /app/services/games
COPY --from=build /app/services/games/dist ./dist
COPY --from=build /app/services/games/node_modules ./node_modules
COPY --from=build /app/packages/shared /app/packages/shared
COPY --from=build /app/node_modules /app/node_modules
COPY services/games/package.json ./
EXPOSE 4001
CMD ["bun", "run", "start:prod"]
