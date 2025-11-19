-- ============================================
-- Agregar posiciones CEO y COO
-- ============================================
-- Este script agrega las posiciones CEO y COO al organigrama
-- Ejecutar en el SQL Editor de Supabase
-- 
-- Estructura del organigrama:
-- CEO (nivel superior)
--   └── COO
--       └── Gerente de Tienda (14 tiendas)
--           ├── Piso de Venta
--           ├── Médico Veterinario
--           └── Peluquero

-- Usar el department_id existente de Administración
-- (basado en el CSV, el department_id 'd9b1c8bc-e52b-44cc-9398-0ae7568b2ece' parece ser Administración)

-- Agregar posición CEO
-- Nota: Si la tabla positions tiene company_id, se incluirá. Si no, se omitirá.
INSERT INTO positions (id, name, department_id, schedule_admin, admin, schedule_approver) 
SELECT 
  '00000000-0000-0000-0000-000000000100'::uuid, 
  'CEO', 
  d.id,
  true, 
  true, 
  true
FROM departments d 
WHERE d.name ILIKE '%administraci%' OR d.name ILIKE '%direcci%' OR d.name ILIKE '%ejecutiva%'
LIMIT 1
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    schedule_admin = EXCLUDED.schedule_admin,
    admin = EXCLUDED.admin,
    schedule_approver = EXCLUDED.schedule_approver;

-- Agregar posición COO
INSERT INTO positions (id, name, department_id, schedule_admin, admin, schedule_approver) 
SELECT 
  '00000000-0000-0000-0000-000000000101'::uuid, 
  'COO', 
  d.id,
  true, 
  true, 
  true
FROM departments d 
WHERE d.name ILIKE '%administraci%' OR d.name ILIKE '%direcci%' OR d.name ILIKE '%ejecutiva%'
LIMIT 1
ON CONFLICT (id) DO UPDATE 
SET name = EXCLUDED.name,
    schedule_admin = EXCLUDED.schedule_admin,
    admin = EXCLUDED.admin,
    schedule_approver = EXCLUDED.schedule_approver;

-- Configurar jerarquía: COO reporta a CEO
INSERT INTO organization_chart (position_id, parent_position_id)
VALUES (
  '00000000-0000-0000-0000-000000000101'::uuid, -- COO
  '00000000-0000-0000-0000-000000000100'::uuid  -- CEO
)
ON CONFLICT (position_id) DO UPDATE 
SET parent_position_id = EXCLUDED.parent_position_id;

-- Nota importante:
-- Después de ejecutar este script, debes configurar manualmente en el organigrama:
-- 1. Cada uno de los 14 "Gerente de Tienda" debe reportar al COO
-- 2. Cada "Piso de Venta", "Médico Veterinario" y "Peluquero" debe reportar a su respectivo "Gerente de Tienda"
--
-- Puedes hacer esto desde la interfaz del organigrama en la aplicación.

