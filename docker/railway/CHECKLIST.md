# ✅ Checklist de Configuración Railway

Usa este checklist para verificar que todo esté configurado correctamente.

## 📋 Proyecto: People Development

### Configuración Inicial

- [ ] Proyecto "People Development" creado en Railway
- [ ] Repositorio GitHub conectado
- [ ] Branch configurado: `nazMarcacion0`

### Backend Dev

- [ ] Servicio "Backend Dev" creado
- [ ] Dockerfile configurado: `docker/Dockerfile.backend.railway`
- [ ] Dominio generado: `https://people-dev-backend.railway.app`
- [ ] Variables de entorno configuradas (ver `env.dev.example.txt`):
  - [ ] `PORT=3000`
  - [ ] `NODE_ENV=development`
  - [ ] `ENV_SUPABASE_URL`
  - [ ] `ENV_SUPABASE_ANON_KEY`
  - [ ] `ENV_SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `ENV_SMTP_HOST`
  - [ ] `ENV_SMTP_PORT`
  - [ ] `ENV_SMTP_USER`
  - [ ] `ENV_SMTP_PASSWORD`
  - [ ] `ENV_SMTP_NOREPLY_EMAIL`
  - [ ] `ENV_SMTP_NOREPLY_NAME`
  - [ ] `ENV_APP_URL` (actualizar después de crear frontend)
  - [ ] `AUTH0_DOMAIN`
  - [ ] `AUTH0_CLIENT_ID`
  - [ ] `AUTH0_CLIENT_SECRET`
  - [ ] `LOG_LEVEL=debug`
- [ ] Deploy exitoso
- [ ] Healthcheck funciona: `https://people-dev-backend.railway.app/health`

### Frontend Dev

- [ ] Servicio "Frontend Dev" creado
- [ ] Dockerfile configurado: `docker/Dockerfile.frontend.railway`
- [ ] Dominio generado: `https://people-dev-frontend.railway.app`
- [ ] Variables de entorno configuradas:
  - [ ] `ENV_SUPABASE_URL`
  - [ ] `ENV_SUPABASE_ANON_KEY`
  - [ ] `ENV_API_URL` (usar dominio del backend: `https://people-dev-backend.railway.app`)
  - [ ] `ENV_APP_URL` (usar dominio del frontend: `https://people-dev-frontend.railway.app`)
  - [ ] `AUTH0_DOMAIN`
  - [ ] `AUTH0_CLIENT_ID`
- [ ] Deploy exitoso
- [ ] Frontend carga correctamente
- [ ] Login funciona
- [ ] Llamadas al backend funcionan

### Verificación Final Development

- [ ] Backend responde en `/health`
- [ ] Frontend carga sin errores en consola
- [ ] Login con Auth0 funciona
- [ ] Datos de Supabase se cargan correctamente
- [ ] Envío de emails funciona (si aplica)

---

## 📋 Proyecto: People Production

### Configuración Inicial

- [ ] Proyecto "People Production" creado en Railway
- [ ] Repositorio GitHub conectado
- [ ] Branch configurado: `main`

### Backend Prod

- [ ] Servicio "Backend Prod" creado
- [ ] Dockerfile configurado: `docker/Dockerfile.backend.railway`
- [ ] Dominio generado: `https://people-prod-backend.railway.app`
- [ ] Variables de entorno configuradas (ver `env.prod.example.txt`):
  - [ ] `PORT=3000`
  - [ ] `NODE_ENV=production`
  - [ ] `ENV_SUPABASE_URL`
  - [ ] `ENV_SUPABASE_ANON_KEY`
  - [ ] `ENV_SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `ENV_SMTP_HOST`
  - [ ] `ENV_SMTP_PORT`
  - [ ] `ENV_SMTP_USER`
  - [ ] `ENV_SMTP_PASSWORD`
  - [ ] `ENV_SMTP_NOREPLY_EMAIL`
  - [ ] `ENV_SMTP_NOREPLY_NAME`
  - [ ] `ENV_APP_URL` (usar dominio de producción)
  - [ ] `AUTH0_DOMAIN`
  - [ ] `AUTH0_CLIENT_ID`
  - [ ] `AUTH0_CLIENT_SECRET`
  - [ ] `LOG_LEVEL=info`
- [ ] Deploy exitoso
- [ ] Healthcheck funciona: `https://people-prod-backend.railway.app/health`

