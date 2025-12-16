#!/bin/bash
# ============================================
# Script de Setup Inicial - Hostinger VPS
# ============================================
# Ejecutar UNA VEZ en el servidor Hostinger
# ============================================

set -e

echo "🔧 Configurando servidor Hostinger para People..."
echo "=========================================="

# 1. Actualizar sistema
echo "📦 Actualizando sistema..."
sudo apt update && sudo apt upgrade -y

# 2. Instalar Docker
if ! command -v docker &> /dev/null; then
    echo "🐳 Instalando Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "✅ Docker ya está instalado"
fi

# 3. Instalar Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "📦 Instalando Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "✅ Docker Compose ya está instalado"
fi

# 4. Instalar Nginx
if ! command -v nginx &> /dev/null; then
    echo "🌐 Instalando Nginx..."
    sudo apt install -y nginx
else
    echo "✅ Nginx ya está instalado"
fi

# 5. Instalar Certbot para SSL
if ! command -v certbot &> /dev/null; then
    echo "🔒 Instalando Certbot..."
    sudo apt install -y certbot python3-certbot-nginx
else
    echo "✅ Certbot ya está instalado"
fi

# 6. Crear estructura de directorios
echo "📁 Creando estructura de directorios..."
sudo mkdir -p /opt/people/{prod,stage}
sudo mkdir -p /opt/people/prod/{logs,backups}
sudo mkdir -p /opt/people/stage/{logs,backups}
sudo chown -R $USER:$USER /opt/people

# 7. Configurar firewall
echo "🔥 Configurando firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS
sudo ufw --force enable

# 8. Configurar Nginx
echo "⚙️  Configurando Nginx..."
sudo mkdir -p /etc/nginx/sites-available
sudo mkdir -p /etc/nginx/sites-enabled

# Copiar configuraciones (asumiendo que los archivos están en el repo)
# sudo cp docker/nginx-stage.conf /etc/nginx/sites-available/stage.people.blackdogpanama.com
# sudo cp docker/nginx-prod.conf /etc/nginx/sites-available/people.blackdogpanama.com
# sudo ln -sf /etc/nginx/sites-available/stage.people.blackdogpanama.com /etc/nginx/sites-enabled/
# sudo ln -sf /etc/nginx/sites-available/people.blackdogpanama.com /etc/nginx/sites-enabled/

echo ""
echo "=========================================="
echo "✅ Setup inicial completado"
echo ""
echo "📋 Próximos pasos:"
echo "1. Copiar archivos del proyecto a /opt/people/"
echo "2. Configurar .env.stage y .env.prod"
echo "3. Configurar Nginx con las configuraciones"
echo "4. Configurar DNS para stage.people.blackdogpanama.com y people.blackdogpanama.com"
echo "5. Ejecutar certbot para SSL: sudo certbot --nginx"
echo "=========================================="

