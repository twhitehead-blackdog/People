# Stage 1: Build
FROM node:20-alpine AS builder

# Instalar dependencias del sistema necesarias para build
RUN apk add --no-cache python3 make g++

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de configuración de dependencias primero (para cache de Docker)
COPY package.json package-lock.json* ./
COPY nx.json ./

# Instalar dependencias (incluyendo devDependencies para el build)
RUN npm ci --legacy-peer-deps

# Copiar todo el código fuente y archivos de configuración
COPY . .

# Construir la aplicación
RUN npm run build && \
    echo "=== Verificando build ===" && \
    ls -la /app/dist && \
    ls -la /app/dist/people && \
    test -d /app/dist/people && echo "✅ Build exitoso: dist/people existe" || (echo "❌ ERROR: Build falló: dist/people no existe" && exit 1)

# Stage 2: Production
FROM node:20-alpine AS production

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package.json package-lock.json* ./

# Instalar dependencias de producción + tsx (necesario para ejecutar server.ts)
RUN npm ci --omit=dev --legacy-peer-deps && \
    npm install -g tsx

# Copiar archivos construidos desde el stage de build
COPY --from=builder /app/dist ./dist

# Copiar el servidor Express
COPY server.ts ./

# Copiar archivos de configuración TypeScript necesarios para el runtime
COPY tsconfig.json ./

# Verificar que los archivos necesarios existen
RUN echo "=== Verificando archivos ===" && \
    ls -la /app && \
    ls -la /app/dist 2>/dev/null || echo "⚠️ dist no existe" && \
    ls -la /app/dist/people 2>/dev/null || echo "⚠️ dist/people no existe" && \
    test -f /app/server.ts && echo "✅ server.ts existe" || echo "❌ server.ts NO existe" && \
    which tsx && echo "✅ tsx está instalado" || echo "❌ tsx NO está instalado"

# Crear script de inicio para mejor debugging
RUN echo '#!/bin/sh' > /app/start.sh && \
    echo 'set -e' >> /app/start.sh && \
    echo 'echo "🚀 Iniciando servidor..."' >> /app/start.sh && \
    echo 'echo "📁 Working directory: $(pwd)"' >> /app/start.sh && \
    echo 'echo "📁 Contenido de /app:"' >> /app/start.sh && \
    echo 'ls -la /app' >> /app/start.sh && \
    echo 'echo "📁 Verificando dist/people:"' >> /app/start.sh && \
    echo 'if [ -d "/app/dist/people" ]; then' >> /app/start.sh && \
    echo '  echo "✅ dist/people existe"' >> /app/start.sh && \
    echo '  ls -la /app/dist/people | head -10' >> /app/start.sh && \
    echo 'else' >> /app/start.sh && \
    echo '  echo "❌ ERROR: dist/people NO existe"' >> /app/start.sh && \
    echo '  exit 1' >> /app/start.sh && \
    echo 'fi' >> /app/start.sh && \
    echo 'echo "🔍 Verificando tsx:"' >> /app/start.sh && \
    echo 'which tsx || (echo "❌ tsx no encontrado" && exit 1)' >> /app/start.sh && \
    echo 'tsx --version' >> /app/start.sh && \
    echo 'echo "✅ Iniciando server.ts..."' >> /app/start.sh && \
    echo 'exec tsx server.ts' >> /app/start.sh && \
    chmod +x /app/start.sh

# Exponer el puerto (Railway lo configurará automáticamente)
EXPOSE 3000

# Variable de entorno para producción
ENV NODE_ENV=production

# Comando para iniciar el servidor
CMD ["/app/start.sh"]

