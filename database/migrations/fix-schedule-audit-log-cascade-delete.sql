-- ============================================
-- Migración: Corregir CASCADE DELETE en schedule_audit_log
-- ============================================
-- Este script corrige el problema donde los registros de auditoría
-- se eliminaban cuando se borraba un horario (employee_schedule).
-- 
-- IMPORTANTE: El historial de auditoría debe mantenerse incluso después
-- de eliminar los horarios para cumplir con requisitos de auditoría y trazabilidad.

-- Paso 1: Eliminar la foreign key constraint existente
ALTER TABLE schedule_audit_log 
DROP CONSTRAINT IF EXISTS schedule_audit_log_employee_schedule_id_fkey;

-- Paso 2: Modificar la columna para permitir NULL
ALTER TABLE schedule_audit_log 
ALTER COLUMN employee_schedule_id DROP NOT NULL;

-- Paso 3: Recrear la foreign key con ON DELETE SET NULL
ALTER TABLE schedule_audit_log 
ADD CONSTRAINT schedule_audit_log_employee_schedule_id_fkey 
FOREIGN KEY (employee_schedule_id) 
REFERENCES employee_schedules(id) 
ON DELETE SET NULL;

-- Actualizar el comentario para reflejar el cambio
COMMENT ON COLUMN schedule_audit_log.employee_schedule_id IS 'ID del horario de empleado relacionado (puede ser NULL si el horario fue eliminado)';
