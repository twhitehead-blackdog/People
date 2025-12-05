#!/bin/bash
set -e

cd /opt/docker-projects/People

echo "🚀 Actualizando aplicación People a test2.0..."
echo ""

# 1. Verificar build
echo "📋 Paso 1: Verificando build..."
if [ ! -d "dist/people/browser" ]; then
    echo "   ⚠️  Build no encontrado, construyendo..."
    npm run build
else
    echo "   ✅ Build encontrado"
fi
echo ""

# 2. Detener proceso existente
echo "🛑 Paso 2: Deteniendo servidor existente..."
PID_8080=$(lsof -ti:8080 2>/dev/null || echo "")
if [ -n "$PID_8080" ]; then
    echo "   Deteniendo proceso $PID_8080..."
    kill $PID_8080 2>/dev/null || true
    sleep 2
    echo "   ✅ Proceso detenido"
else
    echo "   ℹ️  No hay proceso corriendo en puerto 8080"
fi
echo ""

# 3. Iniciar servidor
echo "🚀 Paso 3: Iniciando servidor..."
PORT=8080 NODE_ENV=production npx tsx server.ts > /tmp/people-server.log 2>&1 &
SERVER_PID=$!
sleep 3

# 4. Verificar que está corriendo
if ps -p $SERVER_PID > /dev/null 2>&1; then
    echo "   ✅ Servidor iniciado (PID: $SERVER_PID)"
    echo "   📝 Logs: /tmp/people-server.log"
    echo "   🌐 URL: http://localhost:8080"
else
    echo "   ❌ Error al iniciar servidor"
    echo "   📝 Últimas líneas del log:"
    tail -20 /tmp/people-server.log
    exit 1
fi
echo ""

# 5. Recargar nginx si está corriendo
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "🔄 Paso 4: Recargando Nginx..."
    sudo systemctl reload nginx
    echo "   ✅ Nginx recargado"
else
    echo "ℹ️  Paso 4: Nginx no está corriendo o no se pudo recargar"
fi
echo ""

echo "✅ Actualización completada!"
echo ""
echo "📝 Verifica que todo funcione:"
echo "   - Visita: https://people.blackdogpanama.com/login"
echo "   - Revisa logs: tail -f /tmp/people-server.log"
echo ""



