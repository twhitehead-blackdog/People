---
title: Patterns
type: architecture
status: current
tags: [patterns, signals, stores, components]
related: [[data-flow]], [[stack-overview]]
last-updated: 2026-02-13
---
# Patterns

## 1. Component-as-Orchestrator

Componentes son **solo orquestadores**: inyectan services/stores, bindan signals, manejan navegación.

**NO deben contener:**
- Lógica de negocio compleja (>30-40 líneas)
- Llamadas API directas
- Permission checks
- Cálculos de fechas/horas
- Construcción de payloads

**Target:** Componentes < 300 líneas

| Tipo de código | Ubicación |
|----------------|-----------|
| Cálculos puros | `utils/*.utils.ts` |
| Reglas de negocio | `services/*.service.ts` |
| Form submits complejos | `actions/*.actions.ts` |
| Estado compartido | `stores/*.store.ts` |
| Templates grandes | Split en subcomponents |

## 2. NgRX Signal Store + Entity Factory

`entities.feature.ts` provee `withCustomEntities()` — factory para crear stores CRUD con:

```typescript
const EmployeesStore = signalStore(
  { providedIn: 'root' },
  withCustomEntities({ name: 'employees', query: '*', order: 'first_name' })
);
```

**Incluye automáticamente:**
- `loadItems()` - carga con company_id filter
- `createItem()` / `editItem()` / `deleteItem()` - CRUD
- `selectEntity()` - selección
- **Caching** por duración configurable
- **company_id filtering** automático via OrganizationService

**Cache durations:**
| Entidad | Duración |
|---------|----------|
| companies, branches | 30 min |
| departments, positions, schedules | 30 min |
| employees | 5 min |
| timelogs | 2 min |
| default | 5 min |

## 3. Multi-Company Filtering

**TODAS las queries deben incluir `company_id`** (excepto tabla `companies`).

```typescript
// El entities.feature.ts lo agrega automáticamente
// Usa OrganizationService.getCurrentCompanyId()
```

**Empresas:** Black Dog (BD) y Naz (NZ).
- Employee numbers: `BD0001`, `NZ0001` (por empresa)
- Organización se persiste en localStorage

## 4. Supabase httpResource Pattern

```typescript
// En componentes — query reactiva
public myData = httpResource<MyType[]>({
  url: computed(() => this.apiUrl.build('rest/v1/my_table', {
    company_id: `eq.${this.orgService.getCurrentCompanyId()}`,
    select: '*'
  }))
});
```

## 5. File Upload Pattern (Supabase Storage)

```typescript
// Signals necesarios
public myFile = signal<File | null>(null);
public myDocUrl = signal<string | null>(null);
public uploadingMyDoc = signal<boolean>(false);

// Upload usa apiUrl.baseUrl + storage/v1/object/BUCKET_NAME/path
// Public URL usa apiUrl.build('storage/v1/object/public/BUCKET_NAME/path')
```

**Buckets disponibles:** `disabilities`, `compensatory`, `employee-documents`

## 6. PostgREST: Múltiples FKs a la Misma Tabla

Cuando una tabla tiene múltiples FKs a `employees`, PostgREST NO puede resolver automáticamente.

```typescript
// ❌ Error: PGRST201
const select = `*,employee:employees(id,first_name)`;

// ✅ Especificar FK
const select = `*,employee:employees!timelogs_employee_id_fkey(id,first_name)`;

// ✅ Con INNER JOIN
const select = `*,employee:employees!timelogs_employee_id_fkey!inner(id,first_name)`;
```

**Tablas afectadas:** `timelogs`, `employee_disabilities`, `employee_vacations`, `document_requests`, `time_offs`

**Patrón FK:** `{tabla}_{columna}_fkey`
