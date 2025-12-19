# 🚂 Railway - Variables de Entorno

Este directorio contiene archivos de ejemplo para configurar variables de entorno en Railway.

## 📁 Archivos

- `env.dev.example.txt` - Variables para el proyecto **People Development**
- `env.prod.example.txt` - Variables para el proyecto **People Production**

## 📋 Cómo Usar

1. **Abrir el archivo correspondiente** (`env.dev.example.txt` o `env.prod.example.txt`)
2. **Reemplazar los valores** con tus credenciales reales
3. **Copiar las variables** al proyecto correspondiente en Railway:
   - Ir a Railway → Proyecto → Servicio → "Variables"
   - Agregar cada variable manualmente o usar "Import from .env"

## 🔐 Variables Importantes

### Backend
- `PORT` - Railway lo asigna automáticamente, pero lo dejamos por compatibilidad
- `NODE_ENV` - `development` para dev, `production` para prod
- `LOG_LEVEL` - `debug` para dev, `info` para prod

### Supabase
- `ENV_SUPABASE_URL` - URL de tu proyecto Supabase
- `ENV_SUPABASE_ANON_KEY` - Clave pública de Supabase
- `ENV_SUPABASE_SERVICE_ROLE_KEY` - Clave privada de Supabase (solo backend)

### SMTP
- `ENV_SMTP_HOST` - Servidor SMTP (ej: smtp.gmail.com)
- `ENV_SMTP_PORT` - Puerto SMTP (ej: 587)
- `ENV_SMTP_USER` - Usuario de email
- `ENV_SMTP_PASSWORD` - Contraseña de aplicación (no la contraseña normal)
- `ENV_SMTP_NOREPLY_EMAIL` - Email noreply (diferente para dev/prod)
- `ENV_SMTP_NOREPLY_NAME` - Nombre del remitente noreply

### URLs
- `ENV_APP_URL` - URL completa de la aplicación frontend
- `ENV_API_URL` - URL del backend (solo frontend)

### Auth0
- `AUTH0_DOMAIN` - Dominio de Auth0
- `AUTH0_CLIENT_ID` - ID del cliente Auth0
- `AUTH0_CLIENT_SECRET` - Secreto del cliente (solo backend)

## ⚠️ Notas

1. **No commitees archivos `.env` reales** - Solo los archivos `.example.txt` están en el repo
2. **Actualiza las URLs** después de generar dominios en Railway
3. **Usa credenciales diferentes** para development y production cuando sea posible
4. **Mantén seguras las claves** - No las compartas públicamente

## 🔄 Actualizar Variables

Si necesitas actualizar variables después de configurar:

1. Ir a Railway → Proyecto → Servicio → "Variables"
2. Editar la variable
3. Guardar
4. Railway reiniciará el servicio automáticamente




