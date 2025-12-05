#!/bin/bash
cd /opt/docker-projects/People
echo "Instalando dependencias..."
npm install --legacy-peer-deps
echo "Construyendo aplicación..."
npm run build
echo "Actualización completada"



