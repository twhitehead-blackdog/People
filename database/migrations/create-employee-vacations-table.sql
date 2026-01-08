-- ============================================
-- Crear tabla employee_vacations
-- ============================================
-- Esta tabla almacena las solicitudes de vacaciones de los empleados
-- Similar a employee_disabilities pero para vacaciones
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
  CONSTRAINT employee_vacations_pkey PRIMARY KEY (id),
  CONSTRAINT employee_vacations_company_id_fkey FOREIGN KEY (company_id) REFERENCES companies (id) ON DELETE RESTRICT,
  CONSTRAINT employee_vacations_employee_id_fkey FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_employee_vacations_employee_id 
  ON public.employee_vacations USING btree (employee_id) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_employee_vacations_status 
  ON public.employee_vacations USING btree (status) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_employee_vacations_company_id 
  ON public.employee_vacations USING btree (company_id) TABLESPACE pg_default;

-- Comentarios
COMMENT ON TABLE public.employee_vacations IS 'Solicitudes de vacaciones de empleados';
COMMENT ON COLUMN public.employee_vacations.employee_id IS 'ID del empleado que solicita las vacaciones';
COMMENT ON COLUMN public.employee_vacations.start_date IS 'Fecha de inicio de las vacaciones';
COMMENT ON COLUMN public.employee_vacations.end_date IS 'Fecha de fin de las vacaciones';
COMMENT ON COLUMN public.employee_vacations.reason IS 'Motivo o comentarios adicionales (opcional)';
COMMENT ON COLUMN public.employee_vacations.status IS 'Estado de la solicitud: pending, approved, rejected';
COMMENT ON COLUMN public.employee_vacations.company_id IS 'Company ID del empleado. Se sincroniza automáticamente';

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

-- Trigger para sincronizar company_id al insertar/actualizar
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

-- Políticas RLS básicas (ajustar según necesidades)
DROP POLICY IF EXISTS "Usuarios pueden ver sus propias vacaciones" ON employee_vacations;
CREATE POLICY "Usuarios pueden ver sus propias vacaciones"
  ON employee_vacations FOR SELECT
  USING (true); -- Ajustar según roles

DROP POLICY IF EXISTS "Usuarios pueden crear vacaciones" ON employee_vacations;
CREATE POLICY "Usuarios pueden crear vacaciones"
  ON employee_vacations FOR INSERT
  WITH CHECK (true); -- Ajustar según roles

-- ============================================
-- ¡LISTO! Tabla employee_vacations creada
-- ============================================
