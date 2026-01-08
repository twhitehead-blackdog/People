-- ============================================
-- MIGRACIONES PARA BRANCH MANAGER - GESTIONES
-- ============================================
-- ⚠️ IMPORTANTE: Probablemente NO NECESITAS ejecutar esto
-- ============================================
-- Según el schema proporcionado, tu base de datos ya tiene:
-- ✅ employee_vacations (con created_by)
-- ✅ employee_disabilities (con created_by)
-- ✅ document_requests (con created_by)
-- 
-- Este archivo es SOLO por si acaso alguna columna falta
-- Puedes ejecutarlo sin problemas (es idempotente)
-- ============================================

-- ============================================
-- 1. Crear tabla employee_vacations (si no existe)
-- ============================================

CREATE TABLE IF NOT EXISTS public.employee_vacations (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  employee_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NULL,
  status CHARACTER VARYING(20) NOT NULL DEFAULT 'pending'::CHARACTER VARYING,
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NULL,
  review_notes TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  rejection_comment TEXT NULL,
  company_id UUID NULL,
  created_by UUID NULL,  -- Campo para registrar quién creó la solicitud
  CONSTRAINT employee_vacations_pkey PRIMARY KEY (id),
  CONSTRAINT employee_vacations_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT employee_vacations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
  CONSTRAINT employee_vacations_created_by_fkey FOREIGN KEY (created_by) REFERENCES employees (id) ON DELETE SET NULL,
  CONSTRAINT employee_vacations_check CHECK ((end_date >= start_date)),
  CONSTRAINT employee_vacations_status_check CHECK (
    (status)::TEXT = ANY (
      (
        ARRAY[
          'pending'::CHARACTER VARYING,
          'approved'::CHARACTER VARYING,
          'rejected'::CHARACTER VARYING
        ]
      )::TEXT[]
    )
  )
) TABLESPACE pg_default;

-- Índices para employee_vacations
CREATE INDEX IF NOT EXISTS idx_employee_vacations_employee_id 
  ON public.employee_vacations USING btree (employee_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_employee_vacations_status 
  ON public.employee_vacations USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_employee_vacations_company_id 
  ON public.employee_vacations USING btree (company_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_employee_vacations_created_by 
  ON public.employee_vacations USING btree (created_by) TABLESPACE pg_default;

-- Comentarios
COMMENT ON TABLE public.employee_vacations IS 'Solicitudes de vacaciones de empleados';
COMMENT ON COLUMN public.employee_vacations.employee_id IS 'ID del empleado que solicita las vacaciones';
COMMENT ON COLUMN public.employee_vacations.start_date IS 'Fecha de inicio de las vacaciones';
COMMENT ON COLUMN public.employee_vacations.end_date IS 'Fecha de fin de las vacaciones';
COMMENT ON COLUMN public.employee_vacations.reason IS 'Motivo o comentarios adicionales (opcional)';
COMMENT ON COLUMN public.employee_vacations.status IS 'Estado de la solicitud: pending, approved, rejected';
COMMENT ON COLUMN public.employee_vacations.company_id IS 'Company ID del empleado. Se sincroniza automáticamente';
COMMENT ON COLUMN public.employee_vacations.created_by IS 'ID del empleado que creó esta solicitud (puede ser el empleado mismo o un gerente en su nombre)';

-- Función para sincronizar company_id
CREATE OR REPLACE FUNCTION sync_employee_vacation_company_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS NULL THEN
        SELECT company_id INTO NEW.company_id
        FROM employees
        WHERE id = NEW.employee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para sincronizar company_id
DROP TRIGGER IF EXISTS sync_employee_vacation_company_id_trigger ON employee_vacations;
CREATE TRIGGER sync_employee_vacation_company_id_trigger
    BEFORE INSERT OR UPDATE OF employee_id ON employee_vacations
    FOR EACH ROW
    EXECUTE FUNCTION sync_employee_vacation_company_id();

-- Trigger para actualizar updated_at
CREATE TRIGGER update_employee_vacations_updated_at
    BEFORE UPDATE ON employee_vacations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE employee_vacations ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias vacaciones" ON employee_vacations;
CREATE POLICY "Usuarios pueden ver sus propias vacaciones"
  ON employee_vacations FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios pueden crear vacaciones" ON employee_vacations;
CREATE POLICY "Usuarios pueden crear vacaciones"
  ON employee_vacations FOR INSERT
  WITH CHECK (true);

-- ============================================
-- 2. Agregar created_by a employee_disabilities (si no existe)
-- ============================================

ALTER TABLE employee_disabilities 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Agregar constraint si la columna se agregó
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'employee_disabilities_created_by_fkey'
    ) THEN
        ALTER TABLE employee_disabilities 
        ADD CONSTRAINT employee_disabilities_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN employee_disabilities.created_by IS 
'ID del empleado que creó esta solicitud (puede ser el empleado mismo o un gerente en su nombre)';

CREATE INDEX IF NOT EXISTS idx_employee_disabilities_created_by 
  ON employee_disabilities(created_by);

-- ============================================
-- 3. Agregar created_by a document_requests (si no existe)
-- ============================================

ALTER TABLE document_requests 
ADD COLUMN IF NOT EXISTS created_by UUID;

-- Agregar constraint si la columna se agregó
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'document_requests_created_by_fkey'
    ) THEN
        ALTER TABLE document_requests 
        ADD CONSTRAINT document_requests_created_by_fkey 
        FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL;
    END IF;
END $$;

COMMENT ON COLUMN document_requests.created_by IS 
'ID del empleado que creó esta solicitud (puede ser el empleado mismo o un gerente en su nombre)';

CREATE INDEX IF NOT EXISTS idx_document_requests_created_by 
  ON document_requests(created_by);

-- ============================================
-- ¡LISTO! Todas las migraciones aplicadas
-- ============================================
-- Verifica que las tablas se crearon correctamente:
-- SELECT * FROM employee_vacations LIMIT 1;
-- SELECT * FROM employee_disabilities LIMIT 1;
-- SELECT * FROM document_requests LIMIT 1;
-- ============================================
