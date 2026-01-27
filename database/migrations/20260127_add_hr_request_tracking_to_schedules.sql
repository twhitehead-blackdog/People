-- =====================================================
-- MIGRACIÓN: Integración de Solicitudes HR con Horarios
-- =====================================================
-- Descripción: Extiende employee_schedules para trackear solicitudes de HR
--              (Vacaciones, Incapacidades, Compensatorios)
--
-- PRINCIPIOS:
-- 1. NO eliminar registros existentes de employee_schedules
-- 2. Preservar historial, auditabilidad y reversibilidad
-- 3. Si existe horario para fecha, se ajusta/marca
-- 4. Si no existe horario, se crea marcado con la solicitud
-- 5. Cada cambio mantiene referencia a la solicitud HR que lo causó
--
-- SEGURIDAD: Migración SEGURA para producción
-- - Solo agrega columnas nuevas con IF NOT EXISTS
-- - No modifica datos existentes
-- - No elimina columnas ni tablas
-- =====================================================

-- =====================================================
-- PASO 1: CAMPOS PARA TIEMPO COMPENSATORIO
-- Representa ajustes de horario de trabajo
-- =====================================================

-- Campo booleano para marcar si el horario fue ajustado por compensatorio
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS is_compensatory BOOLEAN DEFAULT false;

-- Referencia a la solicitud de compensatorio (tabla timeoffs con type_id = 'Compensatorio')
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS compensatory_request_id UUID;

-- Agregar FK solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employee_schedules_compensatory_request_id_fkey'
    AND table_name = 'employee_schedules'
  ) THEN
    ALTER TABLE public.employee_schedules
    ADD CONSTRAINT employee_schedules_compensatory_request_id_fkey
    FOREIGN KEY (compensatory_request_id)
    REFERENCES public.timeoffs(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- PASO 2: CAMPOS PARA TIEMPO LIBRE (Vacaciones/Incapacidades)
-- Representa ausencias del empleado
-- =====================================================

-- Campo booleano para marcar si el horario es por tiempo libre
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS is_timeoff BOOLEAN DEFAULT false;

-- Tipo de tiempo libre (para identificar rápidamente)
-- Creamos el tipo ENUM si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'timeoff_category') THEN
    CREATE TYPE timeoff_category AS ENUM ('VACACIONES', 'INCAPACIDAD');
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL; -- Ignorar si ya existe
END $$;

-- Columna para el tipo de timeoff
-- Usamos TEXT para evitar problemas con ENUM en Supabase
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS timeoff_type TEXT;

-- Agregar CHECK constraint solo si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'employee_schedules_timeoff_type_check'
  ) THEN
    ALTER TABLE public.employee_schedules
    ADD CONSTRAINT employee_schedules_timeoff_type_check
    CHECK (timeoff_type IS NULL OR timeoff_type IN ('VACACIONES', 'INCAPACIDAD'));
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- Referencia a solicitud de vacaciones
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS vacation_request_id UUID;

-- FK a employee_vacations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employee_schedules_vacation_request_id_fkey'
    AND table_name = 'employee_schedules'
  ) THEN
    ALTER TABLE public.employee_schedules
    ADD CONSTRAINT employee_schedules_vacation_request_id_fkey
    FOREIGN KEY (vacation_request_id)
    REFERENCES public.employee_vacations(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Tabla employee_vacations no existe, omitiendo FK';
END $$;

-- Referencia a solicitud de incapacidad
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS disability_request_id UUID;

-- FK a employee_disabilities
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employee_schedules_disability_request_id_fkey'
    AND table_name = 'employee_schedules'
  ) THEN
    ALTER TABLE public.employee_schedules
    ADD CONSTRAINT employee_schedules_disability_request_id_fkey
    FOREIGN KEY (disability_request_id)
    REFERENCES public.employee_disabilities(id) ON DELETE SET NULL;
  END IF;
END $$;

-- =====================================================
-- PASO 3: CAMPOS DE SNAPSHOT DEL HORARIO ORIGINAL
-- Preserva los datos originales antes de ser afectados
-- =====================================================

-- Guardar referencia al schedule_id original (antes del cambio)
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS original_schedule_id UUID;

