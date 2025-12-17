# 🚨 Railway Troubleshooting Guide

Guía completa para resolver problemas comunes en Railway.

---

## 🔴 Backend no responde

### Síntomas
- El servicio muestra "Active" pero no responde
- Healthcheck falla: `https://tu-backend.railway.app/api/health`
- Frontend no puede conectarse al backend

### Soluciones

1. **Verificar que el servicio esté activo**
   - Ir a Railway → Proyecto → Servicio Backend
   - Verificar que el estado sea "Active" (no "Paused")
   - Si está pausado, click en "Unpause"

2. **Verificar logs**
   - Ir a Railway → Proyecto → Servicio Backend → "Deployments"
   - Click en el deployment más reciente
   - Revisar logs para errores
   - Buscar errores comunes:
     - `Error: Cannot find module`
     - `Error: EADDRINUSE` (puerto ocupado)
     - `Error: Missing environment variable`

3. **Verificar variables de entorno**
   - Ir a Railway → Proyecto → Servicio Backend → "Variables"
   - Verificar que todas las variables requeridas estén configuradas
   - Verificar que no haya espacios extra en los valores
   - Verificar que las URLs tengan `https://` (no `http://`)

4. **Verificar puerto**
   - Railway asigna el puerto automáticamente
   - El código debe usar `process.env.PORT || 3000`
   - Verificar que `server.ts` use la variable `PORT` correctamente

5. **Reiniciar el servicio**
   - Ir a Railway → Proyecto → Servicio Backend → "Deployments"
   - Click en "Redeploy" en el deployment más reciente

---

## 🔴 Frontend no carga

### Síntomas
- El servicio muestra "Active" pero la página no carga
- Error 502 Bad Gateway
- Página en blanco

### Soluciones

1. **Verificar que el servicio esté activo**
   - Ir a Railway → Proyecto → Servicio Frontend
   - Verificar que el estado sea "Active"

2. **Verificar logs del build**
   - Ir a Railway → Proyecto → Servicio Frontend → "Deployments"
   - Click en el deployment más reciente
   - Revisar logs del build
   - Buscar errores comunes:
     - `Error: Build failed`
     - `Error: Cannot find module`
     - `Error: ENV_SUPABASE_URL is not defined`

3. **Verificar variables de entorno**
   - Ir a Railway → Proyecto → Servicio Frontend → "Variables"
   - Verificar que `ENV_SUPABASE_URL` y `ENV_SUPABASE_ANON_KEY` estén configuradas
   - Verificar que `ENV_API_URL` apunte al backend correcto
   - Verificar que `ENV_APP_URL` esté configurado

4. **Verificar Dockerfile**
   - Verificar que el Dockerfile path sea correcto: `docker/Dockerfile.frontend.railway`
   - Verificar que el build se complete sin errores

5. **Verificar Nginx**
   - El frontend usa Nginx para servir archivos estáticos
   - Verificar que `nginx-frontend-railway.conf` esté correcto
   - Verificar que el puerto esté configurado correctamente

---

## 🔴 CORS Errors

### Síntomas
- Error en consola: `Access to fetch at '...' from origin '...' has been blocked by CORS policy`
- Frontend no puede hacer requests al backend
- Requests fallan con error CORS

### Soluciones

1. **Verificar ENV_API_URL**
   - Ir a Railway → Proyecto → Servicio Frontend → "Variables"
   - Verificar que `ENV_API_URL` apunte al dominio correcto del backend
   - Debe ser: `https://people-dev-backend.railway.app` (o el dominio de producción)

2. **Verificar configuración de CORS en server.ts**
   - El backend debe permitir requests del frontend
   - Verificar que `server.ts` tenga configuración de CORS:
   ```typescript
   app.use(cors({
     origin: process.env['ENV_APP_URL'] || '*',
     credentials: true
   }));
   ```

3. **Verificar dominios**
   - Asegúrate de que los dominios del frontend y backend sean correctos
   - No uses `localhost` en producción
   - Usa los dominios de Railway o dominios personalizados

