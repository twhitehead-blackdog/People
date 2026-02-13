-- Migration: Add time-off metadata columns to employee_schedules
-- Purpose: Track which schedules were auto-created from vacation/compensatory/disability approvals

ALTER TABLE employee_schedules
  ADD COLUMN IF NOT EXISTS time_off_type TEXT,
  ADD COLUMN IF NOT EXISTS time_off_source_id UUID,
  ADD COLUMN IF NOT EXISTS compensatory_hours_amount NUMERIC(6,2);

-- Add index for querying schedules by source
CREATE INDEX IF NOT EXISTS idx_employee_schedules_time_off_source
  ON employee_schedules (time_off_source_id)
  WHERE time_off_source_id IS NOT NULL;

COMMENT ON COLUMN employee_schedules.time_off_type IS 'Type of time-off: vacation, compensatory_day, compensatory_hours, disability';
COMMENT ON COLUMN employee_schedules.time_off_source_id IS 'FK to the source record (employee_vacations.id, timeoffs.id, employee_disabilities.id)';
COMMENT ON COLUMN employee_schedules.compensatory_hours_amount IS 'Hours amount for compensatory_hours type';
