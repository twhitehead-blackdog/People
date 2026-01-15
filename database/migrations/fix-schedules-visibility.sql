-- ============================================
-- FIX: Schedules Visibility for Managers
-- ============================================

-- 1. Ensure Schedules table is readable by all authenticated users
-- Use DO block to handle potential missing policies gracefully
DO $$
BEGIN
    -- Drop potential restrictive policies
    DROP POLICY IF EXISTS "Enable read access for authenticated users" ON schedules;
    DROP POLICY IF EXISTS "Schedules: Read for authenticated" ON schedules;
    DROP POLICY IF EXISTS "Schedules: Read for admins" ON schedules; -- Only if it existed
    
    -- Create permissive read policy
    CREATE POLICY "Schedules: Read for authenticated" ON schedules
        FOR SELECT USING (auth.role() = 'authenticated');
        
    -- Ensure RLS is enabled
    ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
END $$;

-- 2. Ensure Employee Schedules are readable by schedule admins (Managers)
-- This fixes the issue where Managers couldn't see schedules assigned by Admins
DO $$
BEGIN
    DROP POLICY IF EXISTS "Employee Schedules: Read own or admin" ON employee_schedules;
    DROP POLICY IF EXISTS "Employee Schedules: Read for authenticated" ON employee_schedules;
    
    -- Re-create policy explicitly allowing schedule_admin to see ALL
    CREATE POLICY "Employee Schedules: Read own or admin" ON employee_schedules
        FOR SELECT USING (
            auth.role() = 'authenticated' AND (
                employee_id = (SELECT id FROM employees WHERE work_email = auth.jwt() ->> 'email' LIMIT 1) 
                OR 
                EXISTS (
                    SELECT 1 FROM employees e
                    JOIN positions p ON e.position_id = p.id
                    WHERE e.work_email = auth.jwt() ->> 'email'
                    AND (p.admin = true OR p.schedule_admin = true)
                    AND e.is_active = true
                )
            )
        );
        
    ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
END $$;
