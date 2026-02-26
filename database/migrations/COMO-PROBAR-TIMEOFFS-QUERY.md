# Cómo Probar que la Sintaxis de Foreign Key Funciona en Supabase

## 🎯 Método Más Rápido: Usar el Dashboard de Supabase

### Paso 1: Obtener los valores necesarios

1. **URL de tu proyecto Supabase:**

   - Ve a tu Dashboard de Supabase
   - Copia la URL (ejemplo: `https://fsrptlzaqjkcutoiivjr.supabase.co`)

2. **Anon Key:**

   - Dashboard > Settings > API
   - Copia la "anon" key (pública)

3. **Employee ID y Company ID:**
   - Puedes obtenerlos de tu base de datos o de la aplicación

### Paso 2: Probar la Query en el Navegador

1. Abre una nueva pestaña en tu navegador
2. Pega esta URL (reemplaza los valores):

```
https://TU_PROYECTO.supabase.co/rest/v1/timeoffs?select=*,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,company_id)&employee_id=eq.TU_EMPLOYEE_ID&type_id=eq.f2d92995-96a0-414f-b64a-9823db776745&is_approved=eq.true&employee.company_id=eq.TU_COMPANY_ID&order=date_from.desc
```

3. Antes de presionar Enter, abre las DevTools (F12) > Network
4. Presiona Enter
5. Verás una petición en la pestaña Network

### Paso 3: Verificar el Resultado

**✅ Si funciona correctamente:**

- Status: `200 OK` (o `200` en la pestaña Network)
- Verás un array JSON con los timeoffs y sus relaciones embebidas
- Ejemplo de respuesta:

```json
[
  {
    "id": "...",
    "date_from": "2024-01-01",
    "date_to": "2024-01-05",
    "type": {
      "id": "f2d92995-96a0-414f-b64a-9823db776745",
      "name": "Compensatorio"
    },
    "employee": {
      "id": "...",
      "company_id": "..."
    }
  }
]
```

**❌ Si da error:**

- Status: `300 OK` o `400 Bad Request`
- Verás un mensaje de error como:

```json
{
  "code": "PGRST201",
  "message": "Could not embed because more than one relationship was found..."
}
```

---

## 🔧 Método Alternativo: Usar la Consola del Navegador

1. Abre la consola del navegador (F12 > Console)
2. Pega y ejecuta este código (reemplaza los valores):

```javascript
const supabaseUrl = 'https://TU_PROYECTO.supabase.co';
const anonKey = 'TU_ANON_KEY';
const employeeId = 'TU_EMPLOYEE_ID';
const companyId = 'TU_COMPANY_ID';

const url = `${supabaseUrl}/rest/v1/timeoffs?select=*,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,company_id)&employee_id=eq.${employeeId}&type_id=eq.f2d92995-96a0-414f-b64a-9823db776745&is_approved=eq.true&employee.company_id=eq.${companyId}&order=date_from.desc`;

fetch(url, {
  headers: {
    apikey: anonKey,
    Authorization: `Bearer ${anonKey}`,
  },
})
  .then((res) => {
    console.log('Status:', res.status, res.statusText);
    if (!res.ok) {
      return res.json().then((err) => {
        throw new Error(JSON.stringify(err, null, 2));
      });
    }
    return res.json();
  })
  .then((data) => {
    console.log('✅ Éxito! Datos:', data);
    console.log('Cantidad de registros:', data.length);
  })
  .catch((error) => {
    console.error('❌ Error:', error);
  });
```

3. Verás el resultado en la consola

---

## 📋 Método con SQL Editor (para verificar foreign keys)

1. Ve a Supabase Dashboard > SQL Editor
2. Ejecuta esta query para verificar que las foreign keys tienen los nombres correctos:

```sql
SELECT
    tc.constraint_name AS "Nombre de la Foreign Key",
    tc.table_name AS "Tabla",
    kcu.column_name AS "Columna",
    ccu.table_name AS "Tabla Referenciada",
    ccu.column_name AS "Columna Referenciada"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'timeoffs'
    AND kcu.column_name IN ('employee_id', 'reviewed_by', 'registered_by')
ORDER BY kcu.column_name;
```

**Deberías ver:**

- ✅ `time_offs_employee_id_fkey` para `employee_id`
- ✅ `timeoffs_reviewed_by_fkey` para `reviewed_by`
- ✅ `timeoffs_registered_by_fkey` para `registered_by`

---

## 🧪 Comparar: Con vs Sin Sintaxis Explícita

### Query CON sintaxis explícita (debería funcionar):

```
select=*,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,company_id)
```

### Query SIN sintaxis explícita (debería fallar):

```
select=*,type:timeoff_types(id,name),employee:employees(id,company_id)
```

Prueba ambas y compara los resultados.

---

## ✅ Checklist de Verificación

- [ ] Las foreign keys tienen los nombres correctos (`time_offs_employee_id_fkey`)
- [ ] La query con sintaxis explícita devuelve Status 200
- [ ] La respuesta incluye los datos de `type` y `employee` embebidos
- [ ] El filtro `employee.company_id` funciona correctamente
- [ ] No hay errores HTTP 300

---

## 🆘 Si Sigue Dando Error

1. **Verifica los nombres de las foreign keys:**

   - Ejecuta la query SQL de verificación
   - Asegúrate de que `time_offs_employee_id_fkey` existe

2. **Si los nombres son diferentes:**

   - Ejecuta la migración `fix-timeoffs-foreign-keys-names.sql`
   - O ajusta la query para usar el nombre correcto

3. **Verifica que tienes datos:**
   - Asegúrate de que existen timeoffs con los filtros aplicados
   - Prueba sin filtros primero: `?select=*,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,company_id)&limit=5`
