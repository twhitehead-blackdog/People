-- ============================================================
-- Migration: Tablas para migración de datos desde Payday
-- Date: 2026-03-09
-- Description: Fondo de cesantía, saldos iniciales de vacaciones,
--              staging de importación y flags de auditoría
-- ============================================================

-- ============================================================
-- 1. FONDO DE CESANTÍA - Saldo acumulado por empleado
-- ============================================================

CREATE TABLE IF NOT EXISTS fondo_cesantia_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  current_balance DECIMAL(12,2) NOT NULL DEFAULT 0,
  employer_contribution_rate DECIMAL(5,4) NOT NULL DEFAULT 0.0192, -- 1.92% fondo de cesantía
  last_updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id)
);

CREATE TABLE IF NOT EXISTS fondo_cesantia_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  balance_id UUID NOT NULL REFERENCES fondo_cesantia_balance(id) ON DELETE CASCADE,
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN (
    'contribution',     -- Aporte patronal mensual
    'interest',         -- Intereses generados
    'withdrawal',       -- Retiro parcial
    'termination',      -- Retiro total por terminación
    'adjustment',       -- Ajuste manual
    'import'            -- Importado desde sistema anterior
  )),
  amount DECIMAL(12,2) NOT NULL,
  running_balance DECIMAL(12,2) NOT NULL,
  reference_date DATE NOT NULL,                     -- Fecha a la que aplica el movimiento
  payroll_payment_id UUID REFERENCES payroll_payments(id), -- Si viene de planilla
  description TEXT,
  imported_from VARCHAR(50),                        -- 'payday', null si es nativo
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fondo_cesantia_balance_employee
  ON fondo_cesantia_balance(employee_id);
CREATE INDEX IF NOT EXISTS idx_fondo_cesantia_movements_employee
  ON fondo_cesantia_movements(employee_id);
CREATE INDEX IF NOT EXISTS idx_fondo_cesantia_movements_date
  ON fondo_cesantia_movements(reference_date);

-- ============================================================
-- 2. SALDOS INICIALES DE VACACIONES (para migración)
-- ============================================================

CREATE TABLE IF NOT EXISTS vacation_initial_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  accrued_days DECIMAL(6,2) NOT NULL DEFAULT 0,       -- Días acumulados al momento de migración
  used_days DECIMAL(6,2) NOT NULL DEFAULT 0,           -- Días ya usados al momento de migración
  available_days DECIMAL(6,2) NOT NULL DEFAULT 0,      -- = accrued - used
  cutoff_date DATE NOT NULL,                           -- Fecha de corte del saldo
  imported_from VARCHAR(50) DEFAULT 'payday',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_vacation_initial_balances_employee
  ON vacation_initial_balances(employee_id);

-- ============================================================
-- 3. STAGING TABLE PARA IMPORTACIÓN MASIVA
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_import_staging (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  import_batch_id UUID NOT NULL,                     -- Agrupa registros de una misma importación
  import_type VARCHAR(30) NOT NULL CHECK (import_type IN (
    'payroll_history',        -- Planillas pagadas
    'salary_history',         -- Historial de salarios
    'vacation_balance',       -- Saldos de vacaciones
    'debt_history',           -- Préstamos activos
    'fondo_cesantia',         -- Saldo de fondo de cesantía
    'decimo_history',         -- Historial de XIII mes
    'employee_data'           -- Datos maestros de empleados
  )),
  -- Datos crudos del CSV
  raw_data JSONB NOT NULL,
  -- Mapeo a entidades internas
  employee_id UUID REFERENCES employees(id),
  mapped_data JSONB,                                 -- Datos transformados listos para insertar
  -- Estado de validación
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending',        -- Cargado, sin validar
    'validated',      -- Validado correctamente
    'error',          -- Error de validación
    'imported',       -- Importado exitosamente
    'skipped'         -- Omitido (duplicado u otro)
  )),
  validation_errors JSONB,                           -- Array de errores encontrados
  -- Auditoría
  source_system VARCHAR(50) DEFAULT 'payday',
  source_reference VARCHAR(100),                     -- ID o referencia en sistema origen
  imported_by UUID REFERENCES auth.users(id),
  imported_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payroll_import_staging_batch
  ON payroll_import_staging(import_batch_id);
