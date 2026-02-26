# 🔌 Configuración de API - Railway

## 📋 Resumen

En Railway, el frontend y backend son **servicios separados** con dominios diferentes. Esto requiere configuración especial para que el frontend pueda comunicarse con el backend.

---

## 🏗️ Arquitectura

```
Frontend (people-dev-frontend.railway.app)
    │
    │ HTTP Request
    │
    ▼
Backend (people-dev-backend.railway.app)
    │
    │ Query
    │
    ▼
Supabase
```

---

## ⚙️ Configuración Actual

### Código Actual

El código actual usa **rutas relativas** para las llamadas al backend:

```typescript
// Ejemplo en ip-monitor.service.ts
this.http.get<{ ip: string }>('/api/client-ip')
```

Esto funciona cuando frontend y backend están en el mismo dominio, pero **NO funciona** cuando están en dominios separados (como en Railway).

---

## 🔧 Solución: Variables de Entorno

### 1. Configurar ENV_API_URL

En Railway, configura la variable `ENV_API_URL` en el servicio Frontend:

```bash
ENV_API_URL=https://people-dev-backend.railway.app
```

### 2. Usar ENV_API_URL en el Código

Necesitas modificar el código para usar `ENV_API_URL` cuando esté disponible:

```typescript
// Ejemplo de cómo debería ser
const apiUrl = process.env['ENV_API_URL'] || '';
const fullUrl = apiUrl ? `${apiUrl}/api/client-ip` : '/api/client-ip';
this.http.get<{ ip: string }>(fullUrl)
```

---

## 📝 Archivos que Necesitan Modificación

### Servicios que hacen llamadas al backend:

1. **`src/app/services/ip-monitor.service.ts`**
   - Línea 171: `this.http.get<{ ip: string }>('/api/client-ip')`
   - Cambiar a usar `ENV_API_URL`

2. **`src/app/services/email.service.ts`**
   - Verificar si hace llamadas a `/api/email/send`
   - Cambiar a usar `ENV_API_URL`

3. **Cualquier otro servicio que use `/api/...`**
   - Buscar en el código: `'/api/'`
   - Cambiar a usar `ENV_API_URL`

---

## 🛠️ Implementación Recomendada

### Opción 1: Crear un servicio de configuración

```typescript
// src/app/services/api-config.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiConfigService {
  private apiUrl = process.env['ENV_API_URL'] || '';

  getApiUrl(path: string): string {
    if (this.apiUrl) {
      // Si ENV_API_URL está configurado, usarlo
      return `${this.apiUrl}${path}`;
    }
    // Si no, usar ruta relativa (desarrollo local)
    return path;
  }
}
```

### Opción 2: Interceptor HTTP

```typescript
// src/app/interceptors/api-url.interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http';

export const apiUrlInterceptor: HttpInterceptorFn = (req, next) => {
  // Solo interceptar rutas que empiecen con /api/
  if (req.url.startsWith('/api/')) {
    const apiUrl = process.env['ENV_API_URL'] || '';
    if (apiUrl) {
      const newUrl = `${apiUrl}${req.url}`;
      req = req.clone({ url: newUrl });
    }
  }
  return next(req);
};
```

Luego agregar al `app.config.ts`:

```typescript
provideHttpClient(
  withInterceptors([
    apiUrlInterceptor,  // Agregar este
    httpInterceptor,
    errorInterceptor
  ])
)
```

---

## ✅ Verificación

### 1. Verificar que ENV_API_URL esté configurado

En Railway:
- Ir a Proyecto → Frontend → Variables
- Verificar que `ENV_API_URL` esté configurado
- Debe ser: `https://people-dev-backend.railway.app` (o el dominio de producción)

### 2. Verificar en el navegador

1. Abrir la aplicación en el navegador
2. Abrir DevTools (F12) → Network
3. Intentar una acción que llame al backend
4. Verificar que la request vaya al dominio correcto del backend

### 3. Verificar CORS

Si ves errores de CORS:
- Verificar que el backend permita requests del frontend
- Verificar configuración de CORS en `server.ts`

---

## 🔄 Configuración por Ambiente

### Development
```bash
ENV_API_URL=https://people-dev-backend.railway.app
```

### Production
```bash
ENV_API_URL=https://people-prod-backend.railway.app
# O si usas dominio personalizado:
ENV_API_URL=https://api.people.blackdogpanama.com
```

---

## 📝 Notas Importantes

1. **Desarrollo Local**: Si `ENV_API_URL` no está configurado, el código debe usar rutas relativas (como ahora)

2. **Railway**: Siempre configurar `ENV_API_URL` en el servicio Frontend

3. **CORS**: El backend debe permitir requests del frontend. Verificar configuración en `server.ts`

4. **SSL**: Siempre usar `https://` en producción, nunca `http://`

---

## 🚨 Problemas Comunes

### Error: "Failed to fetch"
- Verificar que `ENV_API_URL` esté configurado correctamente
- Verificar que el backend esté activo
- Verificar que la URL sea correcta (con `https://`)

### Error: CORS
- Verificar configuración de CORS en el backend
- Verificar que `ENV_APP_URL` en el backend sea el dominio del frontend

### Error: 404 Not Found
- Verificar que la ruta del API sea correcta
- Verificar que el backend tenga el endpoint configurado

---

## 📚 Referencias

- [Angular HTTP Client](https://angular.io/guide/http)
- [Railway Environment Variables](https://docs.railway.app/develop/variables)
- [CORS Configuration](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

