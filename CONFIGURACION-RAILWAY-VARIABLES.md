# 🔧 Configuración de Variables en Railway

## ⚠️ IMPORTANTE: Formato de Variables

En Railway, **NO debes incluir comillas** alrededor de los valores de las variables de entorno.

### ✅ CORRECTO (sin comillas):
```
ENV_AUTH0_DOMAIN=dev-usuy2wsr55zolczv.us.auth0.com
ENV_APP_URL=https://adoptions-production.up.railway.app
```

### ❌ INCORRECTO (con comillas):
```
ENV_AUTH0_DOMAIN="dev-usuy2wsr55zolczv.us.auth0.com"
ENV_APP_URL="https://adoptions-production.up.railway.app"
```

## 📋 Variables Requeridas

Configura estas variables en Railway: **Proyecto > Variables**

### 🔵 Supabase
```
ENV_SUPABASE_URL=https://vnorepqmaiiufyyvuozu.supabase.co
ENV_SUPABASE_API_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub3JlcHFtYWlpdWZ5eXZ1b3p1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMzODE0ODgsImV4cCI6MjA3ODk1NzQ4OH0.DCflxpW-JvN7g6MsfTBKLJ84W_n-GG5Y_Tk9dcYo7OY
ENV_SUPABASE_TOKEN=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZub3JlcHFtYWlpdWZ5eXZ1b3p1Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzM4MTQ4OCwiZXhwIjoyMDc4OTU3NDg4fQ.z6uDy--tSZ_xHkGP0UQr51dzrfc8zq3yTrCbmiISgbk
```

### 🔐 Auth0
```
ENV_AUTH0_DOMAIN=dev-usuy2wsr55zolczv.us.auth0.com
ENV_AUTH0_CLIENT_ID=Mh77Sqe2L90uslJsjMA8Av6snPvvXvEY
ENV_AUTH0_CLIENT_SECRET=kZysIKtI-7zmpl9QO1NjR8tmA5AcYMTFCIj34IlVzxZDjCl1Gb4EeCA5PEsbToja
ENV_AUTH0_AUDIENCE=https://dev-usuy2wsr55zolczv.us.auth0.com/api/v2/
```

### 🌐 Application
```
ENV_APP_URL=https://adoptions-production.up.railway.app
```

## 🔍 Nota sobre ENV_AUTH0_AUDIENCE

El valor actual `https://dev-usuy2wsr55zolczv.us.auth0.com/api/v2/` parece ser la URL de la API de Management de Auth0, no el identifier de tu API.

Si estás usando una API personalizada en Auth0:
1. Ve a **Auth0 Dashboard > APIs**
2. Selecciona tu API
3. Copia el **Identifier** (algo como `https://people.api` o `https://api.example.com`)
4. Usa ese valor para `ENV_AUTH0_AUDIENCE`

Si NO estás usando una API personalizada, puedes dejar este campo vacío o eliminarlo.

## 📝 Pasos para Configurar en Railway

1. Ve a tu proyecto en [Railway](https://railway.app)
2. Haz clic en tu servicio
3. Ve a la pestaña **Variables**
4. Para cada variable:
   - Haz clic en **+ New Variable**
   - Ingresa el nombre (ej: `ENV_AUTH0_DOMAIN`)
   - Ingresa el valor **SIN comillas** (ej: `dev-usuy2wsr55zolczv.us.auth0.com`)
   - Haz clic en **Add**

5. Después de agregar todas las variables, Railway automáticamente:
   - Pasará las variables como build args al Dockerfile
   - Las inyectará en el código Angular durante el build
   - Las hará disponibles en runtime para el servidor Express

## ✅ Verificación

Después de configurar las variables, verifica que:

1. ✅ Todas las variables están configuradas (sin comillas)
2. ✅ El build de Railway se completa exitosamente
3. ✅ Los logs muestran que las variables se inyectaron correctamente
4. ✅ Auth0 funciona correctamente (no hay errores DNS)

## 🐛 Troubleshooting

### Problema: Variables no se inyectan
- Verifica que las variables estén configuradas en Railway (no en un archivo .env)
- Verifica que NO tengan comillas alrededor de los valores
- Revisa los logs del build para ver si las variables se pasan correctamente

### Problema: Error DNS con "authorize"
- Verifica que `ENV_AUTH0_DOMAIN` esté configurado correctamente (sin comillas)
- Verifica que `ENV_APP_URL` coincida exactamente con tu dominio de Railway
- Verifica en Auth0 Dashboard que las URLs permitidas incluyan tu dominio de Railway

### Problema: Auth0 no funciona
- Abre la consola del navegador (F12) y busca errores
- Verifica que `ENV_AUTH0_DOMAIN` y `ENV_AUTH0_CLIENT_ID` estén configurados
- Verifica en Auth0 Dashboard que las URLs permitidas sean correctas