### Frontend Prod

- [ ] Servicio "Frontend Prod" creado
- [ ] Dockerfile configurado: `docker/Dockerfile.frontend.railway`
- [ ] Dominio configurado (Railway o personalizado)
- [ ] Variables de entorno configuradas:
  - [ ] `ENV_SUPABASE_URL`
  - [ ] `ENV_SUPABASE_ANON_KEY`
  - [ ] `ENV_API_URL` (usar dominio del backend)
  - [ ] `ENV_APP_URL` (usar dominio de producción)
  - [ ] `AUTH0_DOMAIN`
  - [ ] `AUTH0_CLIENT_ID`
- [ ] Deploy exitoso
- [ ] Frontend carga correctamente
- [ ] Login funciona
- [ ] Llamadas al backend funcionan

### Dominio Personalizado (Opcional)

- [ ] Dominio personalizado configurado en Railway
- [ ] DNS configurado (registro CNAME)
- [ ] SSL activado automáticamente
- [ ] Dominio funciona correctamente

### Verificación Final Production

- [ ] Backend responde en `/health`
- [ ] Frontend carga sin errores en consola
- [ ] Login con Auth0 funciona
- [ ] Datos de Supabase se cargan correctamente
- [ ] Envío de emails funciona
- [ ] Todas las funcionalidades principales funcionan

---

## 🔄 Flujo de Trabajo

### Deploy a Development

- [ ] Cambios en branch `nazMarcacion0`
- [ ] Push a GitHub: `git push origin nazMarcacion0`
- [ ] Railway despliega automáticamente
- [ ] Verificar logs en Railway
- [ ] Probar en: `https://people-dev-frontend.railway.app`

### Deploy a Production

- [ ] Cambios probados en Development
- [ ] Merge a branch `main`
- [ ] Push a GitHub: `git push origin main`
- [ ] Railway despliega automáticamente
- [ ] Verificar logs en Railway
- [ ] Probar en dominio de producción

---

## 🚨 Problemas Comunes

### Backend no responde

- [ ] Verificar que el servicio esté "Active" (no pausado)
- [ ] Verificar logs en Railway
- [ ] Verificar variables de entorno
- [ ] Verificar que el puerto esté correcto

### Frontend no carga

- [ ] Verificar que el servicio esté "Active"
- [ ] Verificar logs en Railway
- [ ] Verificar variables de entorno
- [ ] Verificar que `ENV_API_URL` apunte al backend correcto

### CORS errors

- [ ] Verificar que `ENV_API_URL` en frontend apunte al backend correcto
- [ ] Verificar configuración de CORS en `server.ts`
- [ ] Verificar que los dominios estén correctos

### Auth0 no funciona

- [ ] Verificar `AUTH0_DOMAIN` y `AUTH0_CLIENT_ID`
- [ ] Verificar que `ENV_APP_URL` esté configurado correctamente
- [ ] Verificar configuración en Auth0 dashboard (Allowed Callback URLs)

### Supabase no funciona

- [ ] Verificar `ENV_SUPABASE_URL` y `ENV_SUPABASE_ANON_KEY`
- [ ] Verificar que las credenciales sean correctas
- [ ] Verificar que Supabase esté activo

---

## 📝 Notas

- Guarda este checklist y márcalo mientras configuras
- Si algo falla, revisa la sección de Troubleshooting en `RAILWAY-SETUP.md`
- Mantén las credenciales seguras y no las compartas públicamente
