-- ============================================
-- DAR PERMISO DE APROBACIÓN A soporte2@blackdogpanama.com
-- ============================================
-- Este script actualiza la posición del usuario soporte2
-- para que pueda aprobar turnos de empleados
-- ============================================

-- Ver información actual del usuario
SELECT 
  e.id as employee_id,
  e.first_name,
  e.father_name,
  e.work_email,
  e.position_id,
  p.name as position_name,
  p.schedule_approver as puede_aprobar_actualmente,
  p.schedule_admin
FROM employees e
LEFT JOIN positions p ON e.position_id = p.id
WHERE e.work_email = 'soporte2@blackdogpanama.com';

-- ============================================
-- EJECUTAR ESTO PARA DAR EL PERMISO
-- ============================================

UPDATE positions 
SET schedule_approver = true 
WHERE id = (
  SELECT position_id 
  FROM employees 
  WHERE work_email = 'soporte2@blackdogpanama.com'
);

-- ============================================
-- VERIFICAR QUE SE APLICÓ CORRECTAMENTE
-- ============================================

SELECT 
  e.first_name,
  e.father_name,
  e.work_email,
  p.name as position_name,
  p.schedule_approver as ✅_puede_aprobar_ahora,
  p.schedule_admin
FROM employees e
LEFT JOIN positions p ON e.position_id = p.id
WHERE e.work_email = 'soporte2@blackdogpanama.com';

-- ============================================
-- ✅ RESULTADO ESPERADO:
-- ✅_puede_aprobar_ahora = true
-- ============================================
