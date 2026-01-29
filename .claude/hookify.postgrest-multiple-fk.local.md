---
name: postgrest-multiple-fk-warning
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: \.(ts|tsx)$
  - field: new_text
    operator: regex_match
    pattern: timelogs.*employee:employees\(|timelogs.*employee:employees!inner\(
---

## PostgREST: Multiples FK Detectadas

**Problema detectado:** Estas escribiendo una consulta de `timelogs` que hace join con `employees` SIN especificar la FK.

La tabla `timelogs` tiene **DOS foreign keys** a `employees`:
- `employee_id` -> `timelogs_employee_id_fkey`
- `created_by` -> `timelogs_created_by_fkey`

**PostgREST no puede determinar automaticamente cual usar** y devolvera error PGRST201.

### Codigo incorrecto:
```typescript
select: `*,employee:employees(id,first_name)`
select: `*,employee:employees!inner(id,first_name)`
```

### Codigo correcto:
```typescript
// LEFT JOIN (sin filtro por employee)
select: `*,employee:employees!timelogs_employee_id_fkey(id,first_name)`

// INNER JOIN (cuando se filtra por employee.is_active, etc.)
select: `*,employee:employees!timelogs_employee_id_fkey!inner(id,first_name,is_active)`

// Para obtener quien creo el timelog manual
select: `*,creator:employees!timelogs_created_by_fkey(id,first_name)`
```

**IMPORTANTE:** Si la consulta original usaba `!inner`, DEBE mantenerlo: `!fk_name!inner`
Sin `!inner`, filtros como `employee.is_active=eq.true` NO filtran los registros principales.

### Referencia
Ver seccion "PostgREST: Multiples Foreign Keys" en `CLAUDE.md`.
