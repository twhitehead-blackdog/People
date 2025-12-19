# 🚀 Guía Paso a Paso: Desplegar en Railway

Esta guía te llevará paso a paso para configurar y desplegar tu aplicación web en Railway.

---

## 📋 Pre-requisitos

Antes de comenzar, asegúrate de tener:

- ✅ Una cuenta en [Railway](https://railway.app)
- ✅ Tu código en un repositorio de GitHub
- ✅ Credenciales de Supabase configuradas
- ✅ Credenciales de Auth0 configuradas

---

## 🔵 PASO 1: Crear Proyecto en Railway

1. Ve a [Railway](https://railway.app) e inicia sesión
2. Haz clic en **"New Project"** o **"Nuevo Proyecto"**
3. Selecciona **"Deploy from GitHub repo"** o **"Desplegar desde repositorio de GitHub"**
4. Conecta tu cuenta de GitHub si aún no lo has hecho
5. Selecciona tu repositorio
6. Selecciona el branch `adopciones` (o el branch que uses para producción)

> **Nota**: Railway detectará automáticamente la configuración desde `railway.json`

---

## 🔐 PASO 2: Obtener Credenciales de Supabase

Antes de configurar las variables, necesitas obtener tus credenciales de Supabase:

1. Ve a [Supabase Dashboard](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **Settings > API**
4. Copia los siguientes valores:
   - **Project URL** → Esta será tu `ENV_SUPABASE_URL`
   - **anon/public key** → Esta será tu `ENV_SUPABASE_API_KEY`
   - **service_role key** → Esta será tu `ENV_SUPABASE_TOKEN` (⚠️ Mantén esto secreto)

---

## 🔐 PASO 3: Obtener Credenciales de Auth0

1. Ve a [Auth0 Dashboard](https://manage.auth0.com)
2. Selecciona tu aplicación
3. Ve a **Settings**
4. Copia los siguientes valores:
   - **Domain** → Esta será tu `ENV_AUTH0_DOMAIN`
   - **Client ID** → Esta será tu `ENV_AUTH0_CLIENT_ID`
   - **Client Secret** → Esta será tu `ENV_AUTH0_CLIENT_SECRET` (⚠️ Mantén esto secreto)
   - **API Audience** (si usas API) → Esta será tu `ENV_AUTH0_AUDIENCE`

---

## ⚙️ PASO 4: Configurar Variables de Entorno en Railway

1. En Railway, ve a tu proyecto
2. Haz clic en la pestaña **"Variables"** o **"Variables"**
3. Haz clic en **"New Variable"** o **"Nueva Variable"**
4. Agrega las siguientes variables **UNA POR UNA**:

### Variables de Supabase

```
ENV_SUPABASE_URL=https://tu-proyecto.supabase.co
ENV_SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ENV_SUPABASE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Variables de Auth0

```
ENV_AUTH0_DOMAIN=tu-dominio.us.auth0.com
ENV_AUTH0_CLIENT_ID=tu_client_id_aqui
ENV_AUTH0_CLIENT_SECRET=tu_client_secret_aqui
ENV_AUTH0_AUDIENCE=https://people.api
```

### Variable de Aplicación

**⚠️ IMPORTANTE**: Primero necesitas obtener el dominio de Railway (ver PASO 5), pero puedes configurarlo después.

```
ENV_APP_URL=https://tu-app.railway.app
```

> **Nota**: Reemplaza todos los valores con tus credenciales reales. Railway encripta automáticamente estas variables.

---

## 🌐 PASO 5: Obtener el Dominio de Railway

1. En Railway, ve a tu proyecto
2. Haz clic en la pestaña **"Settings"** o **"Configuración"**
3. Busca la sección **"Domains"** o **"Dominios"**
4. Railway te asignará automáticamente un dominio como: `tu-proyecto.up.railway.app`
5. **Copia este dominio completo** (incluyendo `https://`)

> **Alternativa**: Si quieres un dominio personalizado, puedes configurarlo aquí también.

---

## 🔄 PASO 6: Actualizar ENV_APP_URL

1. Vuelve a la pestaña **"Variables"** en Railway
2. Busca la variable `ENV_APP_URL`
3. Edítala y reemplaza con tu dominio real de Railway:
   ```
   ENV_APP_URL=https://tu-proyecto.up.railway.app
   ```
4. **Asegúrate de que:**
   - ✅ Incluya `https://` (no `http://`)
   - ✅ No tenga barra final (`/`)
   - ✅ Coincida exactamente con tu dominio de Railway

---

## 🔐 PASO 7: Actualizar URLs en Auth0

Ahora necesitas actualizar las URLs en Auth0 para que funcionen con tu dominio de Railway:

1. Ve a [Auth0 Dashboard](https://manage.auth0.com)
2. Selecciona tu aplicación
3. Ve a **Settings**
4. Busca la sección **"Application URIs"**
5. Actualiza las siguientes URLs (reemplaza con tu dominio real de Railway):

   - **Allowed Callback URLs**:

     ```
     https://tu-proyecto.up.railway.app/auth/callback
     ```

   - **Allowed Logout URLs**:

     ```
     https://tu-proyecto.up.railway.app
     ```

   - **Allowed Web Origins**:
     ```
     https://tu-proyecto.up.railway.app
     ```

6. Haz clic en **"Save Changes"**

> **Nota**: Si tienes múltiples URLs, sepáralas con comas.

---

## 🚀 PASO 8: Desplegar la Aplicación

Railway desplegará automáticamente cuando:

- ✅ Haces push al branch conectado
- ✅ Cambias variables de entorno (después de guardar)
- ✅ Haces un deploy manual desde el dashboard

### Para hacer un deploy manual:

1. En Railway, ve a tu proyecto
2. Haz clic en la pestaña **"Deployments"** o **"Despliegues"**
3. Haz clic en **"Redeploy"** o **"Redesplegar"**

### Para hacer un deploy desde GitHub:

1. Haz push a tu branch `adopciones` (o el branch conectado):
   ```bash
   git push origin adopciones
   ```
2. Railway detectará automáticamente el push y comenzará el despliegue

---

## ⏳ PASO 9: Monitorear el Despliegue

1. En Railway, ve a tu proyecto
2. Haz clic en la pestaña **"Deployments"**
3. Verás el estado del despliegue:

   - 🟡 **Building**: Railway está construyendo tu aplicación
   - 🟡 **Deploying**: Railway está desplegando tu aplicación
   - 🟢 **Active**: Tu aplicación está en línea
   - 🔴 **Failed**: Hubo un error (revisa los logs)

4. Haz clic en el despliegue para ver los **logs** en tiempo real

---

## ✅ PASO 10: Verificar que Todo Funciona

1. **Verifica el dominio**: Abre tu dominio de Railway en el navegador

   - Deberías ver tu aplicación cargando

2. **Verifica los logs**: En Railway, ve a **"Logs"** y busca errores

   - Si hay errores, revisa que todas las variables estén configuradas correctamente

3. **Prueba la autenticación**: Intenta iniciar sesión con Auth0

   - Si hay problemas, verifica las URLs en Auth0 Dashboard

4. **Prueba las funcionalidades**: Verifica que todas las características de tu app funcionen

---

## 🐛 Solución de Problemas Comunes

### ❌ La aplicación no carga

**Solución:**

- Verifica que el build se completó correctamente (revisa los logs)
- Asegúrate de que todas las variables de entorno estén configuradas
- Verifica que `ENV_APP_URL` coincida exactamente con tu dominio

### ❌ Error 404 en rutas

**Solución:**

- Verifica que el servidor esté sirviendo `index.html` para rutas no-API
- Revisa que el build generó correctamente los archivos en `dist/people`

### ❌ Problemas con Auth0

**Solución:**

- Verifica que las URLs en Auth0 coincidan exactamente con tu dominio de Railway
- Asegúrate de que `ENV_APP_URL` coincida con tu dominio
- Verifica que `ENV_AUTH0_DOMAIN`, `ENV_AUTH0_CLIENT_ID` y `ENV_AUTH0_CLIENT_SECRET` estén correctos

### ❌ Error: "Blocked request. This host is not allowed"

**Solución:**

- Este error ya está resuelto con el archivo `vite.config.ts`
- Si tu dominio de Railway es diferente, agrega el nuevo dominio a `vite.config.ts` en la sección `allowedHosts`

### ❌ Error en el build

**Solución:**

- Revisa los logs completos en Railway
- Verifica que todas las dependencias estén en `package.json`
- Asegúrate de que el branch conectado tenga el código más reciente

---

## 📝 Resumen de Variables Requeridas

Aquí está la lista completa de variables que debes configurar en Railway:

```
ENV_SUPABASE_URL=https://tu-proyecto.supabase.co
ENV_SUPABASE_API_KEY=tu_anon_key
ENV_SUPABASE_TOKEN=tu_service_role_key
ENV_AUTH0_DOMAIN=tu-dominio.us.auth0.com
ENV_AUTH0_CLIENT_ID=tu_client_id
ENV_AUTH0_CLIENT_SECRET=tu_client_secret
ENV_AUTH0_AUDIENCE=https://people.api
ENV_APP_URL=https://tu-proyecto.up.railway.app
```

### Variables Opcionales (si usas email)

```
ENV_EMAIL_API_URL=https://tu-api-de-email.com
ENV_EMAIL_API_KEY=tu_api_key_de_email
```

---

## 🔒 Notas de Seguridad

- ⚠️ **NUNCA** compartas tus `CLIENT_SECRET` o `SERVICE_ROLE_KEY` públicamente
- ⚠️ `ENV_SUPABASE_TOKEN` y `ENV_AUTH0_CLIENT_SECRET` solo se usan en el servidor
- ✅ Railway encripta las variables de entorno automáticamente
- ✅ No las incluyas en commits de Git
- ✅ Usa diferentes credenciales para desarrollo y producción

---

## 🎉 ¡Listo!

Si seguiste todos los pasos, tu aplicación debería estar funcionando en Railway.

**Próximos pasos sugeridos:**

- Configura un dominio personalizado (opcional)
- Configura monitoreo y alertas
- Configura backups automáticos
- Revisa los logs periódicamente

---

## 📚 Referencias

- [Documentación de Railway](https://docs.railway.app)
- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de Auth0](https://auth0.com/docs)

---

**¿Necesitas ayuda?** Revisa los logs en Railway o consulta la documentación específica de cada servicio.
