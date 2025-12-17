# 🚀 Empezar con Railway - Guía Paso a Paso

## ✅ Estado Actual

Todo el código está listo para Railway:

- ✅ Interceptor API URL configurado
- ✅ Dockerfiles listos
- ✅ Variables de entorno preparadas
- ✅ Documentación completa

## 🎯 Próximos Pasos

### Paso 1: Crear Cuenta en Railway (5 minutos)

1. Ir a [railway.app](https://railway.app)
2. Click en "Start a New Project"
3. Conectar con GitHub
4. Autorizar Railway para acceder a tus repositorios

---

### Paso 2: Crear Proyecto "People Development" (10 minutos)

1. Click en "New Project"
2. Seleccionar "Deploy from GitHub repo"
3. Seleccionar repositorio `People`
4. **Nombre:** `People Development`
5. Seleccionar branch `nazMarcacion0`

---

### Paso 3: Configurar Backend Dev (15 minutos)

1. En el proyecto, click en "+ New" → "GitHub Repo"
2. Seleccionar repositorio `People`, branch `nazMarcacion0`
3. Renombrar a: `Backend Dev`
4. Ir a "Settings" → "Source"
   - Dockerfile Path: `docker/Dockerfile.backend.railway`
5. Ir a "Variables" y agregar (ver `docker/railway/env.dev.example.txt`):
   ```
   PORT=3000
   NODE_ENV=development
   ENV_SUPABASE_URL=tu_url_aqui
   ENV_SUPABASE_ANON_KEY=tu_key_aqui
   ENV_SUPABASE_SERVICE_ROLE_KEY=tu_key_aqui
   ENV_SMTP_HOST=smtp.gmail.com
   ENV_SMTP_PORT=587
   ENV_SMTP_USER=tu_email
   ENV_SMTP_PASSWORD=tu_app_password
   ENV_SMTP_NOREPLY_EMAIL=noreply-dev@blackdogpanama.com
   ENV_SMTP_NOREPLY_NAME=Black Dog - Development
   ENV_APP_URL=https://people-dev-frontend.railway.app (actualizar después)
   AUTH0_DOMAIN=tu_dominio.auth0.com
   AUTH0_CLIENT_ID=tu_client_id
   AUTH0_CLIENT_SECRET=tu_client_secret
   LOG_LEVEL=debug
   ```
6. Ir a "Settings" → "Domains" → "Generate Domain"
7. **Anotar el dominio del backend:** `https://people-dev-backend.railway.app`
   backend-dev-production-5b38.up.railway.app

---

### Paso 4: Configurar Frontend Dev (10 minutos)

1. En el mismo proyecto, click en "+ New" → "GitHub Repo"
2. Seleccionar repositorio `People`, branch `nazMarcacion0`
3. Renombrar a: `Frontend Dev`
4. Ir a "Settings" → "Source"
   - Dockerfile Path: `docker/Dockerfile.frontend.railway`
5. Ir a "Variables" y agregar:
   ```
   ENV_SUPABASE_URL=tu_url_aqui
   ENV_SUPABASE_ANON_KEY=tu_key_aqui
   ENV_API_URL=https://people-dev-backend.railway.app (usar el dominio del paso 3.7)
   ENV_APP_URL=https://people-dev-frontend.railway.app (actualizar después)
   AUTH0_DOMAIN=tu_dominio.auth0.com
   AUTH0_CLIENT_ID=tu_client_id
   ENV_AUTH0_AUDIENCE=tu_audience (si lo usas)
   ```
6. Ir a "Settings" → "Domains" → "Generate Domain"
7. **Anotar el dominio del frontend:** `https://people-dev-frontend.railway.app`
8. Volver a Backend Dev → Variables → Actualizar `ENV_APP_URL` con el dominio del frontend

---

### Paso 5: Verificar Development (5 minutos)

1. Esperar a que ambos servicios terminen de desplegar (verás "Active" en verde)
2. Abrir el dominio del frontend en el navegador
3. Verificar que carga sin errores
4. Abrir DevTools (F12) → Console
5. Verificar que no haya errores
6. Probar login

---

### Paso 6: Configurar Auth0 (5 minutos)

1. Ir a [Auth0 Dashboard](https://manage.auth0.com)
2. Seleccionar tu aplicación
3. Ir a "Settings"
4. En "Allowed Callback URLs", agregar:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
5. En "Allowed Logout URLs", agregar:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
6. En "Allowed Web Origins", agregar:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
7. Guardar cambios

---

### Paso 7: Probar Todo (10 minutos)

**📖 Guía completa:** Ver `docker/railway/PASO-7-VERIFICACION.md`

Resumen rápido:

1. Abrir el dominio del frontend en el navegador
2. Verificar que carga sin errores (F12 → Console)
3. Probar login con Auth0
4. Verificar que las llamadas a `/api/...` vayan al backend correcto (F12 → Network)
5. Verificar que las funcionalidades principales funcionen

---

## 🎉 ¡Listo para Development!

Una vez que Development funcione, puedes crear Production siguiendo los mismos pasos pero:

- Proyecto: "People Production"
- Branch: `main`
- Variables de producción (ver `docker/railway/env.prod.example.txt`)

---

## 📚 Documentación Completa

- **Guía detallada:** `docker/railway/MANUAL-TASKS.md`
- **Checklist:** `docker/railway/CHECKLIST.md`
- **Troubleshooting:** `docker/railway/TROUBLESHOOTING.md`
- **Variables ejemplo:** `docker/railway/env.dev.example.txt`

---

## 🚨 Si algo no funciona

1. Revisar logs en Railway:
   - Proyecto → Servicio → "Deployments" → Click en el más reciente
2. Verificar variables de entorno:
   - Asegurarse de que todas estén configuradas
   - Verificar que no haya espacios extra
3. Consultar: `docker/railway/TROUBLESHOOTING.md`

---

## ⚡ Tips

- Railway despliega automáticamente cuando haces push a GitHub
- Puedes pausar el proyecto Development cuando no lo uses para ahorrar
- Los logs se ven en tiempo real en Railway
- Puedes hacer rollback fácilmente desde "Deployments"

¡Empieza con el Paso 1! 🚀
