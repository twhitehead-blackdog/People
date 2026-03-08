-- ============================================
-- VACATION PAYMENTS TABLE
-- Planilla de Vacaciones - Art. 54-59 Código de Trabajo de Panamá
-- 30 días de vacaciones por cada 11 meses trabajados
-- ============================================

CREATE TABLE IF NOT EXISTS vacation_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID NOT NULL REFERENCES employees(id),
  vacation_request_id UUID REFERENCES employee_vacations(id),

  -- Cálculo
  hire_date DATE NOT NULL,
  calculation_date DATE NOT NULL,
  months_worked DECIMAL(10,2) NOT NULL,
  accrued_days DECIMAL(10,2) NOT NULL,
  used_days DECIMAL(10,2) DEFAULT 0,
  days_to_pay DECIMAL(10,2) NOT NULL,
  daily_rate DECIMAL(12,2) NOT NULL,
  monthly_salary DECIMAL(12,2) NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL,

  -- Status
  status VARCHAR(20) DEFAULT 'PENDING' CHECK (status IN ('PENDING','CALCULATED','APPROVED','PAID')),
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  paid_date DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vacation_payments_company_id ON vacation_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_vacation_payments_employee_id ON vacation_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_vacation_payments_status ON vacation_payments(status);

ALTER TABLE vacation_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "vacation_payments_auth" ON vacation_payments FOR ALL TO authenticated USING (true);
