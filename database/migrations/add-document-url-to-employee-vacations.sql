-- ============================================
-- Agregar columna document_url a employee_vacations
-- ============================================
-- Permite adjuntar un documento PDF o imagen como respaldo
-- de la solicitud de vacaciones
-- ============================================

-- Agregar columna document_url
ALTER TABLE employee_vacations 
ADD COLUMN IF NOT EXISTS document_url TEXT NULL;

-- Comentario
COMMENT ON COLUMN employee_vacations.document_url IS 
'URL del documento de respaldo (PDF o imagen) subido a Supabase Storage';

-- Crear índice para búsquedas
CREATE INDEX IF NOT EXISTS idx_employee_vacations_document_url 
  ON employee_vacations(document_url) 
  WHERE document_url IS NOT NULL;

-- ============================================
-- ✅ LISTO! Columna document_url agregada
-- ============================================
