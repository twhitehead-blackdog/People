#!/bin/bash
# ============================================
# Script de Despliegue a Producción (Linux/Mac)
# ============================================
# Uso: ./scripts/deploy-production.sh

set -e

PROJECT_PATH="${1:-.}"
SKIP_BUILD="${2:-false}"
SKIP_GIT="${3:-false}"

echo "🚀 Iniciando despliegue a producción..."
echo ""

# ============================================
# Paso 1: Actualizar código desde GitHub
# ============================================
if [ "$SKIP_GIT" != "true" ]; then
    echo "📥 Paso 1: Actualizando código desde GitHub..."
    cd "$PROJECT_PATH"
    CURRENT_BRANCH=$(git branch --show-current)
    echo "   Rama actual: $CURRENT_BRANCH"
    
    if [ -n "$(git status --porcelain)" ]; then
        echo "   ⚠️  Hay cambios sin commitear. Guardándolos..."
        git stash
    fi
    
    git fetch origin
    git pull origin "$CURRENT_BRANCH"
    echo "   ✅ Código actualizado"
else
    echo "⏭️  Paso 1: Omitido (SKIP_GIT=true)"
fi

echo ""

# ============================================
# Paso 2: Instalar dependencias
# ============================================
echo "📦 Paso 2: Instalando dependencias..."
cd "$PROJECT_PATH"
npm install
echo "   ✅ Dependencias instaladas"

echo ""

# ============================================
# Paso 3: Build de producción
# ============================================
if [ "$SKIP_BUILD" != "true" ]; then
    echo "🔨 Paso 3: Construyendo aplicación para producción..."
    cd "$PROJECT_PATH"
    npm run build
    echo "   ✅ Build completado"
else
    echo "⏭️  Paso 3: Omitido (SKIP_BUILD=true)"
fi

echo ""

# ============================================
# Paso 4: Verificar archivos SQL
# ============================================
echo "📋 Paso 4: Verificando archivos SQL necesarios..."
STORAGE_SCRIPT="$PROJECT_PATH/database/migrations/setup-storage.sql"
SETUP_SCRIPT="$PROJECT_PATH/database/01-setup.sql"

if [ ! -f "$STORAGE_SCRIPT" ]; then
    echo "   ❌ No se encuentra: $STORAGE_SCRIPT"
    exit 1
fi

if [ ! -f "$SETUP_SCRIPT" ]; then
    echo "   ❌ No se encuentra: $SETUP_SCRIPT"
    exit 1
fi

echo "   ✅ Archivos SQL encontrados"
echo ""

# ============================================
# Resumen y próximos pasos
# ============================================
echo "✅ Despliegue local completado"
echo ""
echo "📝 PRÓXIMOS PASOS MANUALES:"
echo ""
echo "1. Ejecuta los scripts SQL en Supabase (PRODUCCIÓN):"
echo "   a) Ve a: https://app.supabase.com → Tu proyecto de producción"
echo "   b) SQL Editor → New Query"
echo "   c) Ejecuta: database/migrations/setup-storage.sql"
echo "   d) Ejecuta: database/01-setup.sql"
echo ""
echo "2. Verifica variables de entorno en producción:"
echo "   - ENV_SUPABASE_URL"
echo "   - ENV_SUPABASE_API_KEY"
echo "   - ENV_SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo "3. Reinicia tu aplicación:"
echo "   pm2 restart all"
echo "   # O el comando que uses para reiniciar"
echo ""
echo "4. Verifica que todo funcione:"
echo "   - Bucket 'disabilities' existe en Storage"
echo "   - Puedes subir archivos de incapacidades"
echo "   - La aplicación carga correctamente"
echo ""

