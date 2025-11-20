-- ============================================
-- Migración: Agregar campos dashboard_access y default_view a positions
-- ============================================
-- Fecha: 2024
-- Descripción: Agrega permisos de acceso al dashboard y vista predeterminada para posiciones
-- ============================================

-- Agregar columna dashboard_access (permiso de acceso al dashboard)
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS dashboard_access BOOLEAN DEFAULT true;

-- Agregar columna default_view (vista predeterminada al iniciar sesión)
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS default_view VARCHAR(50);

-- Comentarios para documentación
COMMENT ON COLUMN positions.dashboard_access IS 'Permite o deniega el acceso al dashboard principal';
COMMENT ON COLUMN positions.default_view IS 'Vista predeterminada a la que se redirige al usuario al iniciar sesión (home, admin, payroll, time-management, employee-portal)';

-- Actualizar posiciones existentes para que tengan acceso al dashboard por defecto
UPDATE positions 
SET dashboard_access = true 
WHERE dashboard_access IS NULL;

