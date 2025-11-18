-- ============================================
-- Solución Temporal: Deshabilitar RLS en complaint_messages
-- ============================================
-- ⚠️ SOLO PARA DESARROLLO/TESTING
-- NO EJECUTAR EN PRODUCCIÓN
-- ============================================

-- Deshabilitar RLS en complaint_messages
ALTER TABLE complaint_messages DISABLE ROW LEVEL SECURITY;

-- ============================================
-- Para volver a habilitar RLS más tarde:
-- ============================================
-- ALTER TABLE complaint_messages ENABLE ROW LEVEL SECURITY;

