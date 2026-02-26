-- ============================================
-- MIGRACIÓN: Sistema de Planilla V2 - Reestructuración completa
-- ============================================
-- Fecha: 2026-02-26
-- Descripción: Reestructura el sistema de planilla para soportar:
--   - Configuración de fechas de corte y pago por empresa
--   - Tipos de empleado: Regular (CSS+ISR) vs Honorarios (sin deducciones legales)
--   - Sistema robusto de préstamos (empresa, banco, acreedor)
--   - Historial de salarios
--   - Días feriados
--   - Flujo de aprobación expandido
--   - Agrupación por sucursal/departamento
-- Seguro de ejecutar múltiples veces (IF NOT EXISTS / idempotente)
-- ============================================

-- ============================================
-- 1. CONFIGURACIÓN DE PLANILLA POR EMPRESA
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    -- Fechas de corte (días del mes)
    cut_off_day_1 INTEGER NOT NULL DEFAULT 10,
    cut_off_day_2 INTEGER NOT NULL DEFAULT 25,
    -- Fechas de pago (días del mes)
    payment_day_1 INTEGER NOT NULL DEFAULT 15,
    payment_day_2 INTEGER NOT NULL DEFAULT 30,
    -- Si el día de pago cae domingo, pagar el sábado anterior
    adjust_payment_on_sunday BOOLEAN NOT NULL DEFAULT true,
    -- Horas mensuales para cálculo de salario por hora (default Panamá: 26 días × 8 hrs)
    monthly_hours DECIMAL(10,2) NOT NULL DEFAULT 208,
    -- Quincenas al año (normalmente 24)
    periods_per_year INTEGER NOT NULL DEFAULT 24,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id)
);

CREATE INDEX IF NOT EXISTS idx_payroll_settings_company_id ON payroll_settings(company_id);

COMMENT ON TABLE payroll_settings IS 'Configuración de planilla por empresa: fechas de corte, pago y parámetros de cálculo';

-- ============================================
-- 2. DÍAS FERIADOS NACIONALES
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    -- Si es recurrente (se repite cada año en la misma fecha)
    is_recurring BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(company_id, date)
);

CREATE INDEX IF NOT EXISTS idx_payroll_holidays_company_id ON payroll_holidays(company_id);
CREATE INDEX IF NOT EXISTS idx_payroll_holidays_date ON payroll_holidays(date);

COMMENT ON TABLE payroll_holidays IS 'Días feriados nacionales y de empresa para cálculo de planilla';

-- ============================================
-- 3. HISTORIAL DE SALARIOS
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_salary_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    previous_monthly_salary DECIMAL(10,2),
    new_monthly_salary DECIMAL(10,2) NOT NULL,
    previous_hourly_salary DECIMAL(10,2),
    new_hourly_salary DECIMAL(10,2) NOT NULL,
    effective_date DATE NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_salary_history_employee_id ON payroll_salary_history(employee_id);
CREATE INDEX IF NOT EXISTS idx_payroll_salary_history_effective_date ON payroll_salary_history(effective_date);

COMMENT ON TABLE payroll_salary_history IS 'Historial de cambios de salario por empleado';

-- ============================================
-- 4. HISTORIAL DE PAGOS POR DEUDA (CUOTAS)
-- ============================================
CREATE TABLE IF NOT EXISTS payroll_debt_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    debt_id UUID NOT NULL REFERENCES payroll_debts(id) ON DELETE CASCADE,
    payroll_payment_id UUID NOT NULL REFERENCES payroll_payments(id) ON DELETE CASCADE,
    payment_employee_id UUID REFERENCES payroll_payment_employees(id) ON DELETE SET NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date DATE NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payroll_debt_payments_debt_id ON payroll_debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_payroll_debt_payments_payment_id ON payroll_debt_payments(payroll_payment_id);

COMMENT ON TABLE payroll_debt_payments IS 'Registro de cada cuota pagada contra una deuda/préstamo';

-- ============================================
-- 5. AGREGAR COLUMNAS A TABLA employees
-- ============================================
ALTER TABLE employees
    ADD COLUMN IF NOT EXISTS payroll_type VARCHAR(20) DEFAULT 'regular';

-- Agregar CHECK constraint solo si no existe
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'employees_payroll_type_check'
    ) THEN
        ALTER TABLE employees
            ADD CONSTRAINT employees_payroll_type_check
            CHECK (payroll_type IN ('regular', 'honorarios'));
    END IF;
END $$;

COMMENT ON COLUMN employees.payroll_type IS 'Tipo de planilla: regular (CSS+ISR) o honorarios (sin deducciones legales)';