-- FK al schedule original
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'employee_schedules_original_schedule_id_fkey'
    AND table_name = 'employee_schedules'
  ) THEN
    ALTER TABLE public.employee_schedules
    ADD CONSTRAINT employee_schedules_original_schedule_id_fkey
    FOREIGN KEY (original_schedule_id)
    REFERENCES public.schedules(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Notas de auditoría para el cambio
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS hr_request_notes TEXT;

-- Quién aplicó el cambio
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS modified_by UUID;

-- Cuándo se aplicó el cambio por solicitud HR
ALTER TABLE public.employee_schedules
ADD COLUMN IF NOT EXISTS hr_modified_at TIMESTAMPTZ;

-- =====================================================
-- PASO 4: ÍNDICES PARCIALES PARA PERFORMANCE
-- Solo indexan filas donde el flag es true
-- =====================================================

-- Índice para horarios con compensatorio
CREATE INDEX IF NOT EXISTS idx_employee_schedules_is_compensatory
ON public.employee_schedules(is_compensatory)
WHERE is_compensatory = true;

-- Índice para horarios con timeoff
CREATE INDEX IF NOT EXISTS idx_employee_schedules_is_timeoff
ON public.employee_schedules(is_timeoff)
WHERE is_timeoff = true;

-- Índice para búsqueda por tipo de timeoff
CREATE INDEX IF NOT EXISTS idx_employee_schedules_timeoff_type
ON public.employee_schedules(timeoff_type)
WHERE timeoff_type IS NOT NULL;

-- Índice para búsqueda por vacation_request_id
CREATE INDEX IF NOT EXISTS idx_employee_schedules_vacation_request_id
ON public.employee_schedules(vacation_request_id)
WHERE vacation_request_id IS NOT NULL;

-- Índice para búsqueda por disability_request_id
CREATE INDEX IF NOT EXISTS idx_employee_schedules_disability_request_id
ON public.employee_schedules(disability_request_id)
WHERE disability_request_id IS NOT NULL;

-- Índice para búsqueda por compensatory_request_id
CREATE INDEX IF NOT EXISTS idx_employee_schedules_compensatory_request_id
ON public.employee_schedules(compensatory_request_id)
WHERE compensatory_request_id IS NOT NULL;

-- Índice compuesto para queries comunes (empleado + fecha + estado)
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_date_timeoff
ON public.employee_schedules(employee_id, start_date, is_timeoff, is_compensatory);

-- =====================================================
-- PASO 5: COMENTARIOS DESCRIPTIVOS
-- =====================================================

COMMENT ON COLUMN public.employee_schedules.is_compensatory IS
'Indica si este horario fue ajustado por una solicitud de tiempo compensatorio. El horario se modifica (start/end) pero no se muestra como timeoff.';

COMMENT ON COLUMN public.employee_schedules.compensatory_request_id IS
'Referencia a la solicitud de compensatorio (timeoffs con type=Compensatorio) que causó el ajuste';

COMMENT ON COLUMN public.employee_schedules.is_timeoff IS
'Indica si este horario representa una ausencia del empleado (vacaciones o incapacidad). Se muestra visualmente diferente en la grilla.';

COMMENT ON COLUMN public.employee_schedules.timeoff_type IS
'Tipo de tiempo libre: VACACIONES o INCAPACIDAD. Determina el renderizado visual.';

COMMENT ON COLUMN public.employee_schedules.vacation_request_id IS
'Referencia a la solicitud de vacaciones (employee_vacations) que causó esta entrada';

COMMENT ON COLUMN public.employee_schedules.disability_request_id IS
'Referencia a la solicitud de incapacidad (employee_disabilities) que causó esta entrada';

COMMENT ON COLUMN public.employee_schedules.original_schedule_id IS
'Preserva el schedule_id original antes de ser reemplazado por una solicitud HR. Útil para auditoría y reversión.';

COMMENT ON COLUMN public.employee_schedules.hr_request_notes IS
'Notas adicionales sobre el cambio aplicado por solicitud HR';

COMMENT ON COLUMN public.employee_schedules.modified_by IS
'UUID del usuario que aplicó el cambio por solicitud HR';

COMMENT ON COLUMN public.employee_schedules.hr_modified_at IS
'Timestamp de cuándo se aplicó el cambio por solicitud HR';

-- =====================================================
-- PASO 6: FUNCIÓN HELPER PARA APLICAR TIMEOFF A HORARIOS
-- =====================================================

CREATE OR REPLACE FUNCTION apply_timeoff_to_schedules(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_timeoff_type TEXT,
  p_request_id UUID,
  p_request_type TEXT, -- 'vacation' o 'disability'
  p_modified_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_date DATE;
  v_affected_count INTEGER := 0;
  v_existing_schedule RECORD;
  v_day_off_schedule_id UUID;
BEGIN
  -- Validar tipo de timeoff
  IF p_timeoff_type NOT IN ('VACACIONES', 'INCAPACIDAD') THEN
    RAISE EXCEPTION 'Tipo de timeoff inválido: %. Debe ser VACACIONES o INCAPACIDAD', p_timeoff_type;
  END IF;

  -- Validar tipo de request
  IF p_request_type NOT IN ('vacation', 'disability') THEN
    RAISE EXCEPTION 'Tipo de request inválido: %. Debe ser vacation o disability', p_request_type;
  END IF;

  -- Obtener un schedule de día libre para usar cuando no hay horario
  SELECT id INTO v_day_off_schedule_id
  FROM schedules
  WHERE day_off = true
  LIMIT 1;

  -- Iterar por cada día del rango
  v_date := p_start_date;
  WHILE v_date <= p_end_date LOOP
    -- Buscar horario existente para este día
    SELECT * INTO v_existing_schedule
    FROM employee_schedules
    WHERE employee_id = p_employee_id
      AND start_date <= v_date
      AND end_date >= v_date
    LIMIT 1;

    IF v_existing_schedule IS NOT NULL THEN
      -- Existe horario: marcarlo como timeoff y preservar original
      UPDATE employee_schedules
      SET
        is_timeoff = true,
        timeoff_type = p_timeoff_type,
        vacation_request_id = CASE WHEN p_request_type = 'vacation' THEN p_request_id ELSE vacation_request_id END,
        disability_request_id = CASE WHEN p_request_type = 'disability' THEN p_request_id ELSE disability_request_id END,
        original_schedule_id = COALESCE(original_schedule_id, schedule_id),
        hr_request_notes = COALESCE(p_notes, hr_request_notes),
        modified_by = COALESCE(p_modified_by, modified_by),
        hr_modified_at = NOW(),
        updated_at = NOW()
      WHERE id = v_existing_schedule.id;
    ELSE
      -- No existe horario: crear uno nuevo marcado como timeoff
      INSERT INTO employee_schedules (
        employee_id,
        schedule_id,
        start_date,
        end_date,
        approved,
        approved_at,
        is_timeoff,
        timeoff_type,
        vacation_request_id,
        disability_request_id,
        hr_request_notes,
        modified_by,
        hr_modified_at
      ) VALUES (
        p_employee_id,
        v_day_off_schedule_id,
        v_date,
        v_date,
        true,
        NOW(),
        true,
        p_timeoff_type,
        CASE WHEN p_request_type = 'vacation' THEN p_request_id ELSE NULL END,
        CASE WHEN p_request_type = 'disability' THEN p_request_id ELSE NULL END,
        p_notes,
        p_modified_by,
        NOW()
      );
    END IF;

    v_affected_count := v_affected_count + 1;
    v_date := v_date + INTERVAL '1 day';
  END LOOP;

  RETURN v_affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_timeoff_to_schedules IS
'Aplica una solicitud de timeoff (vacaciones/incapacidad) a los horarios del empleado.
Si existe horario para la fecha, lo marca como timeoff. Si no existe, crea uno nuevo.
Retorna el número de días afectados.';

-- =====================================================
-- PASO 7: FUNCIÓN HELPER PARA APLICAR COMPENSATORIO
-- =====================================================

CREATE OR REPLACE FUNCTION apply_compensatory_to_schedules(
  p_employee_id UUID,
  p_start_date DATE,
  p_end_date DATE,
  p_request_id UUID,
  p_modified_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  v_date DATE;
  v_affected_count INTEGER := 0;
  v_existing_schedule RECORD;
  v_day_off_schedule_id UUID;
BEGIN
  -- Obtener un schedule de día libre para usar cuando no hay horario
  SELECT id INTO v_day_off_schedule_id
  FROM schedules
  WHERE day_off = true
  LIMIT 1;

  -- Iterar por cada día del rango
  v_date := p_start_date;
  WHILE v_date <= p_end_date LOOP
    -- Buscar horario existente para este día
    SELECT * INTO v_existing_schedule
    FROM employee_schedules
    WHERE employee_id = p_employee_id
      AND start_date <= v_date
      AND end_date >= v_date
    LIMIT 1;

    IF v_existing_schedule IS NOT NULL THEN
      -- Existe horario: marcarlo como compensatorio y preservar original
      UPDATE employee_schedules
      SET
        is_compensatory = true,
        compensatory_request_id = p_request_id,
        original_schedule_id = COALESCE(original_schedule_id, schedule_id),
        hr_request_notes = COALESCE(p_notes, hr_request_notes),
        modified_by = COALESCE(p_modified_by, modified_by),
        hr_modified_at = NOW(),
        updated_at = NOW()
      WHERE id = v_existing_schedule.id;
    ELSE
      -- No existe horario: crear uno nuevo marcado como compensatorio
      INSERT INTO employee_schedules (
        employee_id,
        schedule_id,
        start_date,
        end_date,
        approved,
        approved_at,
        is_compensatory,
        compensatory_request_id,
        hr_request_notes,
        modified_by,
        hr_modified_at
      ) VALUES (
        p_employee_id,
        v_day_off_schedule_id,
        v_date,
        v_date,
        true,
        NOW(),
        true,
        p_request_id,
        p_notes,
        p_modified_by,
        NOW()
      );
    END IF;

    v_affected_count := v_affected_count + 1;
    v_date := v_date + INTERVAL '1 day';
  END LOOP;

  RETURN v_affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION apply_compensatory_to_schedules IS
'Aplica una solicitud de compensatorio a los horarios del empleado.
Si existe horario para la fecha, lo marca como compensatorio.
Si no existe horario, crea uno nuevo marcado como compensatorio.
Retorna el número de días afectados.';

-- =====================================================
-- PASO 8: FUNCIÓN PARA REVERTIR CAMBIOS DE HR
-- =====================================================

CREATE OR REPLACE FUNCTION revert_hr_schedule_changes(
  p_employee_id UUID,
  p_request_id UUID,
  p_request_type TEXT -- 'vacation', 'disability', 'compensatory'
)
RETURNS INTEGER AS $$
DECLARE
  v_affected_count INTEGER;
BEGIN
  IF p_request_type = 'vacation' THEN
    UPDATE employee_schedules
    SET
      is_timeoff = false,
      timeoff_type = NULL,
      vacation_request_id = NULL,
      schedule_id = COALESCE(original_schedule_id, schedule_id),
      original_schedule_id = NULL,
      hr_request_notes = NULL,
      hr_modified_at = NULL,
      updated_at = NOW()
    WHERE employee_id = p_employee_id
      AND vacation_request_id = p_request_id;

  ELSIF p_request_type = 'disability' THEN
    UPDATE employee_schedules
    SET
      is_timeoff = false,
      timeoff_type = NULL,
      disability_request_id = NULL,
      schedule_id = COALESCE(original_schedule_id, schedule_id),
      original_schedule_id = NULL,
      hr_request_notes = NULL,
      hr_modified_at = NULL,
      updated_at = NOW()
    WHERE employee_id = p_employee_id
      AND disability_request_id = p_request_id;

  ELSIF p_request_type = 'compensatory' THEN
    UPDATE employee_schedules
    SET
      is_compensatory = false,
      compensatory_request_id = NULL,
      schedule_id = COALESCE(original_schedule_id, schedule_id),
      original_schedule_id = NULL,
      hr_request_notes = NULL,
      hr_modified_at = NULL,
      updated_at = NOW()
    WHERE employee_id = p_employee_id
      AND compensatory_request_id = p_request_id;

  ELSE
    RAISE EXCEPTION 'Tipo de request inválido: %. Debe ser vacation, disability o compensatory', p_request_type;
  END IF;

  GET DIAGNOSTICS v_affected_count = ROW_COUNT;
  RETURN v_affected_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION revert_hr_schedule_changes IS
'Revierte los cambios aplicados a los horarios por una solicitud HR específica.
Restaura el schedule_id original si fue preservado.
Retorna el número de horarios afectados.';

-- =====================================================
-- PASO 9: VISTA PARA QUERY OPTIMIZADO DE HORARIOS CON HR
-- =====================================================

CREATE OR REPLACE VIEW v_employee_schedules_with_hr AS
SELECT
  es.id,
  es.employee_id,
  es.branch_id,
  es.schedule_id,
  es.start_date,
  es.end_date,
  es.approved,
  es.approved_at,
  es.created_at,
  es.updated_at,

  -- Campos HR
  es.is_compensatory,
  es.compensatory_request_id,
  es.is_timeoff,
  es.timeoff_type,
  es.vacation_request_id,
  es.disability_request_id,
  es.original_schedule_id,
  es.hr_request_notes,
  es.modified_by,
  es.hr_modified_at,

  -- Schedule info
  s.name AS schedule_name,
  s.entry_time,
  s.exit_time,
  s.lunch_start_time,
  s.lunch_end_time,
  s.day_off,
  s.color AS schedule_color,

  -- Original schedule info (si aplica)
  os.name AS original_schedule_name,

  -- Estado calculado
  CASE
    WHEN es.is_timeoff THEN 'TIMEOFF'
    WHEN es.is_compensatory THEN 'COMPENSATORY'
    ELSE 'NORMAL'
  END AS schedule_state

FROM employee_schedules es
LEFT JOIN schedules s ON es.schedule_id = s.id
LEFT JOIN schedules os ON es.original_schedule_id = os.id;

COMMENT ON VIEW v_employee_schedules_with_hr IS
'Vista optimizada de horarios con información de HR (vacaciones, incapacidades, compensatorios)';

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
DECLARE
  v_columns TEXT[];
BEGIN
  SELECT array_agg(column_name::TEXT) INTO v_columns
  FROM information_schema.columns
  WHERE table_name = 'employee_schedules'
    AND column_name IN (
      'is_compensatory', 'compensatory_request_id',
      'is_timeoff', 'timeoff_type',
      'vacation_request_id', 'disability_request_id',
      'original_schedule_id', 'hr_request_notes',
      'modified_by', 'hr_modified_at'
    );

  RAISE NOTICE 'Migración completada. Columnas HR agregadas: %', v_columns;
END $$;
