-- ============================================================
-- Enable Supabase Realtime for critical tables (Phase 1)
-- Tables: timelogs, employees, employee_schedules, timeoffs
-- ============================================================

-- 1. Set REPLICA IDENTITY FULL so Realtime sends complete row data
--    (not just PKs) on UPDATE and DELETE events.
ALTER TABLE timelogs          REPLICA IDENTITY FULL;
ALTER TABLE employees         REPLICA IDENTITY FULL;
ALTER TABLE employee_schedules REPLICA IDENTITY FULL;
ALTER TABLE timeoffs          REPLICA IDENTITY FULL;

-- 2. Add tables to the supabase_realtime publication.
--    If the publication doesn't exist yet, Supabase creates it automatically.
--    Using IF NOT EXISTS pattern via DO block to be idempotent.
DO $$
BEGIN
  -- Check if publication exists, create if not
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime'
  ) THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;
END
$$;

-- Add tables to publication (idempotent - ignores if already added)
ALTER PUBLICATION supabase_realtime ADD TABLE timelogs;
ALTER PUBLICATION supabase_realtime ADD TABLE employees;
ALTER PUBLICATION supabase_realtime ADD TABLE employee_schedules;
ALTER PUBLICATION supabase_realtime ADD TABLE timeoffs;
