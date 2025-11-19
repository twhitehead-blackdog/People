-- ============================================
-- People Database - Setup Completo
-- ============================================
-- Este es el archivo PRINCIPAL para crear toda la base de datos
-- Ejecutar SOLO ESTE ARCHIVO en el SQL Editor de Supabase
-- 
-- Incluye:
-- - Todas las tablas principales
-- - Tablas adicionales (datos personales, portal, quejas)
-- - Índices y triggers
-- - RLS básico
-- - Migraciones necesarias (campos adicionales, etc.)
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- FUNCIONES ÚTILES
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TABLAS MAESTRAS
-- ============================================

CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone_number VARCHAR(50),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS branches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(50),
    address TEXT,
    is_active BOOLEAN DEFAULT true,
    ip VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    schedule_admin BOOLEAN DEFAULT false,
    admin BOOLEAN DEFAULT false,
    schedule_approver BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS organization_chart (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
    parent_position_id UUID REFERENCES positions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(position_id, parent_position_id)
);

CREATE TABLE IF NOT EXISTS banks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS creditors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timeoff_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL
);

CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLAS DE EMPLEADOS
-- ============================================

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
    has_portal_access BOOLEAN DEFAULT false,
    account_approved BOOLEAN DEFAULT NULL,
    uniform_size VARCHAR(10) CHECK (uniform_size IN ('XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL')),
    qr_code TEXT,
    code_uri TEXT,
    bank VARCHAR(255),
    account_number VARCHAR(50),
    bank_account_type VARCHAR(20) CHECK (bank_account_type IN ('Ahorros', 'Corriente')),
    full_name VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS timeoffs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_id UUID NOT NULL REFERENCES timeoff_types(id) ON DELETE RESTRICT,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date_from DATE NOT NULL,
    date_to DATE NOT NULL,
    notes TEXT[],
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (date_to >= date_from)
);

CREATE TABLE IF NOT EXISTS terminations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    notes TEXT,
    reason VARCHAR(20) NOT NULL CHECK (reason IN ('DESPIDO', 'RENUNCIA', 'FIN_CONTRATO')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLAS DE DATOS PERSONALES
-- ============================================

CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    document_number VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(255),
    file_url TEXT,
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    note_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL',
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    skill_level VARCHAR(50) CHECK (skill_level IN ('BASICO', 'INTERMEDIO', 'AVANZADO', 'EXPERTO')),
    certification_date DATE,
    certification_authority VARCHAR(255),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS employee_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    language VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('BASICO', 'INTERMEDIO', 'AVANZADO', 'NATIVO')),
    is_native BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- TABLAS DEL PORTAL DE EMPLEADOS
-- ============================================

CREATE TABLE IF NOT EXISTS employee_disabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    document_url TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL,
    custom_document_type VARCHAR(255),
    reason TEXT,
    required_date DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    document_url TEXT,
    processed_by UUID,
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID,
    creator_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    category VARCHAR(50) NOT NULL CHECK (category IN ('work_environment', 'harassment', 'safety', 'management', 'benefits', 'other')),
    complaint TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    allow_contact BOOLEAN DEFAULT false,
    contact_method VARCHAR(20) CHECK (contact_method IN ('email', 'phone', 'meeting')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved', 'closed')),
    closed BOOLEAN DEFAULT false,
    closed_at TIMESTAMP WITH TIME ZONE,
    reveal_identity BOOLEAN DEFAULT false,
    thread_id UUID DEFAULT uuid_generate_v4(),
    response TEXT,
    responded_by UUID,
    response_date TIMESTAMP WITH TIME ZONE,
    last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS complaint_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
    thread_id UUID,
    sender_id UUID,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('employee', 'hr')),
    is_anonymous BOOLEAN DEFAULT false,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (
        (sender_type = 'employee' AND is_anonymous = true AND sender_id IS NULL) OR
        (sender_type = 'employee' AND is_anonymous = false AND sender_id IS NOT NULL) OR
        (sender_type = 'hr' AND sender_id IS NOT NULL)
    )
);

-- ============================================
-- TABLAS DE HORARIOS Y ASISTENCIA
-- ============================================

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

