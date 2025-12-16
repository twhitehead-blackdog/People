# ⚡ Railway Quick Setup - Resumen Rápido

## ✅ Lo que YA está configurado en el código

- ✅ Interceptor API URL (`src/app/interceptors/api-url.interceptor.ts`)
- ✅ Dockerfiles listos para Railway
- ✅ Variables de entorno configuradas
- ✅ Documentación completa

## 🚀 Pasos Rápidos

### 1. Crear Proyectos en Railway

**Development:**
- Proyecto: "People Development"
- Branch: `nazMarcacion0`
- Backend: `docker/Dockerfile.backend.railway`
- Frontend: `docker/Dockerfile.frontend.railway`

**Production:**
- Proyecto: "People Production"
- Branch: `main`
- Backend: `docker/Dockerfile.backend.railway`
- Frontend: `docker/Dockerfile.frontend.railway`

### 2. Configurar Variables de Entorno

Usar los archivos de ejemplo:
- Development: `docker/railway/env.dev.example.txt`
- Production: `docker/railway/env.prod.example.txt`

### 3. Configurar Auth0

Agregar dominios a "Allowed Callback URLs":
- Development: `https://people-dev-frontend.railway.app`
- Production: `https://people.blackdogpanama.com`

## 📚 Documentación Completa

- **Guía completa:** `docker/RAILWAY-SETUP.md`
- **Tareas manuales:** `docker/railway/MANUAL-TASKS.md`
- **Checklist:** `docker/railway/CHECKLIST.md`
- **Troubleshooting:** `docker/railway/TROUBLESHOOTING.md`
- **Configuración API:** `docker/railway/API-CONFIGURATION.md`

## ⚠️ Importante

1. **ENV_API_URL** debe apuntar al dominio del backend
2. **ENV_APP_URL** debe ser el dominio del frontend
3. Configurar Auth0 con los dominios correctos
4. Verificar que las variables de entorno estén todas configuradas

## 🎯 Flujo de Trabajo

```bash
# Desarrollo
git push origin nazMarcacion0
# → Railway Development despliega automáticamente

# Producción
git checkout main
git merge nazMarcacion0
git push origin main
# → Railway Production despliega automáticamente
```

---

**¿Problemas?** Ver `docker/railway/TROUBLESHOOTING.md`

