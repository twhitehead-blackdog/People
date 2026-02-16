---
title: Data Flow
type: architecture
status: current
tags: [data-flow, api, supabase, httpresource]
related: [[stack-overview]], [[patterns]]
source: src/app/services/api-url.service.ts
last-updated: 2026-02-13
---
# Data Flow

## Flujo Principal: Component → Supabase

```
Component (signal/computed)
  → httpResource (Angular)
    → ApiUrlService.build('rest/v1/table', params)
      → HTTP Interceptor (agrega apikey + Bearer token)
        → PostgREST (Supabase)
          → PostgreSQL (con RLS)
```

## ApiUrlService

```typescript
// Construye URLs de Supabase — OBLIGATORIO para todas las queries
const url = this.apiUrl.build('rest/v1/employees', {
  company_id: `eq.${companyId}`,
  select: 'id,name,position:positions(name)'
});
```

**Ubicación:** `src/app/services/api-url.service.ts`
**Base URL:** Viene de `getEnv('ENV_SUPABASE_URL')`

## Interceptors

### HTTP Interceptor (`src/app/interceptors/http.interceptor.ts`)
- Agrega `apikey` header a todas las requests a Supabase
- Agrega `Authorization: Bearer` con token de Auth0
- Usa `service_role_key` para endpoints whitelisted (storage uploads)

### API URL Interceptor (`src/app/interceptors/api-url.interceptor.ts`)
- Para requests a `/api/*` (backend Express)
- Si `ENV_API_URL` está seteado → reescribe a URL absoluta
- Si no → queda relativo (dev con proxy)

## Proxy en Desarrollo
- `proxy.conf.js` proxea `/api/*` a `http://localhost:4000`
- Angular dev server en `:4200`, Express en `:4000`

## Flujo Backend → Odoo (opcional)
```
Frontend → /api/odoo/sale-orders → Express → JSON-RPC → Odoo 18
```
