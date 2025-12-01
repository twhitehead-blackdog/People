-- ============================================
-- Script: Agregar campos adicionales a job_applications
-- ============================================
-- Agrega los campos: province, corregimiento, currently_working, salary_expectation
-- ============================================

-- 1. Agregar columna province (Provincia)
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS province VARCHAR(100);

-- 2. Agregar columna corregimiento (Corregimiento)
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS corregimiento VARCHAR(100);

-- 3. Agregar columna currently_working (Laborando Actualmente)
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS currently_working BOOLEAN DEFAULT false;

-- 4. Agregar columna salary_expectation (Aspiración Salarial)
ALTER TABLE job_applications 
ADD COLUMN IF NOT EXISTS salary_expectation NUMERIC(12, 2);

-- 5. Agregar comentarios para documentación
COMMENT ON COLUMN job_applications.province IS 'Provincia de residencia del aspirante';
COMMENT ON COLUMN job_applications.corregimiento IS 'Corregimiento de residencia del aspirante';
COMMENT ON COLUMN job_applications.currently_working IS 'Indica si el aspirante está trabajando actualmente';
COMMENT ON COLUMN job_applications.salary_expectation IS 'Aspiración salarial del aspirante';

-- ============================================
-- Verificación (opcional)
-- ============================================
-- Verificar que las columnas se agregaron correctamente:
-- SELECT column_name, data_type, is_nullable 
-- FROM information_schema.columns 
-- WHERE table_name = 'job_applications' 
-- AND column_name IN ('province', 'corregimiento', 'currently_working', 'salary_expectation')
-- ORDER BY column_name;
-- ============================================