CREATE TABLE IF NOT EXISTS payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE TABLE IF NOT EXISTS employee_payrolls (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payroll_id UUID NOT NULL REFERENCES payrolls(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    monthly_salary DECIMAL(10, 2) NOT NULL,
    hourly_salary DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(payroll_id, employee_id)
);

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

CREATE TABLE IF NOT EXISTS payroll_payment_employee_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_employee_id UUID NOT NULL REFERENCES payroll_payment_employees(id) ON DELETE CASCADE,
    type VARCHAR(20) NOT NULL CHECK (type IN ('income', 'deduction', 'debt')),
    amount DECIMAL(10, 2) NOT NULL,
    description TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employees_branch_id ON employees(branch_id);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_work_email ON employees(work_email);
CREATE INDEX IF NOT EXISTS idx_employees_is_active ON employees(is_active);
CREATE INDEX IF NOT EXISTS idx_employees_portal_access ON employees(has_portal_access) WHERE has_portal_access = true;
CREATE INDEX IF NOT EXISTS idx_employees_account_approved ON employees(account_approved) WHERE account_approved IS NULL OR account_approved = FALSE;

CREATE INDEX IF NOT EXISTS idx_timelogs_employee_id ON timelogs(employee_id);
CREATE INDEX IF NOT EXISTS idx_timelogs_branch_id ON timelogs(branch_id);
CREATE INDEX IF NOT EXISTS idx_timelogs_created_at ON timelogs(created_at);
CREATE INDEX IF NOT EXISTS idx_timelogs_type ON timelogs(type);

CREATE INDEX IF NOT EXISTS idx_attendance_sheets_employee_id ON attendance_sheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_attendance_sheets_date ON attendance_sheets(date);
CREATE INDEX IF NOT EXISTS idx_attendance_sheets_branch_id ON attendance_sheets(branch_id);

CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_id ON employee_schedules(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_schedule_id ON employee_schedules(schedule_id);
CREATE INDEX IF NOT EXISTS idx_employee_schedules_dates ON employee_schedules(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_payroll_payments_payroll_id ON payroll_payments(payroll_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_employees_payment_id ON payroll_payment_employees(payroll_payment_id);
CREATE INDEX IF NOT EXISTS idx_payroll_payment_employees_employee_id ON payroll_payment_employees(employee_id);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_employee_id ON emergency_contacts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notes_employee_id ON employee_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee_id ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_languages_employee_id ON employee_languages(employee_id);

CREATE INDEX IF NOT EXISTS idx_employee_disabilities_employee_id ON employee_disabilities(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_disabilities_status ON employee_disabilities(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_employee_id ON document_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_complaints_employee_id ON complaints(employee_id);
CREATE INDEX IF NOT EXISTS idx_complaints_creator_employee_id ON complaints(creator_employee_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
CREATE INDEX IF NOT EXISTS idx_complaints_closed ON complaints(closed);
CREATE INDEX IF NOT EXISTS idx_complaints_thread_id ON complaints(thread_id);
CREATE INDEX IF NOT EXISTS idx_complaints_last_message_at ON complaints(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_complaint_messages_complaint_id ON complaint_messages(complaint_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_thread_id ON complaint_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_sender_id ON complaint_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_created_at ON complaint_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_complaint_messages_is_read ON complaint_messages(is_read);

CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- ============================================
-- TRIGGERS
-- ============================================

CREATE TRIGGER update_employee_schedules_updated_at
    BEFORE UPDATE ON employee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at
    BEFORE UPDATE ON employee_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_notes_updated_at
    BEFORE UPDATE ON employee_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_skills_updated_at
    BEFORE UPDATE ON employee_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_disabilities_updated_at
    BEFORE UPDATE ON employee_disabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_requests_updated_at
    BEFORE UPDATE ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaint_messages_updated_at
    BEFORE UPDATE ON complaint_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE OR REPLACE FUNCTION update_complaint_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE complaints 
    SET last_message_at = NEW.created_at
    WHERE id = NEW.complaint_id;
    
    UPDATE complaint_messages
    SET thread_id = (SELECT thread_id FROM complaints WHERE id = NEW.complaint_id)
    WHERE id = NEW.id AND thread_id IS NULL;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_complaint_last_message_trigger
    AFTER INSERT ON complaint_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_complaint_last_message_at();

CREATE OR REPLACE FUNCTION sync_thread_id_to_messages()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE complaint_messages
    SET thread_id = NEW.thread_id
    WHERE complaint_id = NEW.id AND (thread_id IS NULL OR thread_id != NEW.thread_id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER sync_complaint_thread_id
    AFTER INSERT OR UPDATE OF thread_id ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION sync_thread_id_to_messages();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_chart ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_disabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
-- Eliminar políticas existentes antes de crear nuevas (evita errores)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON companies;
CREATE POLICY "Enable all access for authenticated users" ON companies
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON branches;
CREATE POLICY "Enable all access for authenticated users" ON branches
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON departments;
CREATE POLICY "Enable all access for authenticated users" ON departments
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON positions;
CREATE POLICY "Enable all access for authenticated users" ON positions
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON organization_chart;
CREATE POLICY "Enable all access for authenticated users" ON organization_chart
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON banks;
CREATE POLICY "Enable all access for authenticated users" ON banks
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON creditors;
CREATE POLICY "Enable all access for authenticated users" ON creditors
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON timeoff_types;
CREATE POLICY "Enable all access for authenticated users" ON timeoff_types
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employees;
CREATE POLICY "Enable all access for authenticated users" ON employees
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON timeoffs;
CREATE POLICY "Enable all access for authenticated users" ON timeoffs
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON terminations;
CREATE POLICY "Enable all access for authenticated users" ON terminations
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON schedules;
CREATE POLICY "Enable all access for authenticated users" ON schedules
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_schedules;
CREATE POLICY "Enable all access for authenticated users" ON employee_schedules
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON timelogs;
CREATE POLICY "Enable all access for authenticated users" ON timelogs
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON attendance_sheets;
CREATE POLICY "Enable all access for authenticated users" ON attendance_sheets
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payrolls;
CREATE POLICY "Enable all access for authenticated users" ON payrolls
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_deductions;
CREATE POLICY "Enable all access for authenticated users" ON payroll_deductions
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_payrolls;
CREATE POLICY "Enable all access for authenticated users" ON employee_payrolls
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_payments;
CREATE POLICY "Enable all access for authenticated users" ON payroll_payments
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_debts;
CREATE POLICY "Enable all access for authenticated users" ON payroll_debts
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_payment_employees;
CREATE POLICY "Enable all access for authenticated users" ON payroll_payment_employees
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_payment_employee_items;
CREATE POLICY "Enable all access for authenticated users" ON payroll_payment_employee_items
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON emergency_contacts;
CREATE POLICY "Enable all access for authenticated users" ON emergency_contacts
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_documents;
CREATE POLICY "Enable all access for authenticated users" ON employee_documents
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_notes;
CREATE POLICY "Enable all access for authenticated users" ON employee_notes
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_skills;
CREATE POLICY "Enable all access for authenticated users" ON employee_skills
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_languages;
CREATE POLICY "Enable all access for authenticated users" ON employee_languages
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_disabilities;
CREATE POLICY "Enable all access for authenticated users" ON employee_disabilities
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON document_requests;
CREATE POLICY "Enable all access for authenticated users" ON document_requests
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON complaints;
CREATE POLICY "Enable all access for authenticated users" ON complaints
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON complaint_messages;
CREATE POLICY "Enable all access for authenticated users" ON complaint_messages
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON settings;
CREATE POLICY "Enable all access for authenticated users" ON settings
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- VISTAS
-- ============================================

CREATE OR REPLACE VIEW v_lates_daily AS
SELECT
  date AS work_date,
  COUNT(*) FILTER (WHERE is_late) AS total_lates,
  COALESCE(SUM(ROUND(late_hours * 60)::int), 0) AS total_minutes_late
FROM attendance_sheets
GROUP BY date
ORDER BY date;

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

-- ============================================
-- DATOS INICIALES
-- ============================================

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES 
    ('wassenger_api_key', '', 'API Key de Wassenger para envío de mensajes', 'integrations', true),
    ('wassenger_enabled', 'false', 'Habilita o deshabilita la integración con Wassenger', 'integrations', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- FIN DEL SETUP
-- ============================================

