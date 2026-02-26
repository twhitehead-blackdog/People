#!/bin/bash
# ============================================
# Script de Despliegue a Producción - Ubuntu
# ============================================
# Uso: ./scripts/deploy-ubuntu.sh [ruta-del-proyecto]
# Ejemplo: ./scripts/deploy-ubuntu.sh /var/www/people

set -e  # Salir si hay algún error

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Función para imprimir mensajes
print_step() {
    echo -e "${CYAN}$1${NC}"
}

print_success() {
    echo -e "${GREEN}   ✅ $1${NC}"
}

print_error() {
    echo -e "${RED}   ❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}   ⚠️  $1${NC}"
}

# Obtener ruta del proyecto
PROJECT_PATH="${1:-$(pwd)}"
if [ ! -d "$PROJECT_PATH" ]; then
    print_error "El directorio no existe: $PROJECT_PATH"
    exit 1
fi

echo ""
echo -e "${GREEN}🚀 Iniciando despliegue a producción...${NC}"
echo -e "${CYAN}📁 Directorio: $PROJECT_PATH${NC}"
echo ""

# ============================================
# Paso 1: Verificar que estamos en el directorio correcto
# ============================================
print_step "📋 Paso 1: Verificando proyecto..."
cd "$PROJECT_PATH"

if [ ! -f "package.json" ]; then
    print_error "No se encuentra package.json. ¿Estás en el directorio correcto?"
    exit 1
fi

if [ ! -d ".git" ]; then
    print_warning "No se encuentra .git. Continuando sin actualización de git..."
    SKIP_GIT=true
else
    SKIP_GIT=false
fi

print_success "Proyecto verificado"
echo ""

# ============================================
# Paso 2: Actualizar código desde GitHub
# ============================================
if [ "$SKIP_GIT" = false ]; then
    print_step "📥 Paso 2: Actualizando código desde GitHub..."
    
    # Verificar si hay cambios sin commitear
    if [ -n "$(git status --porcelain)" ]; then
        print_warning "Hay cambios sin commitear. Guardándolos en stash..."
        git stash push -m "Auto-stash antes de deploy $(date +%Y-%m-%d_%H-%M-%S)" || true
    fi
    
    # Obtener rama actual
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "main")
    echo "   Rama actual: $CURRENT_BRANCH"
    
    # Actualizar
    git fetch origin || print_warning "No se pudo hacer fetch (puede ser normal si no hay conexión)"
    git pull origin "$CURRENT_BRANCH" || print_warning "No se pudo hacer pull"
    
    print_success "Código actualizado"
else
    print_step "⏭️  Paso 2: Omitido (no es un repositorio git)"
fi

echo ""

# ============================================
# Paso 3: Instalar/Actualizar dependencias
# ============================================
print_step "📦 Paso 3: Instalando dependencias..."
if npm install --legacy-peer-deps; then
    print_success "Dependencias instaladas"
else
    print_error "Error al instalar dependencias"
    exit 1
fi

echo ""

# ============================================
# Paso 4: Build de producción
# ============================================
print_step "🔨 Paso 4: Construyendo aplicación para producción..."
if npm run build; then
    print_success "Build completado"
else
    print_error "Error en el build"
    exit 1
fi

echo ""

# ============================================
# Paso 5: Verificar archivos SQL
# ============================================
print_step "📋 Paso 5: Verificando archivos SQL necesarios..."
STORAGE_SCRIPT="$PROJECT_PATH/database/migrations/setup-storage.sql"
SETUP_SCRIPT="$PROJECT_PATH/database/01-setup.sql"

if [ ! -f "$STORAGE_SCRIPT" ]; then
    print_error "No se encuentra: $STORAGE_SCRIPT"
    exit 1
fi

if [ ! -f "$SETUP_SCRIPT" ]; then
    print_error "No se encuentra: $SETUP_SCRIPT"
    exit 1
fi

print_success "Archivos SQL encontrados"
echo ""

# ============================================
# Paso 6: Mostrar contenido de scripts SQL (opcional)
# ============================================
print_step "📄 Paso 6: Preparando scripts SQL para ejecutar en Supabase..."
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}SCRIPT 1: setup-storage.sql${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Ubicación: $STORAGE_SCRIPT"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}SCRIPT 2: 01-setup.sql${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Ubicación: $SETUP_SCRIPT"
echo ""

# ============================================
# Resumen y próximos pasos
# ============================================
echo -e "${GREEN}✅ Despliegue local completado${NC}"
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}📝 PRÓXIMOS PASOS MANUALES:${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════${NC}"
echo ""
echo -e "${CYAN}1. Ejecuta los scripts SQL en Supabase (PRODUCCIÓN):${NC}"
echo "   a) Ve a: https://app.supabase.com → Tu proyecto de PRODUCCIÓN"
echo "   b) SQL Editor → New Query"
echo "   c) Abre y ejecuta: $STORAGE_SCRIPT"
echo "   d) Abre y ejecuta: $SETUP_SCRIPT"
echo ""
echo -e "${CYAN}2. Verifica variables de entorno:${NC}"
echo "   - ENV_SUPABASE_URL"
echo "   - ENV_SUPABASE_API_KEY"
echo "   - ENV_SUPABASE_SERVICE_ROLE_KEY"
echo ""
echo -e "${CYAN}3. Reinicia tu aplicación:${NC}"
echo "   pm2 restart all"
echo "   # O: sudo systemctl restart tu-servicio"
echo "   # O: docker-compose restart"
echo ""
echo -e "${CYAN}4. Verifica que todo funcione:${NC}"
echo "   - Bucket 'disabilities' existe en Storage"
echo "   - Puedes subir archivos de incapacidades"
echo "   - La aplicación carga correctamente"
echo ""
echo -e "${GREEN}✨ ¡Listo para producción!${NC}"
echo ""