CREATE INDEX IF NOT EXISTS idx_payroll_import_staging_status
  ON payroll_import_staging(status);
CREATE INDEX IF NOT EXISTS idx_payroll_import_staging_type
  ON payroll_import_staging(import_type);

-- ============================================================
-- 4. REGISTRO DE LOTES DE IMPORTACIÓN
-- ============================================================

CREATE TABLE IF NOT EXISTS payroll_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  import_type VARCHAR(30) NOT NULL,
  file_name VARCHAR(255),
  total_records INT NOT NULL DEFAULT 0,
  validated_records INT NOT NULL DEFAULT 0,
  imported_records INT NOT NULL DEFAULT 0,
  error_records INT NOT NULL DEFAULT 0,
  skipped_records INT NOT NULL DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'uploaded' CHECK (status IN (
    'uploaded',       -- Archivo cargado
    'validating',     -- En proceso de validación
    'validated',      -- Validación completa
    'importing',      -- En proceso de importación
    'completed',      -- Importación completada
    'failed',         -- Falló la importación
    'cancelled'       -- Cancelado por usuario
  )),
  source_system VARCHAR(50) DEFAULT 'payday',
  started_by UUID REFERENCES auth.users(id),
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. AGREGAR FLAGS DE AUDITORÍA A TABLAS EXISTENTES
-- ============================================================

-- payroll_payments: marcar planillas importadas
ALTER TABLE payroll_payments
  ADD COLUMN IF NOT EXISTS imported_from VARCHAR(50),
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES payroll_import_batches(id);

-- payroll_salary_history: marcar historial importado
ALTER TABLE payroll_salary_history
  ADD COLUMN IF NOT EXISTS imported_from VARCHAR(50),
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES payroll_import_batches(id);

-- decimo_tercer_mes: marcar XIII mes importados
ALTER TABLE decimo_tercer_mes
  ADD COLUMN IF NOT EXISTS imported_from VARCHAR(50),
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES payroll_import_batches(id);

-- payroll_debts: marcar deudas importadas
ALTER TABLE payroll_debts
  ADD COLUMN IF NOT EXISTS imported_from VARCHAR(50),
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES payroll_import_batches(id);

-- employee_liquidations: marcar liquidaciones importadas
ALTER TABLE employee_liquidations
  ADD COLUMN IF NOT EXISTS imported_from VARCHAR(50),
  ADD COLUMN IF NOT EXISTS import_batch_id UUID REFERENCES payroll_import_batches(id);

-- ============================================================
-- 6. RLS POLICIES
-- ============================================================

ALTER TABLE fondo_cesantia_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE fondo_cesantia_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE vacation_initial_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_import_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_import_batches ENABLE ROW LEVEL SECURITY;

-- Policies para usuarios autenticados
CREATE POLICY IF NOT EXISTS "authenticated_fondo_balance" ON fondo_cesantia_balance
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "authenticated_fondo_movements" ON fondo_cesantia_movements
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "authenticated_vacation_balances" ON vacation_initial_balances
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "authenticated_import_staging" ON payroll_import_staging
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "authenticated_import_batches" ON payroll_import_batches
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================
-- 7. FUNCIÓN AUXILIAR: Actualizar saldo de fondo de cesantía
-- ============================================================

CREATE OR REPLACE FUNCTION update_fondo_cesantia_balance()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE fondo_cesantia_balance
  SET current_balance = NEW.running_balance,
      last_updated_at = now()
  WHERE id = NEW.balance_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_fondo_balance ON fondo_cesantia_movements;
CREATE TRIGGER trg_update_fondo_balance
  AFTER INSERT ON fondo_cesantia_movements
  FOR EACH ROW
  EXECUTE FUNCTION update_fondo_cesantia_balance();
