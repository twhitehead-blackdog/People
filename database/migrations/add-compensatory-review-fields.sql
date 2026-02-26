-- ============================================
-- Migración: Agregar campos de revisión a timeoffs para tiempo compensatorio
-- ============================================

-- Agregar campos para flujo de revisión de tiempo compensatorio
ALTER TABLE timeoffs
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS review_status VARCHAR(20) CHECK (review_status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS registered_by UUID REFERENCES employees(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS registered_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rejection_comment TEXT,
ADD COLUMN IF NOT EXISTS compensatory_type VARCHAR(10) CHECK (compensatory_type IN ('hours', 'days')),
ADD COLUMN IF NOT EXISTS compensatory_amount DECIMAL(5,2);

-- Crear índices para mejorar rendimiento de consultas
CREATE INDEX IF NOT EXISTS idx_timeoffs_review_status ON timeoffs(review_status);
CREATE INDEX IF NOT EXISTS idx_timeoffs_reviewed_by ON timeoffs(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_timeoffs_registered_by ON timeoffs(registered_by);
CREATE INDEX IF NOT EXISTS idx_timeoffs_compensatory_type ON timeoffs(compensatory_type);

-- Comentarios
COMMENT ON COLUMN timeoffs.reviewed_by IS 'Empleado que revisó la solicitud (Verley)';
COMMENT ON COLUMN timeoffs.reviewed_at IS 'Fecha y hora de revisión';
COMMENT ON COLUMN timeoffs.review_status IS 'Estado de revisión: pending, approved, rejected';
COMMENT ON COLUMN timeoffs.registered_by IS 'Empleado que registró la solicitud aprobada (Lia)';
COMMENT ON COLUMN timeoffs.registered_at IS 'Fecha y hora de registro';
COMMENT ON COLUMN timeoffs.rejection_comment IS 'Comentario de rechazo si aplica';
COMMENT ON COLUMN timeoffs.compensatory_type IS 'Tipo de tiempo compensatorio: hours o days';
COMMENT ON COLUMN timeoffs.compensatory_amount IS 'Cantidad original solicitada (horas o días)';

