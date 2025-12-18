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
RUN npm ci

# Copiar todo el código fuente y archivos de configuración
COPY . .

# Construir la aplicación
RUN npm run build

# Stage 2: Production
FROM node:20-alpine AS production

# Instalar solo tsx globalmente para ejecutar el servidor
RUN npm install -g tsx

# Establecer directorio de trabajo
WORKDIR /app

# Copiar package.json y package-lock.json
COPY package.json package-lock.json* ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev

# Copiar archivos construidos desde el stage de build
COPY --from=builder /app/dist ./dist

# Copiar el servidor Express
COPY server.ts ./

# Copiar archivos de configuración TypeScript necesarios para el runtime
COPY tsconfig.json ./

# Exponer el puerto (Railway lo configurará automáticamente)
EXPOSE 3000

# Variable de entorno para producción
ENV NODE_ENV=production

# Comando para iniciar el servidor
CMD ["tsx", "server.ts"]

