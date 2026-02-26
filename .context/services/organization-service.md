---
title: OrganizationService
type: service
status: implemented
tags: [service, organization, multi-company]
source: src/app/services/organization.service.ts
related: [[api-url-service]], [[core-models]]
last-updated: 2026-02-13
---
# OrganizationService

> Gestiona el contexto multi-empresa. Determina qué company_id usar en cada query.

## Quick Summary
Servicio singleton que maneja la organización seleccionada (Black Dog / Naz), persiste en localStorage, y provee el `company_id` actual para filtrar queries.

## Empresas
- **Black Dog Panama** (BD) — Empresa principal
- **Naz** (NZ) — Segunda empresa

## API Principal

### `getCurrentCompanyId(): string | null`
Retorna el company_id de la organización seleccionada.

### `currentOrganization$(): Signal<Organization>`
Signal reactivo de la organización actual.

### `currentCompanyId$(): Signal<string | null>`
Signal reactivo del company_id.

### `setOrganization(org: Organization): void`
Cambia la organización seleccionada.

### `toggleOrganization(): void`
Alterna entre Black Dog y Naz.

### `getNazCompanyId(): string | null`
Retorna el company_id de Naz.

### `getBlackdogCompanyId(): string | null`
Retorna el company_id de Black Dog.

### `initializeCompanyIds(): Promise<void>`
Inicializa los company_ids desde la DB al arrancar la app.

### `waitForCompanyIds(): Promise<void>`
Espera a que los company_ids estén cargados.

## Persistencia
- Usa localStorage: `selected_organization` y `selected_company_id`
- Se restaura al recargar la página

## Uso en Stores
`entities.feature.ts` inyecta este servicio automáticamente para agregar `company_id` filter a todas las queries.

## Ubicación
`src/app/services/organization.service.ts` (482 líneas)
