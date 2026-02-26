#!/bin/bash
# ============================================
# Script para Actualizar desde GitHub
# y Reconstruir la Aplicación
# ============================================
# Uso: ./scripts/update-from-github-ubuntu.sh [ruta-del-proyecto]
# Ejemplo: ./scripts/update-from-github-ubuntu.sh /var/www/People

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
echo -e "${GREEN}🔄 Actualizando desde GitHub y reconstruyendo aplicación...${NC}"
echo -e "${CYAN}📁 Directorio: $PROJECT_PATH${NC}"
echo ""

# ============================================
# Paso 1: Ir al directorio del proyecto
# ============================================
print_step "📂 Paso 1: Cambiando al directorio del proyecto..."
cd "$PROJECT_PATH"
print_success "Directorio: $(pwd)"
echo ""

# ============================================
# Paso 2: Verificar que es un repositorio git
# ============================================
print_step "🔍 Paso 2: Verificando repositorio git..."
if [ ! -d ".git" ]; then
    print_error "No es un repositorio git"
    exit 1
fi
print_success "Repositorio git encontrado"
echo ""

# ============================================
# Paso 3: Verificar estado actual
# ============================================
print_step "📊 Paso 3: Verificando estado del repositorio..."
CURRENT_BRANCH=$(git branch --show-current)
print_success "Rama actual: $CURRENT_BRANCH"

# Verificar si hay cambios locales sin commitear
if [ -n "$(git status --porcelain)" ]; then
    print_warning "Hay cambios locales sin commitear"
    git status --short
    echo ""
    read -p "¿Deseas continuar? Los cambios locales podrían perderse. (s/N): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        print_error "Operación cancelada"
        exit 1
    fi
    print_warning "Haciendo stash de cambios locales..."
    git stash || true
fi
echo ""

# ============================================
# Paso 4: Obtener cambios de GitHub
# ============================================
print_step "📥 Paso 4: Obteniendo cambios de GitHub..."
git fetch origin
print_success "Cambios obtenidos"
echo ""

# ============================================
# Paso 5: Actualizar desde GitHub
# ============================================
print_step "🔄 Paso 5: Actualizando código desde GitHub..."
if git pull origin "$CURRENT_BRANCH"; then
    print_success "Código actualizado desde GitHub"
else
    print_error "Error al actualizar desde GitHub"
    exit 1
fi
echo ""

# ============================================
# Paso 6: Verificar archivo .env
# ============================================
print_step "📋 Paso 6: Verificando archivo .env..."
ENV_FILE="$PROJECT_PATH/.env"
if [ ! -f "$ENV_FILE" ]; then
    print_warning "No se encuentra el archivo .env"
    print_warning "Asegúrate de tener las variables de entorno configuradas"
else
    print_success "Archivo .env encontrado"
fi
echo ""

# ============================================
# Paso 7: Instalar dependencias (si es necesario)
# ============================================
print_step "📦 Paso 7: Verificando dependencias..."
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_warning "Instalando/actualizando dependencias..."
    npm install --legacy-peer-deps
    print_success "Dependencias instaladas"
else
    print_success "Dependencias ya están instaladas"
fi
echo ""

# ============================================
# Paso 8: Limpiar caché y reconstruir
# ============================================
print_step "🧹 Paso 8: Limpiando caché y reconstruyendo aplicación..."
rm -rf .nx/cache
rm -rf dist
print_success "Caché limpiada"
echo ""

print_step "🏗️  Construyendo aplicación..."
if npx nx build people --skip-nx-cache; then
    print_success "Build completado"
else
    print_error "Error en el build"
    exit 1
fi
echo ""

# ============================================
# Paso 9: Recargar Nginx
# ============================================
print_step "🔄 Paso 9: Recargando Nginx..."
if command -v systemctl &> /dev/null; then
    if sudo systemctl is-active --quiet nginx; then
        sudo systemctl reload nginx
        print_success "Nginx recargado"
    else
        print_warning "Nginx no está corriendo"
    fi
elif command -v service &> /dev/null; then
    if sudo service nginx status &> /dev/null; then
        sudo service nginx reload
        print_success "Nginx recargado"
    else
        print_warning "Nginx no está corriendo"
    fi
else
    print_warning "No se pudo recargar Nginx (comando no encontrado)"
fi
echo ""

# ============================================
# Resumen
# ============================================
echo -e "${GREEN}✅ Actualización completada exitosamente${NC}"
echo ""
echo -e "${CYAN}📝 Resumen:${NC}"
echo "   • Rama: $CURRENT_BRANCH"
echo "   • Código actualizado desde GitHub"
echo "   • Aplicación reconstruida"
echo "   • Nginx recargado"
echo ""
echo -e "${GREEN}✨ ¡Listo! La aplicación está actualizada con los últimos cambios de GitHub.${NC}"
echo ""


