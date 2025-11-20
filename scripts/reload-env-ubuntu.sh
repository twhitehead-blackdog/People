#!/bin/bash
# ============================================
# Script para Recargar Variables de Entorno
# y Reconstruir la Aplicación Angular
# ============================================
# Uso: ./scripts/reload-env-ubuntu.sh [ruta-del-proyecto]
# Ejemplo: ./scripts/reload-env-ubuntu.sh /var/www/People

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
echo -e "${GREEN}🔄 Recargando variables de entorno y reconstruyendo aplicación...${NC}"
echo -e "${CYAN}📁 Directorio: $PROJECT_PATH${NC}"
echo ""

# ============================================
# Paso 1: Verificar archivo .env
# ============================================
print_step "📋 Paso 1: Verificando archivo .env..."
cd "$PROJECT_PATH"

ENV_FILE="$PROJECT_PATH/.env"
if [ ! -f "$ENV_FILE" ]; then
    print_error "No se encuentra el archivo .env en: $ENV_FILE"
    print_warning "Crea el archivo .env con las variables necesarias"
    exit 1
fi

print_success "Archivo .env encontrado"
echo ""

# ============================================
# Paso 2: Cargar variables de entorno
# ============================================
print_step "📥 Paso 2: Cargando variables de entorno desde .env..."

# Cargar variables del archivo .env
# Ignorar líneas vacías y comentarios
while IFS= read -r line || [ -n "$line" ]; do
    # Ignorar líneas vacías
    if [ -z "$line" ]; then
        continue
    fi
    
    # Ignorar comentarios
    if [[ "$line" =~ ^[[:space:]]*# ]]; then
        continue
    fi
    
    # Exportar variable si tiene formato KEY=VALUE
    if [[ "$line" =~ ^[[:space:]]*([^=]+)=(.*)$ ]]; then
        key="${BASH_REMATCH[1]}"
        value="${BASH_REMATCH[2]}"
        
        # Remover espacios en blanco
        key=$(echo "$key" | xargs)
        value=$(echo "$value" | xargs)
        
        # Remover comillas si existen
        value="${value#\"}"
        value="${value%\"}"
        value="${value#\'}"
        value="${value%\'}"
        
        # Exportar variable
        export "$key=$value"
        echo "   ✓ $key"
    fi
done < "$ENV_FILE"

print_success "Variables de entorno cargadas"
echo ""

# ============================================
# Paso 3: Verificar variables críticas
# ============================================
print_step "🔍 Paso 3: Verificando variables críticas..."

REQUIRED_VARS=(
    "ENV_SUPABASE_URL"
    "ENV_SUPABASE_API_KEY"
)

MISSING_VARS=()
for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
        print_error "$var no está definida"
    else
        print_success "$var está definida"
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    print_error "Faltan variables requeridas: ${MISSING_VARS[*]}"
    exit 1
fi

echo ""

# ============================================
# Paso 4: Reconstruir aplicación
# ============================================
print_step "🔨 Paso 4: Reconstruyendo aplicación con nuevas variables..."

# Asegurarse de que npm está disponible
if ! command -v npm &> /dev/null; then
    print_error "npm no está instalado"
    exit 1
fi

# Ejecutar build con las variables de entorno cargadas
if npm run build; then
    print_success "Build completado con nuevas variables"
else
    print_error "Error en el build"
    exit 1
fi

echo ""

# ============================================
# Paso 5: Reiniciar Nginx
# ============================================
print_step "🔄 Paso 5: Reiniciando Nginx..."

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
    print_warning "No se pudo reiniciar Nginx (comando no encontrado)"
fi

echo ""

# ============================================
# Resumen
# ============================================
echo -e "${GREEN}✅ Variables de entorno recargadas y aplicación reconstruida${NC}"
echo ""
echo -e "${CYAN}📝 Variables cargadas:${NC}"
for var in "${REQUIRED_VARS[@]}"; do
    if [ -n "${!var}" ]; then
        # Mostrar solo los primeros caracteres por seguridad
        value="${!var}"
        if [ ${#value} -gt 50 ]; then
            value="${value:0:50}..."
        fi
        echo "   • $var = $value"
    fi
done
echo ""
echo -e "${GREEN}✨ ¡Listo! La aplicación ahora usa las nuevas variables de entorno.${NC}"
echo ""



