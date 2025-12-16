#!/bin/bash
# ============================================
# Script de Deployment - STAGING
# ============================================

set -e  # Salir si hay error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGE_DIR="$(dirname "$SCRIPT_DIR")/stage"

cd "$STAGE_DIR"

echo "🚀 Iniciando deployment en STAGING..."
echo "=========================================="

# 1. Verificar que .env.stage existe
if [ ! -f .env.stage ]; then
    echo "❌ Error: .env.stage no existe"
    echo "   Copia .env.stage.example a .env.stage y completa los valores"
    exit 1
fi

# 2. Pull del código más reciente (si usas git)
# git pull origin nazMarcacion0

# 3. Build de las imágenes
echo "📦 Construyendo imágenes Docker..."
docker-compose build --no-cache

# 4. Detener contenedores actuales
echo "🛑 Deteniendo contenedores actuales..."
docker-compose down

# 5. Iniciar contenedores
echo "▶️  Iniciando contenedores..."
docker-compose up -d

# 6. Verificar salud
echo "🏥 Verificando salud de los servicios..."
sleep 10

if docker-compose ps | grep -q "Up"; then
    echo "✅ Servicios iniciados correctamente"
else
    echo "❌ Error: Algunos servicios no están corriendo"
    docker-compose logs
    exit 1
fi

# 7. Mostrar logs
echo ""
echo "📋 Últimos logs:"
docker-compose logs --tail=50

echo ""
echo "=========================================="
echo "✅ Deployment en STAGING completado"
echo "🌐 URL: https://stage.people.blackdogpanama.com"
echo "=========================================="

