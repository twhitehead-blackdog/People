-- ============================================
-- TEST: Verificar que la sintaxis explícita de foreign key funciona
-- ============================================
-- Este script prueba la query de timeoffs usando la sintaxis explícita
-- que especifica qué foreign key usar cuando hay múltiples relaciones
-- ============================================

-- NOTA: Este script es solo para referencia
-- La query real se hace a través de la API REST de Supabase
-- Para probar, usa el SQL Editor de Supabase o la API REST directamente

-- ============================================
-- OPCIÓN 1: Probar directamente en Supabase SQL Editor
-- ============================================
-- Copia y pega esta query en el SQL Editor de Supabase:

/*
SELECT 
  t.*,
  jsonb_build_object(
    'id', tt.id,
    'name', tt.name
  ) as type,
  jsonb_build_object(
    'id', e.id,
    'company_id', e.company_id
  ) as employee
FROM timeoffs t
INNER JOIN timeoff_types tt ON t.type_id = tt.id
INNER JOIN employees e ON t.employee_id = e.id
WHERE t.employee_id = 'TU_EMPLOYEE_ID_AQUI'
  AND t.type_id = 'f2d92995-96a0-414f-b64a-9823db776745'
  AND t.is_approved = true
  AND e.company_id = 'TU_COMPANY_ID_AQUI'
ORDER BY t.date_from DESC;
*/

-- ============================================
-- OPCIÓN 2: Probar con la API REST (recomendado)
-- ============================================
-- Usa curl, Postman, o el navegador para probar la query REST

-- Ejemplo con curl (reemplaza los valores):
/*
curl -X GET \
  'https://TU_PROYECTO.supabase.co/rest/v1/timeoffs?select=*,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,company_id)&employee_id=eq.TU_EMPLOYEE_ID&type_id=eq.f2d92995-96a0-414f-b64a-9823db776745&is_approved=eq.true&employee.company_id=eq.TU_COMPANY_ID&order=date_from.desc' \
  -H 'apikey: TU_ANON_KEY' \
  -H 'Authorization: Bearer TU_ANON_KEY'
*/

-- ============================================
-- OPCIÓN 3: Verificar que las foreign keys existen
-- ============================================
-- Ejecuta esto primero para verificar que las foreign keys tienen los nombres correctos:

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

-- Deberías ver:
-- ✅ time_offs_employee_id_fkey para employee_id
-- ✅ timeoffs_reviewed_by_fkey para reviewed_by
-- ✅ timeoffs_registered_by_fkey para registered_by

-- ============================================
-- OPCIÓN 4: Probar en el navegador (más fácil)
-- ============================================
-- 1. Ve a tu proyecto en Supabase Dashboard
-- 2. Ve a API > REST
-- 3. Prueba esta URL (reemplaza los valores):
/*
https://TU_PROYECTO.supabase.co/rest/v1/timeoffs?
  select=*,
  type:timeoff_types(id,name),
  employee:employees!time_offs_employee_id_fkey(id,company_id)
  &employee_id=eq.TU_EMPLOYEE_ID
  &type_id=eq.f2d92995-96a0-414f-b64a-9823db776745
  &is_approved=eq.true
  &employee.company_id=eq.TU_COMPANY_ID
  &order=date_from.desc
*/

-- Si funciona correctamente, deberías recibir:
-- ✅ Status: 200 OK
-- ✅ Un array JSON con los timeoffs y sus relaciones embebidas

-- Si da error, verás:
-- ❌ Status: 300 OK (o 400 Bad Request)
-- ❌ Mensaje: "Could not embed because more than one relationship was found..."

-- ============================================
-- OPCIÓN 5: Probar desde la consola del navegador
-- ============================================
-- Abre la consola del navegador (F12) y ejecuta:

/*
fetch('https://TU_PROYECTO.supabase.co/rest/v1/timeoffs?select=*,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,company_id)&employee_id=eq.TU_EMPLOYEE_ID&type_id=eq.f2d92995-96a0-414f-b64a-9823db776745&is_approved=eq.true&employee.company_id=eq.TU_COMPANY_ID&order=date_from.desc', {
  headers: {
    'apikey': 'TU_ANON_KEY',
    'Authorization': 'Bearer TU_ANON_KEY'
  }
})
.then(res => {
  console.log('Status:', res.status);
  return res.json();
})
.then(data => {
  console.log('✅ Éxito:', data);
})
.catch(error => {
  console.error('❌ Error:', error);
});
*/

-- ============================================
-- INSTRUCCIONES PASO A PASO
-- ============================================

-- 1. Obtén los valores necesarios:
--    - TU_PROYECTO: Tu URL de Supabase (ej: fsrptlzaqjkcutoiivjr)
--    - TU_ANON_KEY: Tu anon key de Supabase (Dashboard > Settings > API)
--    - TU_EMPLOYEE_ID: ID de un empleado de prueba
--    - TU_COMPANY_ID: ID de la compañía

-- 2. Verifica las foreign keys (ejecuta OPCIÓN 3)

-- 3. Prueba la query (usa OPCIÓN 4 o 5)

-- 4. Verifica el resultado:
--    ✅ Status 200 = Funciona correctamente
--    ❌ Status 300 = Todavía hay ambigüedad (verifica nombres de FK)
--    ❌ Status 400 = Error de sintaxis (revisa la query)

-- ============================================
-- QUERY DE PRUEBA SIMPLIFICADA (sin filtros)
-- ============================================
-- Para probar solo la sintaxis de la relación:

/*
SELECT 
  t.id,
  t.date_from,
  t.date_to,
  jsonb_build_object(
    'id', tt.id,
    'name', tt.name
  ) as type,
  jsonb_build_object(
    'id', e.id,
    'company_id', e.company_id
  ) as employee
FROM timeoffs t
INNER JOIN timeoff_types tt ON t.type_id = tt.id
INNER JOIN employees e ON t.employee_id = e.id
LIMIT 5;
*/

