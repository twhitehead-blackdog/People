# 🚂 Configuración para Railway

Este proyecto está configurado para desplegarse en Railway.

## 📋 Archivos de Configuración

- `railway.json`: Configuración de build y deploy para Railway
- `server.ts`: Servidor Express que sirve la aplicación Angular en producción
- `package.json`: Scripts de build y start
- `vite.config.ts`: Configuración de Vite con hosts permitidos para Railway

## 🚀 Despliegue en Railway

### Paso 1: Conectar el Repositorio

1. Ve a [Railway](https://railway.app)
2. Crea un nuevo proyecto
3. Selecciona "Deploy from GitHub repo"
4. Conecta tu repositorio y selecciona el branch `adopciones`

### Paso 2: Configurar Variables de Entorno

En Railway, ve a tu proyecto > Variables y agrega las siguientes variables:

#### Supabase

```
ENV_SUPABASE_URL=tu_url_de_supabase
ENV_SUPABASE_API_KEY=tu_api_key_anon
ENV_SUPABASE_TOKEN=tu_service_role_key
```

#### Auth0

```
ENV_AUTH0_DOMAIN=tu_dominio.auth0.com
ENV_AUTH0_CLIENT_ID=tu_client_id
ENV_AUTH0_CLIENT_SECRET=tu_client_secret
ENV_AUTH0_AUDIENCE=tu_audience
```

#### Aplicación

```
ENV_APP_URL=https://tu-app.railway.app
```

**IMPORTANTE**:

- Asegúrate de actualizar las URLs en Auth0 Dashboard:
  - Allowed Callback URLs: `https://tu-app.railway.app/auth/callback`
  - Allowed Logout URLs: `https://tu-app.railway.app`
  - Allowed Web Origins: `https://tu-app.railway.app`

### Paso 3: Configuración Automática

Railway detectará automáticamente:

- **Build Command**: `npm run build` (definido en `railway.json`)
- **Start Command**: `npm run start:prod` (definido en `railway.json`)
- **Port**: Railway asignará automáticamente el puerto a través de la variable `PORT`

### Paso 4: Desplegar

Railway desplegará automáticamente cuando:

- Haces push al branch conectado
- Cambias variables de entorno
- Haces un deploy manual desde el dashboard

## 🔧 Cómo Funciona

1. **Build**: Railway ejecuta `npm run build` que construye la aplicación Angular en `dist/people`
2. **Start**: Railway ejecuta `npm run start:prod` que inicia el servidor Express
3. **Servir Archivos**: El servidor Express (`server.ts`) sirve los archivos estáticos desde `dist/people` y maneja el routing de la SPA

## 📝 Notas

- El servidor detecta automáticamente si está en producción usando `NODE_ENV` o `RAILWAY_ENVIRONMENT`
- El puerto se obtiene de la variable de entorno `PORT` (Railway la establece automáticamente)
- Los archivos estáticos se sirven desde `dist/people` en producción
- Las rutas de API (`/api/*`) se manejan antes de servir archivos estáticos

## 🐛 Troubleshooting

### La aplicación no carga

- Verifica que el build se completó correctamente
- Revisa los logs en Railway dashboard
- Asegúrate de que todas las variables de entorno estén configuradas

### Error 404 en rutas

- Verifica que el servidor esté sirviendo `index.html` para rutas no-API
- Revisa que el build generó correctamente los archivos en `dist/people`

### Problemas con Auth0

- Verifica que las URLs en Auth0 coincidan exactamente con tu dominio de Railway
- Asegúrate de que `ENV_APP_URL` coincida con tu dominio

### Error: "Blocked request. This host is not allowed"

Si ves el error `Blocked request. This host ("people-production.up.railway.app") is not allowed`:

- Este error ya está resuelto con el archivo `vite.config.ts` que incluye los hosts permitidos de Railway
- Si tu dominio de Railway es diferente, agrega el nuevo dominio a `vite.config.ts` en la sección `allowedHosts`
- El archivo ya incluye `.railway.app` como patrón, lo que permite todos los subdominios de Railway
