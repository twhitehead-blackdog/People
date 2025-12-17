# 🔍 Diagnóstico de Errores de Auth0

## ❓ ¿Qué error específico estás viendo?

Por favor, comparte:
1. **Mensaje de error exacto** (de la consola del navegador F12)
2. **Cuándo ocurre** (al hacer login, al cargar la página, etc.)
3. **URL completa** donde ocurre el error

---

## 🔍 Verificaciones Paso a Paso

### 1. Verificar Variables de Entorno en Railway

#### Frontend Dev → Variables

Verifica que estas variables estén configuradas:

```
ENV_AUTH0_DOMAIN=tu-dominio.auth0.com
ENV_AUTH0_CLIENT_ID=tu-client-id
ENV_AUTH0_AUDIENCE=tu-audience (opcional)
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
```

**⚠️ IMPORTANTE:**
- `ENV_APP_URL` DEBE tener `https://` al inicio
- No debe haber espacios alrededor del `=`
- Los valores deben ser exactos (sin comillas)

---

### 2. Verificar Consola del Navegador

1. Abre el frontend en Railway
2. Presiona **F12** para abrir DevTools
3. Ve a la pestaña **Console**
4. Busca errores relacionados con Auth0

**Errores comunes:**

#### Error: "Invalid redirect_uri"
```
Error: invalid_request
Description: The redirect_uri Mismatch
```

**Causa:** La URL de callback no está en Allowed Callback URLs

**Solución:**
1. Verifica que `ENV_APP_URL` sea exactamente: `https://frontend-dev-production-c157.up.railway.app`
2. Ve a Auth0 Dashboard → Applications → Tu App → Settings
3. En **Allowed Callback URLs**, agrega exactamente:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
4. Guarda y espera 1-2 minutos para que se propague

---

#### Error: "Invalid client"
```
Error: invalid_client
Description: Invalid client_id
```

**Causa:** `ENV_AUTH0_CLIENT_ID` incorrecto o no configurado

**Solución:**
1. Ve a Auth0 Dashboard → Applications → Tu App → Settings
2. Copia el **Client ID** exacto
3. En Railway → Frontend Dev → Variables
4. Verifica que `ENV_AUTH0_CLIENT_ID` tenga el valor correcto
5. No debe haber espacios extra

---

#### Error: "Configuration error"
```
Error: Configuration error
Description: domain is required
```

**Causa:** `ENV_AUTH0_DOMAIN` no está configurado o está vacío

**Solución:**
1. Ve a Auth0 Dashboard → Settings → General
2. Copia el **Domain** exacto
3. En Railway → Frontend Dev → Variables
4. Verifica que `ENV_AUTH0_DOMAIN` tenga el valor correcto
5. No debe tener `https://` (solo el dominio)

---

#### Error: CORS
```
Access to XMLHttpRequest at 'https://...' from origin 'https://...' has been blocked by CORS policy
```

**Causa:** El dominio no está en Allowed Web Origins

**Solución:**
1. Ve a Auth0 Dashboard → Applications → Tu App → Settings
2. En **Allowed Web Origins**, agrega:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
3. Guarda cambios

---

### 3. Verificar Network Tab

1. Abre DevTools (F12)
2. Ve a la pestaña **Network**
3. Intenta hacer login
4. Busca requests a `auth0.com`
5. Revisa los errores (status 400, 401, etc.)

**Qué buscar:**
- Requests a `authorize` (debe ser 302 redirect)
- Requests a `token` (debe ser 200 OK)
- Cualquier request con status 4xx o 5xx

---

### 4. Verificar Logs de Railway

1. Ve a Railway → Frontend Dev → Deployments
2. Abre el deployment más reciente
3. Revisa los logs para errores relacionados con Auth0

**Qué buscar:**
- Errores de configuración
- Variables de entorno no encontradas
- Errores de build

---

## 🔧 Soluciones Comunes

### Problema: "redirect_uri Mismatch"

