-- ============================================
-- MIGRACIÓN: late_arrivals - Setup completo
-- Ejecutar en Supabase SQL Editor (una sola vez)
-- ============================================

-- ============================================
-- PASO 1: Crear tabla late_arrivals
-- ============================================

CREATE TABLE IF NOT EXISTS late_arrivals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id   uuid NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  branch_id     uuid NOT NULL REFERENCES branches(id) ON DELETE RESTRICT,
  timelog_id    uuid NOT NULL REFERENCES timelogs(id) ON DELETE CASCADE,
  scheduled_at  timestamptz NOT NULL,
  arrived_at    timestamptz NOT NULL,
  minutes_late  integer GENERATED ALWAYS AS (
    EXTRACT(EPOCH FROM (arrived_at - scheduled_at))::integer / 60
  ) STORED,
  notes         text,
  created_at    timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT arrived_after_scheduled CHECK (arrived_at > scheduled_at)
);

-- Índice para consultas por empleado y fecha
CREATE INDEX IF NOT EXISTS idx_late_arrivals_employee_date
  ON late_arrivals (employee_id, scheduled_at DESC);

-- Índice único para evitar duplicados (un registro por timelog)
CREATE UNIQUE INDEX IF NOT EXISTS idx_late_arrivals_timelog_unique
  ON late_arrivals (timelog_id);

-- ============================================
-- PASO 2: Permisos y RLS
-- ============================================

-- GRANTs necesarios para que REST API funcione con service_role
GRANT SELECT ON late_arrivals TO authenticated;
GRANT SELECT ON employees TO authenticated;
GRANT SELECT ON positions TO authenticated;

-- Habilitar RLS
ALTER TABLE late_arrivals ENABLE ROW LEVEL SECURITY;

-- Política SELECT: usuarios autenticados ven datos de su empresa
CREATE POLICY "late_arrivals_select_authenticated"
ON late_arrivals FOR SELECT
USING (
  auth.role() = 'authenticated'
  AND company_id IN (
    SELECT e.company_id FROM employees e
    WHERE e.work_email = auth.jwt() ->> 'email'
  )
);

-- ============================================
-- PASO 3: Backfill - Cargar datos históricos
-- desde febrero 2026 en adelante
-- ============================================

INSERT INTO late_arrivals (
  employee_id, company_id, branch_id,
  timelog_id, scheduled_at, arrived_at
)
SELECT
  t.employee_id,
  t.company_id,
  t.branch_id,
  t.id AS timelog_id,
  -- Construir scheduled_at con timezone Panama correcto
  ((t.created_at AT TIME ZONE 'America/Panama')::date + s.entry_time) AT TIME ZONE 'America/Panama' AS scheduled_at,
  t.created_at AS arrived_at
FROM timelogs t
INNER JOIN employee_schedules es
  ON es.employee_id = t.employee_id
  AND (es.company_id = t.company_id OR es.company_id IS NULL)
  AND t.created_at::date BETWEEN es.start_date AND es.end_date
INNER JOIN schedules s
  ON s.id = es.schedule_id
  AND s.entry_time IS NOT NULL
  AND s.day_off = false
WHERE t.type = 'entry'
  AND t.created_at >= '2026-02-01T00:00:00-05:00'
  -- Solo los que exceden la tolerancia
  AND EXTRACT(EPOCH FROM (
    (t.created_at::date + t.created_at::time) - (t.created_at::date + s.entry_time)
  )) / 60 > COALESCE(s.minutes_tolerance, 0)
ON CONFLICT (timelog_id) DO NOTHING;

-- ============================================
-- PASO 4: Actualizar process_timelog RPC
-- para insertar automáticamente en late_arrivals
-- ============================================

CREATE OR REPLACE FUNCTION process_timelog(
  p_employee_id UUID,
  p_company_id UUID,
  p_branch_id UUID,
  p_type VARCHAR(20),
  p_ip VARCHAR(45) DEFAULT NULL,
  p_invalid_ip BOOLEAN DEFAULT false
)
RETURNS JSONB AS $$
DECLARE
  v_timelog_id UUID;
  v_now TIMESTAMP WITH TIME ZONE := NOW();
  v_today DATE := CURRENT_DATE;
  v_schedule RECORD;
  v_last_timelog RECORD;
  v_lunch_start_timelog RECORD;
  v_delay INTEGER := NULL;
  v_exit_diff_minutes INTEGER := NULL;
  v_exit_is_early BOOLEAN := false;
  v_lunch_end_diff INTEGER := NULL;
  v_lunch_exceeded_minutes INTEGER := NULL;
  v_should_show_warning BOOLEAN := false;
  v_result JSONB;
  v_scheduled_at TIMESTAMP WITH TIME ZONE;
