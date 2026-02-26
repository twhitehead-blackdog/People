---
description: Debuggear errores de API Supabase (400, 401, 403, 500)
---

# Debug API Workflow

Este workflow guía el debugging de errores de Supabase.

## Diagnóstico Rápido

### Error 400 (Bad Request)

Causa: Query malformada o campo inexistente.

1. Verificar la URL en Network tab del DevTools
2. Revisar parámetros del `select`
3. Confirmar que los campos existen en la tabla
4. Verificar filtros (eq, in, gte, etc.)

```typescript
// ❌ Campo inexistente
select: 'id,nonexistent_field';

// ✅ Solo campos que existen
select: 'id,name,created_at';
```

### Error 401 (Unauthorized)

Causa: Token inválido o endpoint no whitelisted.

1. Verificar si el endpoint necesita service role key
2. Revisar `http.interceptor.ts`
3. Agregar a `needsServiceRoleKey` si es necesario

```typescript
// En http.interceptor.ts
const needsServiceRoleKey = [
  '/rest/v1/employees',
  '/rest/v1/timelogs',
  // Agregar endpoint aquí
  '/rest/v1/tu_endpoint',
];
```

### Error 403 (Forbidden)

Causa: RLS policies o permisos insuficientes.

1. Verificar Row Level Security en Supabase
2. Confirmar que company_id está en el filtro
3. Revisar policies de la tabla

### Error 500 (Server Error)

Causa: Error en Supabase o RPC.

1. Revisar logs en Supabase Dashboard
2. Verificar sintaxis de RPC functions
3. Buscar errores en funciones PLpgSQL

## Pasos de Debug

// turbo

### 1. Abrir DevTools

```
F12 → Network tab → filtrar por "rest"
```

### 2. Reproducir el error

Ejecutar la acción que causa el error.

### 3. Inspeccionar request

- **URL**: ¿Está bien formada?
- **Headers**: ¿Tiene Authorization?
- **Response**: ¿Qué dice el mensaje de error?

### 4. Verificar interceptor

```typescript
// Buscar en http.interceptor.ts
grep -n "needsServiceRoleKey" src/app/interceptors/
```

### 5. Probar en Supabase

- Ir a Table Editor
- Ejecutar query equivalente
- Verificar RLS policies

## Herramientas Útiles

```typescript
// Agregar logging temporal
console.log('Request URL:', url);
console.log('Request params:', params);

// DiagnosticService para debugging
private diagnostic = inject(DiagnosticService);
this.diagnostic.log('API', 'Request failed', { url, error });
```

## Checklist de Verificación

- [ ] ¿El endpoint está en `needsServiceRoleKey`?
- [ ] ¿Los campos del `select` existen?
- [ ] ¿El filtro `company_id` está presente?
- [ ] ¿La tabla tiene RLS habilitado?
- [ ] ¿El token/API key es válido?
