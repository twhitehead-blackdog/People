#!/bin/bash

echo "🔄 Verificando y reiniciando servicio de People..."

# Verificar si PM2 está corriendo
if command -v pm2 &> /dev/null; then
    echo "📋 Verificando procesos PM2..."
    PM2_PROCESS=$(pm2 list | grep -i people || echo "")
    if [ -n "$PM2_PROCESS" ]; then
        echo "   Reiniciando aplicación con PM2..."
        pm2 restart all || pm2 restart people-app || pm2 restart people
        pm2 save
        echo "   ✅ PM2 reiniciado"
        exit 0
    fi
fi

# Verificar si hay un proceso Node corriendo en el puerto 8080
PID_8080=$(lsof -ti:8080 2>/dev/null || ss -tlnp | grep :8080 | awk '{print $6}' | cut -d',' -f2 | cut -d'=' -f2 | head -1)
if [ -n "$PID_8080" ]; then
    echo "   Proceso encontrado en puerto 8080 (PID: $PID_8080)"
    echo "   Reiniciando proceso..."
    kill -HUP $PID_8080 2>/dev/null || kill $PID_8080 2>/dev/null
    echo "   ✅ Proceso reiniciado"
fi

# Verificar si hay un servicio systemd
if systemctl list-units --type=service | grep -qi people; then
    echo "   Reiniciando servicio systemd..."
    sudo systemctl restart people* 2>/dev/null || echo "   No se encontró servicio systemd específico"
fi

# Recargar nginx si está corriendo
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo "   Recargando Nginx..."
    sudo systemctl reload nginx
    echo "   ✅ Nginx recargado"
fi

echo "✅ Proceso de reinicio completado"



