-- ============================================
-- People Database - Setup Completo para Producción
-- ============================================
-- Este es el archivo CONSOLIDADO que contiene TODO lo necesario
-- para replicar la base de datos de desarrollo en producción
-- 
-- Incluye:
-- - Todas las tablas principales y adicionales
-- - Funciones y triggers
-- - Índices
-- - Políticas RLS
-- - Tabla de notificaciones
-- - Tabla de aplicaciones de trabajo (job_applications)
-- - Campos adicionales en positions
-- - Buckets de Storage (disabilities, timeoffs, job-applications)
-- ============================================
-- 
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → SQL Editor → New Query
-- 2. Copia y pega TODO este contenido
-- 3. Haz clic en Run o presiona Ctrl+Enter
-- 4. Verifica que no haya errores
-- ============================================

-- ============================================
-- SECCIÓN 1: EXTENSIONES Y FUNCIONES BASE
-- ============================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- SECCIÓN 2: TABLAS MAESTRAS
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
    work_email VARCHAR(255) UNIQUE,
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
-- SECCIÓN 3: TABLAS DE EMPLEADOS
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
-- SECCIÓN 4: TABLAS DE DATOS PERSONALES
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
-- SECCIÓN 5: TABLAS DEL PORTAL DE EMPLEADOS
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
-- SECCIÓN 6: TABLAS DE HORARIOS Y ASISTENCIA
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
-- SECCIÓN 7: TABLAS DE NÓMINA
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
-- SECCIÓN 8: TABLA DE NOTIFICACIONES
-- ============================================

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID, -- ID del empleado supervisor (o NULL para notificaciones generales)
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE, -- Sucursal relacionada
    type VARCHAR(50) NOT NULL CHECK (type IN ('timelog_entry', 'timelog_exit', 'timelog_lunch_start', 'timelog_lunch_end', 'delay', 'early_exit', 'lunch_exceeded', 'complaint', 'complaint_message', 'document_request', 'other')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50), -- 'timelog', 'complaint', etc.
    related_entity_id UUID, -- ID de la entidad relacionada (timelog, complaint, etc.)
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para notificaciones
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_branch_id ON notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

-- ============================================
-- SECCIÓN 9: MIGRACIONES DE CAMPOS ADICIONALES
-- ============================================

-- Agregar columnas al portal de empleados si no existen
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS has_portal_access BOOLEAN DEFAULT false;

ALTER TABLE employees
ADD COLUMN IF NOT EXISTS account_approved BOOLEAN DEFAULT NULL;

-- Agregar campos a positions para dashboard y feria de empleo
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS dashboard_access BOOLEAN DEFAULT true;

ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS default_view VARCHAR(50);

ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS available_for_job_fair BOOLEAN DEFAULT true;

-- Comentarios para documentación
COMMENT ON COLUMN positions.dashboard_access IS 'Permite o deniega el acceso al dashboard principal';
COMMENT ON COLUMN positions.default_view IS 'Vista predeterminada a la que se redirige al usuario al iniciar sesión (home, admin, payroll, time-management, employee-portal)';
COMMENT ON COLUMN positions.available_for_job_fair IS 'Indica si la posición está disponible para selección en el formulario de feria de empleo';

-- Actualizar posiciones existentes
UPDATE positions 
SET dashboard_access = true 
WHERE dashboard_access IS NULL;

UPDATE positions 
SET available_for_job_fair = true 
WHERE available_for_job_fair IS NULL;

-- ============================================
-- SECCIÓN 10: TABLA DE APLICACIONES DE TRABAJO
-- ============================================

-- Eliminar tabla si existe (CASCADE elimina automáticamente políticas, triggers e índices)
DROP TABLE IF EXISTS job_applications CASCADE;

