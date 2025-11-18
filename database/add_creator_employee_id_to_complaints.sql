-- ============================================
-- Agregar campo creator_employee_id a complaints
-- ============================================
-- Este campo almacena siempre el ID del empleado que creó la queja,
-- incluso si es anónima. Se usa solo para uso interno y para que
-- los empleados puedan ver sus propias quejas anónimas.
-- ============================================

-- Agregar columna creator_employee_id a la tabla complaints
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS creator_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_complaints_creator_employee_id ON complaints(creator_employee_id);

-- Comentario para documentación
COMMENT ON COLUMN complaints.creator_employee_id IS 'ID del empleado que creó la queja (siempre se guarda, incluso si es anónima). Solo para uso interno.';

-- Actualizar quejas existentes sin creator_employee_id
-- Si tienen employee_id, usar ese valor; si no, dejarlo NULL
UPDATE complaints
SET creator_employee_id = employee_id
WHERE creator_employee_id IS NULL AND employee_id IS NOT NULL;

