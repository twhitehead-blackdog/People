# 🔐 Configuración de Auth0 para Railway

## 📋 Variables Requeridas para Frontend Dev

### Variables de Auth0 (Frontend)

```
ENV_AUTH0_DOMAIN=tu-dominio.auth0.com
ENV_AUTH0_CLIENT_ID=tu-client-id
ENV_AUTH0_AUDIENCE=tu-audience (opcional, pero recomendado)
```

**Ejemplo:**
```
ENV_AUTH0_DOMAIN=dev-abc123.us.auth0.com
ENV_AUTH0_CLIENT_ID=xyz789ABC123DEF456
ENV_AUTH0_AUDIENCE=https://people.api
```

---

## 📋 Variables Requeridas para Backend Dev

### Variables de Auth0 (Backend)

```
AUTH0_DOMAIN=tu-dominio.auth0.com
AUTH0_CLIENT_ID=tu-client-id
AUTH0_CLIENT_SECRET=tu-client-secret
```

**Ejemplo:**
```
AUTH0_DOMAIN=dev-abc123.us.auth0.com
AUTH0_CLIENT_ID=xyz789ABC123DEF456
AUTH0_CLIENT_SECRET=super_secret_key_here_123456789
```

**⚠️ IMPORTANTE:** 
- En el **Frontend** se usa `ENV_AUTH0_DOMAIN` (con prefijo `ENV_`)
- En el **Backend** se usa `AUTH0_DOMAIN` (sin prefijo `ENV_`)

---

## 🔍 Cómo Obtener los Valores de Auth0

### 1. Ir a Auth0 Dashboard

1. Ve a [https://manage.auth0.com](https://manage.auth0.com)
2. Inicia sesión en tu cuenta
3. Selecciona tu tenant (o crea uno si no tienes)

### 2. Obtener Domain

1. Ve a **Settings** → **General**
2. Busca **Domain**
3. Copia el valor (ejemplo: `dev-abc123.us.auth0.com`)

### 3. Obtener Client ID y Client Secret

1. Ve a **Applications** → Selecciona tu aplicación (o crea una nueva)
2. Ve a la pestaña **Settings**
3. Encuentra:
   - **Client ID**: Cópialo (ejemplo: `xyz789ABC123DEF456`)
   - **Client Secret**: Haz clic en "Show" y cópialo (ejemplo: `super_secret_key_here_123456789`)

### 4. Obtener Audience (si usas API)

1. Ve a **APIs** → Selecciona tu API (o crea una nueva)
2. Ve a **Settings**
3. Encuentra **Identifier** (este es tu Audience)
4. Cópialo (ejemplo: `https://people.api`)

---

## ⚙️ Configuración en Auth0 Dashboard

### 1. Configurar Allowed Callback URLs

1. Ve a **Applications** → Tu aplicación → **Settings**
2. Busca **Allowed Callback URLs**
3. Agrega:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
4. Si tienes desarrollo local, también agrega:
   ```
   http://localhost:4200
   ```

### 2. Configurar Allowed Logout URLs

1. En la misma página, busca **Allowed Logout URLs**
2. Agrega:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
3. Si tienes desarrollo local:
   ```
   http://localhost:4200
   ```

### 3. Configurar Allowed Web Origins

1. Busca **Allowed Web Origins**
2. Agrega:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
3. Si tienes desarrollo local:
   ```
   http://localhost:4200
   ```

### 4. Configurar CORS (si es necesario)

1. Si tu API Auth0 tiene CORS configurado, asegúrate de agregar:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```

---

## 📝 Resumen de Variables para Railway

### Frontend Dev → Variables

```
ENV_AUTH0_DOMAIN=dev-abc123.us.auth0.com
ENV_AUTH0_CLIENT_ID=xyz789ABC123DEF456
ENV_AUTH0_AUDIENCE=https://people.api
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
```

### Backend Dev → Variables

```
AUTH0_DOMAIN=dev-abc123.us.auth0.com
AUTH0_CLIENT_ID=xyz789ABC123DEF456
AUTH0_CLIENT_SECRET=super_secret_key_here_123456789
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
```

---

## ✅ Verificación

### 1. Verificar que las variables estén configuradas

- Frontend: `ENV_AUTH0_DOMAIN`, `ENV_AUTH0_CLIENT_ID`
- Backend: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`

### 2. Verificar URLs en Auth0 Dashboard

- Allowed Callback URLs incluye tu dominio de Railway
- Allowed Logout URLs incluye tu dominio de Railway
- Allowed Web Origins incluye tu dominio de Railway

### 3. Probar Login

1. Abre el frontend en Railway
2. Intenta hacer login
3. Deberías ser redirigido a Auth0
4. Después de autenticarte, deberías volver al frontend

---

## 🐛 Problemas Comunes

### Error: "Invalid redirect_uri"

**Causa:** La URL de callback no está en Allowed Callback URLs

**Solución:** 
1. Verifica que `ENV_APP_URL` tenga `https://`
2. Agrega la URL exacta a Allowed Callback URLs en Auth0

### Error: "Invalid client"

**Causa:** `ENV_AUTH0_CLIENT_ID` o `AUTH0_CLIENT_ID` incorrecto

**Solución:** 
1. Verifica que el Client ID sea correcto
2. Verifica que no haya espacios extra

### Error: CORS

**Causa:** El dominio no está en Allowed Web Origins

**Solución:** 
1. Agrega el dominio a Allowed Web Origins en Auth0
2. Verifica que `ENV_APP_URL` tenga `https://`

---

## 📚 Recursos

- [Auth0 Dashboard](https://manage.auth0.com)
- [Auth0 Documentation](https://auth0.com/docs)
- [Angular Auth0 SDK](https://github.com/auth0/auth0-angular)

---

**Última actualización:** 2025-12-17

