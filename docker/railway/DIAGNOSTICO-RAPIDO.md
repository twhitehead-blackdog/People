# 🔍 Diagnóstico Rápido - "Application failed to respond"

## ✅ Checklist de Verificación

### 1. Verificar que Railway NO esté ejecutando `npm start`

**Paso crítico:**
1. Ir a Railway → Proyecto → Servicio "Frontend Dev" → **Settings**
2. Buscar sección **"Start Command"** o **"Command"**
3. **DEBE ESTAR VACÍO** o no existir
4. Si hay algo como `npm start` o `nx serve`, **ELIMINARLO**
5. Guardar cambios
6. Hacer **Redeploy**

### 2. Verificar Logs del Deployment

1. Ir a Railway → Proyecto → Servicio "Frontend Dev" → **Deployments**
2. Click en el deployment más reciente
3. Revisar los logs

**✅ Logs CORRECTOS (Nginx funcionando):**
```
Starting Container
nginx: [notice] nginx/1.29.4
nginx: [notice] start worker processes
```

**❌ Logs INCORRECTOS (Railway ejecutando npm start):**
```
> nx serve
> nx run people:serve:development
```

### 3. Verificar que el Build se Complete

En los logs del build, buscar:
- ✅ `Successfully ran target build for project people`
- ❌ `Build failed` o errores de compilación

### 4. Verificar Variables de Entorno

Ir a Railway → Proyecto → Servicio "Frontend Dev" → **Variables**

Verificar que estén configuradas:
- `ENV_SUPABASE_URL`
- `ENV_SUPABASE_ANON_KEY`
- `ENV_API_URL` (debe apuntar al backend)
- `ENV_APP_URL` (debe ser el dominio del frontend)
- `AUTH0_DOMAIN`
- `AUTH0_CLIENT_ID`

### 5. Verificar Healthcheck

Abrir en el navegador:
```
https://tu-frontend.railway.app/health
```

**✅ Debe responder:** `healthy`
**❌ Si no responde:** El servicio no está funcionando

---

## 🚨 Problemas Comunes y Soluciones

### Problema: Logs muestran `nx serve`

**Solución:**
1. Ir a Settings → Start Command
2. Eliminar cualquier comando configurado
3. Redeploy

### Problema: Build falla

**Solución:**
1. Revisar logs del build para ver el error específico
2. Verificar que todas las variables de entorno estén configuradas
3. Verificar que el Dockerfile path sea correcto: `docker/Dockerfile.frontend.railway`

### Problema: Nginx inicia pero no responde

**Solución:**
1. Verificar que el build generó archivos en `dist/people`
2. Verificar que `index.html` existe
3. Revisar logs de Nginx para errores

### Problema: Error 502 Bad Gateway

**Solución:**
1. Verificar que el servicio esté "Active" (no pausado)
2. Verificar que Nginx esté escuchando en el puerto 80
3. Verificar que Railway no esté ejecutando otro comando

---

## 📞 Siguiente Paso

Si después de verificar todo lo anterior el problema persiste:

1. **Copiar logs completos** del deployment más reciente
2. **Verificar configuración de Railway:**
   - Dockerfile Path: `docker/Dockerfile.frontend.railway`
   - Start Command: (debe estar vacío)
   - Variables de entorno: (todas configuradas)
3. **Revisar** `docker/railway/TROUBLESHOOTING.md` para más detalles

