# 🚂 Guía Completa: Railway Deployment - Proyectos Separados

## 📋 Resumen

Esta guía te lleva paso a paso para desplegar People en Railway usando **proyectos separados** para Development y Production.

**Estructura recomendada:**

- **Proyecto "People Development"** → Branch `nazMarcacion0` → Ambiente de desarrollo/staging
- **Proyecto "People Production"** → Branch `main` → Ambiente de producción

**Tiempo estimado:** 30-40 minutos  
**Dificultad:** Fácil  
**Requisitos:** Cuenta de Railway, repositorio en GitHub

---

## 🎯 Ventajas de Proyectos Separados

- ✅ **Aislamiento total** entre ambientes
- ✅ **Variables de entorno independientes**
- ✅ **Permisos y acceso separados**
- ✅ **Facturación separada** (puedes pausar dev cuando no lo uses)
- ✅ **Rollback fácil** sin afectar el otro ambiente
- ✅ **Deploy automático** por branch

---

## 🏗️ Arquitectura

```
Railway Dashboard
├── People Development (Proyecto)
│   ├── Backend Dev
│   │   └── Branch: nazMarcacion0
│   └── Frontend Dev
│       └── Branch: nazMarcacion0
└── People Production (Proyecto)
    ├── Backend Prod
    │   └── Branch: main
    └── Frontend Prod
        └── Branch: main
```

---

## 📦 PARTE 1: Configurar Development (Staging)

### Paso 1.1: Crear Proyecto Development

