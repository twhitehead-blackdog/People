-- ============================================
-- Migración: Agregar tabla de auditoría para horarios de empleados
-- ============================================

-- Crear tabla de auditoría para employee_schedules
CREATE TABLE IF NOT EXISTS schedule_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_schedule_id UUID REFERENCES employee_schedules(id) ON DELETE SET NULL,
    changed_by UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'updated', 'deleted', 'approved', 'rejected', 'split', 'split_range')),
    old_status BOOLEAN,
    new_status BOOLEAN,
    old_value JSONB,
    new_value JSONB,
    comment TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_schedule_audit_employee_schedule_id ON schedule_audit_log(employee_schedule_id);
CREATE INDEX IF NOT EXISTS idx_schedule_audit_changed_by ON schedule_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_schedule_audit_changed_at ON schedule_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_schedule_audit_action ON schedule_audit_log(action);

-- Comentarios descriptivos
COMMENT ON TABLE schedule_audit_log IS 'Registro de auditoría de cambios en horarios de empleados';
COMMENT ON COLUMN schedule_audit_log.employee_schedule_id IS 'ID del horario de empleado relacionado (puede ser NULL si el horario fue eliminado - el historial se mantiene para auditoría)';
COMMENT ON COLUMN schedule_audit_log.changed_by IS 'ID del empleado que realizó el cambio';
COMMENT ON COLUMN schedule_audit_log.changed_at IS 'Fecha y hora en que se realizó el cambio';
COMMENT ON COLUMN schedule_audit_log.action IS 'Tipo de acción: created, updated, deleted, approved, rejected, split, split_range';
COMMENT ON COLUMN schedule_audit_log.old_status IS 'Estado anterior de aprobación (true/false)';
COMMENT ON COLUMN schedule_audit_log.new_status IS 'Estado nuevo de aprobación (true/false)';
COMMENT ON COLUMN schedule_audit_log.old_value IS 'Valores anteriores en formato JSON (para cambios complejos)';
COMMENT ON COLUMN schedule_audit_log.new_value IS 'Valores nuevos en formato JSON (para cambios complejos)';
COMMENT ON COLUMN schedule_audit_log.comment IS 'Comentario adicional sobre el cambio';
COMMENT ON COLUMN schedule_audit_log.ip_address IS 'Dirección IP del usuario que realizó el cambio';
COMMENT ON COLUMN schedule_audit_log.user_agent IS 'User agent del navegador del usuario';