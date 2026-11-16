# Imagen de la API (ADR-009). Se construye desde la raíz del monorepo:
#   docker build -f apps/api/Dockerfile .
# La misma imagen se usa en Render (ADR-010).
FROM node:22-slim AS base
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@9.15.0 --activate
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/
COPY apps/api/package.json apps/api/
RUN pnpm install --frozen-lockfile --filter @autonota/api... --ignore-scripts
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN pnpm --filter @autonota/shared build && pnpm --filter @autonota/api build
RUN pnpm --filter @autonota/api deploy --prod /app \
  && cp -r apps/api/dist /app/dist \
  && cp -r apps/api/prisma /app/prisma \
  && cd /app && npx prisma generate

FROM node:22-slim AS runtime
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
ENV NODE_ENV=production
WORKDIR /app
COPY --from=build /app /app
USER node
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