-- Crear tabla job_applications
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    province VARCHAR(100),
    corregimiento VARCHAR(100),
    currently_working BOOLEAN DEFAULT false,
    salary_expectation NUMERIC(12, 2),
    position_id UUID REFERENCES positions(id),
    position_name VARCHAR(255), -- Guardar nombre de la posición por si se elimina
    resume_url TEXT, -- URL del archivo de hoja de vida en Supabase Storage
    resume_filename VARCHAR(255), -- Nombre original del archivo
    additional_info TEXT, -- Información adicional del aspirante
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, contacted, rejected, hired
    interview_date TIMESTAMP WITH TIME ZONE, -- Fecha de entrevista programada
    notes TEXT, -- Notas internas sobre la aplicación
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para job_applications
CREATE INDEX idx_job_applications_position_id ON job_applications(position_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_job_applications_created_at ON job_applications(created_at DESC);
CREATE INDEX idx_job_applications_email ON job_applications(email);

-- Crear constraints únicos para evitar duplicados por email y teléfono
-- Constraint único para email
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uk_job_applications_email'
    ) THEN
        ALTER TABLE job_applications 
        ADD CONSTRAINT uk_job_applications_email 
        UNIQUE (email);
        
        COMMENT ON CONSTRAINT uk_job_applications_email ON job_applications IS 
        'Constraint único para evitar múltiples aplicaciones con el mismo email';
    END IF;
END $$;

-- Función para normalizar teléfono (remover formato y prefijo 507)
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT) 
RETURNS TEXT AS $$
BEGIN
    IF phone IS NULL THEN
        RETURN NULL;
    END IF;
    -- Remover todo excepto números y quitar prefijo 507
    RETURN REGEXP_REPLACE(REGEXP_REPLACE(phone, '\D', '', 'g'), '^507', '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Índice único para teléfono normalizado (previene duplicados con diferentes formatos)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'job_applications_phone_unique'
    ) THEN
        CREATE UNIQUE INDEX job_applications_phone_unique 
        ON job_applications(normalize_phone(phone_number)) 
        WHERE phone_number IS NOT NULL;
        
        COMMENT ON INDEX job_applications_phone_unique IS 
        'Índice único para evitar múltiples aplicaciones con el mismo teléfono (normalizado)';
    END IF;
END $$;

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en la tabla y columnas
COMMENT ON TABLE job_applications IS 'Almacena las aplicaciones de trabajo de la Feria de Empleo Virtual';
COMMENT ON COLUMN job_applications.status IS 'Estado de la aplicación: pending, reviewed, contacted, rejected, hired';
COMMENT ON COLUMN job_applications.resume_url IS 'URL del archivo de hoja de vida almacenado en Supabase Storage';
COMMENT ON COLUMN job_applications.province IS 'Provincia de residencia del aspirante';
COMMENT ON COLUMN job_applications.corregimiento IS 'Corregimiento de residencia del aspirante';
COMMENT ON COLUMN job_applications.currently_working IS 'Indica si el aspirante está trabajando actualmente';
COMMENT ON COLUMN job_applications.salary_expectation IS 'Aspiración salarial del aspirante';

-- Habilitar Row Level Security
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Crear políticas RLS para job_applications
-- Política para permitir que usuarios anónimos puedan insertar aplicaciones
CREATE POLICY "Allow anon insert to job_applications"
ON job_applications
FOR INSERT
TO anon
WITH CHECK (true);

-- Política alternativa para public (por si anon no funciona)
CREATE POLICY "Allow public insert to job_applications"
ON job_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Política para permitir que usuarios autenticados puedan leer todas las aplicaciones
CREATE POLICY "Allow authenticated select from job_applications"
ON job_applications
FOR SELECT
TO authenticated
USING (true);

-- Política para permitir que usuarios autenticados puedan actualizar aplicaciones
CREATE POLICY "Allow authenticated update to job_applications"
ON job_applications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para permitir que usuarios autenticados puedan eliminar aplicaciones
CREATE POLICY "Allow authenticated delete from job_applications"
ON job_applications
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- SECCIÓN 11: ÍNDICES ADICIONALES
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
-- SECCIÓN 12: TRIGGERS
-- ============================================

