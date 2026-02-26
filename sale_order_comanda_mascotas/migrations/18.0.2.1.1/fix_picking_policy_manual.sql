-- ============================================================================
-- SCRIPT MANUAL: Quitar restricción NOT NULL de picking_policy
-- ============================================================================
-- Este script puede ejecutarse manualmente cuando no haya bloqueos activos
-- en la tabla sale_order para evitar el error de lock timeout durante la
-- actualización del módulo.
--
-- ⚠️ IMPORTANTE: 
-- - Ejecutar este script cuando NO haya procesos activos usando sale_order
-- - Verificar bloqueos antes de ejecutar: 
--   SELECT * FROM pg_locks WHERE relation = 'sale_order'::regclass;
-- - Si hay bloqueos, esperar a que terminen o terminarlos primero
-- ============================================================================

-- Verificar si la columna tiene restricción NOT NULL
SELECT 
    column_name,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public'
  AND table_name = 'sale_order' 
  AND column_name = 'picking_policy';

-- Si is_nullable = 'NO', entonces tiene restricción NOT NULL y necesita cambiarse
-- Ejecutar el siguiente comando solo si is_nullable = 'NO':

-- ALTER TABLE sale_order 
-- ALTER COLUMN picking_policy DROP NOT NULL;

-- Verificar que el cambio se aplicó correctamente
-- SELECT 
--     column_name,
--     is_nullable
-- FROM information_schema.columns 
-- WHERE table_schema = 'public'
--   AND table_name = 'sale_order' 
--   AND column_name = 'picking_policy';
-- -- is_nullable debería ser 'YES' después del cambio