1. Ir a [railway.app](https://railway.app)
2. Click en "New Project"
3. Seleccionar "Deploy from GitHub repo"
4. Seleccionar el repositorio `People`
5. **Nombre del proyecto:** `People Development`
6. Seleccionar branch `nazMarcacion0`

---

### Paso 1.2: Crear Servicio Backend Development

#### 1.2.1 Agregar servicio

1. En el proyecto "People Development", click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar el mismo repositorio `People`
4. Seleccionar branch `nazMarcacion0`

#### 1.2.2 Configurar servicio

1. Click en el servicio recién creado
2. Renombrar a: `Backend Dev` (click en el nombre)
3. Ir a "Settings" → "Source"
4. En "Root Directory", dejar vacío (o poner `/`)
5. En "Dockerfile Path", poner: `docker/Dockerfile.backend.railway`

#### 1.2.3 Configurar variables de entorno

Ir a "Variables" y agregar todas las variables del archivo `docker/railway/env.dev.example.txt`:

```bash
# Backend
PORT=3000
NODE_ENV=development

# Supabase
ENV_SUPABASE_URL=https://fsrptlzaqjkcutoiivjr.supabase.co
ENV_SUPABASE_ANON_KEY=tu_anon_key_aqui
ENV_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui

# SMTP
ENV_SMTP_HOST=smtp.gmail.com
ENV_SMTP_PORT=587
ENV_SMTP_USER=tu_email@gmail.com
ENV_SMTP_PASSWORD=tu_app_password
ENV_SMTP_NOREPLY_EMAIL=noreply-dev@blackdogpanama.com
ENV_SMTP_NOREPLY_NAME=Black Dog - Development

# URLs (se actualizará después de crear el frontend)
ENV_APP_URL=https://people-dev-frontend.railway.app

# Auth0
AUTH0_DOMAIN=tu_dominio.auth0.com
AUTH0_CLIENT_ID=tu_client_id
AUTH0_CLIENT_SECRET=tu_client_secret

# Otros
LOG_LEVEL=debug
```

#### 1.2.4 Generar dominio

1. Ir a "Settings" → "Domains"
2. Click en "Generate Domain"
3. Anotar el dominio (ej: `people-dev-backend.railway.app`)
4. **IMPORTANTE:** Copiar este dominio, lo necesitarás para el frontend

---

### Paso 1.3: Crear Servicio Frontend Development

#### 1.3.1 Agregar servicio

1. En el proyecto "People Development", click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar el mismo repositorio `People`
4. Seleccionar branch `nazMarcacion0`

#### 1.3.2 Configurar servicio

1. Click en el servicio recién creado
2. Renombrar a: `Frontend Dev` (click en el nombre)
3. Ir a "Settings" → "Source"
4. En "Root Directory", dejar vacío
5. En "Dockerfile Path", poner: `docker/Dockerfile.frontend.railway`

#### 1.3.3 Configurar variables de entorno

Ir a "Variables" y agregar:

```bash
# Frontend
ENV_SUPABASE_URL=https://fsrptlzaqjkcutoiivjr.supabase.co
ENV_SUPABASE_ANON_KEY=tu_anon_key_aqui

# URL del backend (usar el dominio que generaste en paso 1.2.4)
ENV_API_URL=https://people-dev-backend.railway.app

# URL de la aplicación (se actualizará después de generar dominio)
ENV_APP_URL=https://people-dev-frontend.railway.app

# Auth0
AUTH0_DOMAIN=tu_dominio.auth0.com
AUTH0_CLIENT_ID=tu_client_id
```

**IMPORTANTE:**

- Actualizar `ENV_API_URL` con el dominio real del backend que generaste en el paso 1.2.4
- El código actual usa rutas relativas `/api/...` que funcionan cuando frontend y backend están en el mismo dominio. En Railway, como son servicios separados, las llamadas al backend se hacen directamente al dominio del backend. Si tu código Angular usa rutas relativas, necesitarás adaptarlo o usar un servicio proxy.

#### 1.3.4 Generar dominio

1. Ir a "Settings" → "Domains"
2. Click en "Generate Domain"
3. Anotar el dominio (ej: `people-dev-frontend.railway.app`)

#### 1.3.5 Actualizar URLs

1. Volver al servicio **Backend Dev**
2. Ir a "Variables"
3. Actualizar `ENV_APP_URL` con el dominio del frontend que acabas de generar
4. Guardar

---

### Paso 1.4: Verificar Development

1. Esperar a que ambos servicios terminen de desplegar
2. Abrir el dominio del frontend: `https://people-dev-frontend.railway.app`
3. Verificar que carga correctamente
4. Probar login y funcionalidades básicas
5. Verificar logs en ambos servicios

---

## 🚀 PARTE 2: Configurar Production

### Paso 2.1: Crear Proyecto Production

1. En Railway dashboard, click en "New Project"
2. Seleccionar "Deploy from GitHub repo"
3. Seleccionar el repositorio `People`
4. **Nombre del proyecto:** `People Production`
5. Seleccionar branch `main` (o el branch de producción)

---

### Paso 2.2: Crear Servicio Backend Production

#### 2.2.1 Agregar servicio

1. En el proyecto "People Production", click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar el mismo repositorio `People`
4. Seleccionar branch `main`

#### 2.2.2 Configurar servicio

1. Click en el servicio recién creado
2. Renombrar a: `Backend Prod`
3. Ir a "Settings" → "Source"
4. En "Root Directory", dejar vacío
5. En "Dockerfile Path", poner: `docker/Dockerfile.backend.railway`

#### 2.2.3 Configurar variables de entorno

Ir a "Variables" y agregar todas las variables del archivo `docker/railway/env.prod.example.txt`:

```bash
# Backend
PORT=3000
NODE_ENV=production

# Supabase
ENV_SUPABASE_URL=https://fsrptlzaqjkcutoiivjr.supabase.co
ENV_SUPABASE_ANON_KEY=tu_anon_key_prod
ENV_SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_prod

# SMTP
ENV_SMTP_HOST=smtp.gmail.com
ENV_SMTP_PORT=587
ENV_SMTP_USER=tu_email_prod@gmail.com
ENV_SMTP_PASSWORD=tu_app_password_prod
ENV_SMTP_NOREPLY_EMAIL=noreply@blackdogpanama.com
ENV_SMTP_NOREPLY_NAME=Black Dog - Feria de Empleo

# URLs (se actualizará después de crear el frontend)
ENV_APP_URL=https://people.blackdogpanama.com

# Auth0
AUTH0_DOMAIN=tu_dominio_prod.auth0.com
AUTH0_CLIENT_ID=tu_client_id_prod
AUTH0_CLIENT_SECRET=tu_client_secret_prod

# Otros
LOG_LEVEL=info
```

#### 2.2.4 Generar dominio

1. Ir a "Settings" → "Domains"
2. Click en "Generate Domain"
3. Anotar el dominio (ej: `people-prod-backend.railway.app`)

---

### Paso 2.3: Crear Servicio Frontend Production

#### 2.3.1 Agregar servicio

1. En el proyecto "People Production", click en "+ New"
2. Seleccionar "GitHub Repo"
3. Seleccionar el mismo repositorio `People`
4. Seleccionar branch `main`

#### 2.3.2 Configurar servicio

1. Click en el servicio recién creado
2. Renombrar a: `Frontend Prod`
3. Ir a "Settings" → "Source"
4. En "Root Directory", dejar vacío
5. En "Dockerfile Path", poner: `docker/Dockerfile.frontend.railway`

#### 2.3.3 Configurar variables de entorno

Ir a "Variables" y agregar:

```bash
# Frontend
ENV_SUPABASE_URL=https://fsrptlzaqjkcutoiivjr.supabase.co
ENV_SUPABASE_ANON_KEY=tu_anon_key_prod

# URL del backend (usar el dominio que generaste en paso 2.2.4)
ENV_API_URL=https://people-prod-backend.railway.app

# URL de la aplicación
ENV_APP_URL=https://people.blackdogpanama.com

# Auth0
AUTH0_DOMAIN=tu_dominio_prod.auth0.com
AUTH0_CLIENT_ID=tu_client_id_prod
```

#### 2.3.4 Generar dominio o usar dominio personalizado

**Opción A: Usar dominio de Railway (temporal)**

1. Ir a "Settings" → "Domains"
2. Click en "Generate Domain"
3. Anotar el dominio (ej: `people-prod-frontend.railway.app`)

**Opción B: Usar dominio personalizado (recomendado para producción)**

1. Ir a "Settings" → "Domains"
2. Click en "Custom Domain"
3. Agregar: `people.blackdogpanama.com`
4. Seguir instrucciones para configurar DNS (ver Paso 2.4)

#### 2.3.5 Actualizar URLs

1. Volver al servicio **Backend Prod**
2. Ir a "Variables"
3. Actualizar `ENV_APP_URL` con el dominio del frontend (personalizado o Railway)
4. Guardar

---

### Paso 2.4: Configurar Dominio Personalizado (Opcional pero Recomendado)

#### 2.4.1 Configurar DNS

En tu proveedor de DNS (ej: Cloudflare, GoDaddy), agregar registros CNAME:

```
# Para producción
people.blackdogpanama.com  →  people-prod-frontend.railway.app
api.people.blackdogpanama.com  →  people-prod-backend.railway.app

# Para development (opcional)
stage.people.blackdogpanama.com  →  people-dev-frontend.railway.app
```

#### 2.4.2 Verificar SSL

Railway maneja SSL automáticamente cuando configuras el dominio personalizado. Espera 5-10 minutos para que se active.

---

## 🔄 PARTE 3: Flujo de Trabajo

### 3.1 Desarrollo → Development

```bash
# 1. Trabajar en branch de desarrollo
git checkout nazMarcacion0

# 2. Hacer cambios
# ... editar código ...

# 3. Commit y push
git add .
git commit -m "feat: nueva funcionalidad"
git push origin nazMarcacion0

# → Railway "People Development" despliega automáticamente
# → Probar en: https://people-dev-frontend.railway.app
```

### 3.2 Development → Production

```bash
# 1. Cambiar a branch de producción
git checkout main

# 2. Merge desde development
git merge nazMarcacion0

# 3. Push a producción
git push origin main

# → Railway "People Production" despliega automáticamente
# → Aplicación disponible en: https://people.blackdogpanama.com
```

### 3.3 Deploy Manual

Si necesitas desplegar manualmente:

1. En Railway dashboard
2. Seleccionar el proyecto (Development o Production)
3. Click en el servicio (Backend o Frontend)
4. Ir a "Deployments"
5. Click en "Redeploy" en el deployment más reciente

### 3.4 Rollback

Si necesitas revertir un cambio:

1. En Railway dashboard
2. Seleccionar el proyecto
3. Click en el servicio → "Deployments"
4. Seleccionar deployment anterior
5. Click en "Redeploy"

---

## 📊 PARTE 4: Monitoreo

### 4.1 Ver Logs en Tiempo Real

1. Click en el proyecto (Development o Production)
2. Click en el servicio (Backend o Frontend)
3. Ir a "Deployments"
4. Click en el deployment activo
5. Ver logs en tiempo real

### 4.2 Métricas

Railway muestra automáticamente:

- CPU usage
- Memory usage
- Network traffic
- Request count

### 4.3 Alertas

Configurar alertas en Railway:

1. Ir a "Settings" → "Notifications"
2. Configurar alertas por email/Slack
3. Recibir notificaciones cuando:
   - Un deployment falla
   - El servicio se cae
   - Uso de recursos alto

---

## 🚨 Troubleshooting

### Error: "Build failed"

1. Ir a Railway → Proyecto → Servicio → "Deployments"
2. Click en el deployment fallido
3. Revisar logs del build
4. Verificar errores comunes:
   - Variables de entorno faltantes
   - Errores de sintaxis en código
   - Dependencias faltantes

### Error: "Service not responding"

1. Verificar variables de entorno
2. Verificar logs del servicio
3. Verificar que el puerto esté correcto (Railway asigna automáticamente)
4. Verificar que el servicio esté "Active" (no pausado)

### Error: "CORS error"

1. Verificar que `ENV_API_URL` en frontend apunte al backend correcto
2. Verificar configuración de CORS en `server.ts`
3. Verificar que los dominios estén correctos

### Error: "Cannot connect to Supabase"

1. Verificar variables `ENV_SUPABASE_URL` y `ENV_SUPABASE_ANON_KEY`
2. Verificar que las credenciales sean correctas
3. Verificar que Supabase esté activo

### Error: "Domain not working"

1. Verificar que el DNS esté configurado correctamente
2. Esperar 5-10 minutos para propagación DNS
3. Verificar que el dominio esté verificado en Railway

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

**Tip:** Puedes pausar el proyecto "People Development" cuando no lo uses para ahorrar costos.

---

## ✅ Checklist

### Development

- [ ] Proyecto "People Development" creado
- [ ] Servicio Backend Dev creado y configurado
- [ ] Servicio Frontend Dev creado y configurado
- [ ] Branch: `nazMarcacion0` configurado
- [ ] Variables de entorno de desarrollo configuradas
- [ ] Dominios generados
- [ ] Deploy exitoso
- [ ] Aplicación funciona en development

### Production

- [ ] Proyecto "People Production" creado
- [ ] Servicio Backend Prod creado y configurado
- [ ] Servicio Frontend Prod creado y configurado
- [ ] Branch: `main` configurado
- [ ] Variables de entorno de producción configuradas
- [ ] Dominios personalizados configurados (opcional)
- [ ] DNS configurado (si usas dominio personalizado)
- [ ] Deploy exitoso
- [ ] Aplicación funciona en producción

---

## 🎉 ¡Listo!

Tu aplicación está corriendo en Railway con ambientes separados:

- **Development:** `https://people-dev-frontend.railway.app`
  - Branch: `nazMarcacion0`
  - Deploy automático al hacer push
- **Production:** `https://people.blackdogpanama.com` (o dominio Railway)
  - Branch: `main`
  - Deploy automático al hacer push

---

## 📝 Notas Importantes

1. **Railway vs Hostinger:** Los archivos de Hostinger (`docker-compose.yml`, `Dockerfile.backend`, `Dockerfile.frontend`) se mantienen intactos. Railway usa archivos diferentes (`Dockerfile.backend.railway`, `Dockerfile.frontend.railway`).

2. **Coexistencia:** Puedes tener ambos configurados. Railway para desarrollo rápido, Hostinger para producción con más control.

3. **Variables de entorno:** Railway las maneja en el dashboard, no necesitas archivos `.env`.

4. **Deploy automático:** Railway despliega automáticamente cuando haces push a GitHub.

5. **SSL:** Railway maneja SSL automáticamente, no necesitas Certbot.

6. **Pausar servicios:** Puedes pausar el proyecto "People Development" cuando no lo uses para ahorrar costos.

---

## 🔗 Referencias

- [Railway Documentation](https://docs.railway.app)
- [Railway Pricing](https://railway.app/pricing)
- [Railway Discord](https://discord.gg/railway)
