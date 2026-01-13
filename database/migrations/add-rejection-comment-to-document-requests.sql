-- ============================================
-- Agregar rejection_comment a document_requests
-- ============================================
-- Este campo permite a RRHH proporcionar una razón cuando 
-- se rechaza una solicitud de documento.
-- ============================================

-- 1. Agregar columna rejection_comment
ALTER TABLE document_requests 
ADD COLUMN IF NOT EXISTS rejection_comment TEXT;

-- 2. Comentario para la columna
COMMENT ON COLUMN document_requests.rejection_comment IS 
'Comentario del revisor explicando la razón del rechazo';

-- 3. (Opcional) Asegurar que updated_at se actualice si se cambia el comentario
-- El trigger generic update_document_requests_updated_at ya debería manejar esto 
-- si está configurado para la tabla.

-- ============================================
-- ¡LISTO! Columna rejection_comment agregada
-- ============================================
