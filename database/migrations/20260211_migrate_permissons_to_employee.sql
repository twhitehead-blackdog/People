-- Migración: Copiar permisos de Cargo a Empleado (Employee-Only Model)
-- 1. Copiar frontend_permissions
UPDATE employees e
SET frontend_permissions_override = p.frontend_permissions
FROM positions p
WHERE e.position_id = p.id
  AND e.frontend_permissions_override IS NULL
  AND p.frontend_permissions IS NOT NULL;

-- 2. Copiar legacy_permissions (admin, schedule_admin, etc.)
-- Construimos un JSON con los valores del cargo y lo guardamos en legacy_permissions_override
UPDATE employees e
SET legacy_permissions_override = jsonb_build_object(
  'admin', p.admin,
  'schedule_admin', p.schedule_admin,
  'schedule_approver', p.schedule_approver,
  'dashboard_access', p.dashboard_access
)
FROM positions p
WHERE e.position_id = p.id
  AND e.legacy_permissions_override IS NULL;
