-- ============================================
-- MIGRACIÓN: SISTEMA DE MARCACIONES INDEPENDIENTE PARA NAZ
-- ============================================
-- Este script crea todas las tablas necesarias para el sistema de marcaciones
-- completamente independiente de la empresa Naz
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- 1. CREAR FUNCIÓN update_updated_at_column (si no existe)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 2. CREAR TABLA naz_companies
-- ============================================
CREATE TABLE IF NOT EXISTS naz_companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_companies
CREATE INDEX IF NOT EXISTS idx_naz_companies_is_active ON naz_companies(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_naz_companies_name ON naz_companies(name);

-- Comentarios
COMMENT ON TABLE naz_companies IS 'Empresas del sistema de marcaciones de Naz';

-- ============================================
-- 3. CREAR TABLA naz_branches
-- ============================================
CREATE TABLE IF NOT EXISTS naz_branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    ip VARCHAR(45),
    company_id UUID REFERENCES naz_companies(id) ON DELETE RESTRICT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_branches
CREATE INDEX IF NOT EXISTS idx_naz_branches_company_id ON naz_branches(company_id);
CREATE INDEX IF NOT EXISTS idx_naz_branches_is_active ON naz_branches(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_naz_branches_ip ON naz_branches(ip) WHERE ip IS NOT NULL;

-- Comentarios
COMMENT ON TABLE naz_branches IS 'Sucursales del sistema de marcaciones de Naz';
COMMENT ON COLUMN naz_branches.ip IS 'Dirección IP de la sucursal para validación en modo kiosko';

-- ============================================
-- 4. CREAR TABLA naz_departments
-- ============================================
CREATE TABLE IF NOT EXISTS naz_departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_departments
CREATE INDEX IF NOT EXISTS idx_naz_departments_name ON naz_departments(name);

-- Comentarios
COMMENT ON TABLE naz_departments IS 'Departamentos del sistema de marcaciones de Naz';

-- ============================================
-- 5. CREAR TABLA naz_positions
-- ============================================
CREATE TABLE IF NOT EXISTS naz_positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    department_id UUID NOT NULL REFERENCES naz_departments(id) ON DELETE RESTRICT,
    schedule_admin BOOLEAN DEFAULT false,
    admin BOOLEAN DEFAULT false,
    schedule_approver BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_positions
CREATE INDEX IF NOT EXISTS idx_naz_positions_department_id ON naz_positions(department_id);
CREATE INDEX IF NOT EXISTS idx_naz_positions_admin ON naz_positions(admin) WHERE admin = true;

-- Comentarios
COMMENT ON TABLE naz_positions IS 'Posiciones/cargos del sistema de marcaciones de Naz';

-- ============================================
-- 6. CREAR TABLA naz_employees
-- ============================================
CREATE TABLE IF NOT EXISTS naz_employees (
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
    branch_id UUID NOT NULL REFERENCES naz_branches(id) ON DELETE RESTRICT,
    department_id UUID NOT NULL REFERENCES naz_departments(id) ON DELETE RESTRICT,
    position_id UUID NOT NULL REFERENCES naz_positions(id) ON DELETE RESTRICT,
    email VARCHAR(255),
    work_email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(50),
    address TEXT,
    end_date DATE,
    is_active BOOLEAN DEFAULT true,
    uniform_size VARCHAR(10) CHECK (uniform_size IN ('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL')),
    qr_code TEXT,
    code_uri TEXT,
    bank VARCHAR(255),
    account_number VARCHAR(50),
    bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('Ahorros', 'Corriente')),
    full_name VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_employees
CREATE INDEX IF NOT EXISTS idx_naz_employees_branch_id ON naz_employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_naz_employees_department_id ON naz_employees(department_id);
CREATE INDEX IF NOT EXISTS idx_naz_employees_position_id ON naz_employees(position_id);
CREATE INDEX IF NOT EXISTS idx_naz_employees_work_email ON naz_employees(work_email);
CREATE INDEX IF NOT EXISTS idx_naz_employees_is_active ON naz_employees(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_naz_employees_document_id ON naz_employees(document_id);

-- Comentarios
COMMENT ON TABLE naz_employees IS 'Empleados del sistema de marcaciones de Naz';
COMMENT ON COLUMN naz_employees.code_uri IS 'URI del código TOTP para validación de PIN';

-- ============================================
-- 7. CREAR TABLA naz_schedules
-- ============================================
CREATE TABLE IF NOT EXISTS naz_schedules (
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

-- Índices para naz_schedules
CREATE INDEX IF NOT EXISTS idx_naz_schedules_name ON naz_schedules(name);
CREATE INDEX IF NOT EXISTS idx_naz_schedules_day_off ON naz_schedules(day_off) WHERE day_off = false;

-- Comentarios
COMMENT ON TABLE naz_schedules IS 'Horarios del sistema de marcaciones de Naz';

-- ============================================
-- 8. CREAR TABLA naz_employee_schedules
-- ============================================
CREATE TABLE IF NOT EXISTS naz_employee_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES naz_employees(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES naz_branches(id) ON DELETE SET NULL,
    schedule_id UUID NOT NULL REFERENCES naz_schedules(id) ON DELETE RESTRICT,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    approved BOOLEAN DEFAULT false,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Índices para naz_employee_schedules
CREATE INDEX IF NOT EXISTS idx_naz_employee_schedules_employee_id ON naz_employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_naz_employee_schedules_schedule_id ON naz_employee_schedules(schedule_id);
CREATE INDEX IF NOT EXISTS idx_naz_employee_schedules_dates ON naz_employee_schedules(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_naz_employee_schedules_branch_id ON naz_employee_schedules(branch_id);

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_naz_employee_schedules_updated_at ON naz_employee_schedules;
CREATE TRIGGER update_naz_employee_schedules_updated_at
    BEFORE UPDATE ON naz_employee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios
COMMENT ON TABLE naz_employee_schedules IS 'Horarios asignados a empleados del sistema de marcaciones de Naz';

-- ============================================
-- 9. CREAR TABLA naz_timelogs
-- ============================================
CREATE TABLE IF NOT EXISTS naz_timelogs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES naz_employees(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES naz_companies(id) ON DELETE RESTRICT,
    branch_id UUID NOT NULL REFERENCES naz_branches(id) ON DELETE RESTRICT,
    type VARCHAR(20) NOT NULL CHECK (type IN ('entry', 'lunch_start', 'lunch_end', 'exit')),
    ip VARCHAR(45),
    invalid_id BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para naz_timelogs
CREATE INDEX IF NOT EXISTS idx_naz_timelogs_employee_id ON naz_timelogs(employee_id);
CREATE INDEX IF NOT EXISTS idx_naz_timelogs_company_id ON naz_timelogs(company_id);
CREATE INDEX IF NOT EXISTS idx_naz_timelogs_branch_id ON naz_timelogs(branch_id);
CREATE INDEX IF NOT EXISTS idx_naz_timelogs_created_at ON naz_timelogs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_naz_timelogs_type ON naz_timelogs(type);
CREATE INDEX IF NOT EXISTS idx_naz_timelogs_employee_date ON naz_timelogs(employee_id, created_at);

-- Comentarios
COMMENT ON TABLE naz_timelogs IS 'Registros de marcación del sistema de Naz';
COMMENT ON COLUMN naz_timelogs.type IS 'Tipo de marcación: entry, lunch_start, lunch_end, exit';
COMMENT ON COLUMN naz_timelogs.invalid_id IS 'Indica si la IP no es válida para el modo kiosko';

-- ============================================
-- 10. CREAR TABLA naz_attendance_sheets
-- ============================================
CREATE TABLE IF NOT EXISTS naz_attendance_sheets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES naz_employees(id) ON DELETE CASCADE,
    base_salary DECIMAL(10, 2) NOT NULL,
    branch_id UUID REFERENCES naz_branches(id) ON DELETE SET NULL,
    schedule_id UUID REFERENCES naz_schedules(id) ON DELETE SET NULL,
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

-- Índices para naz_attendance_sheets
CREATE INDEX IF NOT EXISTS idx_naz_attendance_sheets_employee_id ON naz_attendance_sheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_naz_attendance_sheets_date ON naz_attendance_sheets(date);
CREATE INDEX IF NOT EXISTS idx_naz_attendance_sheets_branch_id ON naz_attendance_sheets(branch_id);
CREATE INDEX IF NOT EXISTS idx_naz_attendance_sheets_schedule_id ON naz_attendance_sheets(schedule_id);
CREATE INDEX IF NOT EXISTS idx_naz_attendance_sheets_employee_date ON naz_attendance_sheets(employee_id, date);

-- Comentarios
COMMENT ON TABLE naz_attendance_sheets IS 'Hojas de asistencia del sistema de marcaciones de Naz';

-- ============================================
-- 11. CONFIGURAR POLÍTICAS RLS (Row Level Security)
-- ============================================
-- Habilitar RLS en todas las tablas
ALTER TABLE naz_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_timelogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE naz_attendance_sheets ENABLE ROW LEVEL SECURITY;

-- Políticas para naz_companies: Todos pueden leer empresas activas
CREATE POLICY "Users can view active naz companies" ON naz_companies
    FOR SELECT
    USING (is_active = true);

-- Políticas para naz_branches: Todos pueden leer sucursales activas
CREATE POLICY "Users can view active naz branches" ON naz_branches
    FOR SELECT
    USING (is_active = true);

-- Políticas para naz_departments: Todos pueden leer
CREATE POLICY "Users can view naz departments" ON naz_departments
    FOR SELECT
    USING (true);

-- Políticas para naz_positions: Todos pueden leer
CREATE POLICY "Users can view naz positions" ON naz_positions
    FOR SELECT
    USING (true);

-- Políticas para naz_employees: Todos pueden leer empleados activos
CREATE POLICY "Users can view active naz employees" ON naz_employees
    FOR SELECT
    USING (is_active = true);

-- Políticas para naz_schedules: Todos pueden leer
CREATE POLICY "Users can view naz schedules" ON naz_schedules
    FOR SELECT
    USING (true);

-- Políticas para naz_employee_schedules: Todos pueden leer
CREATE POLICY "Users can view naz employee schedules" ON naz_employee_schedules
    FOR SELECT
    USING (true);

-- Políticas para naz_timelogs: Todos pueden leer y crear timelogs
CREATE POLICY "Users can view naz timelogs" ON naz_timelogs
    FOR SELECT
    USING (true);

CREATE POLICY "Users can create naz timelogs" ON naz_timelogs
    FOR INSERT
    WITH CHECK (true);

-- Políticas para naz_attendance_sheets: Todos pueden leer
CREATE POLICY "Users can view naz attendance sheets" ON naz_attendance_sheets
    FOR SELECT
    USING (true);

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================

