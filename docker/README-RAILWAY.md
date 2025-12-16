# 🚂 Railway - Resumen Rápido

## ¿Qué archivos usa Railway?

Railway usa archivos **diferentes** a Hostinger:

### Para Railway:
- `docker/Dockerfile.backend.railway` → Backend
- `docker/Dockerfile.frontend.railway` → Frontend
- `docker/nginx-frontend-railway.conf` → Config Nginx (sin proxy)

### Para Hostinger (se mantienen intactos):
- `docker/Dockerfile.backend` → Backend
- `docker/Dockerfile.frontend` → Frontend
- `docker/stage/docker-compose.yml` → Staging
- `docker/prod/docker-compose.yml` → Producción
- `docker/nginx-stage.conf` → Nginx staging
- `docker/nginx-prod.conf` → Nginx producción

## ✅ Ambos pueden coexistir

- **Railway:** Usa los archivos `.railway`
- **Hostinger:** Usa los archivos normales + docker-compose

No hay conflicto. Puedes tener ambos configurados.

## 🚀 Quick Start Railway

1. Crear cuenta en [railway.app](https://railway.app)
2. Conectar repositorio GitHub
3. Crear servicio backend:
   - Dockerfile: `docker/Dockerfile.backend.railway`
   - Variables de entorno: ver `docker/RAILWAY-SETUP.md`
4. Crear servicio frontend:
   - Dockerfile: `docker/Dockerfile.frontend.railway`
   - Variables de entorno: ver `docker/RAILWAY-SETUP.md`
5. Deploy automático desde GitHub

Ver guía completa en: `docker/RAILWAY-SETUP.md`

