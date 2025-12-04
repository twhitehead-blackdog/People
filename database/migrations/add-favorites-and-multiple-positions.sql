-- Migración: Agregar campo is_favorite y soporte para múltiples posiciones
-- ============================================

-- 1. Agregar columna is_favorite
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- 2. Agregar columna position_ids (array de UUIDs) para soportar múltiples posiciones
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS position_ids UUID[] DEFAULT ARRAY[]::UUID[];

-- 3. Migrar datos existentes: si hay position_id, moverlo a position_ids
UPDATE job_applications 
SET position_ids = ARRAY[position_id]::UUID[]
WHERE position_id IS NOT NULL 
  AND (position_ids IS NULL OR array_length(position_ids, 1) IS NULL);

-- 4. Crear índice para búsquedas por favoritos
CREATE INDEX IF NOT EXISTS idx_job_applications_is_favorite 
ON job_applications(is_favorite) 
WHERE is_favorite = true;

-- 5. Crear índice GIN para búsquedas en arrays de position_ids
CREATE INDEX IF NOT EXISTS idx_job_applications_position_ids 
ON job_applications USING GIN (position_ids);

-- 6. Comentarios
COMMENT ON COLUMN job_applications.is_favorite IS 'Indica si la aplicación está marcada como favorita';
COMMENT ON COLUMN job_applications.position_ids IS 'Array de IDs de posiciones a las que el candidato aplicó (soporta múltiples selecciones)';

