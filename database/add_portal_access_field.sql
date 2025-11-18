-- Agregar campo para controlar acceso al portal de empleados
-- Ejecutar este script en Supabase

ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS has_portal_access BOOLEAN DEFAULT false;

-- Comentario para documentar el campo
COMMENT ON COLUMN employees.has_portal_access IS 'Indica si el empleado tiene acceso al portal de empleados. Los empleados con este campo en true solo pueden acceder al portal, no a otras secciones administrativas.';

-- Índice para mejorar consultas
CREATE INDEX IF NOT EXISTS idx_employees_portal_access ON employees(has_portal_access) WHERE has_portal_access = true;

