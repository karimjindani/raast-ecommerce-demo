FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-fund
FROM deps AS builder
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build
FROM node:24-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
ARG COMMIT=development
ENV APP_COMMIT=$COMMIT
LABEL org.opencontainers.image.version="0.1.0" org.opencontainers.image.revision=$COMMIT
RUN addgroup -g 1001 -S app && adduser -S app -u 1001 -G app
COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/migrations ./migrations
COPY --from=builder --chown=app:app /app/scripts/migrate.mjs ./scripts/migrate.mjs
USER app
EXPOSE 3000
CMD ["sh","-c","node scripts/migrate.mjs && node server.js"]
