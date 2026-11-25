# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1

# 1. Install dependencies (lockfile-reproducible)
FROM base AS deps
COPY package.json package-lock.json* ./
RUN if [ -f package-lock.json ]; then npm ci; else npm install; fi

# 2. Build Next.js standalone application
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY package.json tsconfig.json next.config.ts drizzle.config.ts ./
COPY public ./public
COPY src ./src
COPY drizzle ./drizzle
ENV NODE_ENV=production
RUN npm run build

# 3. Production web runtime (non-root, NO ffmpeg, NO dev secrets or data/)
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME=0.0.0.0
ENV PORT=3000
ENV MEDIA_ROOT=/var/lib/komik-mirror/media

RUN mkdir -p /app/.next /var/lib/komik-mirror/media \
  && chown -R node:node /app /var/lib/komik-mirror

COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]

# 4. Migration & operator CLI runner (non-root, single-connection Drizzle migrator)
FROM base AS migrator
ENV NODE_ENV=production
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json tsconfig.json drizzle.config.ts ./
COPY --chown=node:node drizzle ./drizzle
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
USER node
CMD ["npx", "tsx", "src/db/migrate.ts"]

# 5. Snapshot importer job (FFmpeg libwebp ONLY in this image, non-root)
FROM base AS importer
ENV NODE_ENV=production
ENV MEDIA_ROOT=/var/lib/komik-mirror/media
ENV SNAPSHOT_DIR=/snapshot
RUN apk add --no-cache ffmpeg \
  && mkdir -p /var/lib/komik-mirror/media \
  && chown -R node:node /app /var/lib/komik-mirror
COPY --from=deps --chown=node:node /app/node_modules ./node_modules
COPY --chown=node:node package.json tsconfig.json ./
COPY --chown=node:node src ./src
COPY --chown=node:node scripts ./scripts
USER node
ENTRYPOINT ["npx", "tsx", "scripts/import-snapshot.ts"]
