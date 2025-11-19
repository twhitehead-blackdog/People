-- ============================================
-- Actualizar tabla organization_chart para permitir múltiples padres
-- ============================================
-- Este script elimina la restricción UNIQUE(position_id) y crea una nueva
-- restricción única en (position_id, parent_position_id) para permitir
-- que una posición reporte a múltiples supervisores

-- Eliminar la restricción UNIQUE existente en position_id
ALTER TABLE organization_chart 
DROP CONSTRAINT IF EXISTS organization_chart_position_id_key;

-- Crear una nueva restricción única en la combinación de position_id y parent_position_id
-- Esto permite múltiples padres pero evita duplicados exactos
ALTER TABLE organization_chart 
ADD CONSTRAINT organization_chart_position_parent_unique 
UNIQUE (position_id, parent_position_id);

-- Verificar que la tabla ahora permite múltiples registros por position_id
-- Ejemplo: una posición puede tener múltiples registros con diferentes parent_position_id
-- position_id | parent_position_id
-- ------------|-------------------
-- pos-1       | parent-A
-- pos-1       | parent-B  <- Esto ahora está permitido

