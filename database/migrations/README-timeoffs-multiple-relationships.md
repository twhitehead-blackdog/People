# Problema: Múltiples relaciones entre timeoffs y employees

## Contexto

La tabla `timeoffs` tiene múltiples foreign keys que apuntan a la tabla `employees`:

1. **`employee_id`** → `employees(id)` - El empleado que solicita el timeoff (original)
2. **`reviewed_by`** → `employees(id)` - El empleado que revisa la solicitud (agregado en `add-compensatory-review-fields.sql`)
3. **`registered_by`** → `employees(id)` - El empleado que registra la solicitud aprobada (agregado en `add-compensatory-review-fields.sql`)

## Problema

Cuando Supabase/PostgREST intenta hacer un join automático usando `employee:employees(...)`, no sabe cuál de las tres relaciones usar, resultando en el error:

```
HTTP 300: Could not embed because more than one relationship was found for 'timeoffs' and 'employees'
```

## Solución

### Opción 1: Especificar explícitamente la foreign key (si necesitas la relación)

Si realmente necesitas la relación `employee` en tu consulta, debes especificar explícitamente qué foreign key usar:

```typescript
// Para usar employee_id:
const select = `*,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,company_id)`;

// Para usar reviewed_by:
const select = `*,type:timeoff_types(id,name),reviewer:employees!timeoffs_reviewed_by_fkey(id,name)`;

// Para usar registered_by:
const select = `*,type:timeoff_types(id,name),registrar:employees!timeoffs_registered_by_fkey(id,name)`;
```

### Opción 2: Eliminar la relación si no es necesaria (recomendado)

Si no necesitas los datos del empleado en la consulta (como en nuestro caso de `approvedCompensatoryHours`), simplemente elimina la relación:

```typescript
// Solo necesitamos date_from y date_to, que son campos directos de timeoffs
const select = `*,type:timeoff_types(id,name)`;
```

## Migración que causó el cambio

La migración `add-compensatory-review-fields.sql` agregó las columnas `reviewed_by` y `registered_by`, creando las relaciones adicionales que causaron el problema.

## Referencias

- [PostgREST Documentation - Multiple Foreign Keys](https://postgrest.org/en/stable/api.html#embedding-with-foreign-keys)
- [Supabase Documentation - Relationships](https://supabase.com/docs/guides/api/joins-and-nesting)

