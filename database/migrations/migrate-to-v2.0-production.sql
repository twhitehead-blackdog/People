-- ============================================
-- MIGRACIÓN A VERSIÓN 2.0 - PRODUCCIÓN
-- ============================================
-- Este script actualiza la base de datos de producción (peopletrak)
-- para que funcione con la versión 2.0 del código
-- 
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Base de datos: peopletrak (producción)
-- ============================================

-- ============================================
-- 1. AGREGAR CAMPO rejection_comment A employee_disabilities
-- ============================================
-- Este campo es usado para mostrar el motivo de rechazo de incapacidades

ALTER TABLE employee_disabilities 
ADD COLUMN IF NOT EXISTS rejection_comment TEXT;

COMMENT ON COLUMN employee_disabilities.rejection_comment IS 
'Motivo del rechazo de la incapacidad (usado cuando status = rejected)';

-- ============================================
-- 2. AGREGAR CAMPO work_email A branches (PARA NOTIFICACIONES)
-- ============================================
-- Este campo es usado para identificar al supervisor de la sucursal
-- en el sistema de notificaciones

ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS work_email VARCHAR(255);

COMMENT ON COLUMN branches.work_email IS 
'Email del supervisor de la sucursal (usado para notificaciones de marcaciones)';

-- ============================================
-- 3. AGREGAR SETTINGS PARA RANGO DE FECHAS DE FERIA
-- ============================================
-- Cambio: De una fecha única (job_fair_interview_start_date) 
-- a un rango (job_fair_start_date y job_fair_end_date)

-- Agregar setting para fecha de inicio de la feria
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'job_fair_start_date',
  '',
  'Fecha de inicio de la Feria de Empleo (formato: YYYY-MM-DD). Si está vacío, no se mostrará el mensaje.',
  'job_fair',
  false
)
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Agregar setting para fecha de fin de la feria
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'job_fair_end_date',
  '',
  'Fecha de fin de la Feria de Empleo (formato: YYYY-MM-DD). Si está vacío, no se mostrará el mensaje.',
  'job_fair',
  false
)
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================
-- 4. MIGRAR DATOS DEL SETTING ANTIGUO (OPCIONAL)
-- ============================================
-- Si existe job_fair_interview_start_date con un valor,
-- migrarlo a job_fair_start_date
-- (Comentado porque puede que no quieras migrar automáticamente)

/*
DO $$
DECLARE
  old_date_value TEXT;
BEGIN
  -- Obtener el valor del setting antiguo
  SELECT value INTO old_date_value
  FROM settings
  WHERE key = 'job_fair_interview_start_date'
  AND value IS NOT NULL
  AND value != '';

  -- Si existe un valor, migrarlo a job_fair_start_date
  IF old_date_value IS NOT NULL THEN
    UPDATE settings
    SET value = old_date_value
    WHERE key = 'job_fair_start_date';
    
    RAISE NOTICE 'Migrado job_fair_interview_start_date (%) a job_fair_start_date', old_date_value;
  END IF;
END $$;
*/

