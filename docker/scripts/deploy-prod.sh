#!/bin/bash
# ============================================
# Script de Deployment - PRODUCCIÓN
# ============================================
# ⚠️  SOLO EJECUTAR DESPUÉS DE PROBAR EN STAGING
# ============================================

set -e  # Salir si hay error

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROD_DIR="$(dirname "$SCRIPT_DIR")/prod"

cd "$PROD_DIR"

echo "🚀 Iniciando deployment en PRODUCCIÓN..."
echo "=========================================="
echo "⚠️  ADVERTENCIA: Estás desplegando en PRODUCCIÓN"
echo ""

# Confirmación
read -p "¿Estás seguro de que quieres desplegar en PRODUCCIÓN? (yes/no): " confirm
if [ "$confirm" != "yes" ]; then
    echo "❌ Deployment cancelado"
    exit 1
fi

# 1. Verificar que .env.prod existe
if [ ! -f .env.prod ]; then
    echo "❌ Error: .env.prod no existe"
    echo "   Copia .env.prod.example a .env.prod y completa los valores"
    exit 1
fi

# 2. Backup de la configuración actual (opcional)
echo "💾 Creando backup..."
BACKUP_DIR="../backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp .env.prod "$BACKUP_DIR/" 2>/dev/null || true

# 3. Pull del código más reciente (si usas git)
# git pull origin main

# 4. Build de las imágenes
echo "📦 Construyendo imágenes Docker..."
docker-compose build --no-cache

# 5. Detener contenedores actuales (con timeout para evitar downtime)
echo "🛑 Deteniendo contenedores actuales..."
docker-compose down --timeout 30

# 6. Iniciar contenedores
echo "▶️  Iniciando contenedores..."
docker-compose up -d

# 7. Verificar salud
echo "🏥 Verificando salud de los servicios..."
sleep 15

if docker-compose ps | grep -q "Up"; then
    echo "✅ Servicios iniciados correctamente"
else
    echo "❌ Error: Algunos servicios no están corriendo"
    echo "🔄 Intentando rollback..."
    # Aquí podrías implementar rollback automático
    docker-compose logs
    exit 1
fi

# 8. Mostrar logs
echo ""
echo "📋 Últimos logs:"
docker-compose logs --tail=50

echo ""
echo "=========================================="
echo "✅ Deployment en PRODUCCIÓN completado"
echo "🌐 URL: https://people.blackdogpanama.com"
echo "=========================================="

