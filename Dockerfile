# ── build ─────────────────────────────────────────────────────────────
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ── run ───────────────────────────────────────────────────────────────
# node:sqlite is built into Node 24, so nothing native is carried over.
FROM node:24-alpine
# iputils instead of busybox ping: the same flags for IPv4, IPv6 and
# Yggdrasil addresses, and a parseable "time=" line.
RUN apk add --no-cache iputils
WORKDIR /app
COPY --from=build /app/.output ./.output
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3080 \
    NUXT_DB_PATH=/data/network.db
VOLUME /data
EXPOSE 3080
CMD ["node", "--disable-warning=ExperimentalWarning", ".output/server/index.mjs"]
