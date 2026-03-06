-- ============================================
-- MIGRACIÓN: Décimo Tercer Mes (XIII Mes)
-- ============================================
-- Fecha: 2026-03-05
-- Descripción: Tabla para almacenar los cálculos del décimo tercer mes
--   por empleado y cuatrimestre, según ley panameña.
--   3 cuatrimestres:
--     1: Dic 16 - Abr 15 (pago antes del 15 de abril)
--     2: Abr 16 - Ago 15 (pago antes del 15 de agosto)
--     3: Ago 16 - Dic 15 (pago antes del 15 de diciembre)
--   Monto = total devengado en el cuatrimestre / 3
-- ============================================

CREATE TABLE IF NOT EXISTS decimo_tercer_mes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    year INTEGER NOT NULL,
    -- 1 = Dic16-Abr15, 2 = Abr16-Ago15, 3 = Ago16-Dic15
    period_number INTEGER NOT NULL CHECK (period_number BETWEEN 1 AND 3),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    -- Total devengado en el cuatrimestre (base + extras)
    earnings_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- Monto del décimo = earnings_total / 3
    decimo_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- Desglose de ingresos para auditoría
    base_salary_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    overtime_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    sunday_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    holiday_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    other_income_total DECIMAL(12,2) NOT NULL DEFAULT 0,
    -- Estado del pago
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'CALCULATED', 'APPROVED', 'PAID')),
    paid_date DATE,
    approved_by UUID REFERENCES employees(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Un solo registro por empleado/año/cuatrimestre
    UNIQUE(company_id, year, period_number, employee_id)
);

CREATE INDEX IF NOT EXISTS idx_decimo_company_year ON decimo_tercer_mes(company_id, year);
CREATE INDEX IF NOT EXISTS idx_decimo_employee ON decimo_tercer_mes(employee_id);
CREATE INDEX IF NOT EXISTS idx_decimo_period ON decimo_tercer_mes(year, period_number);
CREATE INDEX IF NOT EXISTS idx_decimo_status ON decimo_tercer_mes(status);

COMMENT ON TABLE decimo_tercer_mes IS 'Décimo tercer mes (XIII mes) - Bonificación cuatrimestral según ley panameña';

-- RLS Policies
ALTER TABLE decimo_tercer_mes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "decimo_select_authenticated"
    ON decimo_tercer_mes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY IF NOT EXISTS "decimo_insert_authenticated"
    ON decimo_tercer_mes FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "decimo_update_authenticated"
    ON decimo_tercer_mes FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "decimo_delete_authenticated"
    ON decimo_tercer_mes FOR DELETE
    TO authenticated
    USING (true);
