FROM node:20-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runner
WORKDIR /app

RUN addgroup -S taskflow && adduser -S taskflow -G taskflow

COPY --chown=taskflow:taskflow --from=deps /app/node_modules ./node_modules
COPY --chown=taskflow:taskflow src/ ./src/
COPY --chown=taskflow:taskflow public/ ./public/
COPY --chown=taskflow:taskflow package.json ./

USER taskflow

ENV NODE_ENV=production
ENV PORT=3000
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3000/health || exit 1

CMD ["node", "src/server.js"]
