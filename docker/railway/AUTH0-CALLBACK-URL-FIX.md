# 🔴 Solución: Callback URL mismatch en Auth0

## ❌ Error

```
Oops!, something went wrong
Callback URL mismatch.
The provided redirect_uri is not in the list of allowed callback URLs.
```

## 🔍 Causa

La URL de callback que está enviando tu aplicación no está en la lista de URLs permitidas en Auth0 Dashboard.

## ✅ Solución Paso a Paso

### Paso 1: Verificar ENV_APP_URL en Railway

1. Ve a **Railway → Frontend Dev → Variables**
2. Busca `ENV_APP_URL`
3. Verifica que sea exactamente:
   ```
   ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
   ```
4. **⚠️ IMPORTANTE:**
   - Debe tener `https://` al inicio
   - NO debe terminar con `/`
   - NO debe tener comillas

### Paso 2: Verificar en Auth0 Dashboard

1. Ve a [Auth0 Dashboard](https://manage.auth0.com)
2. **Applications** → Selecciona tu aplicación
3. Ve a **Settings**
4. Busca **Allowed Callback URLs**
5. Verifica que incluya exactamente:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```

### Paso 3: Agregar URL en Auth0 (si no está)

1. En **Allowed Callback URLs**, agrega:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
2. **⚠️ IMPORTANTE:**
   - Debe ser exactamente la URL de Railway (sin `/` al final)
   - Si tienes desarrollo local, puedes agregar también:
     ```
     http://localhost:4200,https://frontend-dev-production-c157.up.railway.app
     ```
   - Separa múltiples URLs con comas

### Paso 4: Verificar Allowed Logout URLs

1. En la misma página, busca **Allowed Logout URLs**
2. Agrega:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```

### Paso 5: Verificar Allowed Web Origins

1. Busca **Allowed Web Origins**
2. Agrega:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```

### Paso 6: Guardar en Auth0

1. Haz scroll hasta el final de la página
2. Click en **Save Changes**
3. Espera 1-2 minutos para que los cambios se propaguen

### Paso 7: Verificar en Railway

1. Ve a **Railway → Frontend Dev → Variables**
2. Verifica que `ENV_APP_URL` sea exactamente:
   ```
   https://frontend-dev-production-c157.up.railway.app
   ```
3. Si no coincide, actualízala
4. Railway desplegará automáticamente

---

## 🔍 Cómo Verificar la URL Actual

### Opción 1: Ver en Railway

1. Railway → Frontend Dev → Settings → Domains
2. Copia la URL exacta que aparece ahí
3. Úsala en Auth0 y en `ENV_APP_URL`

### Opción 2: Ver en los Logs

1. Railway → Frontend Dev → Deployments → Logs más recientes
2. Busca la URL que se está usando

---

## ⚠️ Errores Comunes

### Error: URL termina con `/`

**Incorrecto:**

```
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app/
```

**Correcto:**

```
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
```

### Error: URL sin `https://`

**Incorrecto:**

```
ENV_APP_URL=frontend-dev-production-c157.up.railway.app
```

**Correcto:**

```
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
```

### Error: URL diferente en Auth0

**Problema:** La URL en `ENV_APP_URL` no coincide con la URL en Auth0 Dashboard

**Solución:**

- Usa la misma URL exacta en ambos lugares
- Verifica que no haya espacios extra
- Verifica que no haya comillas

---

## 📋 Checklist Completo

- [ ] `ENV_APP_URL` en Railway tiene `https://` al inicio
- [ ] `ENV_APP_URL` en Railway NO termina con `/`
- [ ] `ENV_APP_URL` en Railway NO tiene comillas
- [ ] Allowed Callback URLs en Auth0 incluye la URL exacta
- [ ] Allowed Logout URLs en Auth0 incluye la URL exacta
- [ ] Allowed Web Origins en Auth0 incluye la URL exacta
- [ ] Guardaste los cambios en Auth0 Dashboard
- [ ] Esperaste 1-2 minutos después de guardar en Auth0
- [ ] Railway desplegó después de cambiar `ENV_APP_URL`

---

## 🧪 Prueba

1. Abre el frontend en Railway
2. Intenta hacer login
3. Deberías ser redirigido a Auth0
4. Después de autenticarte, deberías volver al frontend sin errores

---

## 🆘 Si Aún No Funciona

1. **Verifica la URL exacta que está enviando:**

   - Abre DevTools (F12) → Network
   - Intenta hacer login
   - Busca el request a `authorize` de Auth0
   - Revisa el parámetro `redirect_uri` en la URL
   - Esa URL debe estar en Allowed Callback URLs

2. **Verifica que Railway haya desplegado:**

   - Railway → Frontend Dev → Deployments
   - Verifica que el deployment más reciente esté "Active"

3. **Limpia caché del navegador:**
   - Presiona Ctrl+Shift+Delete
   - Limpia caché y cookies
   - Intenta de nuevo

---

**Última actualización:** 2025-12-17
