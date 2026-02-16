---
title: ApiUrlService
type: service
status: implemented
tags: [service, api, url, supabase]
source: src/app/services/api-url.service.ts
related: [[data-flow]], [[organization-service]]
last-updated: 2026-02-13
---
# ApiUrlService

> **OBLIGATORIO.** Todas las URLs de Supabase deben construirse con este servicio.

## Quick Summary
Servicio singleton que centraliza la construcción de URLs de Supabase via `getEnv('ENV_SUPABASE_URL')`.

## API

### `baseUrl: string`
Getter que retorna la base URL de Supabase.

### `build(resource, params?): string`
Construye URL completa con query params.

```typescript
// Ejemplo: obtener empleados activos
const url = this.apiUrl.build('rest/v1/employees', {
  company_id: `eq.${companyId}`,
  is_active: 'eq.true',
  select: 'id,first_name,father_name,position:positions(name)'
});
// → https://xxx.supabase.co/rest/v1/employees?company_id=eq.abc&is_active=eq.true&select=...

// Ejemplo: Storage upload URL
const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/BUCKET/${fileName}`;

// Ejemplo: Storage public URL
const publicUrl = this.apiUrl.build(`storage/v1/object/public/BUCKET/${fileName}`);
```

## ❌ PROHIBIDO
```typescript
// NUNCA usar process.env directamente
const url = `${process.env['ENV_SUPABASE_URL']}/rest/v1/...`;

// NUNCA usar getEnv() para construir URLs
const url = `${getEnv('ENV_SUPABASE_URL')}/rest/v1/...`;
```

## Ubicación
`src/app/services/api-url.service.ts` (26 líneas)