4. **Verificar headers**
   - El backend debe enviar headers CORS correctos
   - Verificar que `Access-Control-Allow-Origin` esté configurado

---

## 🔴 Auth0 no funciona

### Síntomas
- Error al intentar login: `Invalid redirect_uri`
- Error: `Auth0 configuration error`
- Login no redirige correctamente

### Soluciones

1. **Verificar variables de entorno**
   - Ir a Railway → Proyecto → Servicio Frontend → "Variables"
   - Verificar que `AUTH0_DOMAIN` y `AUTH0_CLIENT_ID` estén configuradas
   - Verificar que `ENV_APP_URL` esté configurado correctamente

2. **Verificar configuración en Auth0 Dashboard**
   - Ir a [Auth0 Dashboard](https://manage.auth0.com)
   - Seleccionar tu aplicación
   - Ir a "Settings"
   - Verificar "Allowed Callback URLs":
     - Development: `https://people-dev-frontend.railway.app`
     - Production: `https://people.blackdogpanama.com` (o tu dominio)
   - Verificar "Allowed Logout URLs"
   - Verificar "Allowed Web Origins"

3. **Verificar redirect_uri en código**
   - El código debe usar `ENV_APP_URL` para el redirect_uri
   - Verificar que `app.config.ts` use: `redirect_uri: process.env['ENV_APP_URL']`

4. **Verificar que el dominio sea HTTPS**
   - Auth0 requiere HTTPS en producción
   - Railway proporciona SSL automáticamente
   - No uses `http://` en producción

---

## 🔴 Supabase no funciona

### Síntomas
- Error: `Failed to fetch` al intentar cargar datos
- Error: `Invalid API key`
- Datos no se cargan

### Soluciones

1. **Verificar variables de entorno**
   - Ir a Railway → Proyecto → Servicio → "Variables"
   - Verificar que `ENV_SUPABASE_URL` esté configurado
   - Verificar que `ENV_SUPABASE_ANON_KEY` esté configurado
   - Verificar que no haya espacios extra en los valores

2. **Verificar credenciales**
   - Ir a [Supabase Dashboard](https://app.supabase.com)
   - Seleccionar tu proyecto
   - Ir a "Settings" → "API"
   - Verificar que las credenciales coincidan

3. **Verificar que Supabase esté activo**
   - Verificar que el proyecto no esté pausado
   - Verificar que no haya límites de uso excedidos

4. **Verificar Row Level Security (RLS)**
   - Si los datos no se cargan, puede ser un problema de RLS
   - Verificar las políticas de RLS en Supabase
   - Verificar que el usuario tenga permisos correctos

---

## 🔴 Build Failed

### Síntomas
- El deployment falla con "Build failed"
- Error en los logs del build

### Soluciones

1. **Verificar logs del build**
   - Ir a Railway → Proyecto → Servicio → "Deployments"
   - Click en el deployment fallido
   - Revisar logs completos del build
   - Buscar el primer error

2. **Errores comunes y soluciones**

   **Error: `Cannot find module`**
   - Verificar que `package.json` tenga todas las dependencias
   - Verificar que el Dockerfile instale dependencias correctamente

   **Error: `ENV_SUPABASE_URL is not defined`**
   - El build de Angular necesita variables de entorno en tiempo de build
   - Verificar que las variables estén configuradas en Railway
   - Verificar que el Dockerfile use las variables correctamente

   **Error: `Dockerfile not found`**
   - Verificar que el Dockerfile path sea correcto
   - Verificar que el archivo exista en el repositorio
   - Verificar que el branch tenga el archivo

3. **Limpiar y reconstruir**
   - Ir a Railway → Proyecto → Servicio → "Settings"
   - Click en "Clear Build Cache"
   - Hacer "Redeploy"

---

## 🔴 Domain not working

### Síntomas
- Dominio personalizado no carga
- Error: `Domain not verified`
- SSL no funciona

### Soluciones

1. **Verificar DNS**
   - Verificar que el registro CNAME esté configurado correctamente
   - Debe apuntar al dominio de Railway (ej: `people-frontend.railway.app`)
   - Esperar 5-10 minutos para propagación DNS

2. **Verificar en Railway**
   - Ir a Railway → Proyecto → Servicio → "Settings" → "Domains"
   - Verificar que el dominio esté listado
   - Verificar que el estado sea "Active"

3. **Verificar SSL**
   - Railway activa SSL automáticamente
   - Puede tardar 5-10 minutos después de configurar el dominio
   - Verificar que el certificado esté activo

4. **Verificar formato del dominio**
   - No incluir `https://` al agregar el dominio
   - Solo el nombre del dominio: `people.blackdogpanama.com`

---

## 🔴 Frontend ejecuta `nx serve` en lugar de Nginx

### Síntomas
- Logs muestran: `> nx serve` o `> nx run people:serve:development`
- El servicio se reinicia constantemente
- Errores de memoria: `fatal error: all goroutines are asleep - deadlock!`
- El servicio muestra "Killed" en los logs

### Causa
Railway está ejecutando `npm start` (que ejecuta `nx serve` en desarrollo) en lugar del comando del Dockerfile que debería ejecutar Nginx.

### Soluciones

1. **Verificar configuración de Railway**
   - Ir a Railway → Proyecto → Servicio Frontend → "Settings"
   - Buscar "Start Command" o "Command"
   - **DEBE ESTAR VACÍO** o no existir
   - Si hay un comando configurado, eliminarlo o dejarlo vacío
   - Railway debe usar el `ENTRYPOINT` del Dockerfile

2. **Verificar Dockerfile**
   - El Dockerfile debe tener: `ENTRYPOINT ["nginx", "-g", "daemon off;"]`
   - Verificar que el path del Dockerfile sea correcto: `docker/Dockerfile.frontend.railway`

3. **Verificar que el build se complete**
   - El build debe completarse exitosamente
   - Verificar que no haya errores en la etapa de build
   - El build debe crear archivos en `/app/dist/people/browser`

4. **Redeploy después de cambios**
   - Después de cambiar la configuración, hacer "Redeploy"
   - Verificar que los logs muestren Nginx iniciando, no `nx serve`

---

## 🔴 Service keeps restarting

### Síntomas
- El servicio se reinicia constantemente
- Logs muestran errores repetidos
- Estado cambia entre "Active" y "Restarting"

### Soluciones

1. **Verificar logs**
   - Ir a Railway → Proyecto → Servicio → "Deployments"
   - Revisar logs para encontrar el error que causa el restart

2. **Verificar variables de entorno**
   - Verificar que todas las variables requeridas estén configuradas
   - Verificar que no haya valores inválidos

3. **Verificar healthcheck**
   - El servicio debe responder en el endpoint de healthcheck
   - Verificar que `/api/health` funcione correctamente

4. **Verificar recursos**
   - Verificar que el servicio tenga suficientes recursos
   - Railway puede reiniciar si se queda sin memoria

---

## 📞 Obtener Ayuda

Si nada funciona:

1. **Revisar logs completos**
   - Copiar logs completos del deployment
   - Buscar el primer error

2. **Verificar documentación**
   - [Railway Documentation](https://docs.railway.app)
   - [Railway Discord](https://discord.gg/railway)

3. **Contactar soporte**
   - Railway tiene soporte en Discord
   - Incluir logs y descripción del problema

---

## ✅ Checklist de Verificación Rápida

Antes de reportar un problema, verifica:

- [ ] El servicio está "Active" (no pausado)
- [ ] Todas las variables de entorno están configuradas
- [ ] Los dominios son correctos (HTTPS, sin espacios)
- [ ] Los logs no muestran errores obvios
- [ ] El build se completó exitosamente
- [ ] Las credenciales (Supabase, Auth0) son correctas
- [ ] El DNS está configurado correctamente (si usas dominio personalizado)

