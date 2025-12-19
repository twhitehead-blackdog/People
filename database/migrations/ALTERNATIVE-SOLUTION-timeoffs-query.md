# Solución Alternativa: Usar sintaxis explícita de foreign key

## Si necesitas mantener la relación `employee`

Si en el futuro necesitas acceder a datos del empleado (como `company_id`), puedes usar la sintaxis que Supabase sugiere:

### Código con relación explícita:

```typescript
public timeoffsApi = httpResource<any[]>(() => {
  if (!this.currentEmployee()?.id) return undefined;
  const companyId = this.organizationService.getCurrentCompanyId();

  if (!companyId) {
    return undefined;
  }

  const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';
  const baseUrl = `${process.env['ENV_SUPABASE_URL']}/rest/v1/timeoffs`;
  
  // Usar la sintaxis explícita que Supabase sugiere:
  // employees!time_offs_employee_id_fkey especifica explícitamente qué foreign key usar
  const select = `*,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,company_id)`;

  let url = `${baseUrl}?select=${encodeURIComponent(select)}`;
  url += `&employee_id=eq.${this.currentEmployee()!.id}`;
  url += `&type_id=eq.${compensatoryTypeId}`;
  url += `&is_approved=eq.true`;
  // Ahora SÍ puedes filtrar por employee.company_id porque especificaste la FK explícitamente
  url += `&employee.company_id=eq.${companyId}`;
  url += `&order=date_from.desc`;

  return {
    url,
    method: 'GET',
  };
}, {
  defaultValue: [],
});
```

### Las tres opciones de foreign keys disponibles:

1. **`employees!time_offs_employee_id_fkey`** - Para la relación `employee_id` (el empleado que solicita)
2. **`employees!timeoffs_reviewed_by_fkey`** - Para la relación `reviewed_by` (el empleado que revisa)
3. **`employees!timeoffs_registered_by_fkey`** - Para la relación `registered_by` (el empleado que registra)

### Ejemplo con múltiples relaciones:

```typescript
// Si necesitas todas las relaciones:
const select = `*,
  type:timeoff_types(id,name),
  employee:employees!time_offs_employee_id_fkey(id,company_id),
  reviewer:employees!timeoffs_reviewed_by_fkey(id,name),
  registrar:employees!timeoffs_registered_by_fkey(id,name)`;
```

## ¿Cuándo usar cada solución?

### Usar Opción 1 (sin relación) cuando:
- ✅ Solo necesitas campos directos de `timeoffs` (como `date_from`, `date_to`)
- ✅ Ya tienes el `employee_id` y no necesitas más datos del empleado
- ✅ Quieres la consulta más simple y eficiente

### Usar Opción 2 (con relación explícita) cuando:
- ✅ Necesitas datos del empleado (como `company_id`, `name`, etc.)
- ✅ Quieres filtrar por `employee.company_id` directamente en la query
- ✅ Necesitas múltiples relaciones (employee, reviewer, registrar)

## Estado actual

**Solución implementada: Opción 1** (sin relación)
- ✅ Más eficiente porque no hace JOIN innecesario
- ✅ `approvedCompensatoryHours` solo usa `date_from` y `date_to`
- ✅ El filtro por `company_id` ya está garantizado por `currentEmployee()`

Si en el futuro necesitas la relación, simplemente cambia a la Opción 2 usando la sintaxis explícita.

