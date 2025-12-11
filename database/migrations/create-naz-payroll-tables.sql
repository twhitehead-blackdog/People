-- ============================================
-- MIGRACIÓN: TABLAS DE PLANILLAS, ACREEDORES Y BANCOS PARA NAZ
-- ============================================
-- Este script crea las tablas necesarias para el sistema de planillas
-- completamente independiente de la empresa Naz
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- 1. CREAR TABLA naz_banks
-- ============================================
CREATE TABLE IF NOT EXISTS naz_banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_banks
CREATE INDEX IF NOT EXISTS idx_naz_banks_name ON naz_banks(name);

-- Comentarios
COMMENT ON TABLE naz_banks IS 'Bancos del sistema de planillas de Naz';

-- ============================================
-- 2. CREAR TABLA naz_creditors
-- ============================================
CREATE TABLE IF NOT EXISTS naz_creditors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_creditors
CREATE INDEX IF NOT EXISTS idx_naz_creditors_name ON naz_creditors(name);

-- Comentarios
COMMENT ON TABLE naz_creditors IS 'Acreedores del sistema de planillas de Naz';

-- ============================================
-- 3. CREAR TABLA naz_payrolls
-- ============================================
-- naz_payrolls tiene company_id que referencia naz_companies
CREATE TABLE IF NOT EXISTS naz_payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES naz_companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_payrolls
CREATE INDEX IF NOT EXISTS idx_naz_payrolls_name ON naz_payrolls(name);

-- Comentarios
COMMENT ON TABLE naz_payrolls IS 'Planillas del sistema de Naz';

