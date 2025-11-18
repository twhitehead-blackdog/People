-- ============================================
-- Peopletrak Database Schema for Supabase
-- ============================================
-- Este script crea todas las tablas necesarias para la aplicación Peopletrak
-- Ejecutar en el SQL Editor de Supabase

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLAS MAESTRAS
-- ============================================

-- Tabla: companies (Compañías)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: branches (Sucursales)
CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    ip VARCHAR(45), -- IPv4 o IPv6
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: departments (Departamentos)
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: positions (Posiciones/Cargos)
CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    schedule_admin BOOLEAN DEFAULT false,
    admin BOOLEAN DEFAULT false,
    schedule_approver BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: banks (Bancos)
CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: creditors (Acreedores)
CREATE TABLE IF NOT EXISTS creditors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: timeoff_types (Tipos de Permisos)
CREATE TABLE IF NOT EXISTS timeoff_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL
);

-- ============================================
-- TABLAS DE EMPLEADOS
-- ============================================

-- Tabla: employees (Empleados)
CREATE TABLE IF NOT EXISTS employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_id VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(255) NOT NULL,
    middle_name VARCHAR(255),
    father_name VARCHAR(255) NOT NULL,
    mother_name VARCHAR(255),
    birth_date DATE,
    gender CHAR(1) CHECK (gender IN ('M', 'F')),
    start_date DATE NOT NULL,
    monthly_salary DECIMAL(10, 2) NOT NULL,
    hourly_salary DECIMAL(10, 2),
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE RESTRICT,
    email VARCHAR(255),
    work_email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(50),
    address TEXT,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    uniform_size VARCHAR(10) CHECK (uniform_size IN ('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL')),
    qr_code TEXT, -- Base64 del QR code
    code_uri TEXT, -- URI del código TOTP
    bank VARCHAR(255),
    account_number VARCHAR(50),
    bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('Ahorros', 'Corriente')),
    full_name VARCHAR(500), -- Campo calculado/virtual
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: timeoffs (Permisos/Ausencias)
CREATE TABLE IF NOT EXISTS timeoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id UUID NOT NULL REFERENCES timeoff_types(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    notes TEXT[], -- Array de strings
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (date_to >= date_from)
);

-- Tabla: terminations (Terminaciones)
CREATE TABLE IF NOT EXISTS terminations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT,
    reason VARCHAR(20) NOT NULL CHECK (reason IN ('DESPIDO', 'RENUNCIA', 'FIN_CONTRATO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLAS DE HORARIOS Y ASISTENCIA
-- ============================================

-- Tabla: schedules (Horarios)
CREATE TABLE IF NOT EXISTS schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    entry_time TIME,
    lunch_start_time TIME,
    lunch_end_time TIME,
    exit_time TIME,
    color VARCHAR(50),
    day_off BOOLEAN DEFAULT false,
    minutes_tolerance INTEGER DEFAULT 0,
    min_lunch_minutes INTEGER,
    max_lunch_minutes INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: employee_schedules (Horarios de Empleados)
CREATE TABLE IF NOT EXISTS employee_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    schedule_id UUID NOT NULL REFERENCES schedules(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Tabla: timelogs (Registros de Tiempo/Asistencia)
CREATE TABLE IF NOT EXISTS timelogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('entry', 'lunch_start', 'lunch_end', 'exit')),
    ip VARCHAR(45),
    invalid_id BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: attendance_sheets (Hojas de Asistencia)
CREATE TABLE IF NOT EXISTS attendance_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    base_salary DECIMAL(10, 2) NOT NULL,
    branch_id UUID REFERENCES branches(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES schedules(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    entry_time TIMESTAMP WITH TIME ZONE,
    exit_time TIMESTAMP WITH TIME ZONE,
    lunch_start_time TIMESTAMP WITH TIME ZONE,
    lunch_end_time TIMESTAMP WITH TIME ZONE,
    is_late BOOLEAN DEFAULT false,
    is_sunday BOOLEAN DEFAULT false,
    is_holiday BOOLEAN DEFAULT false,
    is_justified BOOLEAN DEFAULT false,
    justification_notes TEXT DEFAULT '',
    justification_cause VARCHAR(20) CHECK (justification_cause IN ('NORMAL', 'PERSONAL', 'INJUSTIFICADA', 'JUSTIFICADA', 'COMPENSATORIO')),
    worked_hours DECIMAL(5, 2) DEFAULT 0,
    late_hours DECIMAL(5, 2) DEFAULT 0,
    overtime_hours DECIMAL(5, 2) DEFAULT 0,
    absence_hours DECIMAL(5, 2) DEFAULT 0,
    justified_hours DECIMAL(5, 2),
    compensatory_hours DECIMAL(5, 2),
    worked_hours_payment DECIMAL(10, 2) DEFAULT 0,
    late_hours_payment DECIMAL(10, 2) DEFAULT 0,
    holiday_payment DECIMAL(10, 2) DEFAULT 0,
    sunday_payment DECIMAL(10, 2) DEFAULT 0,
    absence_hours_payment DECIMAL(10, 2) DEFAULT 0,
    compensatory_hours_payment DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(employee_id, date)
);

-- ============================================
-- TABLAS DE NÓMINA
-- ============================================

-- Tabla: payrolls (Nóminas)
CREATE TABLE IF NOT EXISTS payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: payroll_deductions (Deducciones de Nómina)
CREATE TABLE IF NOT EXISTS payroll_deductions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value DECIMAL(10, 2) NOT NULL,
    min_salary DECIMAL(10, 2) DEFAULT 0,
    income_tax BOOLEAN DEFAULT false,
    calculation_type VARCHAR(20) NOT NULL CHECK (calculation_type IN ('fixed', 'percentage')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: employee_payrolls (Empleados en Nómina)
CREATE TABLE IF NOT EXISTS employee_payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    monthly_salary DECIMAL(10, 2) NOT NULL,
    hourly_salary DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payroll_id, employee_id)
);

-- Tabla: payroll_payments (Pagos de Nómina)
CREATE TABLE IF NOT EXISTS payroll_payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PAID')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Tabla: payroll_debts (Deudas de Empleados)
CREATE TABLE IF NOT EXISTS payroll_debts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    creditor_id UUID NOT NULL REFERENCES creditors(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
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

-- Tabla: payroll_payment_employees (Pagos a Empleados)
CREATE TABLE IF NOT EXISTS payroll_payment_employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    payroll_payment_id UUID NOT NULL REFERENCES payroll_payments(id) ON DELETE CASCADE,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    income_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    deduction_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    debt_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    late_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    absence_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payroll_payment_id, employee_id)
);

-- Tabla: payroll_payment_employee_items (Items de Pago)
CREATE TABLE IF NOT EXISTS payroll_payment_employee_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_employee_id UUID NOT NULL REFERENCES payroll_payment_employees(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'deduction', 'debt')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

-- Índices para employees
CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_work_email ON employees(work_email);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);