-- ============================================
-- 6. AGREGAR COLUMNAS A TABLA payroll_deductions
-- ============================================
-- applies_to: a qué tipo de empleado aplica esta deducción
ALTER TABLE payroll_deductions
    ADD COLUMN IF NOT EXISTS applies_to VARCHAR(20) DEFAULT 'regular';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payroll_deductions_applies_to_check'
    ) THEN
        ALTER TABLE payroll_deductions
            ADD CONSTRAINT payroll_deductions_applies_to_check
            CHECK (applies_to IN ('regular', 'honorarios', 'all'));
    END IF;
END $$;

-- is_employer_portion: si es la parte patronal (para Odoo en fase 2)
ALTER TABLE payroll_deductions
    ADD COLUMN IF NOT EXISTS is_employer_portion BOOLEAN DEFAULT false;

-- employer_value: porcentaje o monto de la cuota patronal
ALTER TABLE payroll_deductions
    ADD COLUMN IF NOT EXISTS employer_value DECIMAL(10,2) DEFAULT 0;

COMMENT ON COLUMN payroll_deductions.applies_to IS 'A qué tipo de empleado aplica: regular, honorarios, o all';
COMMENT ON COLUMN payroll_deductions.is_employer_portion IS 'Si esta fila representa la cuota patronal (ej: CSS Patronal 12.25%)';
COMMENT ON COLUMN payroll_deductions.employer_value IS 'Valor de la cuota patronal asociada (porcentaje o fijo)';

-- ============================================
-- 7. EXPANDIR STATUS Y AGREGAR CAMPOS A payroll_payments
-- ============================================

-- Expandir el CHECK de status
DO $$
BEGIN
    -- Eliminar constraint viejo si existe
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payroll_payments_status_check'
    ) THEN
        ALTER TABLE payroll_payments DROP CONSTRAINT payroll_payments_status_check;
    END IF;

    -- Crear constraint nuevo con estados expandidos
    ALTER TABLE payroll_payments
        ADD CONSTRAINT payroll_payments_status_check
        CHECK (status IN ('DRAFT', 'CALCULATED', 'REVIEWED', 'APPROVED', 'PAID', 'PENDING'));
END $$;

-- Migrar registros PENDING existentes a DRAFT
UPDATE payroll_payments SET status = 'DRAFT' WHERE status = 'PENDING';

-- Nuevos campos
ALTER TABLE payroll_payments
    ADD COLUMN IF NOT EXISTS payment_date DATE;

ALTER TABLE payroll_payments
    ADD COLUMN IF NOT EXISTS period_number SMALLINT;

ALTER TABLE payroll_payments
    ADD COLUMN IF NOT EXISTS month SMALLINT;

ALTER TABLE payroll_payments
    ADD COLUMN IF NOT EXISTS year SMALLINT;

ALTER TABLE payroll_payments
    ADD COLUMN IF NOT EXISTS calculated_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE payroll_payments
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE payroll_payments
    ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id);

ALTER TABLE payroll_payments
    ADD COLUMN IF NOT EXISTS notes TEXT;

-- Constraint para period_number
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payroll_payments_period_number_check'
    ) THEN
        ALTER TABLE payroll_payments
            ADD CONSTRAINT payroll_payments_period_number_check
            CHECK (period_number IN (1, 2));
    END IF;
END $$;

-- Índices para búsqueda rápida por período
CREATE INDEX IF NOT EXISTS idx_payroll_payments_year_month ON payroll_payments(year, month);
CREATE INDEX IF NOT EXISTS idx_payroll_payments_period ON payroll_payments(year, month, period_number);

COMMENT ON COLUMN payroll_payments.payment_date IS 'Fecha real de pago (15 o 30, ajustada si cae domingo)';
COMMENT ON COLUMN payroll_payments.period_number IS 'Número de quincena: 1 (primera) o 2 (segunda)';
COMMENT ON COLUMN payroll_payments.month IS 'Mes del período (1-12)';
COMMENT ON COLUMN payroll_payments.year IS 'Año del período';

-- ============================================
-- 8. MEJORAR SISTEMA DE PRÉSTAMOS/DEUDAS
-- ============================================

-- Tipo de préstamo
ALTER TABLE payroll_debts
    ADD COLUMN IF NOT EXISTS debt_type VARCHAR(30) DEFAULT 'creditor';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payroll_debts_debt_type_check'
    ) THEN
        ALTER TABLE payroll_debts
            ADD CONSTRAINT payroll_debts_debt_type_check
            CHECK (debt_type IN ('company_loan', 'bank_loan', 'creditor', 'other'));
    END IF;
END $$;

-- Monto por cuota (cuánto se descuenta cada quincena)
ALTER TABLE payroll_debts
    ADD COLUMN IF NOT EXISTS installment_amount DECIMAL(10,2);

-- Total de cuotas pactadas
ALTER TABLE payroll_debts
    ADD COLUMN IF NOT EXISTS total_installments INTEGER;

