-- ============================================
-- EMPLOYEE LIQUIDATIONS TABLE
-- Liquidación de Personal - Código de Trabajo de Panamá
-- ============================================

CREATE TABLE IF NOT EXISTS employee_liquidations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  employee_id UUID NOT NULL REFERENCES employees(id),

  -- Datos del empleado (snapshot)
  employee_name TEXT NOT NULL,
  document_id TEXT,
  hire_date DATE NOT NULL,
  termination_date DATE NOT NULL,
  monthly_salary DECIMAL(12,2) NOT NULL,
  position TEXT,
  department TEXT,
  branch TEXT,
  contract_type VARCHAR(20) NOT NULL CHECK (contract_type IN ('INDEFINIDO','DEFINIDO','OBRA')),

  -- Tipo de terminación
  termination_type VARCHAR(30) NOT NULL CHECK (termination_type IN (
    'RENUNCIA', 'RENUNCIA_JUSTIFICADA', 'DESPIDO_JUSTIFICADO',
    'DESPIDO_INJUSTIFICADO', 'MUTUO_ACUERDO', 'VENCIMIENTO_CONTRATO'
  )),

  -- Componentes calculados
  pending_salary DECIMAL(12,2) DEFAULT 0,
  pending_salary_days DECIMAL(10,2) DEFAULT 0,
  vacation_days_accrued DECIMAL(10,2) DEFAULT 0,
  vacation_days_proportional DECIMAL(10,2) DEFAULT 0,
  vacation_pay DECIMAL(12,2) DEFAULT 0,
  xiii_month_proportional DECIMAL(12,2) DEFAULT 0,
  seniority_bonus DECIMAL(12,2) DEFAULT 0,
  seniority_years DECIMAL(10,2) DEFAULT 0,
  notice_pay DECIMAL(12,2) DEFAULT 0,
  severance_pay DECIMAL(12,2) DEFAULT 0,
  severance_weeks DECIMAL(10,2) DEFAULT 0,

  -- Totales
  gross_total DECIMAL(12,2) DEFAULT 0,
  css_deduction DECIMAL(12,2) DEFAULT 0,
  isr_deduction DECIMAL(12,2) DEFAULT 0,
  other_deductions DECIMAL(12,2) DEFAULT 0,
  fondo_cesantia_offset DECIMAL(12,2) DEFAULT 0,
  net_total DECIMAL(12,2) DEFAULT 0,

  avg_salary_for_severance DECIMAL(12,2),

  -- Status
  status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','CALCULATED','APPROVED','PAID')),
  approved_by UUID REFERENCES employees(id),
  approved_at TIMESTAMPTZ,
  paid_date DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_employee_liquidations_company_id ON employee_liquidations(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_liquidations_employee_id ON employee_liquidations(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_liquidations_status ON employee_liquidations(status);

ALTER TABLE employee_liquidations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "employee_liquidations_auth" ON employee_liquidations FOR ALL TO authenticated USING (true);
