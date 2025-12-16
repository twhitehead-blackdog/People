# 🚂 Guía Completa: Railway Deployment

## 📋 Resumen

Esta guía te lleva paso a paso para desplegar People en Railway con staging y producción separados.

**Tiempo estimado:** 15-20 minutos  
**Dificultad:** Fácil  
**Requisitos:** Cuenta de Railway, repositorio en GitHub

---

## 🎯 Ventajas de Railway

- ✅ SSL automático (sin configuración)
- ✅ Deploy automático desde GitHub
- ✅ Variables de entorno en dashboard
- ✅ Dominios gratuitos `.railway.app`
- ✅ Menos configuración que Hostinger
- ✅ Escalado automático

---

## 📦 Paso 1: Crear Cuenta y Proyecto

### 1.1 Crear cuenta en Railway

1. Ir a [railway.app](https://railway.app)
2. Click en "Start a New Project"
3. Conectar con GitHub
4. Autorizar Railway para acceder a tus repositorios

### 1.2 Crear proyecto

1. Click en "New Project"
2. Seleccionar "Deploy from GitHub repo"
3. Seleccionar el repositorio `People`
4. Seleccionar el branch `nazMarcacion0`

---

## 🔧 Paso 2: Crear Servicio Backend (Staging)

### 2.1 Agregar servicio

1. En el proyecto, click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar el mismo repositorio
4. Seleccionar branch `nazMarcacion0`

### 2.2 Configurar servicio backend

1. Click en el servicio recién creado
2. Ir a "Settings" → "Source"
3. En "Root Directory", dejar vacío (o poner `/`)
4. En "Dockerfile Path", poner: `docker/Dockerfile.backend.railway`

### 2.3 Configurar variables de entorno

Ir a "Variables" y agregar:

```bash
# Backend
PORT=3000  # Railway lo asigna automáticamente, pero lo dejamos por compatibilidad
NODE_ENV=staging

# Supabase
ENV_SUPABASE_URL=https://fsrptlzaqjkcutoiivjr.supabase.co
ENV_SUPABASE_ANON_KEY=tu_anon_key_aqui
ENV_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# SMTP
ENV_SMTP_HOST=smtp.gmail.com
ENV_SMTP_PORT=587
ENV_SMTP_USER=tu_email@gmail.com
ENV_SMTP_PASSWORD=tu_app_password
ENV_SMTP_NOREPLY_EMAIL=noreply-staging@blackdogpanama.com
ENV_SMTP_NOREPLY_NAME=Black Dog - Staging

# URLs (se actualizará después de crear el servicio frontend)
ENV_APP_URL=https://people-frontend-staging.railway.app

# Auth0
AUTH0_DOMAIN=tu_dominio.auth0.com
AUTH0_CLIENT_ID=tu_client_id
AUTH0_CLIENT_SECRET=tu_client_secret

# Otros
LOG_LEVEL=debug
```

### 2.4 Generar dominio

1. Ir a "Settings" → "Domains"
2. Click en "Generate Domain"
3. Anotar el dominio (ej: `people-backend-staging.railway.app`)

---

## 🎨 Paso 3: Crear Servicio Frontend (Staging)

### 3.1 Agregar servicio

1. En el proyecto, click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar el mismo repositorio
4. Seleccionar branch `nazMarcacion0`

### 3.2 Configurar servicio frontend

1. Click en el servicio recién creado
2. Ir a "Settings" → "Source"
3. En "Root Directory", dejar vacío
4. En "Dockerfile Path", poner: `docker/Dockerfile.frontend.railway`

### 3.3 Configurar variables de entorno

Ir a "Variables" y agregar:

```bash
# Frontend - Variables de entorno que el frontend necesita
ENV_SUPABASE_URL=https://fsrptlzaqjkcutoiivjr.supabase.co
ENV_SUPABASE_ANON_KEY=tu_anon_key_aqui

# URL del backend (usar el dominio que generaste en paso 2.4)
# IMPORTANTE: El frontend usa rutas relativas /api/..., pero en Railway
# necesitas configurar esto si el código lo requiere
ENV_API_URL=https://people-backend-staging.railway.app

# URL de la aplicación
ENV_APP_URL=https://people-frontend-staging.railway.app

# Auth0
AUTH0_DOMAIN=tu_dominio.auth0.com
AUTH0_CLIENT_ID=tu_client_id
```

**IMPORTANTE:** 
- Actualizar `ENV_API_URL` con el dominio real del backend que generaste.
- El código actual usa rutas relativas `/api/...` que funcionan cuando frontend y backend están en el mismo dominio. En Railway, como son servicios separados, las llamadas al backend se hacen directamente al dominio del backend. Si tu código Angular usa rutas relativas, necesitarás adaptarlo o usar un servicio proxy.

### 3.4 Generar dominio

1. Ir a "Settings" → "Domains"
2. Click en "Generate Domain"
3. Anotar el dominio (ej: `people-frontend-staging.railway.app`)

### 3.5 Actualizar ENV_API_URL en backend

1. Volver al servicio backend
2. Ir a "Variables"
3. Actualizar `ENV_APP_URL` con el dominio del frontend
4. Guardar

---

## 🔄 Paso 4: Configurar CORS en Backend

El backend necesita permitir requests del frontend. Railway maneja esto automáticamente, pero verifica que en `server.ts` el CORS esté configurado para aceptar el dominio del frontend.

**Nota:** El código actual tiene `Access-Control-Allow-Origin: '*'` que debería funcionar, pero para producción es mejor especificar el dominio exacto.

---

## 🚀 Paso 5: Deploy y Verificar

### 5.1 Deploy automático

Railway despliega automáticamente cuando:
- Haces push a GitHub
- Cambias variables de entorno
- Haces click en "Redeploy" en el dashboard

### 5.2 Verificar logs

1. Click en el servicio (backend o frontend)
2. Ir a la pestaña "Deployments"
3. Click en el deployment más reciente
4. Ver logs en tiempo real

### 5.3 Verificar que funciona

1. Abrir el dominio del frontend: `https://people-frontend-staging.railway.app`
2. Verificar que carga correctamente
3. Probar login y funcionalidades básicas

---

## 🎯 Paso 6: Crear Producción (Duplicar Servicios)

### 6.1 Duplicar servicios

**Opción A: Crear nuevo proyecto para producción (Recomendado)**

1. Crear nuevo proyecto en Railway: "People Production"
2. Repetir pasos 2-5 pero con:
   - `NODE_ENV=production`
   - Dominios diferentes (ej: `people-backend-prod.railway.app`)
   - Variables de producción

**Opción B: Usar el mismo proyecto con diferentes branches**

1. Crear servicios nuevos apuntando a branch `main` (o producción)
2. Configurar con variables de producción

### 6.2 Variables de producción

```bash
NODE_ENV=production
LOG_LEVEL=info
ENV_APP_URL=https://people.blackdogpanama.com
# ... resto de variables de producción
```

---

## 🌍 Paso 7: Configurar Dominios Personalizados (Opcional)

### 7.1 Para Staging

1. En el servicio frontend staging → "Settings" → "Domains"
2. Click en "Custom Domain"
3. Agregar: `stage.people.blackdogpanama.com`
4. Seguir instrucciones para configurar DNS

### 7.2 Para Producción

1. En el servicio frontend producción → "Settings" → "Domains"
2. Click en "Custom Domain"
3. Agregar: `people.blackdogpanama.com`
4. Seguir instrucciones para configurar DNS

### 7.3 Configurar DNS

En tu proveedor de DNS, agregar registros CNAME:

```
stage.people.blackdogpanama.com  →  people-frontend-staging.railway.app
people.blackdogpanama.com         →  people-frontend-prod.railway.app
```

Railway maneja SSL automáticamente cuando configuras el dominio personalizado.

---

## 🔄 Paso 8: Flujo de Trabajo

### 8.1 Deploy automático

Railway despliega automáticamente cuando haces push a GitHub:

```bash
# En tu máquina local
git add .
git commit -m "feat: nueva funcionalidad"
git push origin nazMarcacion0

# Railway detecta el push y despliega automáticamente
```

### 8.2 Deploy manual

1. En Railway dashboard
2. Click en el servicio
3. Click en "Redeploy" en el deployment más reciente

### 8.3 Rollback

1. En Railway dashboard
2. Click en el servicio → "Deployments"
3. Seleccionar deployment anterior
4. Click en "Redeploy"

---

## 📊 Paso 9: Monitoreo

### 9.1 Ver logs en tiempo real

1. Click en el servicio
2. Ir a "Deployments"
3. Click en el deployment activo
4. Ver logs en tiempo real

### 9.2 Métricas

Railway muestra automáticamente:
- CPU usage
- Memory usage
- Network traffic
- Request count

---

## 🚨 Troubleshooting

### Error: "Build failed"

```bash
# Verificar logs del build
# En Railway → Service → Deployments → Click en el deployment fallido
# Revisar errores en los logs
```

### Error: "Service not responding"

1. Verificar variables de entorno
2. Verificar logs del servicio
3. Verificar que el puerto esté correcto (Railway asigna automáticamente)

### Error: "CORS error"

1. Verificar que `ENV_API_URL` en frontend apunte al backend correcto
2. Verificar configuración de CORS en `server.ts`

### Error: "Cannot connect to Supabase"

1. Verificar variables `ENV_SUPABASE_URL` y `ENV_SUPABASE_ANON_KEY`
2. Verificar que las credenciales sean correctas

---

## 💰 Costos de Railway

### Plan Gratuito (Hobby)

- $5 crédito gratis al mes
- Suficiente para desarrollo/staging
- Se paga por uso (CPU, RAM, ancho de banda)

### Plan Pro ($20/mes)

- $20 crédito incluido
- Mejor para producción
- Más recursos

**Nota:** Railway cobra por uso real. Un servicio pequeño puede costar $5-10/mes.

---

## ✅ Checklist

- [ ] Cuenta de Railway creada
- [ ] Proyecto creado y conectado a GitHub
- [ ] Servicio backend staging creado y configurado
- [ ] Servicio frontend staging creado y configurado
- [ ] Variables de entorno configuradas
- [ ] Dominios generados
- [ ] Deploy exitoso
- [ ] Aplicación funciona en staging
- [ ] Servicios de producción creados (opcional)
- [ ] Dominios personalizados configurados (opcional)

---

## 🎉 ¡Listo!

Tu aplicación está corriendo en Railway:
- **Staging:** `https://people-frontend-staging.railway.app`
- **Producción:** `https://people-frontend-prod.railway.app` (o dominio personalizado)

---

## 📝 Notas Importantes

1. **Railway vs Hostinger:** Los archivos de Hostinger (`docker-compose.yml`, `Dockerfile.backend`, `Dockerfile.frontend`) se mantienen intactos. Railway usa archivos diferentes (`Dockerfile.backend.railway`, `Dockerfile.frontend.railway`).

2. **Coexistencia:** Puedes tener ambos configurados. Railway para desarrollo rápido, Hostinger para producción con más control.

3. **Variables de entorno:** Railway las maneja en el dashboard, no necesitas archivos `.env`.

4. **Deploy automático:** Railway despliega automáticamente cuando haces push a GitHub.

5. **SSL:** Railway maneja SSL automáticamente, no necesitas Certbot.

