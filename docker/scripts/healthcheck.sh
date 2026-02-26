#!/bin/bash
# ============================================
# Script de Healthcheck
# ============================================

ENVIRONMENT=${1:-stage}  # stage o prod

if [ "$ENVIRONMENT" = "prod" ]; then
    COMPOSE_FILE="../prod/docker-compose.yml"
    URL="https://people.blackdogpanama.com"
    PORT=8080
else
    COMPOSE_FILE="../stage/docker-compose.yml"
    URL="https://stage.people.blackdogpanama.com"
    PORT=18080
fi

echo "🏥 Verificando salud de $ENVIRONMENT..."
echo "=========================================="

# Verificar contenedores
echo "📦 Estado de contenedores:"
docker-compose -f "$COMPOSE_FILE" ps

echo ""
echo "🌐 Verificando endpoints:"

# Frontend
if curl -f -s "http://localhost:$PORT/health" > /dev/null; then
    echo "✅ Frontend: OK"
else
    echo "❌ Frontend: ERROR"
fi

# Backend (a través del frontend)
if curl -f -s "http://localhost:$PORT/health" > /dev/null; then
    echo "✅ Backend: OK"
else
    echo "❌ Backend: ERROR"
fi

# Verificar logs de errores
echo ""
echo "📋 Últimos errores (si hay):"
docker-compose -f "$COMPOSE_FILE" logs --tail=20 | grep -i error || echo "No hay errores recientes"

echo ""
echo "=========================================="

