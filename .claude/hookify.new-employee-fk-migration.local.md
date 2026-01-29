---
name: new-employee-fk-migration-warning
enabled: true
event: file
conditions:
  - field: file_path
    operator: regex_match
    pattern: migrations.*\.sql$
  - field: new_text
    operator: regex_match
    pattern: REFERENCES\s+employees\s*\(id\)|UUID\s+REFERENCES\s+employees
---

## ⚠️ Nueva FK a employees detectada en migración

**IMPORTANTE:** Estás agregando una nueva Foreign Key que referencia a `employees`.

Si la tabla ya tiene otra FK a `employees` (como `employee_id`), esto causará **error PGRST201** en TODAS las consultas existentes que hagan join con `employees`.

### Checklist obligatorio:

1. **Verificar FKs existentes:**
   ```sql
   SELECT conname, conrelid::regclass
   FROM pg_constraint
   WHERE confrelid = 'employees'::regclass;
   ```

2. **Si ya existe otra FK a employees:**
   - Buscar TODAS las consultas en el código que usen esta tabla con `employees`
   - Actualizar cada una para especificar explícitamente la FK:
     ```typescript
     // Antes (fallará)
     employee:employees(id,name)

     // Después (funciona)
     employee:employees!{tabla}_{columna}_fkey(id,name)
     ```

3. **Archivos típicos a revisar:**
   - `*-api.service.ts`
   - `*.component.ts` (httpResource, consultas)
   - `*-data.service.ts`
   - Stores (`*.store.ts`)

### Referencia
Ver sección "PostgREST: Múltiples Foreign Keys" en `CLAUDE.md`.
