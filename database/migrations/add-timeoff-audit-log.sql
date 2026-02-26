-- ============================================
-- Migración: Agregar tabla de auditoría para timeoffs
-- ============================================

-- Crear tabla de auditoría para timeoffs
CREATE TABLE IF NOT EXISTS timeoff_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timeoff_id UUID NOT NULL REFERENCES timeoffs(id) ON DELETE CASCADE,
    changed_by UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    action VARCHAR(50) NOT NULL CHECK (action IN ('created', 'status_changed', 'approved', 'rejected', 'registered', 'updated')),
    old_status VARCHAR(20),
    new_status VARCHAR(20),
    old_value JSONB,
    new_value JSONB,
    comment TEXT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_timeoff_audit_timeoff_id ON timeoff_audit_log(timeoff_id);
CREATE INDEX IF NOT EXISTS idx_timeoff_audit_changed_by ON timeoff_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_timeoff_audit_changed_at ON timeoff_audit_log(changed_at DESC);
CREATE INDEX IF NOT EXISTS idx_timeoff_audit_action ON timeoff_audit_log(action);

-- Comentarios descriptivos
COMMENT ON TABLE timeoff_audit_log IS 'Registro de auditoría de cambios en solicitudes de tiempo compensatorio y otros timeoffs';
COMMENT ON COLUMN timeoff_audit_log.timeoff_id IS 'ID de la solicitud de timeoff relacionada';
COMMENT ON COLUMN timeoff_audit_log.changed_by IS 'ID del empleado que realizó el cambio';
COMMENT ON COLUMN timeoff_audit_log.changed_at IS 'Fecha y hora en que se realizó el cambio';
COMMENT ON COLUMN timeoff_audit_log.action IS 'Tipo de acción: created, status_changed, approved, rejected, registered, updated';
COMMENT ON COLUMN timeoff_audit_log.old_status IS 'Estado anterior de la solicitud';
COMMENT ON COLUMN timeoff_audit_log.new_status IS 'Estado nuevo de la solicitud';
COMMENT ON COLUMN timeoff_audit_log.old_value IS 'Valores anteriores en formato JSON (para cambios complejos)';
COMMENT ON COLUMN timeoff_audit_log.new_value IS 'Valores nuevos en formato JSON (para cambios complejos)';
COMMENT ON COLUMN timeoff_audit_log.comment IS 'Comentario adicional sobre el cambio';
COMMENT ON COLUMN timeoff_audit_log.ip_address IS 'Dirección IP del usuario que realizó el cambio';
COMMENT ON COLUMN timeoff_audit_log.user_agent IS 'User agent del navegador del usuario';

