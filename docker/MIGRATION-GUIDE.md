# 🔄 Guía de Migración a Docker

## 📋 Resumen

Esta guía te ayudará a migrar tu aplicación People de un setup tradicional a Docker con ambientes de staging y producción separados.

## 🎯 Beneficios

- ✅ Ambientes completamente aislados
- ✅ Fácil rollback en caso de problemas
- ✅ Reproducible en cualquier servidor
- ✅ Sin conflictos de dependencias
- ✅ Fácil escalado

## 📦 Requisitos Previos

- VPS con Ubuntu 22.04 (Hostinger recomendado)
- 4 GB RAM mínimo (8 GB ideal)
- Acceso root/sudo
- Dominio configurado (people.blackdogpanama.com)

## 🔄 Proceso de Migración

### Paso 1: Backup de Producción Actual

```bash
# En tu servidor actual
cd /var/www/People  # o donde esté tu app
tar -czf backup-$(date +%Y%m%d).tar.gz .
```

### Paso 2: Preparar Nuevo Servidor

```bash
# Conectar al servidor Hostinger
ssh usuario@tu-servidor

# Crear directorio
sudo mkdir -p /opt/people
sudo chown $USER:$USER /opt/people
cd /opt/people
```

### Paso 3: Clonar Repositorio

```bash
git clone https://github.com/twhitehead-blackdog/People.git .
git checkout nazMarcacion0  # o el branch que uses
```

### Paso 4: Ejecutar Setup

```bash
cd docker
chmod +x scripts/*.sh
./scripts/setup-hostinger.sh
```

### Paso 5: Configurar Variables de Entorno

```bash
# Inicializar archivos .env
./scripts/init-env.sh

# Editar staging
nano stage/.env.stage

# Editar producción (copiar valores de tu .env actual)
nano prod/.env.prod
```

### Paso 6: Configurar Nginx

```bash
# Copiar configuraciones
sudo cp nginx-stage.conf /etc/nginx/sites-available/stage.people.blackdogpanama.com
sudo cp nginx-prod.conf /etc/nginx/sites-available/people.blackdogpanama.com

# Habilitar
sudo ln -sf /etc/nginx/sites-available/stage.people.blackdogpanama.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/people.blackdogpanama.com /etc/nginx/sites-enabled/

# Verificar
sudo nginx -t
sudo systemctl restart nginx
```

### Paso 7: Configurar DNS

En tu proveedor de DNS:
- `stage.people.blackdogpanama.com` → IP del servidor
- `people.blackdogpanama.com` → IP del servidor

Esperar propagación DNS (5-30 minutos).

### Paso 8: Configurar SSL

```bash
# Staging
sudo certbot --nginx -d stage.people.blackdogpanama.com

# Producción
sudo certbot --nginx -d people.blackdogpanama.com
```

### Paso 9: Deploy en Staging

```bash
cd docker/stage
./scripts/deploy-stage.sh
```

### Paso 10: Probar Staging

1. Acceder a https://stage.people.blackdogpanama.com
2. Probar todas las funcionalidades
3. Verificar logs: `docker-compose logs -f`
4. Verificar health: `../scripts/healthcheck.sh stage`

### Paso 11: Deploy en Producción

**SOLO después de probar exhaustivamente en staging:**

```bash
cd docker/prod
./scripts/deploy-prod.sh
```

### Paso 12: Verificar Producción

1. Acceder a https://people.blackdogpanama.com
2. Verificar que todo funciona
3. Monitorear logs: `docker-compose logs -f`

## 🔄 Migración de Datos

Como usas Supabase, no necesitas migrar base de datos. Solo asegúrate de:

1. ✅ Usar las mismas credenciales de Supabase en producción
2. ✅ Verificar que las variables de entorno apunten a la BD correcta
3. ✅ Probar conexión a Supabase desde staging primero

## 🚨 Troubleshooting

### Los contenedores no inician

```bash
# Ver logs
docker-compose logs

# Verificar variables de entorno
cat .env.stage  # o .env.prod

# Verificar puertos
sudo netstat -tulpn | grep 18080  # staging
sudo netstat -tulpn | grep 8080   # producción
```

### Nginx no funciona

```bash
# Verificar configuración
sudo nginx -t

# Ver logs
sudo tail -f /var/log/nginx/error.log

# Reiniciar
sudo systemctl restart nginx
```

### Backend no responde

```bash
# Ver logs
docker-compose logs backend

# Verificar health
curl http://localhost:3000/api/health

# Verificar variables de entorno
docker-compose exec backend env | grep ENV_
```

## ✅ Checklist Post-Migración

- [ ] Staging funciona correctamente
- [ ] Producción funciona correctamente
- [ ] SSL configurado en ambos ambientes
- [ ] Healthchecks pasando
- [ ] Logs sin errores críticos
- [ ] Variables de entorno correctas
- [ ] DNS propagado
- [ ] Backup del servidor anterior guardado

## 📞 Soporte

Si algo no funciona:
1. Revisa los logs: `docker-compose logs`
2. Verifica healthcheck: `./scripts/healthcheck.sh`
3. Verifica variables de entorno
4. Verifica que los puertos no estén ocupados
5. Revisa la documentación en `docker/README.md`

