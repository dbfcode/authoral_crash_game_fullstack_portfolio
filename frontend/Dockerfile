FROM oven/bun:latest AS build
WORKDIR /app

COPY packages/shared packages/shared
WORKDIR /app/packages/shared
RUN bun install

WORKDIR /app/frontend
COPY frontend/package.json ./
RUN bun install
COPY frontend .

ARG VITE_API_BASE=http://localhost:8000
ARG VITE_WS_URL=http://localhost:4001
ARG VITE_KEYCLOAK_URL=http://localhost:8080
ARG VITE_KEYCLOAK_REALM=crash-game
ARG VITE_KEYCLOAK_CLIENT_ID=crash-game-client
ARG VITE_BETTING_DURATION_MS=7000

ENV VITE_API_BASE=$VITE_API_BASE
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_KEYCLOAK_URL=$VITE_KEYCLOAK_URL
ENV VITE_KEYCLOAK_REALM=$VITE_KEYCLOAK_REALM
ENV VITE_KEYCLOAK_CLIENT_ID=$VITE_KEYCLOAK_CLIENT_ID
ENV VITE_BETTING_DURATION_MS=$VITE_BETTING_DURATION_MS

RUN bun run build

FROM nginx:1.27-alpine AS run
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/frontend/dist /usr/share/nginx/html
EXPOSE 3000
