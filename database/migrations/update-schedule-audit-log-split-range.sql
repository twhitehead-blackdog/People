-- ============================================
-- Migración: Actualizar constraint para incluir 'split_range'
-- ============================================
-- Este script actualiza la tabla schedule_audit_log si ya existe
-- para permitir la acción 'split_range' en el CHECK constraint

-- Primero, eliminar el constraint existente
ALTER TABLE schedule_audit_log 
DROP CONSTRAINT IF EXISTS schedule_audit_log_action_check;

-- Crear el nuevo constraint con 'split_range' incluido
ALTER TABLE schedule_audit_log 
ADD CONSTRAINT schedule_audit_log_action_check 
CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'rejected', 'split', 'split_range'));

-- Actualizar el comentario
COMMENT ON COLUMN schedule_audit_log.action IS 'Tipo de acción: created, updated, deleted, approved, rejected, split, split_range';
