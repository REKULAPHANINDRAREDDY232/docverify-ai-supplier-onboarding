# syntax=docker/dockerfile:1

FROM node:22-alpine AS deps
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl python3 make g++

COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS build
WORKDIR /app

RUN apk add --no-cache libc6-compat openssl

COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json tsconfig.json ./
COPY prisma ./prisma
COPY src ./src

RUN npx prisma generate \
  && npm run build \
  && npm prune --omit=dev \
  && npm install prisma@6.19.0 --omit=dev --no-save

FROM node:22-alpine AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    PORT=4000 \
    UPLOAD_DIR=/app/uploads

RUN apk add --no-cache libc6-compat openssl curl \
  && addgroup -S docverify \
  && adduser -S docverify -G docverify

COPY --from=build --chown=docverify:docverify /app/node_modules ./node_modules
COPY --from=build --chown=docverify:docverify /app/dist ./dist
COPY --from=build --chown=docverify:docverify /app/prisma ./prisma
COPY --from=build --chown=docverify:docverify /app/package.json ./package.json
COPY --chown=docverify:docverify docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh \
  && mkdir -p /app/uploads \
  && chown -R docverify:docverify /app/uploads

USER docverify

EXPOSE 4000

HEALTHCHECK --interval=15s --timeout=5s --start-period=40s --retries=5 \
  CMD curl -fsS "http://127.0.0.1:${PORT}/api/health" || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
