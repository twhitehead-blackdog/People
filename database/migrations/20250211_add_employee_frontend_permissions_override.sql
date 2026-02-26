-- Migración: Agregar frontend_permissions_override a employees
-- Permite personalizar permisos de frontend por empleado individual
-- Si es NULL, se usan los permisos del cargo (position.frontend_permissions)

ALTER TABLE employees ADD COLUMN IF NOT EXISTS frontend_permissions_override JSONB DEFAULT NULL;

COMMENT ON COLUMN employees.frontend_permissions_override IS
  'Override de permisos de frontend por empleado. NULL = usar permisos del cargo. Estructura: {version: number, modules: Record<string, ModulePermission>}';