-- ============================================
-- 4. CREAR TABLA naz_payroll_deductions
-- ============================================
CREATE TABLE IF NOT EXISTS naz_payroll_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES naz_payrolls(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    min_salary DECIMAL(10, 2) DEFAULT 0,
    income_tax BOOLEAN DEFAULT false,
    calculation_type VARCHAR(20) NOT NULL CHECK (calculation_type IN ('fixed', 'percentage')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_payroll_deductions
CREATE INDEX IF NOT EXISTS idx_naz_payroll_deductions_payroll_id ON naz_payroll_deductions(payroll_id);

-- Comentarios
COMMENT ON TABLE naz_payroll_deductions IS 'Deducciones de planilla para Naz';

-- ============================================
-- 5. CREAR TABLA naz_employee_payrolls
-- ============================================
CREATE TABLE IF NOT EXISTS naz_employee_payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES naz_payrolls(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES naz_employees(id) ON DELETE CASCADE,
    monthly_salary DECIMAL(10, 2) NOT NULL,
    hourly_salary DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payroll_id, employee_id)
);

-- Índices para naz_employee_payrolls
CREATE INDEX IF NOT EXISTS idx_naz_employee_payrolls_payroll_id ON naz_employee_payrolls(payroll_id);
CREATE INDEX IF NOT EXISTS idx_naz_employee_payrolls_employee_id ON naz_employee_payrolls(employee_id);

-- Comentarios
COMMENT ON TABLE naz_employee_payrolls IS 'Relación entre empleados y planillas para Naz';

-- ============================================
-- 6. CREAR TABLA naz_payroll_payments
-- ============================================
CREATE TABLE IF NOT EXISTS naz_payroll_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    payroll_id UUID NOT NULL REFERENCES naz_payrolls(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Índices para naz_payroll_payments
CREATE INDEX IF NOT EXISTS idx_naz_payroll_payments_payroll_id ON naz_payroll_payments(payroll_id);
CREATE INDEX IF NOT EXISTS idx_naz_payroll_payments_status ON naz_payroll_payments(status);

-- Comentarios
COMMENT ON TABLE naz_payroll_payments IS 'Pagos de planilla para Naz';

-- ============================================
-- 7. CREAR TABLA naz_payroll_debts
-- ============================================
CREATE TABLE IF NOT EXISTS naz_payroll_debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES naz_payrolls(id) ON DELETE CASCADE,
    creditor_id UUID NOT NULL REFERENCES naz_creditors(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES naz_employees(id) ON DELETE CASCADE,
    account_id VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    start_date DATE NOT NULL,
    due_date DATE NOT NULL,
    balance DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (balance >= 0),
    CHECK (due_date >= start_date)
);

-- Índices para naz_payroll_debts
CREATE INDEX IF NOT EXISTS idx_naz_payroll_debts_payroll_id ON naz_payroll_debts(payroll_id);
CREATE INDEX IF NOT EXISTS idx_naz_payroll_debts_creditor_id ON naz_payroll_debts(creditor_id);
CREATE INDEX IF NOT EXISTS idx_naz_payroll_debts_employee_id ON naz_payroll_debts(employee_id);

-- Comentarios
COMMENT ON TABLE naz_payroll_debts IS 'Deudas de planilla para Naz';

-- ============================================
-- 8. CREAR TABLA naz_payroll_payment_employees
-- ============================================
CREATE TABLE IF NOT EXISTS naz_payroll_payment_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES naz_payrolls(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES naz_employees(id) ON DELETE CASCADE,
    payroll_payment_id UUID NOT NULL REFERENCES naz_payroll_payments(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    income_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    deduction_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    debt_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    late_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    absence_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payroll_payment_id, employee_id)
);

-- Índices para naz_payroll_payment_employees
CREATE INDEX IF NOT EXISTS idx_naz_payroll_payment_employees_payroll_id ON naz_payroll_payment_employees(payroll_id);
CREATE INDEX IF NOT EXISTS idx_naz_payroll_payment_employees_employee_id ON naz_payroll_payment_employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_naz_payroll_payment_employees_payment_id ON naz_payroll_payment_employees(payroll_payment_id);

-- Comentarios
COMMENT ON TABLE naz_payroll_payment_employees IS 'Empleados en pagos de planilla para Naz';

-- ============================================
-- 9. CREAR TABLA naz_payroll_payment_employee_items
-- ============================================
CREATE TABLE IF NOT EXISTS naz_payroll_payment_employee_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_employee_id UUID NOT NULL REFERENCES naz_payroll_payment_employees(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'deduction', 'debt')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_payroll_payment_employee_items
CREATE INDEX IF NOT EXISTS idx_naz_payroll_payment_employee_items_payment_employee_id ON naz_payroll_payment_employee_items(payment_employee_id);
CREATE INDEX IF NOT EXISTS idx_naz_payroll_payment_employee_items_type ON naz_payroll_payment_employee_items(type);

-- Comentarios
COMMENT ON TABLE naz_payroll_payment_employee_items IS 'Items de pago de empleados en planillas para Naz';

-- ============================================
-- 10. HABILITAR ROW LEVEL SECURITY (RLS)
-- ============================================
ALTER TABLE naz_banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_creditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_employee_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_payroll_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_payroll_payment_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_payroll_payment_employee_items ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. CREAR POLÍTICAS RLS
-- ============================================
-- Política para permitir acceso completo a usuarios autenticados
DO $$
BEGIN
    -- naz_banks
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'naz_banks' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON naz_banks
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- naz_creditors
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'naz_creditors' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON naz_creditors
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- naz_payrolls
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'naz_payrolls' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON naz_payrolls
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- naz_payroll_deductions
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'naz_payroll_deductions' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON naz_payroll_deductions
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- naz_employee_payrolls
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'naz_employee_payrolls' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON naz_employee_payrolls
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- naz_payroll_payments
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'naz_payroll_payments' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON naz_payroll_payments
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- naz_payroll_debts
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'naz_payroll_debts' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON naz_payroll_debts
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- naz_payroll_payment_employees
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'naz_payroll_payment_employees' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON naz_payroll_payment_employees
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;

    -- naz_payroll_payment_employee_items
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'naz_payroll_payment_employee_items' AND policyname = 'Enable all access for authenticated users') THEN
        CREATE POLICY "Enable all access for authenticated users" ON naz_payroll_payment_employee_items
            FOR ALL USING (auth.role() = 'authenticated');
    END IF;
END $$;

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================

