#!/bin/bash

cd /opt/docker-projects/People

# Verificar que el build existe
if [ ! -d "dist/people/browser" ]; then
    echo "❌ Error: No se encuentra el build. Ejecuta 'npm run build' primero."
    exit 1
fi

# Buscar si ya hay un proceso corriendo en el puerto 8080
PID_8080=$(lsof -ti:8080 2>/dev/null || ss -tlnp 2>/dev/null | grep :8080 | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)

if [ -n "$PID_8080" ]; then
    echo "🔄 Deteniendo proceso existente en puerto 8080 (PID: $PID_8080)..."
    kill $PID_8080 2>/dev/null
    sleep 2
fi

# Iniciar el servidor
echo "🚀 Iniciando servidor en puerto 8080..."
PORT=8080 NODE_ENV=production npx tsx server.ts > /tmp/people-server.log 2>&1 &

NEW_PID=$!
sleep 3

# Verificar que el servidor está corriendo
if ps -p $NEW_PID > /dev/null 2>&1; then
    echo "✅ Servidor iniciado exitosamente (PID: $NEW_PID)"
    echo "📝 Logs: /tmp/people-server.log"
    echo "🌐 Servidor corriendo en: http://localhost:8080"
else
    echo "❌ Error al iniciar el servidor. Revisa los logs:"
    tail -20 /tmp/people-server.log
    exit 1
fi



