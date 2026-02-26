# 🔴 Error Común: AUTH0_DOMAIN vs ENV_AUTH0_DOMAIN

## ❌ Problema

En Railway estás usando:

```
AUTH0_DOMAIN=dev-gyiiy3lphqlh0zo8.us.auth0.com
```

Pero el código Angular busca:

```typescript
process.env['ENV_AUTH0_DOMAIN'];
```

## ✅ Solución

### En Railway → Frontend Dev → Variables

**Cambiar:**

```
AUTH0_DOMAIN=dev-gyiiy3lphqlh0zo8.us.auth0.com
```

**Por:**

```
ENV_AUTH0_DOMAIN=dev-gyiiy3lphqlh0zo8.us.auth0.com
```

**⚠️ IMPORTANTE:**

- **NO** uses comillas dobles en Railway
- El valor debe ser: `dev-gyiiy3lphqlh0zo8.us.auth0.com` (sin comillas)
- El nombre debe ser: `ENV_AUTH0_DOMAIN` (con prefijo `ENV_`)

---

## 📋 Variables Correctas para Railway Frontend

```
ENV_SUPABASE_URL=https://fsrptlzaqjkcutoiivjr.supabase.co
ENV_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcnB0bHphcWprY3V0b2lpdmpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTYxNjA4MjIsImV4cCI6MjAzMTczNjgyMn0.EGyx9-GkmEjeFx78c8P1Ou4JHBO5rXEwD274isJMkmQ
ENV_API_URL=https://backend-dev-production-5b38.up.railway.app
ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app
ENV_AUTH0_DOMAIN=dev-gyiiy3lphqlh0zo8.us.auth0.com
ENV_AUTH0_CLIENT_ID=78LG4I64RD8KiyNOkPf31qAblNVXSgRa
ENV_AUTH0_AUDIENCE=https://dev-gyiiy3lphqlh0zo8.us.auth0.com/api/v2/
ENV_SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZzcnB0bHphcWprY3V0b2lpdmpyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTcxNjE2MDgyMiwiZXhwIjoyMDMxNzM2ODIyfQ.bRkzdRiQBJGfyc49L7wZhfA0V-uV-nam_AAX_F0S4vI
```

**⚠️ NOTAS:**

- **NO** uses comillas dobles en Railway
- Todos los valores deben estar sin comillas
- `ENV_AUTH0_DOMAIN` (no `AUTH0_DOMAIN`)
- `ENV_AUTH0_CLIENT_ID` (no `AUTH0_CLIENT_ID`)

---

## 🔧 Pasos para Corregir

1. **Ir a Railway → Frontend Dev → Variables**

2. **Buscar `AUTH0_DOMAIN` y cambiarlo a `ENV_AUTH0_DOMAIN`:**

   - Si existe `AUTH0_DOMAIN`, elimínalo
   - Agrega `ENV_AUTH0_DOMAIN` con el mismo valor (sin comillas)

3. **Verificar que `ENV_AUTH0_CLIENT_ID` exista:**

   - Si solo existe `AUTH0_CLIENT_ID`, cámbialo a `ENV_AUTH0_CLIENT_ID`

4. **Verificar que no haya comillas en los valores:**

   - Los valores NO deben tener comillas dobles
   - Ejemplo correcto: `ENV_AUTH0_DOMAIN=dev-gyiiy3lphqlh0zo8.us.auth0.com`
   - Ejemplo incorrecto: `ENV_AUTH0_DOMAIN="dev-gyiiy3lphqlh0zo8.us.auth0.com"`

5. **Guardar cambios**

6. **Railway desplegará automáticamente**

---

## ✅ Verificación

Después del deployment, verifica en la consola del navegador (F12):

- No debe aparecer "domain is required"
- No debe aparecer "clientId is required"
- Auth0 debe iniciar correctamente

---

**Última actualización:** 2025-12-17
