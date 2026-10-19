# Multi-stage production Dockerfile for Lissafi Backend Engine
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

# Generate Prisma Client & build NestJS
RUN npx prisma generate
RUN npm run build

# Stage 2: Production runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=4000

# Install runtime dependencies only
COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci --only=production

# Copy built application and prisma client
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma/generated ./prisma/generated

EXPOSE 4000

# Startup script ensures DB schema syncs before launching
CMD ["sh", "-c", "npx prisma db push --skip-generate && node dist/main.js"]
