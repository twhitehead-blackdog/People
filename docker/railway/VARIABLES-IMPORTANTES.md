# ⚠️ Variables de Entorno Importantes - Railway

## 🔴 CRÍTICO: URLs deben incluir `https://`

### ❌ INCORRECTO:

```
ENV_API_URL=backend-dev-production-5b38.up.railway.app
ENV_APP_URL=frontend-dev-production-c157.up.railway.app
```

### ✅ CORRECTO:

```
ENV_API_URL=https://backend-dev-production-5b38.up.railway.app
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
```

## 📋 Variables Requeridas para Frontend

### Variables de Supabase

```
ENV_SUPABASE_URL=https://tu-proyecto.supabase.co
ENV_SUPABASE_ANON_KEY=tu-anon-key
```

### Variables de API

```
ENV_API_URL=https://backend-dev-production-5b38.up.railway.app
```

**⚠️ IMPORTANTE:** Debe incluir `https://` al inicio

### Variables de Aplicación

```
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
```

**⚠️ IMPORTANTE:** Debe incluir `https://` al inicio

### Variables de Auth0

```
AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
AUTH0_CLIENT_ID=tu-client-id
ENV_AUTH0_AUDIENCE=tu-audience (opcional)
```

## 📋 Variables Requeridas para Backend

### Variables de Supabase

```
ENV_SUPABASE_URL=https://tu-proyecto.supabase.co
ENV_SUPABASE_ANON_KEY=tu-anon-key (REQUERIDO - para todas las operaciones)
ENV_SUPABASE_SERVICE_ROLE_KEY=tu-service-role-key (OPCIONAL - solo para subida de archivos)
```

**⚠️ IMPORTANTE:**

- `ENV_SUPABASE_ANON_KEY` es **REQUERIDO** para todas las operaciones con Supabase
- `ENV_SUPABASE_SERVICE_ROLE_KEY` es **OPCIONAL** pero recomendado para subir archivos a Storage
- El Service Role Key bypassa RLS (Row Level Security), úsalo solo cuando sea necesario

### Variables de SMTP

```
ENV_SMTP_HOST=smtp.gmail.com
ENV_SMTP_PORT=587
ENV_SMTP_USER=tu-email@gmail.com
ENV_SMTP_PASSWORD=tu-app-password
ENV_SMTP_NOREPLY_EMAIL=noreply@tudominio.com
ENV_SMTP_NOREPLY_NAME=Tu Nombre
```

### Variables de Postmark (Recomendado)

```
ENV_POSTMARK_API_KEY=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
ENV_POSTMARK_FROM_EMAIL=noreply@tu-dominio.com
ENV_POSTMARK_FROM_NAME=People - RRHH
```

**📝 Notas sobre Postmark:**
- Obtén tu Server API Token desde: https://account.postmarkapp.com/servers > Tu Server > API Tokens
- El Server API Token se usa tanto como username como password para SMTP
- Host: smtp.postmarkapp.com (automático en el código)
- Puerto: 587 (TLS) o 2525 (automático en el código)

### Variables de Auth0

```
AUTH0_DOMAIN=dev-xxxxx.us.auth0.com
AUTH0_CLIENT_ID=tu-client-id
AUTH0_CLIENT_SECRET=tu-client-secret
```

### Variables de Aplicación

```
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
PORT=3000 (Railway lo asigna automáticamente, pero puedes especificarlo)
NODE_ENV=development
LOG_LEVEL=debug
```

## 🔍 Cómo Verificar

1. Ir a Railway → Proyecto → Servicio → **Variables**
2. Verificar que todas las URLs tengan `https://` al inicio
3. Verificar que no haya espacios extra en los valores
4. Verificar que las URLs sean correctas (no `localhost`)

## 🚨 Problemas Comunes

### Problema: "Cannot GET /" o página en blanco

**Causa:** `ENV_API_URL` o `ENV_APP_URL` sin `https://`
**Solución:** Agregar `https://` al inicio de las URLs

### Problema: CORS errors

**Causa:** `ENV_API_URL` o `ENV_APP_URL` incorrectas
**Solución:** Verificar que las URLs sean correctas y tengan `https://`

### Problema: Auth0 no funciona

**Causa:** `ENV_APP_URL` sin `https://` o incorrecta
**Solución:** Agregar `https://` y verificar que coincida con la configuración en Auth0 Dashboard