-- ============================================
-- 4. CREAR TABLA disability_events (HISTORIAL DE INCAPACIDADES)
-- ============================================
CREATE TABLE IF NOT EXISTS disability_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    disability_id UUID REFERENCES employee_disabilities(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    performed_by UUID,
    performed_by_type VARCHAR(50),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_disability_events_disability_id ON disability_events(disability_id);
CREATE INDEX IF NOT EXISTS idx_disability_events_created_at ON disability_events(created_at DESC);

COMMENT ON TABLE disability_events IS 'Historial de eventos y cambios de estado en incapacidades';

-- ============================================
-- 5. CREAR TABLA document_request_events (HISTORIAL DE SOLICITUDES)
-- ============================================
CREATE TABLE IF NOT EXISTS document_request_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    document_request_id UUID REFERENCES document_requests(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    performed_by UUID,
    performed_by_type VARCHAR(50),
    previous_status VARCHAR(20),
    new_status VARCHAR(20),
    notes TEXT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_document_request_events_document_request_id ON document_request_events(document_request_id);
CREATE INDEX IF NOT EXISTS idx_document_request_events_created_at ON document_request_events(created_at DESC);

COMMENT ON TABLE document_request_events IS 'Historial de eventos y cambios de estado en solicitudes de documentos';

-- ============================================
-- 6. CREAR TABLA hr_messages (MENSAJES DEL SISTEMA HR)
-- ============================================
CREATE TABLE IF NOT EXISTS hr_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    related_type VARCHAR(50),
    related_id UUID,
    message_type VARCHAR(50) NOT NULL,
    title VARCHAR(255),
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_hr_messages_employee_id ON hr_messages(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_messages_is_read ON hr_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_hr_messages_created_at ON hr_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_hr_messages_related ON hr_messages(related_type, related_id);

COMMENT ON TABLE hr_messages IS 'Mensajes del sistema HR para empleados';

-- ============================================
-- 7. CREAR TABLA job_application_statuses (ESTADOS DE APLICACIONES)
-- ============================================
CREATE TABLE IF NOT EXISTS job_application_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    label VARCHAR(255) NOT NULL,
    severity VARCHAR(20),
    display_order INTEGER DEFAULT 0,
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_application_statuses_code ON job_application_statuses(code);
CREATE INDEX IF NOT EXISTS idx_job_application_statuses_active ON job_application_statuses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_job_application_statuses_order ON job_application_statuses(display_order);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_job_application_statuses_updated_at ON job_application_statuses;
CREATE TRIGGER update_job_application_statuses_updated_at
    BEFORE UPDATE ON job_application_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insertar estados por defecto
INSERT INTO job_application_statuses (code, label, severity, display_order, is_default, is_active)
VALUES
    ('pending', 'Pendiente', 'warn', 1, true, true),
    ('reviewed', 'Revisada', 'info', 2, true, true),
    ('contacted', 'Contactada', 'info', 3, true, true),
    ('rejected', 'Rechazada', 'danger', 4, true, true),
    ('hired', 'Contratada', 'success', 5, true, true)
ON CONFLICT (code) DO NOTHING;

COMMENT ON TABLE job_application_statuses IS 'Estados personalizados para aplicaciones de trabajo';

-- ============================================
-- 8. CREAR TABLA job_applications (APLICACIONES DE TRABAJO)
-- ============================================
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50),
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    position_name VARCHAR(255),
    resume_url TEXT,
    resume_filename VARCHAR(255),
    additional_info TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    interview_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    province VARCHAR(100),
    corregimiento VARCHAR(100),
    currently_working BOOLEAN DEFAULT false,
    salary_expectation NUMERIC(12,2),
    is_favorite BOOLEAN DEFAULT false,
    position_ids UUID[]
);

CREATE INDEX IF NOT EXISTS idx_job_applications_position_id ON job_applications(position_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE job_applications IS 'Almacena las aplicaciones de trabajo de la Feria de Empleo Virtual';

-- ============================================
-- 9. CREAR TABLA notifications (SISTEMA DE NOTIFICACIONES)
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    recipient_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES branches(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL CHECK (type IN ('timelog_entry', 'timelog_exit', 'timelog_lunch_start', 'timelog_lunch_end', 'delay', 'early_exit', 'lunch_exceeded', 'complaint', 'other')),
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    related_entity_type VARCHAR(50),
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_branch_id ON notifications(branch_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_related_entity ON notifications(related_entity_type, related_entity_id);

COMMENT ON TABLE notifications IS 'Sistema de notificaciones para alertar a supervisores sobre eventos del sistema';

-- ============================================
-- 10. HABILITAR RLS EN NUEVAS TABLAS
-- ============================================
ALTER TABLE disability_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_application_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 11. VERIFICACIÓN
-- ============================================
-- Ejecuta estas consultas para verificar que todo esté correcto:

-- Verificar que el campo rejection_comment existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'employee_disabilities' 
    AND column_name = 'rejection_comment'
  ) THEN
    RAISE NOTICE '✓ Campo rejection_comment agregado correctamente';
  ELSE
    RAISE WARNING '✗ Campo rejection_comment NO existe';
  END IF;
END $$;

-- Verificar que el campo work_email existe en branches
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'branches' 
    AND column_name = 'work_email'
  ) THEN
    RAISE NOTICE '✓ Campo work_email agregado a branches correctamente';
  ELSE
    RAISE WARNING '✗ Campo work_email NO existe en branches';
  END IF;
END $$;

-- Verificar que los settings existen
DO $$
DECLARE
  start_date_exists BOOLEAN;
  end_date_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM settings WHERE key = 'job_fair_start_date') INTO start_date_exists;
  SELECT EXISTS(SELECT 1 FROM settings WHERE key = 'job_fair_end_date') INTO end_date_exists;
  
  IF start_date_exists THEN
    RAISE NOTICE '✓ Setting job_fair_start_date existe';
  ELSE
    RAISE WARNING '✗ Setting job_fair_start_date NO existe';
  END IF;
  
  IF end_date_exists THEN
    RAISE NOTICE '✓ Setting job_fair_end_date existe';
  ELSE
    RAISE WARNING '✗ Setting job_fair_end_date NO existe';
  END IF;
END $$;

-- Verificar que las nuevas tablas existen
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
    AND table_name IN (
      'disability_events',
      'document_request_events',
      'hr_messages',
      'job_application_statuses',
      'job_applications',
      'notifications'
    );
  
  IF table_count = 6 THEN
    RAISE NOTICE '✓ Todas las nuevas tablas creadas correctamente (%)', table_count;
  ELSE
    RAISE WARNING '✗ Faltan algunas tablas. Se encontraron % de 6 esperadas', table_count;
  END IF;
END $$;

-- ============================================
-- ¡MIGRACIÓN COMPLETADA!
-- ============================================
-- La base de datos ahora está lista para la versión 2.0
-- 
-- RESUMEN DE CAMBIOS APLICADOS:
-- ✅ Campo rejection_comment agregado a employee_disabilities
-- ✅ Campo work_email agregado a branches
-- ✅ Settings job_fair_start_date y job_fair_end_date creados
-- ✅ Tabla disability_events creada (historial de incapacidades)
-- ✅ Tabla document_request_events creada (historial de solicitudes)
-- ✅ Tabla hr_messages creada (mensajes del sistema HR)
-- ✅ Tabla job_application_statuses creada (estados de aplicaciones)
-- ✅ Tabla job_applications creada (aplicaciones de trabajo)
-- ✅ Tabla notifications creada (sistema de notificaciones)
-- ✅ Índices creados para optimizar consultas
-- ✅ RLS habilitado en todas las nuevas tablas
-- 
-- PRÓXIMOS PASOS:
-- 1. Verificar que la aplicación funcione correctamente
-- 2. Configurar las fechas de la feria desde el dashboard
-- 3. Configurar políticas RLS específicas si es necesario
-- 4. (Opcional) Eliminar el setting antiguo job_fair_interview_start_date
--    si ya no se necesita
-- 5. (Opcional) Configurar work_email en las sucursales para habilitar notificaciones
-- ============================================

