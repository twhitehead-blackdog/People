-- ============================================
-- Crear tabla work_permits
-- ============================================
-- Esta tabla almacena las solicitudes de permisos laborales de los empleados
-- Tipos: defunción, personal, tema médico, otros
-- ============================================

CREATE TABLE IF NOT EXISTS public.work_permits (
  id UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  employee_id UUID NOT NULL,
  created_by UUID NULL,
  permit_type CHARACTER VARYING(30) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  start_time TIME NULL,
  end_time TIME NULL,
  equivalent_value NUMERIC(5,1) NULL,
  equivalent_unit CHARACTER VARYING(10) NULL,
  observations TEXT NULL,
  document_url TEXT NULL,
  status CHARACTER VARYING(20) NOT NULL DEFAULT 'pending'::CHARACTER VARYING,
  reviewed_by UUID NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE NULL,
  rejection_comment TEXT NULL,
  company_id UUID NULL,
  created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT NOW(),

  CONSTRAINT work_permits_pkey PRIMARY KEY (id),
  CONSTRAINT work_permits_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE,
  CONSTRAINT work_permits_created_by_fkey FOREIGN KEY (created_by) REFERENCES employees(id) ON DELETE SET NULL,
  CONSTRAINT work_permits_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT,
  CONSTRAINT work_permits_dates_check CHECK (end_date >= start_date),
  CONSTRAINT work_permits_status_check CHECK (
    (status)::TEXT = ANY (
      (
        ARRAY[
          'pending'::CHARACTER VARYING,
          'approved'::CHARACTER VARYING,
          'rejected'::CHARACTER VARYING
        ]
      )::TEXT[]
    )
  ),
  CONSTRAINT work_permits_permit_type_check CHECK (
    (permit_type)::TEXT = ANY (
      (
        ARRAY[
          'family_death'::CHARACTER VARYING,
          'personal'::CHARACTER VARYING,
          'medical'::CHARACTER VARYING,
          'other'::CHARACTER VARYING
        ]
      )::TEXT[]
    )
  )
) TABLESPACE pg_default;

-- Índices
CREATE INDEX IF NOT EXISTS idx_work_permits_employee_id
  ON public.work_permits USING btree (employee_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_work_permits_status
  ON public.work_permits USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_work_permits_company_id
  ON public.work_permits USING btree (company_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_work_permits_created_by
  ON public.work_permits USING btree (created_by) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_work_permits_permit_type
  ON public.work_permits USING btree (permit_type) TABLESPACE pg_default;

-- Comentarios
COMMENT ON TABLE public.work_permits IS 'Solicitudes de permisos laborales de empleados';
COMMENT ON COLUMN public.work_permits.employee_id IS 'ID del empleado que solicita el permiso';
COMMENT ON COLUMN public.work_permits.created_by IS 'ID del empleado que creó esta solicitud (puede ser el empleado mismo o un gerente en su nombre)';
COMMENT ON COLUMN public.work_permits.permit_type IS 'Tipo de permiso: illness, medical_appointment, vacation, compensatory, family_death, payroll_deduction, maternity_leave, other';
COMMENT ON COLUMN public.work_permits.start_date IS 'Fecha de inicio del permiso';
COMMENT ON COLUMN public.work_permits.end_date IS 'Fecha de fin del permiso';
COMMENT ON COLUMN public.work_permits.start_time IS 'Hora de inicio (para permisos parciales de día)';
COMMENT ON COLUMN public.work_permits.end_time IS 'Hora de fin (para permisos parciales de día)';
COMMENT ON COLUMN public.work_permits.equivalent_value IS 'Valor calculado del equivalente (ej: 4 horas, 2 días)';
COMMENT ON COLUMN public.work_permits.equivalent_unit IS 'Unidad del equivalente: hours o days';
COMMENT ON COLUMN public.work_permits.observations IS 'Observaciones o notas adicionales';
COMMENT ON COLUMN public.work_permits.document_url IS 'URL del documento adjunto (certificado médico, etc.)';
COMMENT ON COLUMN public.work_permits.status IS 'Estado de la solicitud: pending, approved, rejected';
COMMENT ON COLUMN public.work_permits.company_id IS 'Company ID del empleado. Se sincroniza automáticamente';

-- Función para sincronizar company_id
CREATE OR REPLACE FUNCTION sync_work_permit_company_id()
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

COMMENT ON FUNCTION sync_work_permit_company_id() IS
'Sincroniza automáticamente el company_id de work_permits con el company_id del empleado asociado.';

-- Trigger para sincronizar company_id al insertar/actualizar
DROP TRIGGER IF EXISTS sync_work_permit_company_id_trigger ON work_permits;

CREATE TRIGGER sync_work_permit_company_id_trigger
    BEFORE INSERT OR UPDATE OF employee_id ON work_permits
    FOR EACH ROW
    EXECUTE FUNCTION sync_work_permit_company_id();

-- Trigger para actualizar updated_at
CREATE TRIGGER update_work_permits_updated_at
    BEFORE UPDATE ON work_permits
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE work_permits ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
DROP POLICY IF EXISTS "Usuarios pueden ver permisos de trabajo" ON work_permits;
CREATE POLICY "Usuarios pueden ver permisos de trabajo"
  ON work_permits FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Usuarios pueden crear permisos de trabajo" ON work_permits;
CREATE POLICY "Usuarios pueden crear permisos de trabajo"
  ON work_permits FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Usuarios pueden actualizar permisos de trabajo" ON work_permits;
CREATE POLICY "Usuarios pueden actualizar permisos de trabajo"
  ON work_permits FOR UPDATE
  USING (true);

-- ============================================
-- ¡LISTO! Tabla work_permits creada
-- ============================================
