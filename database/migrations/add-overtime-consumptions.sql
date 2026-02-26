-- ============================================
-- Migración: Agregar tabla auditable de consumo de horas extra
-- ============================================

CREATE TABLE IF NOT EXISTS overtime_consumptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  timeoff_id UUID NOT NULL REFERENCES timeoffs(id) ON DELETE CASCADE,
  overtime_day DATE NOT NULL,
  hours_used NUMERIC(6,2) NOT NULL CHECK (hours_used > 0),
  created_by UUID NOT NULL REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  comment TEXT
);

-- Evitar doble consumo del mismo día por la misma solicitud
CREATE UNIQUE INDEX IF NOT EXISTS ux_overtime_consumptions_timeoff_day
  ON overtime_consumptions(timeoff_id, overtime_day);

-- Índices para consultas frecuentes
CREATE INDEX IF NOT EXISTS idx_overtime_consumptions_employee_day
  ON overtime_consumptions(employee_id, overtime_day);

CREATE INDEX IF NOT EXISTS idx_overtime_consumptions_company_day
  ON overtime_consumptions(company_id, overtime_day);

COMMENT ON TABLE overtime_consumptions IS
  'Consumo auditable de horas extra por día asociado a solicitudes de compensatorio';
COMMENT ON COLUMN overtime_consumptions.overtime_day IS
  'Día (YYYY-MM-DD) del overtime consumido';
COMMENT ON COLUMN overtime_consumptions.hours_used IS
  'Horas consumidas de ese día (parcial permitido)';
