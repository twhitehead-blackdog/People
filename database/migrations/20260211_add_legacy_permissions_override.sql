-- Migración: Agregar legacy_permissions_override a employees
-- Permite personalizar permisos legacy (admin, schedule_admin, etc.) por empleado individual
-- Si es NULL, se usan los permisos del cargo (position)

ALTER TABLE employees ADD COLUMN IF NOT EXISTS legacy_permissions_override JSONB DEFAULT NULL;

COMMENT ON COLUMN employees.legacy_permissions_override IS
  'Override de permisos legacy por empleado. NULL = usar permisos del cargo. Estructura: Record<LegacyPermissionKey, boolean>';
