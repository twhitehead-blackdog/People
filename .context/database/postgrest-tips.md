---
title: PostgREST Tips
type: database
status: current
tags: [database, postgrest, supabase, queries]
related: [[api-url-service]], [[patterns]]
last-updated: 2026-02-13
---
# PostgREST Tips

## Query Basics

```typescript
// SELECT con filtros
this.apiUrl.build('rest/v1/employees', {
  company_id: `eq.${companyId}`,
  is_active: 'eq.true',
  select: 'id,first_name,father_name',
  order: 'first_name.asc'
});

// JOIN (embedded resources)
select: 'id,name,position:positions(name),branch:branches(name)'

// Filtro con IN
status: 'in.(pending,approved)'

// Filtro con LIKE
first_name: 'ilike.*john*'

// Filtro con rango de fechas
created_at: 'gte.2026-01-01'
```

## ⚠️ Múltiples FKs a la Misma Tabla (CRÍTICO)

Cuando una tabla tiene múltiples FKs apuntando a `employees`, PostgREST NO puede resolver automáticamente.

### Error Típico
```
PGRST201: Could not embed because more than one relationship was found
```

### Solución: Especificar FK

```typescript
// ❌ INCORRECTO — PostgREST no sabe cuál FK usar
select: '*,employee:employees(id,first_name)'

// ✅ CORRECTO — Especificar la FK (LEFT JOIN por defecto)
select: '*,employee:employees!timelogs_employee_id_fkey(id,first_name)'

// ✅ CORRECTO — Con INNER JOIN
select: '*,employee:employees!timelogs_employee_id_fkey!inner(id,first_name)'

// ✅ CORRECTO — Obtener el creador
select: '*,creator:employees!timelogs_created_by_fkey(id,first_name)'
```

### Orden de Modifiers
`!fk_name!inner` → FK primero, inner después.

### Tablas Afectadas

| Tabla | FK Principal | FK Secundaria |
|-------|-------------|---------------|
| `timelogs` | `timelogs_employee_id_fkey` | `timelogs_created_by_fkey` |
| `employee_disabilities` | `employee_disabilities_employee_id_fkey` | `employee_disabilities_created_by_fkey` |
| `employee_vacations` | `employee_vacations_employee_id_fkey` | `employee_vacations_created_by_fkey` |
| `document_requests` | `document_requests_employee_id_fkey` | `document_requests_created_by_fkey` |
| `time_offs` | `time_offs_employee_id_fkey` | `timeoffs_created_by_fkey` |

### Patrón de Nombres FK
`{tabla}_{columna}_fkey`

### Checklist al Agregar FK a employees
1. Buscar TODAS las queries que usen esa tabla con `employees`
2. Actualizar cada una para especificar `!nombre_de_la_fk`
3. Si usaba `!inner`, mantenerlo: `employees!fk_name!inner`

## UPSERT

```typescript
// Headers para upsert
headers: {
  'Prefer': 'resolution=merge-duplicates',
  'Content-Type': 'application/json'
}
```

## Paginación

```typescript
// Limitar resultados
limit: '50'
offset: '100'

// Header para obtener count
headers: { 'Prefer': 'count=exact' }
```
