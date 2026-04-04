-- ============================================================
-- Enable Supabase Realtime for hr_messages table
-- Allows instant in-app notification delivery to employees
-- and managers without manual page refresh.
-- ============================================================

ALTER TABLE hr_messages REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE hr_messages;
