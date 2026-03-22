-- ============================================================
-- Migration: Add ip_override_by to timelogs + update RPC
-- Allows a manager to authorize IP bypass for 1 hour in kiosk
-- ============================================================

-- 1. Add column
ALTER TABLE timelogs
  ADD COLUMN IF NOT EXISTS ip_override_by UUID REFERENCES employees(id) DEFAULT NULL;

-- 2. Index for reporting queries
CREATE INDEX IF NOT EXISTS idx_timelogs_ip_override_by
  ON timelogs(ip_override_by)
  WHERE ip_override_by IS NOT NULL;

-- 3. Update process_timelog RPC to accept override manager
CREATE OR REPLACE FUNCTION process_timelog(
  p_employee_id    UUID,
  p_company_id     UUID,
  p_branch_id      UUID,
  p_type           VARCHAR(20),
  p_ip             VARCHAR(45) DEFAULT NULL,
  p_invalid_ip     BOOLEAN     DEFAULT false,
  p_ip_override_by UUID        DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_timelog_id              UUID;
  v_now                     TIMESTAMP WITH TIME ZONE := NOW();
  v_today                   DATE := CURRENT_DATE;
  v_schedule                RECORD;
  v_last_timelog            RECORD;
  v_lunch_start_timelog     RECORD;
  v_delay                   INTEGER := NULL;
  v_exit_diff_minutes       INTEGER := NULL;
  v_exit_is_early           BOOLEAN := false;
  v_lunch_end_diff          INTEGER := NULL;
  v_lunch_exceeded_minutes  INTEGER := NULL;
  v_should_show_warning     BOOLEAN := false;
  v_result                  JSONB;
BEGIN
  -- 1. Insert timelog (including override manager when present)
  INSERT INTO timelogs (
    employee_id,
    company_id,
    branch_id,
    type,
    ip,
    invalid_ip,
    ip_override_by,
    created_at
  )
  VALUES (
    p_employee_id,
    p_company_id,
    p_branch_id,
    p_type::timelog_type,
    p_ip,
    p_invalid_ip,
    p_ip_override_by,
    v_now
  )
  RETURNING id INTO v_timelog_id;

  -- 2. Get employee schedule for today
  SELECT
    s.*,
    es.id        AS employee_schedule_id,
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

  -- 3. Get last timelog of the day (for validations)
  SELECT id, type, created_at
  INTO v_last_timelog
  FROM timelogs
  WHERE employee_id = p_employee_id
    AND company_id  = p_company_id
    AND created_at::date = v_today
    AND id != v_timelog_id
  ORDER BY created_at DESC
  LIMIT 1;

  -- 4. Delay calculation for entry
  IF p_type = 'ENTRY' AND v_schedule IS NOT NULL AND v_schedule.entry_time IS NOT NULL
     AND NOT COALESCE(v_schedule.day_off, false) THEN
    DECLARE
      v_scheduled_entry TIME := v_schedule.entry_time;
      v_tolerance       INTEGER := COALESCE(v_schedule.minutes_tolerance, 0);
      v_entry_time      TIME := v_now::time;
      v_diff_minutes    INTEGER;
    BEGIN
      v_diff_minutes := EXTRACT(EPOCH FROM (v_entry_time - v_scheduled_entry)) / 60;
      IF v_diff_minutes > v_tolerance THEN
        v_delay := v_diff_minutes;
      END IF;
    END;
  END IF;

  -- 5. Exit diff calculation
  IF p_type = 'EXIT' AND v_schedule IS NOT NULL AND v_schedule.exit_time IS NOT NULL
     AND NOT COALESCE(v_schedule.day_off, false) THEN
    DECLARE
      v_scheduled_exit TIME := v_schedule.exit_time;
      v_exit_time      TIME := v_now::time;
      v_diff_minutes   INTEGER;
    BEGIN
      v_diff_minutes := EXTRACT(EPOCH FROM (v_exit_time - v_scheduled_exit)) / 60;
      v_exit_diff_minutes := ABS(v_diff_minutes);
      v_exit_is_early := v_diff_minutes < 0;
    END;
  END IF;

  -- 6. Build result
  v_result := jsonb_build_object(
    'success',               true,
    'timelog_id',            v_timelog_id,
    'delay',                 v_delay,
    'exitDiff',              CASE WHEN v_exit_diff_minutes IS NOT NULL
                               THEN jsonb_build_object('minutes', v_exit_diff_minutes, 'isEarly', v_exit_is_early)
                               ELSE NULL END,
    'lunchEndDiff',          v_lunch_end_diff,
    'lunchExceededMinutes',  v_lunch_exceeded_minutes,
    'schedule',              CASE WHEN v_schedule IS NOT NULL
                               THEN jsonb_build_object(
                                 'id',                v_schedule.id,
                                 'name',              v_schedule.name,
                                 'entry_time',        v_schedule.entry_time,
                                 'exit_time',         v_schedule.exit_time,
                                 'day_off',           v_schedule.day_off,
                                 'minutes_tolerance', v_schedule.minutes_tolerance
                               )
                               ELSE NULL END,
    'hasSchedule',           v_schedule IS NOT NULL,
    'isDayOff',              COALESCE(v_schedule.day_off, false)
  );

  RETURN v_result;

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success',    false,
    'error',      SQLERRM,
    'error_code', SQLSTATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