**Síntomas:**
- Error al intentar hacer login
- Mensaje: "The redirect_uri Mismatch"

**Solución:**

1. **Verificar ENV_APP_URL en Railway:**
   ```
   ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
   ```
   - Debe tener `https://`
   - No debe terminar con `/`
   - Debe ser exactamente la URL de Railway

2. **Verificar en Auth0 Dashboard:**
   - Applications → Tu App → Settings
   - **Allowed Callback URLs** debe incluir:
     ```
     https://frontend-dev-production-c157.up.railway.app
     ```
   - **Allowed Logout URLs** debe incluir:
     ```
     https://frontend-dev-production-c157.up.railway.app
     ```
   - **Allowed Web Origins** debe incluir:
     ```
     https://frontend-dev-production-c157.up.railway.app
     ```

3. **Hacer Redeploy:**
   - Después de cambiar variables, Railway debe redeplegar
   - O haz un Redeploy manual

---

### Problema: Variables no se están leyendo

**Síntomas:**
- Auth0 no inicia
- Error: "domain is required" o "clientId is required"

**Solución:**

1. **Verificar que las variables tengan el prefijo `ENV_`:**
   ```
   ENV_AUTH0_DOMAIN=... (correcto)
   AUTH0_DOMAIN=... (incorrecto para frontend)
   ```

2. **Verificar que no haya espacios:**
   ```
   ENV_AUTH0_DOMAIN=dev-abc123.us.auth0.com (correcto)
   ENV_AUTH0_DOMAIN = dev-abc123.us.auth0.com (incorrecto - tiene espacios)
   ```

3. **Verificar que los valores sean correctos:**
   - `ENV_AUTH0_DOMAIN` debe ser solo el dominio (sin `https://`)
   - `ENV_AUTH0_CLIENT_ID` debe ser el Client ID exacto
   - `ENV_APP_URL` debe tener `https://` completo

---

### Problema: Login se queda cargando

**Síntomas:**
- Al hacer login, se queda en la página de Auth0
- No redirige de vuelta

**Solución:**

1. **Verificar redirect_uri:**
   - Debe coincidir exactamente con `ENV_APP_URL`
   - Debe estar en Allowed Callback URLs

2. **Verificar que el dominio de Railway sea correcto:**
   - Railway puede cambiar el dominio después de un redeploy
   - Verifica el dominio actual en Railway → Frontend Dev → Settings → Domains

3. **Limpiar caché del navegador:**
   - Presiona Ctrl+Shift+Delete
   - Limpia caché y cookies
   - Intenta de nuevo

---

## 📋 Checklist de Verificación

- [ ] `ENV_AUTH0_DOMAIN` está configurado en Railway (sin `https://`)
- [ ] `ENV_AUTH0_CLIENT_ID` está configurado en Railway
- [ ] `ENV_APP_URL` está configurado con `https://` completo
- [ ] `ENV_AUTH0_AUDIENCE` está configurado (si lo usas)
- [ ] Allowed Callback URLs incluye tu dominio de Railway
- [ ] Allowed Logout URLs incluye tu dominio de Railway
- [ ] Allowed Web Origins incluye tu dominio de Railway
- [ ] No hay espacios alrededor del `=` en las variables
- [ ] El dominio de Railway es correcto (puede cambiar después de redeploy)
- [ ] Se hizo redeploy después de cambiar variables

---

## 🆘 Si Nada Funciona

1. **Comparte estos detalles:**
   - Mensaje de error exacto de la consola (F12)
   - Variables configuradas en Railway (solo los nombres, no los valores)
   - URL donde ocurre el error
   - Screenshot del error si es posible

2. **Verifica en Auth0 Dashboard:**
   - Applications → Tu App → Settings
   - Verifica que el Application Type sea "Single Page Application"
   - Verifica que todas las URLs estén configuradas

3. **Prueba en modo incógnito:**
   - Abre el frontend en modo incógnito
   - Esto elimina problemas de caché

---

**Última actualización:** 2025-12-17

