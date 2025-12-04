-- ============================================
-- AGREGAR CAMPOS FALTANTES A positions
-- ============================================
-- Este script agrega los campos dashboard_access y default_view
-- que son necesarios para el funcionamiento del sistema
-- ============================================

-- Agregar campo dashboard_access si no existe
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS dashboard_access BOOLEAN DEFAULT false;

-- Agregar campo default_view si no existe
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS default_view VARCHAR(100);

-- Comentarios en los campos
COMMENT ON COLUMN positions.dashboard_access IS 
'Indica si la posición tiene acceso al dashboard administrativo';

COMMENT ON COLUMN positions.default_view IS 
'Vista por defecto del dashboard para esta posición';

-- ============================================
-- ¡LISTO! Los campos han sido agregados
-- ============================================