DROP TRIGGER IF EXISTS update_employee_schedules_updated_at ON employee_schedules;
CREATE TRIGGER update_employee_schedules_updated_at
    BEFORE UPDATE ON employee_schedules
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_emergency_contacts_updated_at ON emergency_contacts;
CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_documents_updated_at ON employee_documents;
CREATE TRIGGER update_employee_documents_updated_at
    BEFORE UPDATE ON employee_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_notes_updated_at ON employee_notes;
CREATE TRIGGER update_employee_notes_updated_at
    BEFORE UPDATE ON employee_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_skills_updated_at ON employee_skills;
CREATE TRIGGER update_employee_skills_updated_at
    BEFORE UPDATE ON employee_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_employee_disabilities_updated_at ON employee_disabilities;
CREATE TRIGGER update_employee_disabilities_updated_at
    BEFORE UPDATE ON employee_disabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_document_requests_updated_at ON document_requests;
CREATE TRIGGER update_document_requests_updated_at
    BEFORE UPDATE ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_complaints_updated_at ON complaints;
CREATE TRIGGER update_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_complaint_messages_updated_at ON complaint_messages;
CREATE TRIGGER update_complaint_messages_updated_at
    BEFORE UPDATE ON complaint_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Función para actualizar last_message_at en complaints
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

DROP TRIGGER IF EXISTS update_complaint_last_message_trigger ON complaint_messages;
CREATE TRIGGER update_complaint_last_message_trigger
    AFTER INSERT ON complaint_messages
    FOR EACH ROW
    EXECUTE FUNCTION update_complaint_last_message_at();

-- Función para sincronizar thread_id
CREATE OR REPLACE FUNCTION sync_thread_id_to_messages()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE complaint_messages
    SET thread_id = NEW.thread_id
    WHERE complaint_id = NEW.id AND (thread_id IS NULL OR thread_id != NEW.thread_id);
    
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS sync_complaint_thread_id ON complaints;
CREATE TRIGGER sync_complaint_thread_id
    AFTER INSERT OR UPDATE OF thread_id ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION sync_thread_id_to_messages();

-- ============================================
-- SECCIÓN 13: ROW LEVEL SECURITY (RLS)
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
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- Políticas para notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (
    auth.role() = 'authenticated' AND (
        recipient_id IS NULL OR -- Notificaciones generales
        recipient_id IN (
            SELECT id FROM employees WHERE work_email = auth.jwt() ->> 'email'
        )
    )
);

DROP POLICY IF EXISTS "System can insert notifications" ON notifications;
CREATE POLICY "System can insert notifications"
ON notifications FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (
    auth.role() = 'authenticated' AND (
        recipient_id IS NULL OR
        recipient_id IN (
            SELECT id FROM employees WHERE work_email = auth.jwt() ->> 'email'
        )
    )
);

-- ============================================
-- SECCIÓN 14: VISTAS
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
-- SECCIÓN 15: FUNCIONES Y TRIGGERS DE NOTIFICACIONES
-- ============================================

-- Función para crear notificaciones de marcaciones
CREATE OR REPLACE FUNCTION create_timelog_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_branch_name TEXT;
    v_type_label TEXT;
    v_title TEXT;
    v_message TEXT;
    v_priority VARCHAR(20);
    v_supervisor_employee_id UUID;
    v_branch_work_email TEXT;
