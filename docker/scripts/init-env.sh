#!/bin/bash
# ============================================
# Script para inicializar archivos .env
# ============================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STAGE_DIR="$(dirname "$SCRIPT_DIR")/stage"
PROD_DIR="$(dirname "$SCRIPT_DIR")/prod"

echo "🔧 Inicializando archivos .env..."
echo "=========================================="

# Staging
if [ ! -f "$STAGE_DIR/.env.stage" ]; then
    echo "📝 Creando .env.stage desde ejemplo..."
    cp "$STAGE_DIR/env.stage.example.txt" "$STAGE_DIR/.env.stage"
    echo "✅ Archivo creado: $STAGE_DIR/.env.stage"
    echo "⚠️  IMPORTANTE: Edita este archivo con tus valores reales"
else
    echo "ℹ️  .env.stage ya existe, no se sobrescribirá"
fi

# Producción
if [ ! -f "$PROD_DIR/.env.prod" ]; then
    echo "📝 Creando .env.prod desde ejemplo..."
    cp "$PROD_DIR/env.prod.example.txt" "$PROD_DIR/.env.prod"
    echo "✅ Archivo creado: $PROD_DIR/.env.prod"
    echo "⚠️  IMPORTANTE: Edita este archivo con tus valores reales"
else
    echo "ℹ️  .env.prod ya existe, no se sobrescribirá"
fi

echo ""
echo "=========================================="
echo "✅ Inicialización completada"
echo ""
echo "📋 Próximos pasos:"
echo "1. Edita docker/stage/.env.stage con tus valores"
echo "2. Edita docker/prod/.env.prod con tus valores"
echo "=========================================="

