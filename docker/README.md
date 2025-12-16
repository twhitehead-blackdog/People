# 🐳 Docker Setup - People (Staging + Producción)

## 🎯 Objetivo

**Producción: NO se toca.**  
**Staging: ahí rompes, pruebas módulos, migraciones y scripts.**  
**Cero sorpresas cuando subes a prod.**

---

## 🚂 Railway vs Hostinger

Este proyecto soporta **ambos** sistemas de deployment:

### Railway (Recomendado para desarrollo rápido)
- ✅ Deploy automático desde GitHub
- ✅ SSL automático
- ✅ Menos configuración
- 📁 Ver: `docker/RAILWAY-SETUP.md`
- 📁 Variables: `docker/railway/`

### Hostinger (Recomendado para producción con control total)
- ✅ Control total del servidor
- ✅ Más económico para alto tráfico
- ✅ Configuración personalizada
- 📁 Ver: `docker/HOSTINGER-SETUP.md`
- 📁 Variables: `docker/stage/` y `docker/prod/`

**Ambos pueden coexistir sin conflictos.**

## 🏗️ Arquitectura

```
Internet
   │
Nginx (Hostinger)
   │
 ├── people_stage  →  https://stage.people.blackdogpanama.com (Puerto 18080)
 └── people_prod   →  https://people.blackdogpanama.com (Puerto 8080)
```

Cada ambiente tiene:
- ✅ Su contenedor Frontend (Angular)
- ✅ Su contenedor Backend (Express)
- ✅ Sus variables de entorno independientes
- ✅ Sus logs independientes
- ✅ Nada compartido

## 📦 Estructura de Carpetas

```
/opt/people/
├── prod/
│   ├── docker-compose.yml
│   ├── .env.prod
│   ├── nginx-custom.conf
│   └── logs/
└── stage/
    ├── docker-compose.yml
    ├── .env.stage
    ├── nginx-custom.conf
    └── logs/
```

## 🚀 Setup Inicial en Hostinger

### 1. Ejecutar script de setup

```bash
chmod +x docker/scripts/setup-hostinger.sh
./docker/scripts/setup-hostinger.sh
```

### 2. Copiar proyecto a servidor

```bash
# En tu máquina local
scp -r . usuario@tu-servidor:/opt/people/

# O clonar desde GitHub en el servidor
cd /opt/people
git clone https://github.com/twhitehead-blackdog/People.git .
```

### 3. Configurar variables de entorno

```bash
# Staging
cd /opt/people/docker/stage
cp .env.stage.example .env.stage
nano .env.stage  # Editar con tus valores

# Producción
cd /opt/people/docker/prod
cp .env.prod.example .env.prod
nano .env.prod  # Editar con tus valores
```

### 4. Configurar Nginx

```bash
# Copiar configuraciones
sudo cp docker/nginx-stage.conf /etc/nginx/sites-available/stage.people.blackdogpanama.com
sudo cp docker/nginx-prod.conf /etc/nginx/sites-available/people.blackdogpanama.com

# Habilitar sitios
sudo ln -sf /etc/nginx/sites-available/stage.people.blackdogpanama.com /etc/nginx/sites-enabled/
sudo ln -sf /etc/nginx/sites-available/people.blackdogpanama.com /etc/nginx/sites-enabled/

# Verificar configuración
sudo nginx -t

# Reiniciar Nginx
sudo systemctl restart nginx
```

### 5. Configurar DNS

En tu proveedor de DNS, agregar:
- `stage.people.blackdogpanama.com` → IP del servidor
- `people.blackdogpanama.com` → IP del servidor

### 6. Configurar SSL con Certbot

```bash
# Staging
sudo certbot --nginx -d stage.people.blackdogpanama.com

# Producción
sudo certbot --nginx -d people.blackdogpanama.com
```

## 🔄 Flujo de Trabajo

### Deploy en Staging

```bash
cd /opt/people/docker/stage
./scripts/deploy-stage.sh
```

### Probar en Staging

1. Acceder a https://stage.people.blackdogpanama.com
2. Probar todas las funcionalidades
3. Verificar logs: `docker-compose logs -f`
4. Verificar health: `./scripts/healthcheck.sh stage`

### Deploy en Producción (SOLO después de probar en staging)

```bash
cd /opt/people/docker/prod
./scripts/deploy-prod.sh
```

## 📋 Comandos Útiles

### Ver logs

```bash
# Staging
cd /opt/people/docker/stage
docker-compose logs -f

# Producción
cd /opt/people/docker/prod
docker-compose logs -f
```

### Reiniciar servicios

```bash
# Staging
cd /opt/people/docker/stage
docker-compose restart

# Producción
cd /opt/people/docker/prod
docker-compose restart
```

### Ver estado

```bash
# Staging
cd /opt/people/docker/stage
docker-compose ps

# Producción
cd /opt/people/docker/prod
docker-compose ps
```

### Healthcheck

```bash
# Staging
./docker/scripts/healthcheck.sh stage

# Producción
./docker/scripts/healthcheck.sh prod
```

### Rebuild después de cambios en código

```bash
# Staging
cd /opt/people/docker/stage
docker-compose build --no-cache
docker-compose up -d

# Producción (SOLO después de probar en staging)
cd /opt/people/docker/prod
docker-compose build --no-cache
docker-compose up -d
```

## 🧠 Reglas de Oro

1. ❌ **NO** uses la misma base de datos para staging y producción
2. ❌ **NO** compartas variables de entorno
3. ❌ **NO** pruebes migraciones directo en prod
4. ✅ **SIEMPRE** prueba en staging primero
5. ✅ **SIEMPRE** verifica logs después de deploy
6. ✅ **SIEMPRE** haz healthcheck después de deploy

## 🔧 Troubleshooting

### Los contenedores no inician

```bash
# Ver logs detallados
docker-compose logs

# Verificar variables de entorno
cat .env.stage  # o .env.prod

# Verificar puertos
netstat -tulpn | grep 18080  # staging
netstat -tulpn | grep 8080   # producción
```

### Nginx no funciona

```bash
# Verificar configuración
sudo nginx -t

# Ver logs de Nginx
sudo tail -f /var/log/nginx/error.log

# Reiniciar Nginx
sudo systemctl restart nginx
```

### Backend no responde

```bash
# Ver logs del backend
docker-compose logs backend

# Verificar que el puerto está expuesto
docker-compose ps

# Verificar variables de entorno
docker-compose exec backend env | grep ENV_
```

## 📞 Soporte

Si algo no funciona:
1. Revisa los logs: `docker-compose logs`
2. Verifica healthcheck: `./scripts/healthcheck.sh`
3. Verifica variables de entorno
4. Verifica que los puertos no estén ocupados

