# 🔓 Guía: Bypass de Autenticación para Desarrollo

## ⚠️ IMPORTANTE

Este bypass **SOLO es para desarrollo/testing**. **NO debe usarse en producción**.

---

## 🎯 ¿Qué es el Bypass?

El bypass de autenticación permite iniciar sesión sin usar Auth0, usando directamente el email `soporte2@gmail.com`. Esto es útil cuando:

- Auth0 no está configurado correctamente
- Necesitas probar la aplicación sin configurar Auth0
- Estás en desarrollo local

---

## 🚀 Cómo Usar el Bypass

### Paso 1: Abrir la Página de Login

1. Ve a la página de login: `https://tu-frontend.railway.app/login`
2. O en local: `http://localhost:4200/login`

### Paso 2: Activar el Bypass

1. En la página de login, verás un botón amarillo en la parte inferior:
   - **"🔓 Bypass: soporte2@gmail.com"**
2. Haz clic en ese botón
3. Espera 1-2 segundos
4. Serás redirigido automáticamente al dashboard

### Paso 3: Verificar que Funciona

Después del bypass, deberías:
- ✅ Ver el dashboard (no solo el reloj de marcación)
- ✅ Ver tu nombre en la esquina superior derecha
- ✅ Poder navegar entre secciones (Home, Admin, etc.)

---

## 🔧 Cómo Funciona Internamente

### 1. **AuthBypassService**
- Guarda el usuario en `localStorage`
- Simula un usuario de Auth0
- Proporciona `isAuthenticated$` y `user$` como Auth0

### 2. **Guards**
- `authGuardFn`: Verifica el bypass primero antes de Auth0
- `employeePortalGuard`: También verifica el bypass

### 3. **AuthStore**
- Usa el bypass si está activo
- Busca al empleado en Supabase usando el email del bypass

### 4. **Dashboard Component**
- Usa el usuario del bypass si está activo
- Muestra el nombre y avatar del usuario

---

## 🐛 Solución de Problemas

### Problema: "El bypass no funciona, se queda estático"

**Solución:**
1. Abre la consola del navegador (F12)
2. Busca mensajes que empiecen con `🔓 [Bypass]` o `🔓 [Login]`
3. Verifica que veas:
   - `🔓 [Login] Iniciando bypass para: soporte2@gmail.com`
   - `🔓 [Login] Redirigiendo al dashboard...`
   - `🔓 [Guard] Bypass activo, usuario: soporte2@gmail.com`
   - `🔓 [Guard] Permitiendo acceso con bypass`

### Problema: "Después del bypass solo veo el reloj de marcación"

**Causa:** La ruta por defecto está redirigiendo a `timeclock` en lugar de `home`.

**Solución:**
1. Verifica que el `employeePortalGuard` esté funcionando
2. Abre la consola y busca mensajes de `🔍 [Guard]`
3. Verifica que el usuario tenga `default_view` configurado en la base de datos

### Problema: "No se muestran datos después del bypass"

**Causa:** El `AuthStore` no está encontrando al empleado en Supabase.

**Solución:**
1. Verifica que `soporte2@gmail.com` exista en la tabla `employees` de Supabase
2. Verifica que el campo `work_email` o `email` coincida exactamente
3. Abre el panel de diagnóstico (`Ctrl + Shift + D`) y busca errores HTTP

---

## 📋 Checklist de Verificación

Después de activar el bypass, verifica:

- [ ] El bypass se activa (mensaje en consola)
- [ ] Se redirige al dashboard (no se queda en login)
- [ ] Se muestra el dashboard completo (no solo timeclock)
- [ ] Se muestra el nombre del usuario en la esquina superior derecha
- [ ] Puedes navegar entre secciones (Home, Admin, etc.)
- [ ] Los datos se cargan (empleados, sucursales, etc.)

---

## 🔍 Verificación en la Consola

Cuando el bypass funciona correctamente, deberías ver en la consola:

```
🔓 [Login] Iniciando bypass para: soporte2@gmail.com
🔓 [Login] Redirigiendo al dashboard...
🔓 [Guard] Bypass activo, usuario: soporte2@gmail.com
🔓 [Guard] Permitiendo acceso con bypass
🔓 [EmployeePortalGuard] Bypass activo, usuario: soporte2@gmail.com
🔓 [EmployeePortalGuard] Permitiendo acceso completo con bypass
🔓 [AuthStore] Usando bypass, usuario: soporte2@gmail.com
```

---

## 🗑️ Cerrar Sesión con Bypass

Para cerrar sesión cuando usas bypass:

1. Haz clic en tu avatar (esquina superior derecha)
2. Selecciona "Cerrar sesión"
3. Serás redirigido al login
4. El bypass se limpiará automáticamente

---

## ⚙️ Configuración Técnica

### Variables de Entorno Necesarias

El bypass funciona **sin** Auth0, pero necesitas:

- ✅ `ENV_SUPABASE_URL` - Para buscar al empleado
- ✅ `ENV_SUPABASE_ANON_KEY` - Para autenticación en Supabase
- ❌ `ENV_AUTH0_DOMAIN` - **NO necesario** para bypass
- ❌ `ENV_AUTH0_CLIENT_ID` - **NO necesario** para bypass

### Email del Bypass

El bypass usa el email: `soporte2@gmail.com`

**IMPORTANTE:** Este email debe existir en la tabla `employees` de Supabase con:
- Campo `work_email` o `email` = `soporte2@gmail.com`
- Campo `is_active` = `true`
- Campo `account_approved` = `true` (o `null`)

---

## 🆘 Si Nada Funciona

1. **Limpiar localStorage:**
   ```javascript
   // En la consola del navegador (F12)
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Verificar que el bypass esté activo:**
   ```javascript
   // En la consola
   localStorage.getItem('auth_bypass_active'); // Debe ser 'true'
   localStorage.getItem('auth_bypass_user'); // Debe tener un objeto JSON
   ```

3. **Verificar errores en el panel de diagnóstico:**
   - Presiona `Ctrl + Shift + D`
   - Revisa todos los errores
   - Busca errores HTTP relacionados con `/rest/v1/employees`

---

## 📝 Notas

- El bypass **NO requiere Auth0** para funcionar
- El bypass **SÍ requiere Supabase** para buscar al empleado
- El bypass se guarda en `localStorage`, así que persiste entre recargas
- Para desactivar el bypass, cierra sesión o limpia `localStorage`

---

**Última actualización:** 2025-12-17