BEGIN
    -- Obtener información del empleado y sucursal
    SELECT 
        e.first_name || ' ' || e.father_name,
        b.name,
        b.work_email
    INTO 
        v_employee_name,
        v_branch_name,
        v_branch_work_email
    FROM employees e
    JOIN branches b ON e.branch_id = b.id
    WHERE e.id = NEW.employee_id AND b.id = NEW.branch_id;

    -- Si no se encuentra información, salir
    IF v_employee_name IS NULL THEN
        RETURN NEW;
    END IF;

    -- Determinar el tipo de notificación y mensaje
    CASE NEW.type
        WHEN 'entry' THEN
            v_type_label := 'Entrada';
            v_title := 'Nueva Marcación de Entrada';
            v_message := v_employee_name || ' marcó entrada en ' || v_branch_name;
            v_priority := 'medium';
        WHEN 'exit' THEN
            v_type_label := 'Salida';
            v_title := 'Nueva Marcación de Salida';
            v_message := v_employee_name || ' marcó salida en ' || v_branch_name;
            v_priority := 'medium';
        WHEN 'lunch_start' THEN
            v_type_label := 'Inicio de Almuerzo';
            v_title := 'Inicio de Almuerzo';
            v_message := v_employee_name || ' inició su almuerzo en ' || v_branch_name;
            v_priority := 'low';
        WHEN 'lunch_end' THEN
            v_type_label := 'Fin de Almuerzo';
            v_title := 'Fin de Almuerzo';
            v_message := v_employee_name || ' regresó del almuerzo en ' || v_branch_name;
            v_priority := 'low';
        ELSE
            RETURN NEW;
    END CASE;

    -- Buscar supervisor de la sucursal (empleado con work_email igual al work_email de la sucursal)
    IF v_branch_work_email IS NOT NULL THEN
        SELECT id INTO v_supervisor_employee_id
        FROM employees
        WHERE work_email = v_branch_work_email
        AND is_active = true
        LIMIT 1;
    END IF;

    -- Crear notificación para el supervisor de la sucursal
    -- Si no hay supervisor específico, crear notificación general (recipient_id = NULL)
    INSERT INTO notifications (
        recipient_id,
        branch_id,
        type,
        title,
        message,
        related_entity_type,
        related_entity_id,
        priority
    ) VALUES (
        v_supervisor_employee_id, -- NULL si no hay supervisor específico
        NEW.branch_id,
        'timelog_' || NEW.type,
        v_title,
        v_message,
        'timelog',
        NEW.id,
        v_priority
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger que se ejecuta después de insertar un timelog
DROP TRIGGER IF EXISTS trigger_create_timelog_notification ON timelogs;
CREATE TRIGGER trigger_create_timelog_notification
    AFTER INSERT ON timelogs
    FOR EACH ROW
    EXECUTE FUNCTION create_timelog_notification();

-- Función para identificar empleados de RR.HH
CREATE OR REPLACE FUNCTION get_hr_employee_ids()
RETURNS UUID[] AS $$
DECLARE
    v_hr_employee_ids UUID[];
BEGIN
    SELECT ARRAY_AGG(DISTINCT e.id)
    INTO v_hr_employee_ids
    FROM employees e
    JOIN positions p ON e.position_id = p.id
    WHERE e.is_active = true
    AND (
        UPPER(p.name) LIKE '%RRHH%' OR
        UPPER(p.name) LIKE '%RECURSOS HUMANOS%' OR
        UPPER(p.name) LIKE '%HR%' OR
        UPPER(p.name) LIKE '%HUMAN RESOURCES%' OR
        UPPER(p.name) LIKE '%R.H.%' OR
        UPPER(p.name) LIKE '%R. H.%'
    );
    
    -- Si no se encuentra ningún empleado de RR.HH, retornar array vacío
    RETURN COALESCE(v_hr_employee_ids, ARRAY[]::UUID[]);
END;
$$ LANGUAGE plpgsql;

-- Función helper para crear notificaciones a RR.HH
CREATE OR REPLACE FUNCTION notify_hr_employees(
    p_type VARCHAR(50),
    p_title VARCHAR(255),
    p_message TEXT,
    p_related_entity_type VARCHAR(50),
    p_related_entity_id UUID,
    p_branch_id UUID DEFAULT NULL,
    p_priority VARCHAR(20) DEFAULT 'medium'
)
RETURNS void AS $$
DECLARE
    v_hr_employee_id UUID;
    v_hr_employee_ids UUID[];
BEGIN
    -- Obtener IDs de empleados de RR.HH
    v_hr_employee_ids := get_hr_employee_ids();
    
    -- Si no hay empleados de RR.HH, salir
    IF array_length(v_hr_employee_ids, 1) IS NULL THEN
        RETURN;
    END IF;
    
    -- Crear notificación para cada empleado de RR.HH
    FOREACH v_hr_employee_id IN ARRAY v_hr_employee_ids
    LOOP
        INSERT INTO notifications (
            recipient_id,
            branch_id,
            type,
            title,
            message,
            related_entity_type,
            related_entity_id,
            priority
        ) VALUES (
            v_hr_employee_id,
            p_branch_id,
            p_type,
            p_title,
            p_message,
            p_related_entity_type,
            p_related_entity_id,
            p_priority
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Trigger para notificar a RR.HH cuando se crea una solicitud de documento
CREATE OR REPLACE FUNCTION create_document_request_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_employee_email TEXT;
    v_document_type TEXT;
    v_title TEXT;
    v_message TEXT;
BEGIN
    -- Obtener información del empleado
    SELECT 
        e.first_name || ' ' || e.father_name,
        e.work_email,
        COALESCE(NEW.custom_document_type, NEW.document_type)
    INTO 
        v_employee_name,
        v_employee_email,
        v_document_type
    FROM employees e
    WHERE e.id = NEW.employee_id;
    
    -- Si no se encuentra información, salir
    IF v_employee_name IS NULL THEN
        RETURN NEW;
    END IF;
    
    -- Crear título y mensaje
    v_title := 'Nueva Solicitud de Documento';
    v_message := v_employee_name || ' (' || v_employee_email || ') ha solicitado un documento: ' || v_document_type;
    
    IF NEW.reason IS NOT NULL AND NEW.reason != '' THEN
        v_message := v_message || '. Motivo: ' || NEW.reason;
    END IF;
    
    -- Notificar a todos los empleados de RR.HH
    PERFORM notify_hr_employees(
        'document_request',
        v_title,
        v_message,
        'document_request',
        NEW.id,
        (SELECT branch_id FROM employees WHERE id = NEW.employee_id),
        'high'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_document_request_notification ON document_requests;
CREATE TRIGGER trigger_create_document_request_notification
    AFTER INSERT ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION create_document_request_notification();

-- Trigger para notificar a RR.HH cuando se crea una nueva queja
CREATE OR REPLACE FUNCTION create_complaint_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_employee_email TEXT;
    v_title TEXT;
    v_message TEXT;
    v_category_label TEXT;
BEGIN
    -- Obtener información del empleado si existe
    IF NEW.employee_id IS NOT NULL THEN
        SELECT 
            e.first_name || ' ' || e.father_name,
            e.work_email
        INTO 
            v_employee_name,
            v_employee_email
        FROM employees e
        WHERE e.id = NEW.employee_id;
    END IF;
    
    -- Determinar etiqueta de categoría
    CASE NEW.category
        WHEN 'work_environment' THEN v_category_label := 'Ambiente Laboral';
        WHEN 'harassment' THEN v_category_label := 'Acoso';
        WHEN 'safety' THEN v_category_label := 'Seguridad';
        WHEN 'management' THEN v_category_label := 'Gestión';
        WHEN 'benefits' THEN v_category_label := 'Beneficios';
        ELSE v_category_label := 'Otro';
    END CASE;
    
    -- Crear título y mensaje
    v_title := 'Nueva Queja en Buzón';
    IF v_employee_name IS NOT NULL THEN
        v_message := 'Nueva queja de ' || v_employee_name || ' (' || v_employee_email || ')';
    ELSE
        v_message := 'Nueva queja anónima';
    END IF;
    v_message := v_message || '. Categoría: ' || v_category_label;
    
    -- Notificar a todos los empleados de RR.HH
    PERFORM notify_hr_employees(
        'complaint',
        v_title,
        v_message,
        'complaint',
        NEW.id,
        (SELECT branch_id FROM employees WHERE id = NEW.employee_id),
        CASE 
            WHEN NEW.priority = 'urgent' THEN 'urgent'
            WHEN NEW.priority = 'high' THEN 'high'
            ELSE 'medium'
        END
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_complaint_notification ON complaints;
CREATE TRIGGER trigger_create_complaint_notification
    AFTER INSERT ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION create_complaint_notification();

-- Trigger para notificar a RR.HH cuando un empleado envía un mensaje en una queja
CREATE OR REPLACE FUNCTION create_complaint_message_notification()
RETURNS TRIGGER AS $$
DECLARE
    v_employee_name TEXT;
    v_employee_email TEXT;
    v_title TEXT;
    v_message TEXT;
    v_complaint_category TEXT;
BEGIN
    -- Solo notificar si el mensaje es de un empleado (no de RR.HH)
    IF NEW.sender_type != 'employee' THEN
        RETURN NEW;
    END IF;
    
    -- Obtener información del empleado
    IF NEW.sender_id IS NOT NULL THEN
        SELECT 
            e.first_name || ' ' || e.father_name,
            e.work_email
        INTO 
            v_employee_name,
            v_employee_email
        FROM employees e
        WHERE e.id = NEW.sender_id;
    END IF;
    
    -- Obtener categoría de la queja
    SELECT category INTO v_complaint_category
    FROM complaints
    WHERE id = NEW.complaint_id;
    
    -- Crear título y mensaje
    v_title := 'Nuevo Mensaje en Buzón de Quejas';
    IF v_employee_name IS NOT NULL THEN
        v_message := v_employee_name || ' (' || v_employee_email || ') ha enviado un nuevo mensaje en una queja';
    ELSE
        v_message := 'Nuevo mensaje en una queja';
    END IF;
    
    -- Notificar a todos los empleados de RR.HH
    PERFORM notify_hr_employees(
        'complaint_message',
        v_title,
        v_message,
        'complaint_message',
        NEW.id,
        (SELECT branch_id FROM employees WHERE id = NEW.sender_id),
        'medium'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_create_complaint_message_notification ON complaint_messages;
CREATE TRIGGER trigger_create_complaint_message_notification
    AFTER INSERT ON complaint_messages
    FOR EACH ROW
    EXECUTE FUNCTION create_complaint_message_notification();

-- Actualizar tipo de notificación en la tabla notifications
-- Eliminar constraint existente si existe
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Recrear constraint con los nuevos tipos
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
CHECK (type IN (
    'timelog_entry', 
    'timelog_exit', 
    'timelog_lunch_start', 
    'timelog_lunch_end', 
    'delay', 
    'early_exit', 
    'lunch_exceeded', 
    'complaint', 
    'complaint_message', 
    'document_request', 
    'other'
));

-- ============================================
-- SECCIÓN 16: BUCKETS DE STORAGE
-- ============================================

-- Bucket para documentos de incapacidades
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'disabilities',
  'disabilities',
  true, -- Público para permitir descarga
  10485760, -- 10MB en bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket disabilities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir subida de archivos de incapacidades'
  ) THEN
    CREATE POLICY "Permitir subida de archivos de incapacidades"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (
      bucket_id = 'disabilities'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir lectura de archivos de incapacidades'
  ) THEN
    CREATE POLICY "Permitir lectura de archivos de incapacidades"
    ON storage.objects
    FOR SELECT
    TO public
    USING (
      bucket_id = 'disabilities'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir actualización de archivos de incapacidades'
  ) THEN
    CREATE POLICY "Permitir actualización de archivos de incapacidades"
    ON storage.objects
    FOR UPDATE
    TO anon
    USING (
      bucket_id = 'disabilities'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir eliminación de archivos de incapacidades'
  ) THEN
    CREATE POLICY "Permitir eliminación de archivos de incapacidades"
    ON storage.objects
    FOR DELETE
    TO anon
    USING (
      bucket_id = 'disabilities'
    );
  END IF;
END $$;

-- Bucket para documentos de vacaciones (timeoffs)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'timeoffs',
  'timeoffs',
  true, -- Público para permitir descarga
  10485760, -- 10MB en bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket timeoffs
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir subida de archivos de timeoffs'
  ) THEN
    CREATE POLICY "Permitir subida de archivos de timeoffs"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (
      bucket_id = 'timeoffs'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir lectura de archivos de timeoffs'
  ) THEN
    CREATE POLICY "Permitir lectura de archivos de timeoffs"
    ON storage.objects
    FOR SELECT
    TO public
    USING (
      bucket_id = 'timeoffs'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir actualización de archivos de timeoffs'
  ) THEN
    CREATE POLICY "Permitir actualización de archivos de timeoffs"
    ON storage.objects
    FOR UPDATE
    TO anon
    USING (
      bucket_id = 'timeoffs'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir eliminación de archivos de timeoffs'
  ) THEN
    CREATE POLICY "Permitir eliminación de archivos de timeoffs"
    ON storage.objects
    FOR DELETE
    TO anon
    USING (
      bucket_id = 'timeoffs'
    );
  END IF;
END $$;

-- Bucket para CVs de aplicaciones de trabajo
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-applications',
  'job-applications',
  true, -- Público para permitir descarga (igual que disabilities)
  5242880, -- 5MB en bytes
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas para bucket job-applications (igual que disabilities)
DROP POLICY IF EXISTS "Permitir subida de archivos de job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
CREATE POLICY "Permitir subida de archivos de job-applications"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'job-applications'
);

DROP POLICY IF EXISTS "Permitir lectura de archivos de job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
CREATE POLICY "Permitir lectura de archivos de job-applications"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'job-applications'
);

DROP POLICY IF EXISTS "Permitir actualización de archivos de job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
CREATE POLICY "Permitir actualización de archivos de job-applications"
ON storage.objects
FOR UPDATE
TO anon
USING (
  bucket_id = 'job-applications'
);

DROP POLICY IF EXISTS "Permitir eliminación de archivos de job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;
CREATE POLICY "Permitir eliminación de archivos de job-applications"
ON storage.objects
FOR DELETE
TO anon
USING (
  bucket_id = 'job-applications'
);

-- ============================================
-- SECCIÓN 17: DATOS INICIALES
-- ============================================

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES 
    ('wassenger_api_key', '', 'API Key de Wassenger para envío de mensajes', 'integrations', true),
    ('wassenger_enabled', 'false', 'Habilita o deshabilita la integración con Wassenger', 'integrations', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- FIN DEL SETUP COMPLETO
-- ============================================
-- 
-- Verificaciones recomendadas después de ejecutar:
-- 
-- 1. Verificar que todas las tablas existen:
--    SELECT table_name FROM information_schema.tables 
--    WHERE table_schema = 'public' 
--    ORDER BY table_name;
-- 
-- 2. Verificar que RLS está habilitado:
--    SELECT tablename, rowsecurity FROM pg_tables 
--    WHERE schemaname = 'public' AND rowsecurity = true;
-- 
-- 3. Verificar buckets de Storage:
--    SELECT id, name, public FROM storage.buckets;
-- 
-- 4. Verificar políticas de job_applications:
--    SELECT policyname, roles, cmd 
--    FROM pg_policies 
--    WHERE tablename = 'job_applications';
-- 
-- ============================================

