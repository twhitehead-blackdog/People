-- Llamados de emergencia: cuando un empleado en su día libre es llamado a trabajar
-- (por ejemplo trasladar peluquero/bañador a otra sucursal). En estos casos no
-- se debe marcar retraso ni horas insuficientes — se trata como día válido.

CREATE TABLE IF NOT EXISTS emergency_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  call_date DATE NOT NULL,
  branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
  reason TEXT,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (employee_id, call_date)
);

CREATE INDEX IF NOT EXISTS idx_emergency_calls_employee_date
  ON emergency_calls (employee_id, call_date);
CREATE INDEX IF NOT EXISTS idx_emergency_calls_company_date
  ON emergency_calls (company_id, call_date);

ALTER TABLE emergency_calls ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS emergency_calls_all ON emergency_calls;
CREATE POLICY emergency_calls_all ON emergency_calls
  FOR ALL USING (true) WITH CHECK (true);
