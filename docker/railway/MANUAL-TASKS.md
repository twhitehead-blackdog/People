# 📋 Tareas Manuales para Railway

Esta lista contiene todas las tareas que **TÚ** debes hacer manualmente en Railway, ya que requieren configuración en el dashboard o credenciales que solo tú tienes.

---

## ✅ Lo que YA está hecho automáticamente

- ✅ Interceptor API URL creado (`src/app/interceptors/api-url.interceptor.ts`)
- ✅ Interceptor agregado a `app.config.ts`
- ✅ Dockerfile.frontend.railway actualizado con variables de entorno
- ✅ Dockerfile.backend.railway verificado
- ✅ Documentación completa creada

---

## 🔧 Tareas Manuales en Railway

### 1. Crear Proyecto "People Development"

1. Ir a [railway.app](https://railway.app)
2. Click en "New Project"
3. Seleccionar "Deploy from GitHub repo"
4. Seleccionar repositorio `People`
5. **Nombre del proyecto:** `People Development`
6. Seleccionar branch `nazMarcacion0`

---

### 2. Configurar Servicio Backend Dev

1. En el proyecto "People Development", click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar repositorio `People`, branch `nazMarcacion0`
4. Renombrar servicio a: `Backend Dev`
5. Ir a "Settings" → "Source"
   - Dockerfile Path: `docker/Dockerfile.backend.railway`
6. Ir a "Variables" y agregar todas las variables de `docker/railway/env.dev.example.txt`:
   - `PORT=3000`
   - `NODE_ENV=development`
   - `ENV_SUPABASE_URL` (tu URL de Supabase)
   - `ENV_SUPABASE_ANON_KEY` (tu clave anon)
   - `ENV_SUPABASE_SERVICE_ROLE_KEY` (tu clave service role)
   - `ENV_SMTP_HOST=smtp.gmail.com`
   - `ENV_SMTP_PORT=587`
   - `ENV_SMTP_USER` (tu email)
   - `ENV_SMTP_PASSWORD` (tu app password)
   - `ENV_SMTP_NOREPLY_EMAIL=noreply-dev@blackdogpanama.com`
   - `ENV_SMTP_NOREPLY_NAME=Black Dog - Development`
   - `ENV_APP_URL` (actualizar después de crear frontend)
   - `AUTH0_DOMAIN` (tu dominio Auth0)
   - `AUTH0_CLIENT_ID` (tu client ID)
   - `AUTH0_CLIENT_SECRET` (tu client secret)
   - `LOG_LEVEL=debug`
7. Ir a "Settings" → "Domains" → "Generate Domain"
8. **Anotar el dominio:** `https://people-dev-backend.railway.app` (o el que te asigne)

---

### 3. Configurar Servicio Frontend Dev

1. En el proyecto "People Development", click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar repositorio `People`, branch `nazMarcacion0`
4. Renombrar servicio a: `Frontend Dev`
5. Ir a "Settings" → "Source"
   - Dockerfile Path: `docker/Dockerfile.frontend.railway`
6. Ir a "Variables" y agregar:
   - `ENV_SUPABASE_URL` (tu URL de Supabase)
   - `ENV_SUPABASE_ANON_KEY` (tu clave anon)
   - `ENV_API_URL` (usar el dominio del backend que anotaste en paso 2.8)
   - `ENV_APP_URL` (actualizar después de generar dominio)
   - `AUTH0_DOMAIN` (tu dominio Auth0)
   - `AUTH0_CLIENT_ID` (tu client ID)
   - `ENV_AUTH0_AUDIENCE` (si lo usas)
7. Ir a "Settings" → "Domains" → "Generate Domain"
8. **Anotar el dominio:** `https://people-dev-frontend.railway.app` (o el que te asigne)
9. Volver al servicio Backend Dev → Variables → Actualizar `ENV_APP_URL` con el dominio del frontend

---

### 4. Verificar Development

1. Esperar a que ambos servicios terminen de desplegar
2. Abrir el dominio del frontend en el navegador
3. Verificar que carga sin errores
4. Probar login
5. Verificar que las llamadas al backend funcionan (abrir DevTools → Network)

---

### 5. Crear Proyecto "People Production"

1. En Railway dashboard, click en "New Project"
2. Seleccionar "Deploy from GitHub repo"
3. Seleccionar repositorio `People`
4. **Nombre del proyecto:** `People Production`
5. Seleccionar branch `main` (o tu branch de producción)

---

### 6. Configurar Servicio Backend Prod

1. En el proyecto "People Production", click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar repositorio `People`, branch `main`
4. Renombrar servicio a: `Backend Prod`
5. Ir a "Settings" → "Source"
   - Dockerfile Path: `docker/Dockerfile.backend.railway`
6. Ir a "Variables" y agregar todas las variables de `docker/railway/env.prod.example.txt`:
   - `PORT=3000`
   - `NODE_ENV=production`
   - `ENV_SUPABASE_URL` (tu URL de Supabase producción)
   - `ENV_SUPABASE_ANON_KEY` (tu clave anon producción)
   - `ENV_SUPABASE_SERVICE_ROLE_KEY` (tu clave service role producción)
   - `ENV_SMTP_HOST=smtp.gmail.com`
   - `ENV_SMTP_PORT=587`
   - `ENV_SMTP_USER` (tu email producción)
   - `ENV_SMTP_PASSWORD` (tu app password producción)
   - `ENV_SMTP_NOREPLY_EMAIL=noreply@blackdogpanama.com`
   - `ENV_SMTP_NOREPLY_NAME=Black Dog - Feria de Empleo`
   - `ENV_APP_URL` (usar dominio de producción, ej: `https://people.blackdogpanama.com`)
   - `AUTH0_DOMAIN` (tu dominio Auth0 producción)
   - `AUTH0_CLIENT_ID` (tu client ID producción)
   - `AUTH0_CLIENT_SECRET` (tu client secret producción)
   - `LOG_LEVEL=info`
7. Ir a "Settings" → "Domains" → "Generate Domain"
8. **Anotar el dominio:** `https://people-prod-backend.railway.app` (o el que te asigne)

---

### 7. Configurar Servicio Frontend Prod

1. En el proyecto "People Production", click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar repositorio `People`, branch `main`
4. Renombrar servicio a: `Frontend Prod`
5. Ir a "Settings" → "Source"
   - Dockerfile Path: `docker/Dockerfile.frontend.railway`
6. Ir a "Variables" y agregar:
   - `ENV_SUPABASE_URL` (tu URL de Supabase producción)
   - `ENV_SUPABASE_ANON_KEY` (tu clave anon producción)
   - `ENV_API_URL` (usar el dominio del backend que anotaste en paso 6.8)
   - `ENV_APP_URL` (usar dominio de producción, ej: `https://people.blackdogpanama.com`)
   - `AUTH0_DOMAIN` (tu dominio Auth0 producción)
   - `AUTH0_CLIENT_ID` (tu client ID producción)
   - `ENV_AUTH0_AUDIENCE` (si lo usas)
7. **Opción A:** Usar dominio Railway
   - Ir a "Settings" → "Domains" → "Generate Domain"
   - Anotar el dominio
8. **Opción B:** Usar dominio personalizado (recomendado para producción)
   - Ir a "Settings" → "Domains" → "Custom Domain"
   - Agregar: `people.blackdogpanama.com`
   - Seguir instrucciones para configurar DNS (ver paso 8)
9. Volver al servicio Backend Prod → Variables → Actualizar `ENV_APP_URL` con el dominio del frontend

---

### 8. Configurar Dominio Personalizado (Opcional pero Recomendado para Producción)

1. En tu proveedor de DNS (Cloudflare, GoDaddy, etc.), agregar registros CNAME:
   ```
   people.blackdogpanama.com  →  people-prod-frontend.railway.app
   api.people.blackdogpanama.com  →  people-prod-backend.railway.app
   ```
2. Esperar 5-10 minutos para propagación DNS
3. Railway activará SSL automáticamente
4. Verificar que el dominio funcione correctamente

---

### 9. Configurar Auth0

1. Ir a [Auth0 Dashboard](https://manage.auth0.com)
2. Seleccionar tu aplicación
3. Ir a "Settings"
4. Configurar "Allowed Callback URLs":
   - Development: `https://people-dev-frontend.railway.app`
   - Production: `https://people.blackdogpanama.com` (o tu dominio)
5. Configurar "Allowed Logout URLs":
   - Development: `https://people-dev-frontend.railway.app`
   - Production: `https://people.blackdogpanama.com`
6. Configurar "Allowed Web Origins":
   - Development: `https://people-dev-frontend.railway.app`
   - Production: `https://people.blackdogpanama.com`
7. Guardar cambios

---

### 10. Verificar Producción

1. Esperar a que ambos servicios terminen de desplegar
2. Abrir el dominio de producción en el navegador
3. Verificar que carga sin errores
4. Probar login
5. Verificar que las llamadas al backend funcionan
6. Probar funcionalidades principales

---

## 🔍 Verificaciones Importantes

### Después de cada deploy, verificar:

- [ ] Backend responde en `/health`
- [ ] Frontend carga sin errores en consola
- [ ] Login con Auth0 funciona
- [ ] Datos de Supabase se cargan
- [ ] Llamadas al backend funcionan (verificar Network tab en DevTools)
- [ ] No hay errores CORS
- [ ] SSL funciona correctamente (https://)

---

## 🚨 Si algo no funciona

1. Revisar logs en Railway:

   - Ir a Proyecto → Servicio → "Deployments"
   - Click en el deployment más reciente
   - Revisar logs completos

2. Verificar variables de entorno:

   - Asegurarse de que todas las variables estén configuradas
   - Verificar que no haya espacios extra
   - Verificar que las URLs tengan `https://`

3. Consultar documentación:
   - `docker/railway/TROUBLESHOOTING.md` - Guía de resolución de problemas
   - `docker/railway/CHECKLIST.md` - Checklist completo
   - `docker/RAILWAY-SETUP.md` - Guía completa

---

## 📝 Notas

- **Credenciales:** Nunca compartas tus credenciales públicamente
- **Variables de entorno:** Railway las maneja en el dashboard, no necesitas archivos `.env`
- **Deploy automático:** Railway despliega automáticamente cuando haces push a GitHub
- **Costos:** Puedes pausar el proyecto "People Development" cuando no lo uses para ahorrar

---

## ✅ Checklist Final

- [ ] Proyecto "People Development" creado
- [ ] Backend Dev configurado y funcionando
- [ ] Frontend Dev configurado y funcionando
- [ ] Proyecto "People Production" creado
- [ ] Backend Prod configurado y funcionando
- [ ] Frontend Prod configurado y funcionando
- [ ] Dominio personalizado configurado (opcional)
- [ ] Auth0 configurado para ambos ambientes
- [ ] Todo funciona correctamente en ambos ambientes

---

¡Listo! Tu aplicación debería estar funcionando en Railway. 🚀
