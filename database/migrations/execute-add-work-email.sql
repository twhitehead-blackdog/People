-- ============================================
-- Migración: Agregar work_email a branches
-- ============================================
-- EJECUTA ESTE SCRIPT EN EL SQL EDITOR DE SUPABASE
-- ============================================

-- Agregar columna work_email a branches
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS work_email VARCHAR(255) UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_branches_work_email ON branches(work_email);

-- Verificar que se creó correctamente
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'branches' AND column_name = 'work_email';

