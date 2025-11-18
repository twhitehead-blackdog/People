-- ============================================
-- Agregar campo de aprobación de cuenta
-- ============================================
-- Este script agrega el campo account_approved a la tabla employees
-- para controlar el acceso de nuevas cuentas

-- Agregar columna account_approved
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS account_approved BOOLEAN DEFAULT NULL;

-- Comentario para documentar el campo
COMMENT ON COLUMN employees.account_approved IS 'Indica si la cuenta del empleado ha sido aprobada. NULL = pendiente, TRUE = aprobado, FALSE = rechazado';

-- Crear índice para búsquedas rápidas de cuentas pendientes
CREATE INDEX IF NOT EXISTS idx_employees_account_approved 
ON employees(account_approved) 
WHERE account_approved IS NULL OR account_approved = FALSE;

-- Actualizar empleados existentes que tienen has_portal_access = true
-- para que tengan account_approved = true
UPDATE employees
SET account_approved = TRUE
WHERE has_portal_access = TRUE AND account_approved IS NULL;

