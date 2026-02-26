-- ============================================
-- Migración: Agregar campo document_url a timeoffs para adjuntar PDFs en solicitudes de compensatorio
-- ============================================

-- Agregar campo para almacenar URL del documento PDF adjunto
ALTER TABLE timeoffs ADD COLUMN IF NOT EXISTS document_url TEXT;

-- Comentarios
COMMENT ON COLUMN timeoffs.document_url IS 'URL del documento PDF adjunto a la solicitud de tiempo compensatorio';

-- Crear índice para mejorar consultas por document_url
CREATE INDEX IF NOT EXISTS idx_timeoffs_document_url ON timeoffs(document_url);