-- Cuotas ya pagadas
ALTER TABLE payroll_debts
    ADD COLUMN IF NOT EXISTS paid_installments INTEGER DEFAULT 0;

-- Estado del préstamo
ALTER TABLE payroll_debts
    ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active';

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'payroll_debts_status_check'
    ) THEN
        ALTER TABLE payroll_debts
            ADD CONSTRAINT payroll_debts_status_check
            CHECK (status IN ('active', 'completed', 'cancelled', 'paused'));
    END IF;
END $$;

-- Notas adicionales
ALTER TABLE payroll_debts
    ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN payroll_debts.debt_type IS 'Tipo: company_loan (empresa), bank_loan (banco), creditor (acreedor externo), other';
COMMENT ON COLUMN payroll_debts.installment_amount IS 'Monto fijo a descontar por quincena';
COMMENT ON COLUMN payroll_debts.total_installments IS 'Número total de cuotas pactadas';
COMMENT ON COLUMN payroll_debts.paid_installments IS 'Cuotas ya pagadas hasta la fecha';
COMMENT ON COLUMN payroll_debts.status IS 'Estado: active, completed, cancelled, paused';

-- ============================================
-- 9. AGREGAR CAMPOS A payroll_payment_employees
-- ============================================

-- Sucursal y departamento para agrupar en reportes
ALTER TABLE payroll_payment_employees
    ADD COLUMN IF NOT EXISTS branch_id UUID REFERENCES branches(id);

ALTER TABLE payroll_payment_employees
    ADD COLUMN IF NOT EXISTS department_id UUID;

-- Tipo de planilla del empleado al momento del pago (snapshot)
ALTER TABLE payroll_payment_employees
    ADD COLUMN IF NOT EXISTS payroll_type VARCHAR(20) DEFAULT 'regular';

-- Montos adicionales desglosados
ALTER TABLE payroll_payment_employees
    ADD COLUMN IF NOT EXISTS overtime_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE payroll_payment_employees
    ADD COLUMN IF NOT EXISTS sunday_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE payroll_payment_employees
    ADD COLUMN IF NOT EXISTS holiday_amount DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Cuota patronal total (para fase 2 - Odoo)
ALTER TABLE payroll_payment_employees
    ADD COLUMN IF NOT EXISTS employer_cost DECIMAL(10,2) NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_payroll_payment_employees_branch_id ON payroll_payment_employees(branch_id);

COMMENT ON COLUMN payroll_payment_employees.branch_id IS 'Sucursal del empleado al momento del pago (para agrupación)';
COMMENT ON COLUMN payroll_payment_employees.employer_cost IS 'Costo patronal total (CSS+SE+RP) para asientos contables';

-- ============================================
-- 10. HABILITAR RLS EN TABLAS NUEVAS
-- ============================================
ALTER TABLE payroll_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_salary_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_debt_payments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. CREAR POLÍTICAS RLS
-- ============================================
DO $$
BEGIN
    -- payroll_settings
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_settings' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON payroll_settings
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- payroll_holidays
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_holidays' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON payroll_holidays
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- payroll_salary_history
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_salary_history' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON payroll_salary_history
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- payroll_debt_payments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'payroll_debt_payments' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON payroll_debt_payments
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- ============================================
-- 12. TRIGGER PARA updated_at EN payroll_settings
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'update_payroll_settings_updated_at'
    ) THEN
        CREATE TRIGGER update_payroll_settings_updated_at
            BEFORE UPDATE ON payroll_settings
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;

-- ============================================
-- 13. SEED: Feriados de Panamá (recurrentes)
-- ============================================
-- Solo insertar si la tabla está vacía para esta empresa
-- Se debe ejecutar pasando el company_id correcto
-- Ejemplo con placeholder que se puede reemplazar:
/*
INSERT INTO payroll_holidays (company_id, name, date, is_recurring) VALUES
    ('COMPANY_ID', 'Año Nuevo', '2026-01-01', true),
    ('COMPANY_ID', 'Día de los Mártires', '2026-01-09', true),
    ('COMPANY_ID', 'Martes de Carnaval', '2026-02-17', false),
    ('COMPANY_ID', 'Viernes Santo', '2026-04-03', false),
    ('COMPANY_ID', 'Día del Trabajo', '2026-05-01', true),
    ('COMPANY_ID', 'Separación de Panamá de Colombia', '2026-11-03', true),
    ('COMPANY_ID', 'Día de los Difuntos', '2026-11-02', true),
    ('COMPANY_ID', 'Primer Grito de Independencia', '2026-11-10', true),
    ('COMPANY_ID', 'Independencia de Panamá de España', '2026-11-28', true),
    ('COMPANY_ID', 'Día de la Madre', '2026-12-08', true),
    ('COMPANY_ID', 'Navidad', '2026-12-25', true);
*/

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================
