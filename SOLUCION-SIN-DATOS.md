# 🔍 Solución: No se muestran datos después del login

## Problema

Después de iniciar sesión, solo aparece un "reloj de marcación" (spinner) y no se cargan los datos de adopciones.

## Causa Principal

Las variables de entorno no están configuradas correctamente en Railway, lo que hace que:
- `process.env['ENV_SUPABASE_URL']` sea `undefined`
- Todas las peticiones a Supabase fallen
- Los componentes no puedan cargar datos

## ✅ Solución Paso a Paso

### 1. Verificar Variables de Entorno en Railway

1. Ve a tu proyecto en [Railway Dashboard](https://railway.app)
2. Selecciona tu servicio
3. Ve a la pestaña **Variables**
4. Verifica que estas variables estén configuradas:

```
ENV_SUPABASE_URL=https://tu-proyecto.supabase.co
ENV_SUPABASE_API_KEY=tu_api_key_anon
ENV_SUPABASE_TOKEN=tu_service_role_key
ENV_AUTH0_DOMAIN=tu-dominio.us.auth0.com
ENV_AUTH0_CLIENT_ID=tu_client_id
ENV_AUTH0_CLIENT_SECRET=tu_client_secret
ENV_AUTH0_AUDIENCE=https://people.api
ENV_APP_URL=https://adoptions-production.up.railway.app
```

### 2. Verificar en la Consola del Navegador

1. Abre la aplicación en el navegador
2. Presiona `F12` para abrir las herramientas de desarrollador
3. Ve a la pestaña **Console**
4. Busca estos mensajes:

**✅ Si las variables están bien:**
```
📊 Supabase URL: https://tu-proyecto.supabase.co
```

**❌ Si las variables NO están bien:**
```
📊 Supabase URL: undefined
```

### 3. Verificar Errores en la Consola

Busca errores como:
- `Failed to fetch`
- `NetworkError`
- `CORS error`
- `ENV_SUPABASE_URL is not defined`

### 4. Verificar en Network Tab

1. En las herramientas de desarrollador, ve a la pestaña **Network**
2. Recarga la página
3. Busca peticiones a Supabase (deberían tener la URL de tu proyecto Supabase)
4. Si ves peticiones a `undefined/rest/v1/...`, las variables no están configuradas

### 5. Solución: Reconfigurar Variables y Rebuild

Si las variables no están configuradas:

1. **Agrega todas las variables** en Railway (ver `VARIABLES-RAILWAY.md`)
2. **Haz un nuevo deploy**:
   - Railway debería detectar los cambios automáticamente
   - O haz un deploy manual desde el dashboard
3. **Espera a que termine el build** (puede tardar varios minutos)
4. **Recarga la aplicación** en el navegador

### 6. Verificar que el Build Incluyó las Variables

El plugin `env-var-plugin.js` inyecta las variables durante el build. Para verificar:

1. Después del build, abre la consola del navegador
2. Ejecuta: `console.log(process.env)`
3. Deberías ver un objeto con todas las variables `ENV_*`

## 🔧 Debug Adicional

### Verificar que el Spinner se Oculte

El "reloj de marcación" es probablemente el spinner de carga (`ngx-spinner`). Si no se oculta:

1. Verifica que las peticiones a Supabase se completen
2. Revisa si hay errores en la consola que bloqueen la carga
3. Verifica que los stores se inicialicen correctamente

### Verificar Stores

Los stores se inicializan automáticamente cuando se carga la aplicación. Si no cargan datos:

1. Abre la consola del navegador
2. Busca mensajes de error relacionados con `fetchItems`
3. Verifica que `ENV_SUPABASE_URL` no sea `undefined`

## 📝 Checklist de Verificación

- [ ] Todas las variables de entorno están configuradas en Railway
- [ ] El build se completó exitosamente
- [ ] En la consola del navegador, `process.env['ENV_SUPABASE_URL']` tiene un valor
- [ ] No hay errores de CORS en la consola
- [ ] Las peticiones a Supabase tienen la URL correcta en Network tab
- [ ] Los stores se inicializan correctamente
- [ ] El spinner se oculta después de cargar los datos

## 🚨 Si el Problema Persiste

1. **Verifica los logs de Railway**: Ve a tu proyecto > Deployments > Selecciona el último deployment > Ver logs
2. **Verifica que el build incluyó las variables**: Busca en los logs del build si hay errores
3. **Verifica la configuración de Supabase**: Asegúrate de que la URL y API key sean correctas
4. **Limpia el caché del navegador**: Ctrl+Shift+R (o Cmd+Shift+R en Mac)

## 📞 Información para Debug

Si necesitas ayuda adicional, proporciona:
- Captura de pantalla de la consola del navegador
- Captura de pantalla de las variables de entorno en Railway
- Logs del build en Railway
- URL de tu aplicación en Railway

