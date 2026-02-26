# 🚀 Quick Start - Docker Setup

## Setup Rápido en Hostinger (5 minutos)

### 1. Ejecutar setup inicial

```bash
cd /opt/people
chmod +x docker/scripts/*.sh
./docker/scripts/setup-hostinger.sh
```

### 2. Inicializar archivos .env

```bash
./docker/scripts/init-env.sh
```

### 3. Editar variables de entorno

```bash
# Staging
nano docker/stage/.env.stage

# Producción
nano docker/prod/.env.prod
```

### 4. Configurar Nginx

```bash
# Copiar configuraciones
sudo cp docker/nginx-stage.conf /etc/nginx/sites-available/stage.people.blackdogpanama.com
sudo cp docker/nginx-prod.conf /etc/nginx/sites-available/people.blackdogpanama.com

# Habilitar
sudo ln -sf /etc/nginx/sites-available/stage.people.blackdogpanama.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/people.blackdogpanama.com /etc/nginx/sites-enabled/

# Verificar y reiniciar
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Configurar DNS

En tu proveedor de DNS:

- `stage.people.blackdogpanama.com` → IP del servidor
- `people.blackdogpanama.com` → IP del servidor

### 6. Configurar SSL

```bash
# Staging
sudo certbot --nginx -d stage.people.blackdogpanama.com

# Producción
sudo certbot --nginx -d people.blackdogpanama.com
```

### 7. Deploy inicial

```bash
# Staging primero
cd docker/stage
./scripts/deploy-stage.sh

# Producción (después de probar staging)
cd ../prod
./scripts/deploy-prod.sh
```

## ✅ Verificar que funciona

```bash
# Healthcheck
./docker/scripts/healthcheck.sh stage
./docker/scripts/healthcheck.sh prod

# Ver logs
cd docker/stage
docker-compose logs -f
```

## 🎯 Listo!

- Staging: https://stage.people.blackdogpanama.com
- Producción: https://people.blackdogpanama.com
