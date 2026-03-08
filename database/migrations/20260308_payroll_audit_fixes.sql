-- ============================================
-- MIGRACIÓN: Correcciones de Auditoría de Planilla
-- ============================================
-- Fecha: 2026-03-08
-- Descripción: Agrega campos identificados en auditoría del sistema de planilla:
--   - overtime_policy en payroll_settings
--   - embargo_max_percentage en payroll_debts
--   - se_deduction en employee_liquidations
--   - ruc en companies
-- Seguro de ejecutar múltiples veces (idempotente)
-- ============================================

-- 1. Política de horas extras en configuración de planilla
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payroll_settings' AND column_name = 'overtime_policy'
  ) THEN
    ALTER TABLE payroll_settings
      ADD COLUMN overtime_policy VARCHAR(20) NOT NULL DEFAULT 'comp_time'
      CHECK (overtime_policy IN ('paid', 'comp_time', 'none'));
    COMMENT ON COLUMN payroll_settings.overtime_policy IS 'Política de horas extras: paid=pago en planilla, comp_time=tiempo compensatorio, none=no aplica';
  END IF;
END $$;

-- 2. Porcentaje máximo de embargo judicial en deudas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'payroll_debts' AND column_name = 'embargo_max_percentage'
  ) THEN
    ALTER TABLE payroll_debts
      ADD COLUMN embargo_max_percentage DECIMAL(5,2) DEFAULT NULL;
    COMMENT ON COLUMN payroll_debts.embargo_max_percentage IS 'Porcentaje máximo del salario neto a embargar por quincena (solo para debt_type=embargo)';
  END IF;
END $$;

-- 3. Deducción de Seguro Educativo en liquidaciones
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'employee_liquidations' AND column_name = 'se_deduction'
  ) THEN
    ALTER TABLE employee_liquidations
      ADD COLUMN se_deduction DECIMAL(12,2) NOT NULL DEFAULT 0;
    COMMENT ON COLUMN employee_liquidations.se_deduction IS 'Deducción de Seguro Educativo (1.25%) sobre base gravable de liquidación';
  END IF;
END $$;

-- 4. RUC de empresa
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'companies' AND column_name = 'ruc'
  ) THEN
    ALTER TABLE companies
      ADD COLUMN ruc VARCHAR(50) DEFAULT NULL;
    COMMENT ON COLUMN companies.ruc IS 'Registro Único de Contribuyente (RUC) de la empresa';
  END IF;
END $$;

-- 5. Asegurar que el tipo de deuda 'embargo' sea válido
-- (La columna debt_type ya es VARCHAR, solo verificar que no haya constraint que lo excluya)
DO $$
BEGIN
  -- Si existe un CHECK constraint en debt_type que no incluye 'embargo', eliminarlo y recrearlo
  IF EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage ccu
    JOIN information_schema.check_constraints cc ON cc.constraint_name = ccu.constraint_name
    WHERE ccu.table_name = 'payroll_debts' AND ccu.column_name = 'debt_type'
    AND cc.check_clause NOT LIKE '%embargo%'
  ) THEN
    EXECUTE 'ALTER TABLE payroll_debts DROP CONSTRAINT ' ||
      (SELECT ccu.constraint_name FROM information_schema.constraint_column_usage ccu
       JOIN information_schema.check_constraints cc ON cc.constraint_name = ccu.constraint_name
       WHERE ccu.table_name = 'payroll_debts' AND ccu.column_name = 'debt_type' LIMIT 1);

    ALTER TABLE payroll_debts
      ADD CONSTRAINT payroll_debts_debt_type_check
      CHECK (debt_type IN ('company_loan', 'bank_loan', 'creditor', 'embargo', 'other'));
  END IF;
END $$;
