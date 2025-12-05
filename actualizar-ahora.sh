#!/bin/bash
set -e

echo "🚀 Iniciando actualización de People a test2.0..."
echo ""

cd /opt/docker-projects/People

echo "📋 Paso 1: Verificando estado del repositorio..."
git log --oneline -1
echo ""

echo "📦 Paso 2: Instalando dependencias..."
npm install --legacy-peer-deps
echo ""

echo "🔨 Paso 3: Construyendo aplicación para producción..."
npm run build
echo ""

echo "🔄 Paso 4: Verificando cómo está corriendo la aplicación..."
if command -v pm2 &> /dev/null; then
    echo "   PM2 detectado, reiniciando..."
    pm2 restart all || pm2 restart people-app || echo "   No se pudo reiniciar con PM2"
fi

if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "   Nginx detectado, recargando..."
    sudo systemctl reload nginx || echo "   No se pudo recargar nginx"
fi

echo ""
echo "✅ Actualización completada!"
echo ""
echo "📝 Verifica que todo funcione correctamente:"
echo "   - Visita: https://people.blackdogpanama.com/login"
echo "   - Revisa los logs si hay problemas"



