-- ============================================
-- Migración: Agregar campo available_for_job_fair a positions
-- ============================================
-- Fecha: 2024
-- Descripción: Agrega campo para habilitar/deshabilitar posiciones en la feria de empleo
-- ============================================

-- Agregar columna available_for_job_fair (disponible para feria de empleo)
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS available_for_job_fair BOOLEAN DEFAULT true;

-- Comentario para documentación
COMMENT ON COLUMN positions.available_for_job_fair IS 'Indica si la posición está disponible para selección en el formulario de feria de empleo';

-- Actualizar posiciones existentes para que estén disponibles por defecto
UPDATE positions 
SET available_for_job_fair = true 
WHERE available_for_job_fair IS NULL;

