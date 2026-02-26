-- ============================================
-- ESTRUCTURA COMPLETA DE LA TABLA positions
-- ============================================
-- Este script muestra la estructura completa que debe tener la tabla positions
-- con todas sus columnas, constraints, índices y comentarios
-- ============================================

-- ============================================
-- CREAR TABLA positions (si no existe)
-- ============================================
CREATE TABLE IF NOT EXISTS positions (
    -- ID único de la posición
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- Nombre de la posición/cargo
    name VARCHAR(255) NOT NULL,
    
    -- Departamento al que pertenece la posición
    department_id UUID NOT NULL REFERENCES departments(id) ON DELETE RESTRICT,
    
    -- Permisos administrativos
    admin BOOLEAN DEFAULT false,
    schedule_admin BOOLEAN DEFAULT false,
    schedule_approver BOOLEAN DEFAULT false,
    
    -- Acceso al dashboard y vista predeterminada
    dashboard_access BOOLEAN DEFAULT true,
    default_view VARCHAR(100),
    
    -- Disponibilidad para feria de empleo
    available_for_job_fair BOOLEAN DEFAULT true,
    
    -- Empresa a la que pertenece la posición
    company_id UUID REFERENCES companies(id) ON DELETE RESTRICT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

-- Índice para búsquedas por company_id
CREATE INDEX IF NOT EXISTS idx_positions_company_id ON positions(company_id);

-- Índice para búsquedas por department_id
CREATE INDEX IF NOT EXISTS idx_positions_department_id ON positions(department_id);

-- Índice para búsquedas de administradores
CREATE INDEX IF NOT EXISTS idx_positions_admin ON positions(admin) WHERE admin = true;

-- Índice para búsquedas de schedule_admin
CREATE INDEX IF NOT EXISTS idx_positions_schedule_admin ON positions(schedule_admin) WHERE schedule_admin = true;

-- Índice para búsquedas de posiciones disponibles para feria de empleo
CREATE INDEX IF NOT EXISTS idx_positions_available_for_job_fair ON positions(available_for_job_fair) WHERE available_for_job_fair = true;

-- ============================================
-- COMENTARIOS EN COLUMNAS
-- ============================================

COMMENT ON TABLE positions IS 'Posiciones/cargos de trabajo en la organización';

COMMENT ON COLUMN positions.id IS 'ID único de la posición';
COMMENT ON COLUMN positions.name IS 'Nombre de la posición/cargo';
COMMENT ON COLUMN positions.department_id IS 'ID del departamento al que pertenece la posición';
COMMENT ON COLUMN positions.admin IS 'Indica si la posición tiene permisos de administrador completo';
COMMENT ON COLUMN positions.schedule_admin IS 'Indica si la posición puede administrar horarios';
COMMENT ON COLUMN positions.schedule_approver IS 'Indica si la posición puede aprobar solicitudes de horarios';
COMMENT ON COLUMN positions.dashboard_access IS 'Permite o deniega el acceso al dashboard principal. NULL o true = acceso permitido, false = acceso denegado';
COMMENT ON COLUMN positions.default_view IS 'Vista predeterminada a la que se redirige al usuario al iniciar sesión (home, admin, payroll, time-management, employee-portal)';
COMMENT ON COLUMN positions.available_for_job_fair IS 'Indica si la posición está disponible para selección en el formulario de feria de empleo';
COMMENT ON COLUMN positions.company_id IS 'ID de la empresa a la que pertenece la posición';
COMMENT ON COLUMN positions.created_at IS 'Fecha y hora de creación del registro';

-- ============================================
-- QUERY PARA VERIFICAR LA ESTRUCTURA ACTUAL
-- ============================================

-- Ver todas las columnas de la tabla positions
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default,
    udt_name
FROM information_schema.columns
WHERE table_name = 'positions'
ORDER BY ordinal_position;

-- Ver todos los índices de la tabla positions
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'positions';

-- Ver todas las constraints de la tabla positions
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'positions'::regclass;

-- Ver todos los comentarios de la tabla positions
SELECT
    obj_description('positions'::regclass, 'pg_class') AS table_comment;

SELECT
    a.attname AS column_name,
    col_description(a.attrelid, a.attnum) AS column_comment
FROM pg_attribute a
JOIN pg_class c ON a.attrelid = c.oid
WHERE c.relname = 'positions'
AND a.attnum > 0
AND NOT a.attisdropped
ORDER BY a.attnum;

