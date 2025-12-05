# =========================
# Etapa 1: Build Angular + Server
# =========================
FROM node:20-alpine AS builder

WORKDIR /app

# Build args
ARG ENV_SUPABASE_URL
ARG ENV_SUPABASE_API_KEY
ARG ENV_SUPABASE_TOKEN
ARG ENV_AUTH0_DOMAIN
ARG ENV_AUTH0_CLIENT_ID
ARG ENV_AUTH0_AUDIENCE
ARG ENV_APP_URL

ENV ENV_SUPABASE_URL=$ENV_SUPABASE_URL
ENV ENV_SUPABASE_API_KEY=$ENV_SUPABASE_API_KEY
ENV ENV_SUPABASE_TOKEN=$ENV_SUPABASE_TOKEN
ENV ENV_AUTH0_DOMAIN=$ENV_AUTH0_DOMAIN
ENV ENV_AUTH0_CLIENT_ID=$ENV_AUTH0_CLIENT_ID
ENV ENV_AUTH0_AUDIENCE=$ENV_AUTH0_AUDIENCE
ENV ENV_APP_URL=$ENV_APP_URL

COPY package*.json ./
COPY .npmrc ./
RUN npm ci --legacy-peer-deps

COPY . .

# Build Angular
RUN npm run build

# Compilar server.ts → dist/server.js
RUN npx tsc server.ts --outDir dist/server

# =========================
# Etapa 2: Producción
# =========================
FROM node:20-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=80

COPY --from=builder /app/dist/people/browser ./dist/people/browser
COPY --from=builder /app/dist/server ./dist/server
COPY package*.json ./

RUN npm install --omit=dev --legacy-peer-deps

EXPOSE 80

CMD ["node", "dist/server/server.js"]