-- Índices para timelogs
CREATE INDEX IF NOT EXISTS idx_timelogs_employee_id ON timelogs(employee_id);
CREATE INDEX IF NOT EXISTS idx_timelogs_branch_id ON timelogs(branch_id);
CREATE INDEX IF NOT EXISTS idx_timelogs_created_at ON timelogs(created_at);
CREATE INDEX IF NOT EXISTS idx_timelogs_type ON timelogs(type);

-- Índices para attendance_sheets
CREATE INDEX IF NOT EXISTS idx_attendance_sheets_employee_id ON attendance_sheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sheets_date ON attendance_sheets(date);
CREATE INDEX IF NOT EXISTS idx_attendance_sheets_branch_id ON attendance_sheets(branch_id);

-- Índices para employee_schedules
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_id ON employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_schedule_id ON employee_schedules(schedule_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_dates ON employee_schedules(start_date, end_date);

-- Índices para payrolls
CREATE INDEX IF NOT EXISTS idx_payroll_payments_payroll_id ON payroll_payments(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_employees_payment_id ON payroll_payment_employees(payroll_payment_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_employees_employee_id ON payroll_payment_employees(employee_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- Nota: Ajustar las políticas según tus necesidades de seguridad

-- Habilitar RLS en todas las tablas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE creditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeoff_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payment_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payment_employee_items ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
-- Permitir todo para usuarios autenticados (ejemplo básico)
-- En producción, crear políticas más específicas basadas en roles

CREATE POLICY "Enable read access for authenticated users" ON companies
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Enable insert access for authenticated users" ON companies
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Enable update access for authenticated users" ON companies
    FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Enable delete access for authenticated users" ON companies
    FOR DELETE USING (auth.role() = 'authenticated');

-- Repetir políticas similares para otras tablas según necesidades
-- O crear políticas más específicas basadas en roles de usuario

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para employee_schedules
CREATE TRIGGER update_employee_schedules_updated_at
    BEFORE UPDATE ON employee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- COMENTARIOS EN TABLAS
-- ============================================

COMMENT ON TABLE companies IS 'Compañías o empresas';
COMMENT ON TABLE branches IS 'Sucursales o ubicaciones';
COMMENT ON TABLE departments IS 'Departamentos de la empresa';
COMMENT ON TABLE positions IS 'Posiciones o cargos de trabajo';
COMMENT ON TABLE employees IS 'Información de empleados';
COMMENT ON TABLE schedules IS 'Horarios de trabajo';
COMMENT ON TABLE employee_schedules IS 'Asignación de horarios a empleados';
COMMENT ON TABLE timelogs IS 'Registros de entrada/salida';
COMMENT ON TABLE attendance_sheets IS 'Hojas de asistencia calculadas';
COMMENT ON TABLE payrolls IS 'Nóminas';
COMMENT ON TABLE payroll_payments IS 'Pagos de nómina';
COMMENT ON TABLE payroll_debts IS 'Deudas de empleados';

-- ============================================
-- VISTAS DE TARDANZAS Y AUSENTISMO
-- ============================================

-- Vista de tardanzas por día (totales)
CREATE OR REPLACE VIEW v_lates_daily AS
SELECT
  date AS work_date,
  COUNT(*) FILTER (WHERE is_late) AS total_lates,
  COALESCE(SUM(ROUND(late_hours * 60)::int), 0) AS total_minutes_late
FROM attendance_sheets
GROUP BY date
ORDER BY date;

-- Vista de detalle: quiénes llegaron tarde por día
CREATE OR REPLACE VIEW v_lates_daily_detail AS
SELECT
  s.date AS work_date,
  s.employee_id,
  CONCAT(COALESCE(e.first_name, ''), ' ', COALESCE(e.father_name, '')) AS employee_name,
  ROUND(s.late_hours * 60)::int AS minutes_late
FROM attendance_sheets s
JOIN employees e ON e.id = s.employee_id
WHERE s.is_late
ORDER BY s.date, employee_name;