BEGIN
  -- 1. Insertar timelog
  INSERT INTO timelogs (
    employee_id, company_id, branch_id, type, ip, invalid_ip, created_at
  )
  VALUES (
    p_employee_id, p_company_id, p_branch_id,
    p_type::timelog_type, p_ip, p_invalid_ip, v_now
  )
  RETURNING id INTO v_timelog_id;

  -- 2. Obtener horario actual del empleado para hoy
  SELECT
    s.*, es.id as employee_schedule_id,
    es.start_date, es.end_date, es.approved
  INTO v_schedule
  FROM employee_schedules es
  INNER JOIN schedules s ON es.schedule_id = s.id
  WHERE es.employee_id = p_employee_id
    AND (es.company_id = p_company_id OR es.company_id IS NULL)
    AND v_today BETWEEN es.start_date AND es.end_date
  ORDER BY es.start_date DESC
  LIMIT 1;

  -- 3. Obtener último timelog del día
  SELECT id, type, created_at
  INTO v_last_timelog
  FROM timelogs
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND created_at::date = v_today
    AND id != v_timelog_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- 4. Si es lunch_end, obtener lunch_start del día
  IF p_type = 'lunch_end' THEN
    SELECT id, type, created_at
    INTO v_lunch_start_timelog
    FROM timelogs
    WHERE employee_id = p_employee_id
      AND company_id = p_company_id
      AND type = 'lunch_start'
      AND created_at::date = v_today
    ORDER BY created_at DESC
    LIMIT 1;

    IF v_lunch_start_timelog.id IS NOT NULL THEN
      v_lunch_exceeded_minutes := EXTRACT(EPOCH FROM (v_now - v_lunch_start_timelog.created_at)) / 60;
      IF v_lunch_exceeded_minutes > 60 THEN
        v_lunch_exceeded_minutes := v_lunch_exceeded_minutes - 60;
        IF v_lunch_exceeded_minutes > 5 THEN
          v_should_show_warning := true;
          v_lunch_end_diff := v_lunch_exceeded_minutes;
        END IF;
        UPDATE employees
        SET total_lunch_exceeded_minutes = COALESCE(total_lunch_exceeded_minutes, 0) + v_lunch_exceeded_minutes
        WHERE id = p_employee_id;
      ELSE
        v_lunch_exceeded_minutes := 0;
      END IF;
    END IF;
  END IF;

  -- 5. Calcular delay para entry
  IF p_type = 'entry' AND v_schedule.id IS NOT NULL THEN
    IF v_schedule.entry_time IS NOT NULL AND NOT v_schedule.day_off THEN
      v_delay := EXTRACT(EPOCH FROM (
        (v_now::date + v_now::time) - (v_now::date + v_schedule.entry_time)
      )) / 60;

      IF v_delay <= COALESCE(v_schedule.minutes_tolerance, 0) THEN
        v_delay := NULL;
      END IF;

      -- Insertar en late_arrivals si hay atraso real
      IF v_delay IS NOT NULL AND v_delay > 0 THEN
        v_scheduled_at := (v_now AT TIME ZONE 'America/Panama')::date + v_schedule.entry_time;
        v_scheduled_at := v_scheduled_at AT TIME ZONE 'America/Panama';

        INSERT INTO late_arrivals (
          employee_id, company_id, branch_id,
          timelog_id, scheduled_at, arrived_at
        )
        VALUES (
          p_employee_id, p_company_id, p_branch_id,
          v_timelog_id, v_scheduled_at, v_now
        );
      END IF;
    END IF;
  END IF;

  -- 6. Calcular exitDiff para exit
  IF p_type = 'exit' AND v_schedule.id IS NOT NULL THEN
    IF v_schedule.exit_time IS NOT NULL AND NOT v_schedule.day_off THEN
      v_exit_diff_minutes := EXTRACT(EPOCH FROM (
        (v_now::date + v_now::time) - (v_now::date + v_schedule.exit_time)
      )) / 60;
      v_exit_is_early := v_exit_diff_minutes < 0;
      v_exit_diff_minutes := ABS(v_exit_diff_minutes);
      IF v_exit_diff_minutes <= COALESCE(v_schedule.minutes_tolerance, 0) THEN
        v_exit_diff_minutes := NULL;
      END IF;
    END IF;
  END IF;

  -- 7. Construir resultado JSONB
  v_result := jsonb_build_object(
    'success', true,
    'timelog_id', v_timelog_id,
    'delay', v_delay,
    'exitDiff', CASE
      WHEN v_exit_diff_minutes IS NOT NULL THEN
        jsonb_build_object('minutes', v_exit_diff_minutes, 'isEarly', v_exit_is_early)
      ELSE NULL
    END,
    'lunchEndDiff', CASE
      WHEN v_should_show_warning THEN v_lunch_end_diff ELSE NULL END,
    'lunchExceededMinutes', CASE
      WHEN v_lunch_exceeded_minutes > 0 THEN v_lunch_exceeded_minutes ELSE NULL END,
    'schedule', CASE
      WHEN v_schedule.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_schedule.id, 'name', v_schedule.name,
          'entry_time', v_schedule.entry_time, 'exit_time', v_schedule.exit_time,
          'day_off', v_schedule.day_off, 'minutes_tolerance', v_schedule.minutes_tolerance
        )
      ELSE NULL
    END,
    'hasSchedule', v_schedule.id IS NOT NULL,
    'isDayOff', COALESCE(v_schedule.day_off, false)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false, 'error', SQLERRM, 'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION process_timelog IS
'Procesa una marcación (timelog) consolidando inserción, consultas de horario y cálculos en una sola transacción. Inserta automáticamente en late_arrivals si el empleado llega tarde.';
