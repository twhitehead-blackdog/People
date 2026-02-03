#!/usr/bin/env bash
# Levanta el backend de People (API + frontend estático) en el puerto 3000.
# Necesario para que Traefik → people-test-proxy pueda conectar (502 si no corre).
# Uso: desde /opt/people-test → ./scripts/start-backend-server.sh
# O con systemd: sudo systemctl start people-backend

set -e
cd "$(dirname "$0")/.."
export PORT="${PORT:-3000}"

# Si no existe el build, compilar
if [ ! -d "dist/people/browser" ]; then
  echo "Build no encontrado. Ejecutando npm run build..."
  npm run build
fi

# Preferir el servidor compilado si existe
if [ -f "dist/server.js" ]; then
  exec node dist/server.js
fi
# Fallback: tsx para desarrollo
if command -v tsx >/dev/null 2>&1; then
  exec tsx server.ts
fi
exec node server.js
