-- ============================================
-- Función RPC: process_timelog
-- ============================================
-- Consolida inserción de timelog, consultas de horario y cálculos
-- en una sola transacción para reducir requests de 4-6 a 1
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
BEGIN
  -- 1. Insertar timelog
  INSERT INTO timelogs (
    employee_id,
    company_id,
    branch_id,
    type,
    ip,
    invalid_ip,
    created_at
  )
  VALUES (
    p_employee_id,
    p_company_id,
    p_branch_id,
    p_type::timelog_type, -- CAST explícito de VARCHAR a ENUM
    p_ip,
    p_invalid_ip,
    v_now
  )
  RETURNING id INTO v_timelog_id;

  -- 2. Obtener horario actual del empleado para hoy
  SELECT 
    s.*,
    es.id as employee_schedule_id,
    es.start_date,
    es.end_date,
    es.approved
  INTO v_schedule
  FROM employee_schedules es
  INNER JOIN schedules s ON es.schedule_id = s.id
  WHERE es.employee_id = p_employee_id
    AND (es.company_id = p_company_id OR es.company_id IS NULL)
    AND v_today BETWEEN es.start_date AND es.end_date
  ORDER BY es.start_date DESC
  LIMIT 1;

  -- 3. Obtener último timelog del día (para validaciones)
  SELECT 
    id,
    type,
    created_at
  INTO v_last_timelog
  FROM timelogs
  WHERE employee_id = p_employee_id
    AND company_id = p_company_id
    AND created_at::date = v_today
    AND id != v_timelog_id  -- Excluir el que acabamos de insertar
  ORDER BY created_at DESC
  LIMIT 1;

  -- 4. Si es lunch_end, obtener lunch_start del día
  IF p_type = 'lunch_end' THEN
    SELECT 
      id,
      type,
      created_at
    INTO v_lunch_start_timelog
    FROM timelogs
    WHERE employee_id = p_employee_id
      AND company_id = p_company_id
      AND type = 'lunch_start'
      AND created_at::date = v_today
    ORDER BY created_at DESC
    LIMIT 1;

    -- Calcular tiempo excedido de almuerzo
    IF v_lunch_start_timelog.id IS NOT NULL THEN
      -- Calcular duración real del almuerzo en minutos
      v_lunch_exceeded_minutes := EXTRACT(EPOCH FROM (v_now - v_lunch_start_timelog.created_at)) / 60;
      
      -- Si duró más de 60 minutos, calcular exceso
      IF v_lunch_exceeded_minutes > 60 THEN
        v_lunch_exceeded_minutes := v_lunch_exceeded_minutes - 60;
        
        -- Solo mostrar warning si excede más de 5 minutos
        IF v_lunch_exceeded_minutes > 5 THEN
          v_should_show_warning := true;
          v_lunch_end_diff := v_lunch_exceeded_minutes;
        END IF;

        -- Actualizar tiempo excedido acumulado en employees
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
      -- Calcular diferencia en minutos entre hora actual y hora programada
      v_delay := EXTRACT(EPOCH FROM (
        (v_now::date + v_now::time) - (v_now::date + v_schedule.entry_time)
      )) / 60;
      
      -- Retornar delay si es positivo (llegó tarde desde el primer segundo)
      -- La tolerancia ya no se usa para ocultar la tardanza
      IF v_delay <= 0 THEN
        v_delay := NULL;
      END IF;
    END IF;
  END IF;

  -- 6. Calcular exitDiff para exit
  IF p_type = 'exit' AND v_schedule.id IS NOT NULL THEN
    IF v_schedule.exit_time IS NOT NULL AND NOT v_schedule.day_off THEN
      -- Calcular diferencia en minutos entre hora actual y hora programada
      v_exit_diff_minutes := EXTRACT(EPOCH FROM (
        (v_now::date + v_now::time) - (v_now::date + v_schedule.exit_time)
      )) / 60;
      
      -- Determinar si salió temprano o tarde
      v_exit_is_early := v_exit_diff_minutes < 0;
      v_exit_diff_minutes := ABS(v_exit_diff_minutes);
      
      -- Solo retornar exitDiff si excede la tolerancia
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
        jsonb_build_object(
          'minutes', v_exit_diff_minutes,
          'isEarly', v_exit_is_early
        )
      ELSE NULL
    END,
    'lunchEndDiff', CASE 
      WHEN v_should_show_warning THEN v_lunch_end_diff 
      ELSE NULL 
    END,
    'lunchExceededMinutes', CASE 
      WHEN v_lunch_exceeded_minutes > 0 THEN v_lunch_exceeded_minutes 
      ELSE NULL 
    END,
    'schedule', CASE 
      WHEN v_schedule.id IS NOT NULL THEN
        jsonb_build_object(
          'id', v_schedule.id,
          'name', v_schedule.name,
          'entry_time', v_schedule.entry_time,
          'exit_time', v_schedule.exit_time,
          'day_off', v_schedule.day_off,
          'minutes_tolerance', v_schedule.minutes_tolerance
        )
      ELSE NULL
    END,
    'hasSchedule', v_schedule.id IS NOT NULL,
    'isDayOff', COALESCE(v_schedule.day_off, false)
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    -- En caso de error, retornar información del error
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'error_code', SQLSTATE
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentarios
COMMENT ON FUNCTION process_timelog IS 
'Procesa una marcación (timelog) consolidando inserción, consultas de horario y cálculos en una sola transacción. Retorna JSONB con delay, exitDiff, lunchExceeded y datos del horario.';

