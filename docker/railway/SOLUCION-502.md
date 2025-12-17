# 🔴 Solución: Error 502 Bad Gateway en Railway

## 🔍 Diagnóstico

El error **502 Bad Gateway** significa que Railway no puede conectarse al servicio Nginx, aunque Nginx esté iniciando correctamente.

## ✅ Verificaciones Inmediatas

### 1. Verificar que el servicio esté "Active"

1. Ir a Railway → Proyecto → Servicio "Frontend Dev"
2. Verificar que el estado sea **"Active"** (verde)
3. Si está "Paused" o "Stopped", hacer click en "Unpause" o "Start"

### 2. Revisar logs completos del servicio

1. Ir a Railway → Proyecto → Servicio "Frontend Dev" → **Deployments**
2. Click en el deployment más reciente
3. Revisar **TODOS** los logs (no solo los de inicio)
4. Buscar errores como:
   - `[error]` en logs de Nginx
   - `[emerg]` en logs de Nginx
   - Mensajes de "Killed" o "OOM" (Out of Memory)
   - Mensajes de reinicio constante

### 3. Verificar configuración de Railway

1. Ir a Railway → Proyecto → Servicio "Frontend Dev" → **Settings**
2. Verificar:
   - **Dockerfile Path:** `docker/Dockerfile.frontend.railway`
   - **Start Command:** DEBE ESTAR VACÍO
   - **Port:** Railway lo asigna automáticamente (puede estar en blanco)

### 4. Verificar variables de entorno

1. Ir a Railway → Proyecto → Servicio "Frontend Dev" → **Variables**
2. Verificar que todas las URLs tengan `https://`:
   - `ENV_API_URL=https://backend-dev-production-5b38.up.railway.app`
   - `ENV_APP_URL=https://frontend-dev-production-c157.up.railway.app`

## 🔧 Soluciones Comunes

### Problema: Servicio se reinicia constantemente

**Síntomas:**
- Logs muestran "Starting Container" repetidamente
- El servicio cambia entre "Active" y "Restarting"

**Solución:**
1. Revisar logs para encontrar el error que causa el reinicio
2. Verificar que no haya errores de memoria (OOM)
3. Verificar que Nginx no tenga errores de configuración

### Problema: Nginx no responde

**Síntomas:**
- Nginx inicia pero no responde a requests
- Error 502 al intentar acceder

**Solución:**
1. Verificar que Nginx esté escuchando en el puerto 80
2. Verificar que no haya errores en la configuración de Nginx
3. Verificar que los archivos estén en `/usr/share/nginx/html/`

### Problema: Railway no puede conectarse

**Síntomas:**
- Error 502
- Nginx inicia correctamente en los logs

**Solución:**
1. Verificar que el servicio esté "Active"
2. Verificar que no haya un "Start Command" configurado
3. Hacer "Redeploy" del servicio
4. Verificar que el puerto esté configurado correctamente

## 🚨 Pasos de Emergencia

Si nada funciona:

1. **Pausar y reanudar el servicio:**
   - Railway → Servicio → "Pause"
   - Esperar 10 segundos
   - "Unpause"

2. **Redeploy completo:**
   - Railway → Servicio → Deployments
   - Click en "Redeploy" en el deployment más reciente

3. **Limpiar caché de build:**
   - Railway → Servicio → Settings
   - Buscar "Clear Build Cache" o similar
   - Hacer Redeploy

4. **Verificar recursos:**
   - Railway puede reiniciar servicios si se quedan sin memoria
   - Verificar que el servicio tenga suficientes recursos asignados

## 📞 Información para Debugging

Si el problema persiste, necesitamos:

1. **Logs completos** del deployment (especialmente errores de Nginx)
2. **Estado del servicio** (Active, Paused, Restarting)
3. **Configuración de Settings** (Dockerfile path, Start Command, Port)
4. **Variables de entorno** (solo los nombres, no los valores)

---

## ✅ Checklist Rápido

- [ ] Servicio está "Active" (no pausado)
- [ ] No hay "Start Command" configurado
- [ ] Dockerfile path es correcto: `docker/Dockerfile.frontend.railway`
- [ ] URLs en variables tienen `https://`
- [ ] No hay errores en los logs de Nginx
- [ ] El servicio no se está reiniciando constantemente

