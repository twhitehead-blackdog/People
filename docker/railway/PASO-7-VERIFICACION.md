# ✅ Paso 7: Verificación Completa - Después de Configurar Auth0

## 🎯 Objetivo

Verificar que todo funcione correctamente después de configurar Auth0 y quitar restricciones de seguridad.

---

## 📋 Checklist de Verificación

### 1. Verificar Backend (5 minutos)

1. **Abrir el dominio del backend en el navegador:**

   ```
   https://people-dev-backend.railway.app/health
   ```

   O el dominio que te asignó Railway

2. **Deberías ver:**

   ```json
   {
     "status": "ok",
     "timestamp": "..."
   }
   ```

3. **Si no funciona:**
   - Ir a Railway → Proyecto → "Backend Dev" → "Deployments"
   - Revisar los logs del último deployment
   - Verificar que el servicio esté "Active" (no pausado)

---

### 2. Verificar Frontend (5 minutos)

1. **Abrir el dominio del frontend:**

   ```
   https://people-dev-frontend.railway.app
   ```

   O el dominio que te asignó Railway

2. **Abrir DevTools (F12) → Console:**

   - No debería haber errores en rojo
   - Verificar que no haya errores de CORS
   - Verificar que no haya errores de conexión a Supabase

3. **Verificar que carga:**
   - La página debería cargar sin errores
   - Si hay una página de login, debería mostrarse

---

### 3. Probar Login con Auth0 (10 minutos)

1. **Hacer click en "Login" o "Sign In"**

2. **Deberías ser redirigido a Auth0:**

   - URL debería ser: `https://tu-dominio.auth0.com/...`
   - Deberías ver la página de login de Auth0

3. **Iniciar sesión:**

   - Usar tus credenciales de Auth0
   - O usar un usuario de prueba

4. **Después del login:**

   - Deberías ser redirigido de vuelta al frontend
   - Deberías estar autenticado
   - La aplicación debería cargar tus datos

5. **Si hay errores:**
   - Revisar la consola del navegador (F12)
   - Verificar que las URLs de callback estén correctas en Auth0
   - Verificar que `ENV_APP_URL` esté configurado correctamente

---

### 4. Verificar Llamadas al Backend (5 minutos)

1. **Abrir DevTools → Network (Red)**

2. **Navegar por la aplicación:**

   - Hacer alguna acción que llame al backend
   - Por ejemplo: cargar datos, hacer una búsqueda, etc.

3. **Verificar las peticiones:**

   - Las peticiones a `/api/...` deberían ir a tu backend de Railway
   - No deberían ir a `localhost` o a otro dominio
   - Deberían tener código de estado 200 (o el apropiado)

4. **Ejemplo de petición correcta:**
   ```
   Request URL: https://people-dev-backend.railway.app/api/employees
   Status: 200 OK
   ```

---

### 5. Verificar Supabase (5 minutos)

1. **Abrir DevTools → Console**

2. **Buscar errores relacionados con Supabase:**

   - No debería haber errores de conexión
   - No debería haber errores de autenticación

3. **Verificar que los datos se carguen:**

   - Si la app muestra datos de empleados, compañías, etc.
   - Deberían cargarse correctamente

4. **Si hay errores:**
   - Verificar `ENV_SUPABASE_URL` y `ENV_SUPABASE_ANON_KEY`
   - Verificar que las credenciales sean correctas
   - Verificar que Supabase esté activo

---

### 6. Verificar Funcionalidades Principales (10 minutos)

Prueba las funcionalidades más importantes de tu aplicación:

- [ ] Login/Logout funciona
- [ ] Dashboard carga correctamente
- [ ] Lista de empleados se muestra
- [ ] Búsquedas funcionan
- [ ] Formularios se pueden enviar
- [ ] Datos se guardan correctamente
- [ ] Navegación entre páginas funciona

---

## 🚨 Problemas Comunes y Soluciones

### Error: "CORS policy: No 'Access-Control-Allow-Origin'"

**Solución:**

1. Verificar que `ENV_API_URL` en frontend apunte al backend correcto
2. Verificar configuración de CORS en `server.ts`
3. Verificar que los dominios estén correctos en Auth0

---

### Error: "Auth0 callback URL mismatch"

**Solución:**

1. Ir a Auth0 Dashboard → Application → Settings
2. Verificar que el dominio del frontend esté en:
   - Allowed Callback URLs
   - Allowed Logout URLs
   - Allowed Web Origins
3. Asegurarse de que `ENV_APP_URL` coincida con el dominio del frontend

---

### Error: "Supabase connection failed"

**Solución:**

1. Verificar `ENV_SUPABASE_URL` y `ENV_SUPABASE_ANON_KEY` en Railway
2. Verificar que las credenciales sean correctas
3. Verificar que Supabase esté activo (no pausado)

---

### Backend no responde

**Solución:**

1. Ir a Railway → Proyecto → "Backend Dev" → "Deployments"
2. Revisar los logs del último deployment
3. Verificar que el servicio esté "Active" (no pausado)
4. Verificar que todas las variables de entorno estén configuradas

---

### Frontend no carga

**Solución:**

1. Ir a Railway → Proyecto → "Frontend Dev" → "Deployments"
2. Revisar los logs del último deployment
3. Verificar que el servicio esté "Active"
4. Verificar que `ENV_API_URL` apunte al backend correcto

---

## ✅ Si Todo Funciona

¡Felicidades! 🎉 Tu aplicación está funcionando correctamente en Railway.

### Próximos Pasos:

1. **Documentar los dominios:**

   - Anotar el dominio del backend: `https://...`
   - Anotar el dominio del frontend: `https://...`

2. **Configurar Production (opcional):**

   - Seguir los mismos pasos pero con branch `main`
   - Usar variables de producción (ver `env.prod.example.txt`)

3. **Configurar dominio personalizado (opcional):**
   - En Railway → Settings → Domains
   - Agregar tu dominio personalizado
   - Configurar DNS (registro CNAME)

---

## 📝 Notas

- Guarda los dominios de Railway para referencia futura
- Los logs se ven en tiempo real en Railway
- Puedes hacer rollback fácilmente desde "Deployments"
- Railway despliega automáticamente cuando haces push a GitHub

---

## 🆘 Si Algo No Funciona

1. Revisar logs en Railway:

   - Proyecto → Servicio → "Deployments" → Click en el más reciente

2. Verificar variables de entorno:

   - Asegurarse de que todas estén configuradas
   - Verificar que no haya espacios extra

3. Consultar documentación:
   - `docker/railway/TROUBLESHOOTING.md`
   - `docker/railway/CHECKLIST.md`
