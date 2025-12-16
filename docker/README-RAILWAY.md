# 🚂 Railway - Resumen Rápido

## 🏗️ Estructura: Proyectos Separados

Railway usa **proyectos separados** para Development y Production:

```
Railway Dashboard
├── People Development (Proyecto)
│   ├── Backend Dev (Branch: nazMarcacion0)
│   └── Frontend Dev (Branch: nazMarcacion0)
└── People Production (Proyecto)
    ├── Backend Prod (Branch: main)
    └── Frontend Prod (Branch: main)
```

## 📁 Archivos de Railway

### Para Railway:
- `docker/Dockerfile.backend.railway` → Backend
- `docker/Dockerfile.frontend.railway` → Frontend
- `docker/nginx-frontend-railway.conf` → Config Nginx (sin proxy)
- `docker/railway/env.dev.example.txt` → Variables Development
- `docker/railway/env.prod.example.txt` → Variables Production

### Para Hostinger (se mantienen intactos):
- `docker/Dockerfile.backend` → Backend
- `docker/Dockerfile.frontend` → Frontend
- `docker/stage/docker-compose.yml` → Staging
- `docker/prod/docker-compose.yml` → Producción
- `docker/nginx-stage.conf` → Nginx staging
- `docker/nginx-prod.conf` → Nginx producción

## ✅ Ambos pueden coexistir

- **Railway:** Usa los archivos `.railway` y proyectos separados
- **Hostinger:** Usa los archivos normales + docker-compose

No hay conflicto. Puedes tener ambos configurados.

## 🚀 Quick Start Railway

### Development
1. Crear proyecto "People Development" en Railway
2. Conectar repositorio GitHub, branch `nazMarcacion0`
3. Crear servicio backend:
   - Dockerfile: `docker/Dockerfile.backend.railway`
   - Variables: ver `docker/railway/env.dev.example.txt`
4. Crear servicio frontend:
   - Dockerfile: `docker/Dockerfile.frontend.railway`
   - Variables: ver `docker/railway/env.dev.example.txt`

### Production
1. Crear proyecto "People Production" en Railway
2. Conectar repositorio GitHub, branch `main`
3. Crear servicio backend:
   - Dockerfile: `docker/Dockerfile.backend.railway`
   - Variables: ver `docker/railway/env.prod.example.txt`
4. Crear servicio frontend:
   - Dockerfile: `docker/Dockerfile.frontend.railway`
   - Variables: ver `docker/railway/env.prod.example.txt`

## 🔄 Flujo de Trabajo

```bash
# Desarrollo → Development (auto-deploy)
git push origin nazMarcacion0
# → Railway "People Development" despliega automáticamente

# Production → Production (auto-deploy)
git checkout main
git merge nazMarcacion0
git push origin main
# → Railway "People Production" despliega automáticamente
```

## 📚 Documentación Completa

Ver guía completa en: `docker/RAILWAY-SETUP.md`

