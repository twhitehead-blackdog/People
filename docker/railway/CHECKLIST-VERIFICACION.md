# ✅ Checklist de Verificación - Railway Deployment

## 🎯 Estructura Correcta de Servicios

- [x] **Frontend Dev** - Usando Dockerfile
- [x] **Backend Dev** - Usando Dockerfile
- [x] **People** - Eliminado (era duplicado)

---

## 🔧 Verificación Frontend Dev

### Settings → Source

- [ ] **Builder:** `Dockerfile` (NO "Railpack")
- [ ] **Dockerfile Path:** `docker/Dockerfile.frontend.railway`
- [ ] **Branch:** `nazMarcacion0`

### Settings → Deploy

- [ ] **Start Command:** VACÍO (no debe tener `npm start` ni nada)
- [ ] **Healthcheck Path:** `/health` (opcional)

### Variables de Entorno

- [ ] `ENV_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
- [ ] `ENV_SUPABASE_ANON_KEY` = `tu-anon-key`
- [ ] `ENV_API_URL` = `https://backend-dev-production-5b38.up.railway.app` (con `https://`)
- [ ] `ENV_APP_URL` = `https://frontend-dev-production-c157.up.railway.app` (con `https://`)
- [ ] `ENV_AUTH0_DOMAIN` = `tu-dominio.auth0.com`
- [ ] `ENV_AUTH0_CLIENT_ID` = `tu-client-id`
- [ ] `ENV_AUTH0_AUDIENCE` = `tu-audience` (si lo usas)

### Domains

- [ ] Dominio generado: `frontend-dev-production-c157.up.railway.app`
- [ ] Estado: "Active" (verde)

---

## 🔧 Verificación Backend Dev

### Settings → Source

- [ ] **Builder:** `Dockerfile` (NO "Railpack")
- [ ] **Dockerfile Path:** `docker/Dockerfile.backend.railway`
- [ ] **Branch:** `nazMarcacion0`

### Settings → Deploy

- [ ] **Start Command:** VACÍO (no debe tener nada)

### Variables de Entorno

- [ ] `PORT` = `3000`
- [ ] `NODE_ENV` = `development` (o `production`)
- [ ] `ENV_SUPABASE_URL` = `https://tu-proyecto.supabase.co`
- [ ] `ENV_SUPABASE_ANON_KEY` = `tu-anon-key`
- [ ] `ENV_SUPABASE_SERVICE_ROLE_KEY` = `tu-service-role-key` (opcional)
- [ ] `ENV_SMTP_HOST` = `smtp.gmail.com`
- [ ] `ENV_SMTP_PORT` = `587`
- [ ] `ENV_SMTP_USER` = `tu-email@gmail.com`
- [ ] `ENV_SMTP_PASSWORD` = `tu-app-password`
- [ ] `ENV_APP_URL` = `https://frontend-dev-production-c157.up.railway.app` (con `https://`)
- [ ] `AUTH0_DOMAIN` = `tu-dominio.auth0.com`
- [ ] `AUTH0_CLIENT_ID` = `tu-client-id`
- [ ] `AUTH0_CLIENT_SECRET` = `tu-client-secret`

### Domains

- [ ] Dominio generado: `backend-dev-production-5b38.up.railway.app`
- [ ] Estado: "Active" (verde)

---

## 🚨 Verificaciones Críticas

### ❌ NO debe aparecer:

- [ ] "Railpack" como builder
- [ ] `npm start` en Start Command
- [ ] `nx serve` en los logs
- [ ] "Watch mode enabled" en los logs

### ✅ DEBE aparecer en logs del Frontend:

- [ ] `=== [timestamp] Iniciando Nginx ===`
- [ ] `✅ index.html existe`
- [ ] `nginx version: nginx/1.29.4`
- [ ] `start worker processes`

### ✅ DEBE aparecer en logs del Backend:

- [ ] `Server running on port 3000`
- [ ] `Backend server is running`
- [ ] Sin errores de conexión a Supabase

---

## 🌐 Verificación de URLs

### Frontend

- [ ] `https://frontend-dev-production-c157.up.railway.app` carga sin error 502
- [ ] `https://frontend-dev-production-c157.up.railway.app/health` responde `healthy`
- [ ] No aparece "Application failed to respond"

### Backend

- [ ] `https://backend-dev-production-5b38.up.railway.app` responde JSON con status
- [ ] `https://backend-dev-production-5b38.up.railway.app/health` responde `ok`
- [ ] No aparece "Cannot GET /"

---

## 🔐 Verificación Auth0

### Auth0 Dashboard → Applications → Settings

- [ ] **Allowed Callback URLs** incluye:
  ```
  https://frontend-dev-production-c157.up.railway.app
  ```
- [ ] **Allowed Logout URLs** incluye:
  ```
  https://frontend-dev-production-c157.up.railway.app
  ```
- [ ] **Allowed Web Origins** incluye:
  ```
  https://frontend-dev-production-c157.up.railway.app
  ```

---

## 📊 Verificación Funcional

### Frontend

- [ ] La página carga sin errores en la consola (F12)
- [ ] Login con Auth0 funciona
- [ ] Las llamadas a `/api/...` van al backend correcto (F12 → Network)
- [ ] No hay errores de CORS
- [ ] Las imágenes y assets cargan correctamente

### Backend

- [ ] Healthcheck responde correctamente
- [ ] Las rutas `/api/...` funcionan
- [ ] Conexión a Supabase funciona
- [ ] Envío de emails funciona (si está configurado)

---

## 🐛 Si algo no funciona

1. **Error 502 en Frontend:**

   - Verificar que Start Command esté VACÍO
   - Verificar que use Dockerfile (no Railpack)
   - Ver logs completos del deployment

2. **Error "Cannot GET /" en Backend:**

   - Verificar que el backend tenga la ruta `/` configurada
   - Ver logs del backend

3. **Error de CORS:**

   - Verificar que `ENV_APP_URL` tenga `https://`
   - Verificar configuración de CORS en el backend

4. **Error de Auth0:**
   - Verificar que las URLs en Auth0 coincidan exactamente
   - Verificar variables de entorno `ENV_AUTH0_*`

---

## ✅ Checklist Final

- [ ] Ambos servicios están "Active" (verde)
- [ ] Ambos usan Dockerfile (no Railpack)
- [ ] Start Command está vacío en ambos
- [ ] Todas las URLs tienen `https://`
- [ ] Auth0 está configurado correctamente
- [ ] Frontend carga sin errores
- [ ] Backend responde correctamente
- [ ] Login funciona
- [ ] Las funcionalidades principales funcionan

---

**Última actualización:** 2025-12-17
