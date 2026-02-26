# 🚀 Guía Completa: Docker + Hostinger

## 📋 Resumen Ejecutivo

Esta guía te lleva paso a paso desde cero hasta tener tu aplicación People corriendo en Hostinger con Docker, separando staging y producción.

**Tiempo estimado:** 30-45 minutos  
**Dificultad:** Media  
**Requisitos:** VPS Hostinger con Ubuntu 22.04, acceso root/sudo

---

## 🎯 Paso 1: Preparar el Servidor Hostinger

### 1.1 Conectar al servidor

```bash
# Desde tu máquina local
ssh usuario@tu-ip-hostinger
# O si usas clave SSH
ssh -i ~/.ssh/tu_clave usuario@tu-ip-hostinger
```

### 1.2 Verificar sistema

```bash
# Verificar versión de Ubuntu
lsb_release -a

# Verificar recursos
free -h
df -h

# Debe ser Ubuntu 22.04 y tener al menos 4GB RAM
```

### 1.3 Actualizar sistema

```bash
sudo apt update
sudo apt upgrade -y
sudo reboot
# Esperar 1-2 minutos y reconectar
```

---

## 🐳 Paso 2: Instalar Docker y Docker Compose

### 2.1 Instalar Docker

```bash
# Instalar dependencias
sudo apt install -y apt-transport-https ca-certificates curl software-properties-common

# Agregar repositorio oficial de Docker
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io

# Agregar tu usuario al grupo docker (para no usar sudo)
sudo usermod -aG docker $USER

# Verificar instalación
docker --version
# Debe mostrar: Docker version 24.x.x o superior
```

### 2.2 Instalar Docker Compose

```bash
# Descargar última versión
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose

# Dar permisos de ejecución
sudo chmod +x /usr/local/bin/docker-compose

# Verificar instalación
docker-compose --version
# Debe mostrar: Docker Compose version v2.x.x
```

### 2.3 Configurar Docker para iniciar automáticamente

```bash
sudo systemctl enable docker
sudo systemctl start docker
sudo systemctl status docker
# Debe mostrar "active (running)"
```

---

## 🌐 Paso 3: Instalar y Configurar Nginx

### 3.1 Instalar Nginx

```bash
sudo apt install -y nginx

# Iniciar y habilitar
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

### 3.2 Verificar que Nginx funciona

```bash
# Debe mostrar "200 OK"
curl http://localhost

# O abrir en navegador: http://tu-ip-hostinger
# Debe mostrar página de bienvenida de Nginx
```

---

## 🔒 Paso 4: Instalar Certbot (para SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 🔥 Paso 5: Configurar Firewall

```bash
# Verificar estado
sudo ufw status

# Permitir puertos necesarios
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp     # HTTP
sudo ufw allow 443/tcp    # HTTPS

# Activar firewall
sudo ufw --force enable

# Verificar
sudo ufw status
```

---

## 📦 Paso 6: Clonar el Proyecto

### 6.1 Crear directorio

```bash
sudo mkdir -p /opt/people
sudo chown $USER:$USER /opt/people
cd /opt/people
```

### 6.2 Clonar repositorio

```bash
# Si tienes acceso SSH configurado
git clone git@github.com:twhitehead-blackdog/People.git .

# O con HTTPS
git clone https://github.com/twhitehead-blackdog/People.git .

