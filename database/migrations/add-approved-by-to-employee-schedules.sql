-- Add approved_by column to track who approved each schedule
ALTER TABLE employee_schedules
  ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES employees(id);

-- Existing approved schedules will have approved_by = NULL (fallback to "RRHH" in UI)
