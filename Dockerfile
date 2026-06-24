# --- STAGE 1: Dependency Installation ---
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm install

# --- STAGE 2: Build the Application ---
FROM node:18-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Environment variables must be provided at runtime, but we can set defaults
ENV NEXT_TELEMETRY_DISABLED 1

# Dummy vars for build-time (Next.js prerendering)
ENV FIREBASE_PROJECT_ID=build-time
ENV FIREBASE_CLIENT_EMAIL=build@time.com
ENV FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQDh\n-----END PRIVATE KEY-----\n"
ENV NEXT_PUBLIC_FIREBASE_API_KEY=build-time
ENV NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=build-time.firebaseapp.com
ENV NEXT_PUBLIC_FIREBASE_PROJECT_ID=build-time

RUN npm run build

# --- STAGE 3: Production Runner ---
FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production
ENV NEXT_TELEMETRY_DISABLED 1

# Create non-root user
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy essential files
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Google Cloud Run expects the app to listen on PORT env var
EXPOSE 8080
ENV PORT 8080

CMD ["node", "server.js"]