# Cambiar al branch correcto
git checkout nazMarcacion0
```

---

## ⚙️ Paso 7: Configurar Variables de Entorno

### 7.1 Inicializar archivos .env

```bash
cd docker
chmod +x scripts/*.sh
./scripts/init-env.sh
```

### 7.2 Editar variables de staging

```bash
nano stage/.env.stage
```

**Completar con tus valores reales:**

```bash
# Backend
PORT=3000
NODE_ENV=staging

# Supabase (Staging - puedes usar el mismo proyecto o crear uno nuevo)
ENV_SUPABASE_URL=https://fsrptlzaqjkcutoiivjr.supabase.co
ENV_SUPABASE_ANON_KEY=tu_anon_key_aqui
ENV_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# SMTP
ENV_SMTP_HOST=smtp.gmail.com
ENV_SMTP_PORT=587
ENV_SMTP_USER=tu_email@gmail.com
ENV_SMTP_PASSWORD=tu_app_password
ENV_SMTP_NOREPLY_EMAIL=noreply-staging@blackdogpanama.com
ENV_SMTP_NOREPLY_NAME=Black Dog - Staging

# URLs
ENV_APP_URL=https://stage.people.blackdogpanama.com

# Auth0
AUTH0_DOMAIN=tu_dominio.auth0.com
AUTH0_CLIENT_ID=tu_client_id
AUTH0_CLIENT_SECRET=tu_client_secret

# Otros
LOG_LEVEL=debug
```

**Guardar:** `Ctrl+O`, `Enter`, `Ctrl+X`

### 7.3 Editar variables de producción

```bash
nano prod/.env.prod
```

**Completar con tus valores de producción** (mismo formato que staging, pero con valores de prod).

---

## 🌍 Paso 8: Configurar DNS

### 8.1 En tu proveedor de DNS (ej: Cloudflare, Namecheap, etc.)

Agregar estos registros A:

```
stage.people.blackdogpanama.com  →  IP_DEL_SERVIDOR_HOSTINGER
people.blackdogpanama.com         →  IP_DEL_SERVIDOR_HOSTINGER
```

**Obtener IP del servidor:**
```bash
curl ifconfig.me
# O
hostname -I
```

### 8.2 Esperar propagación DNS

```bash
# Verificar propagación (puede tardar 5-30 minutos)
nslookup stage.people.blackdogpanama.com
nslookup people.blackdogpanama.com

# Cuando ambos muestren la IP correcta, continuar
```

---

## 🔧 Paso 9: Configurar Nginx

### 9.1 Copiar configuraciones

```bash
cd /opt/people/docker

# Copiar configuraciones
sudo cp nginx-stage.conf /etc/nginx/sites-available/stage.people.blackdogpanama.com
sudo cp nginx-prod.conf /etc/nginx/sites-available/people.blackdogpanama.com
```

### 9.2 Habilitar sitios

```bash
# Crear enlaces simbólicos
sudo ln -sf /etc/nginx/sites-available/stage.people.blackdogpanama.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/people.blackdogpanama.com /etc/nginx/sites-enabled/

# Eliminar configuración por defecto (opcional)
sudo rm /etc/nginx/sites-enabled/default
```

### 9.3 Verificar configuración

```bash
sudo nginx -t
# Debe mostrar: "syntax is ok" y "test is successful"
```

### 9.4 Reiniciar Nginx

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

---

## 🔐 Paso 10: Configurar SSL con Certbot

### 10.1 SSL para Staging

```bash
sudo certbot --nginx -d stage.people.blackdogpanama.com

# Seguir las instrucciones:
# - Email: tu_email@blackdogpanama.com
# - Aceptar términos: Y
# - Compartir email: N (o Y si quieres)
# - Redireccionar HTTP a HTTPS: 2 (Redirect)
```

### 10.2 SSL para Producción

```bash
sudo certbot --nginx -d people.blackdogpanama.com

# Mismo proceso que staging
```

### 10.3 Verificar renovación automática

```bash
# Certbot configura renovación automática, pero verificar:
sudo certbot renew --dry-run

# Debe mostrar que puede renovar sin problemas
```

---

## 🚀 Paso 11: Deploy en Staging

### 11.1 Build y deploy

```bash
cd /opt/people/docker/stage

# Deploy (esto construye imágenes, inicia contenedores, etc.)
./scripts/deploy-stage.sh
```

### 11.2 Verificar que funciona

```bash
# Ver logs
docker-compose logs -f

# En otra terminal, verificar health
cd /opt/people/docker
./scripts/healthcheck.sh stage

# Abrir en navegador
# https://stage.people.blackdogpanama.com
```

### 11.3 Si hay errores

```bash
# Ver logs detallados
docker-compose logs backend
docker-compose logs frontend

# Verificar contenedores
docker-compose ps

# Verificar variables de entorno
cat .env.stage
```

---

## ✅ Paso 12: Probar Staging Exhaustivamente

**IMPORTANTE:** Probar TODO antes de tocar producción:

- [ ] Login funciona
- [ ] Dashboard carga
- [ ] Navegación funciona
- [ ] Formularios funcionan
- [ ] Emails se envían
- [ ] Conexión a Supabase funciona
- [ ] No hay errores en consola del navegador
- [ ] No hay errores en logs del servidor

**Tiempo recomendado:** 1-2 horas de pruebas

---

## 🎯 Paso 13: Deploy en Producción

**SOLO después de probar exhaustivamente en staging:**

```bash
cd /opt/people/docker/prod

# Deploy (pedirá confirmación)
./scripts/deploy-prod.sh
```

### 13.1 Verificar producción

```bash
# Healthcheck
cd /opt/people/docker
./scripts/healthcheck.sh prod

# Abrir en navegador
# https://people.blackdogpanama.com
```

---

## 📊 Paso 14: Monitoreo y Mantenimiento

### 14.1 Ver logs en tiempo real

```bash
# Staging
cd /opt/people/docker/stage
docker-compose logs -f

# Producción
cd /opt/people/docker/prod
docker-compose logs -f
```

### 14.2 Ver estado de contenedores

```bash
# Staging
cd /opt/people/docker/stage
docker-compose ps

# Producción
cd /opt/people/docker/prod
docker-compose ps
```

### 14.3 Reiniciar servicios

```bash
# Staging
cd /opt/people/docker/stage
docker-compose restart

# Producción
cd /opt/people/docker/prod
docker-compose restart
```

---

## 🔄 Paso 15: Actualizar Código (Flujo de Trabajo)

### 15.1 Actualizar desde GitHub

```bash
cd /opt/people

# Pull cambios
git pull origin nazMarcacion0

# Rebuild y redeploy en staging
cd docker/stage
./scripts/deploy-stage.sh

# Probar en staging
# https://stage.people.blackdogpanama.com

# Si todo OK, deploy en producción
cd ../prod
./scripts/deploy-prod.sh
```

---

## 🚨 Troubleshooting Común

### Error: "Cannot connect to Docker daemon"

```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker $USER

# Cerrar sesión y volver a conectar
exit
# Reconectar SSH
```

### Error: "Port already in use"

```bash
# Ver qué está usando el puerto
sudo netstat -tulpn | grep 18080  # staging
sudo netstat -tulpn | grep 8080   # producción

# Detener proceso o cambiar puerto en docker-compose.yml
```

### Error: "nginx: [emerg] bind() to 0.0.0.0:80 failed"

```bash
# Verificar que Nginx no esté corriendo dos veces
sudo systemctl status nginx
sudo pkill -f nginx
sudo systemctl start nginx
```

### Error: "certbot: No such file or directory"

```bash
# Reinstalar certbot
sudo apt install --reinstall certbot python3-certbot-nginx
```

### Contenedores no inician

```bash
# Ver logs detallados
docker-compose logs

# Verificar variables de entorno
cat .env.stage  # o .env.prod

# Verificar que los archivos existen
ls -la
```

### SSL no funciona

```bash
# Verificar certificados
sudo certbot certificates

# Renovar manualmente
sudo certbot renew

# Verificar configuración de Nginx
sudo nginx -t
```

---

## 📋 Checklist Final

- [ ] Docker instalado y funcionando
- [ ] Docker Compose instalado
- [ ] Nginx instalado y configurado
- [ ] Certbot instalado
- [ ] Firewall configurado
- [ ] DNS configurado y propagado
- [ ] SSL configurado para staging
- [ ] SSL configurado para producción
- [ ] Variables de entorno configuradas
- [ ] Staging deployado y funcionando
- [ ] Staging probado exhaustivamente
- [ ] Producción deployada y funcionando
- [ ] Healthchecks pasando
- [ ] Logs sin errores críticos

---

## 🎉 ¡Listo!

Tu aplicación está corriendo en:
- **Staging:** https://stage.people.blackdogpanama.com
- **Producción:** https://people.blackdogpanama.com

## 📞 Soporte

Si algo no funciona:
1. Revisa los logs: `docker-compose logs`
2. Verifica healthcheck: `./scripts/healthcheck.sh`
3. Revisa esta guía paso a paso
4. Verifica que todos los pasos se completaron correctamente

