-- ============================================
-- Security Hardening Migration
-- ============================================
-- Fixes for:
-- - RPC Function Enumeration (HIGH)
-- - Error Message Information Leakage (MEDIUM)
-- - API Version Information Disclosure (LOW)
-- - Credentials in Error Messages (MEDIUM)
-- - Proper RLS Policies
-- ============================================

-- ============================================
-- 1. REVOKE PUBLIC ACCESS TO FUNCTIONS
-- Prevents RPC function enumeration
-- ============================================

-- Revoke public execute on all functions in public schema
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN
        SELECT proname, pg_get_function_identity_arguments(oid) as args
        FROM pg_proc
        WHERE pronamespace = 'public'::regnamespace
    LOOP
        BEGIN
            EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM PUBLIC',
                func_record.proname, func_record.args);
            EXECUTE format('REVOKE ALL ON FUNCTION public.%I(%s) FROM anon',
                func_record.proname, func_record.args);
        EXCEPTION WHEN OTHERS THEN
            -- Skip if function doesn't exist or other error
            NULL;
        END;
    END LOOP;
END $$;

-- ============================================
-- 2. SECURE HELPER FUNCTIONS
-- Use SECURITY INVOKER where possible, limit SECURITY DEFINER
-- ============================================

-- Recreate is_admin with better security
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM employees e
        JOIN positions p ON e.position_id = p.id
        WHERE e.work_email = auth.jwt() ->> 'email'
        AND p.admin = true
        AND e.is_active = true
    ) INTO result;
    RETURN COALESCE(result, false);
EXCEPTION WHEN OTHERS THEN
    -- Don't leak error details
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

-- Grant execute only to authenticated users
REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

-- Recreate is_schedule_admin with better security
CREATE OR REPLACE FUNCTION is_schedule_admin()
RETURNS BOOLEAN AS $$
DECLARE
    result BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM employees e
        JOIN positions p ON e.position_id = p.id
        WHERE e.work_email = auth.jwt() ->> 'email'
        AND p.schedule_admin = true
        AND e.is_active = true
    ) INTO result;
    RETURN COALESCE(result, false);
EXCEPTION WHEN OTHERS THEN
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION is_schedule_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION is_schedule_admin() FROM anon;
GRANT EXECUTE ON FUNCTION is_schedule_admin() TO authenticated;

-- Recreate current_employee_id with better security
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID AS $$
DECLARE
    emp_id UUID;
BEGIN
    SELECT id INTO emp_id
    FROM employees
    WHERE work_email = auth.jwt() ->> 'email'
    AND is_active = true
    LIMIT 1;
    RETURN emp_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION current_employee_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION current_employee_id() FROM anon;
GRANT EXECUTE ON FUNCTION current_employee_id() TO authenticated;

-- ============================================
-- 3. GET CURRENT COMPANY HELPER
-- ============================================

CREATE OR REPLACE FUNCTION current_company_id()
RETURNS UUID AS $$
DECLARE
    comp_id UUID;
BEGIN
    SELECT e.company_id INTO comp_id
    FROM employees e
    WHERE e.work_email = auth.jwt() ->> 'email'
    AND e.is_active = true
    LIMIT 1;
    RETURN comp_id;
EXCEPTION WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

REVOKE ALL ON FUNCTION current_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION current_company_id() FROM anon;
GRANT EXECUTE ON FUNCTION current_company_id() TO authenticated;

-- ============================================
-- 4. HIDE SCHEMA INFORMATION
-- Prevents API version/schema disclosure
-- ============================================

-- Revoke access to information_schema for anon
REVOKE ALL ON SCHEMA information_schema FROM anon;

-- Revoke access to pg_catalog views that leak info
REVOKE SELECT ON pg_catalog.pg_proc FROM anon;
REVOKE SELECT ON pg_catalog.pg_namespace FROM anon;

-- ============================================
-- 5. RE-ENABLE RLS ON ALL TABLES
-- ============================================

ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_chart ENABLE ROW LEVEL SECURITY;
ALTER TABLE banks ENABLE ROW LEVEL SECURITY;
ALTER TABLE creditors ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeoff_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE timeoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE terminations ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE timelogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_sheets ENABLE ROW LEVEL SECURITY;
ALTER TABLE payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_deductions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payrolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_debts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payment_employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE payroll_payment_employee_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_languages ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_disabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaint_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 6. SECURE RLS POLICIES
-- Replace overly permissive policies with proper ones
-- ============================================

-- Drop all existing permissive policies first
DO $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname, tablename
        FROM pg_policies
        WHERE schemaname = 'public'
        AND policyname LIKE 'Enable all access%'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
    END LOOP;
END $$;

-- ============================================
-- COMPANIES - Read only for authenticated
-- ============================================
DROP POLICY IF EXISTS "companies_select_authenticated" ON companies;
CREATE POLICY "companies_select_authenticated" ON companies
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "companies_modify_admin" ON companies;
CREATE POLICY "companies_modify_admin" ON companies
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- BRANCHES - Read all, write admin only
-- ============================================
DROP POLICY IF EXISTS "branches_select_authenticated" ON branches;
CREATE POLICY "branches_select_authenticated" ON branches
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "branches_modify_admin" ON branches;
CREATE POLICY "branches_modify_admin" ON branches
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- DEPARTMENTS - Read all, write admin only
-- ============================================
DROP POLICY IF EXISTS "departments_select_authenticated" ON departments;
CREATE POLICY "departments_select_authenticated" ON departments
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "departments_modify_admin" ON departments;
CREATE POLICY "departments_modify_admin" ON departments
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- POSITIONS - Read all, write admin only
-- ============================================
DROP POLICY IF EXISTS "positions_select_authenticated" ON positions;
CREATE POLICY "positions_select_authenticated" ON positions
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "positions_modify_admin" ON positions;
CREATE POLICY "positions_modify_admin" ON positions
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- EMPLOYEES - Restricted access
-- ============================================
DROP POLICY IF EXISTS "employees_select_own" ON employees;
CREATE POLICY "employees_select_own" ON employees
    FOR SELECT TO authenticated
    USING (
        -- Users can see their own data
        work_email = auth.jwt() ->> 'email'
        -- Admins can see all active employees
        OR (is_admin() AND is_active = true)
        -- Regular users see only active employees
        OR is_active = true
    );

DROP POLICY IF EXISTS "employees_modify_admin" ON employees;
CREATE POLICY "employees_modify_admin" ON employees
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- TIMELOGS - Own data or admin
-- ============================================
DROP POLICY IF EXISTS "timelogs_select" ON timelogs;
CREATE POLICY "timelogs_select" ON timelogs
    FOR SELECT TO authenticated
    USING (
        employee_id = current_employee_id()
        OR is_admin()
    );

DROP POLICY IF EXISTS "timelogs_insert_own" ON timelogs;
CREATE POLICY "timelogs_insert_own" ON timelogs
    FOR INSERT TO authenticated
    WITH CHECK (
        employee_id = current_employee_id()
        OR is_admin()
    );

DROP POLICY IF EXISTS "timelogs_modify_admin" ON timelogs;
CREATE POLICY "timelogs_modify_admin" ON timelogs
    FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "timelogs_delete_admin" ON timelogs;
CREATE POLICY "timelogs_delete_admin" ON timelogs
    FOR DELETE TO authenticated
    USING (is_admin());

-- ============================================
-- ATTENDANCE_SHEETS - Own data or admin
-- ============================================
DROP POLICY IF EXISTS "attendance_sheets_select" ON attendance_sheets;
CREATE POLICY "attendance_sheets_select" ON attendance_sheets
    FOR SELECT TO authenticated
    USING (
        employee_id = current_employee_id()
        OR is_admin()
    );

DROP POLICY IF EXISTS "attendance_sheets_modify_admin" ON attendance_sheets;
CREATE POLICY "attendance_sheets_modify_admin" ON attendance_sheets
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- EMPLOYEE_SCHEDULES - Own data, schedule admin, or admin
-- ============================================
DROP POLICY IF EXISTS "employee_schedules_select" ON employee_schedules;
CREATE POLICY "employee_schedules_select" ON employee_schedules
    FOR SELECT TO authenticated
    USING (
        employee_id = current_employee_id()
        OR is_admin()
        OR is_schedule_admin()
    );

DROP POLICY IF EXISTS "employee_schedules_modify" ON employee_schedules;
CREATE POLICY "employee_schedules_modify" ON employee_schedules
    FOR ALL TO authenticated
    USING (is_admin() OR is_schedule_admin())
    WITH CHECK (is_admin() OR is_schedule_admin());

-- ============================================
-- SCHEDULES - Read all, write schedule admin/admin
-- ============================================
DROP POLICY IF EXISTS "schedules_select" ON schedules;
CREATE POLICY "schedules_select" ON schedules
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS "schedules_modify" ON schedules;
CREATE POLICY "schedules_modify" ON schedules
    FOR ALL TO authenticated
    USING (is_admin() OR is_schedule_admin())
    WITH CHECK (is_admin() OR is_schedule_admin());

-- ============================================
-- TIMEOFFS - Own data or admin
-- ============================================
DROP POLICY IF EXISTS "timeoffs_select" ON timeoffs;
CREATE POLICY "timeoffs_select" ON timeoffs
    FOR SELECT TO authenticated
    USING (
        employee_id = current_employee_id()
        OR is_admin()
    );

DROP POLICY IF EXISTS "timeoffs_insert" ON timeoffs;
CREATE POLICY "timeoffs_insert" ON timeoffs
    FOR INSERT TO authenticated
    WITH CHECK (
        employee_id = current_employee_id()
        OR is_admin()
    );

DROP POLICY IF EXISTS "timeoffs_modify_admin" ON timeoffs;
CREATE POLICY "timeoffs_modify_admin" ON timeoffs
    FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "timeoffs_delete_admin" ON timeoffs;
CREATE POLICY "timeoffs_delete_admin" ON timeoffs
    FOR DELETE TO authenticated
    USING (is_admin());

-- ============================================
-- PAYROLL TABLES - Admin only
-- ============================================
DROP POLICY IF EXISTS "payrolls_admin" ON payrolls;
CREATE POLICY "payrolls_admin" ON payrolls
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payroll_deductions_admin" ON payroll_deductions;
CREATE POLICY "payroll_deductions_admin" ON payroll_deductions
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "employee_payrolls_admin" ON employee_payrolls;
CREATE POLICY "employee_payrolls_admin" ON employee_payrolls
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payroll_payments_admin" ON payroll_payments;
CREATE POLICY "payroll_payments_admin" ON payroll_payments
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payroll_debts_admin" ON payroll_debts;
CREATE POLICY "payroll_debts_admin" ON payroll_debts
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Employees can see their own payment records
DROP POLICY IF EXISTS "payroll_payment_employees_select" ON payroll_payment_employees;
CREATE POLICY "payroll_payment_employees_select" ON payroll_payment_employees
    FOR SELECT TO authenticated
    USING (
        employee_id = current_employee_id()
        OR is_admin()
    );

DROP POLICY IF EXISTS "payroll_payment_employees_modify" ON payroll_payment_employees;
CREATE POLICY "payroll_payment_employees_modify" ON payroll_payment_employees
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payroll_payment_employee_items_select" ON payroll_payment_employee_items;
CREATE POLICY "payroll_payment_employee_items_select" ON payroll_payment_employee_items
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM payroll_payment_employees ppe
            WHERE ppe.id = payment_employee_id
            AND (ppe.employee_id = current_employee_id() OR is_admin())
        )
    );

DROP POLICY IF EXISTS "payroll_payment_employee_items_modify" ON payroll_payment_employee_items;
CREATE POLICY "payroll_payment_employee_items_modify" ON payroll_payment_employee_items
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- MASTER TABLES - Read all, write admin
-- ============================================
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY['banks', 'creditors', 'timeoff_types', 'organization_chart'];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (true)', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "%s_modify" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_modify" ON %I FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin())', tbl, tbl);
    END LOOP;
END $$;

-- ============================================
-- EMPLOYEE PERSONAL DATA - Own or admin
-- ============================================
DO $$
DECLARE
    tbl TEXT;
    tables TEXT[] := ARRAY[
        'emergency_contacts', 'employee_documents', 'employee_notes',
        'employee_skills', 'employee_languages', 'employee_disabilities',
        'document_requests'
    ];
BEGIN
    FOREACH tbl IN ARRAY tables
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS "%s_select" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_select" ON %I FOR SELECT TO authenticated USING (employee_id = current_employee_id() OR is_admin())', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "%s_insert" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_insert" ON %I FOR INSERT TO authenticated WITH CHECK (employee_id = current_employee_id() OR is_admin())', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "%s_update" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_update" ON %I FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin())', tbl, tbl);

        EXECUTE format('DROP POLICY IF EXISTS "%s_delete" ON %I', tbl, tbl);
        EXECUTE format('CREATE POLICY "%s_delete" ON %I FOR DELETE TO authenticated USING (is_admin())', tbl, tbl);
    END LOOP;
END $$;

-- ============================================
-- TERMINATIONS - Admin only
-- ============================================
DROP POLICY IF EXISTS "terminations_admin" ON terminations;
CREATE POLICY "terminations_admin" ON terminations
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- COMPLAINTS - Special handling for anonymity
-- ============================================
DROP POLICY IF EXISTS "complaints_select" ON complaints;
CREATE POLICY "complaints_select" ON complaints
    FOR SELECT TO authenticated
    USING (
        -- HR admins can see all complaints
        is_admin()
        -- Creators can see their own complaints
        OR creator_employee_id = current_employee_id()
    );

DROP POLICY IF EXISTS "complaints_insert" ON complaints;
CREATE POLICY "complaints_insert" ON complaints
    FOR INSERT TO authenticated
    WITH CHECK (true);

DROP POLICY IF EXISTS "complaints_update" ON complaints;
CREATE POLICY "complaints_update" ON complaints
    FOR UPDATE TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- COMPLAINT MESSAGES
-- ============================================
DROP POLICY IF EXISTS "complaint_messages_select" ON complaint_messages;
CREATE POLICY "complaint_messages_select" ON complaint_messages
    FOR SELECT TO authenticated
    USING (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM complaints c
            WHERE c.id = complaint_id
            AND c.creator_employee_id = current_employee_id()
        )
    );

DROP POLICY IF EXISTS "complaint_messages_insert" ON complaint_messages;
CREATE POLICY "complaint_messages_insert" ON complaint_messages
    FOR INSERT TO authenticated
    WITH CHECK (
        is_admin()
        OR EXISTS (
            SELECT 1 FROM complaints c
            WHERE c.id = complaint_id
            AND c.creator_employee_id = current_employee_id()
        )
    );

-- ============================================
-- SETTINGS - Admin only
-- ============================================
DROP POLICY IF EXISTS "settings_admin" ON settings;
CREATE POLICY "settings_admin" ON settings
    FOR ALL TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================
-- 7. BLOCK ANON ACCESS COMPLETELY
-- ============================================

-- Ensure anon role has no access to any table
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename FROM pg_tables WHERE schemaname = 'public'
    LOOP
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', tbl.tablename);
    END LOOP;
END $$;

-- ============================================
-- 8. AUDIT LOGGING (Optional but recommended)
-- ============================================

-- Create audit log table
CREATE TABLE IF NOT EXISTS security_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    user_email TEXT,
    ip_address INET,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read audit logs
DROP POLICY IF EXISTS "audit_log_admin" ON security_audit_log;
CREATE POLICY "audit_log_admin" ON security_audit_log
    FOR SELECT TO authenticated
    USING (is_admin());

-- System can insert (no policy needed for service role)
DROP POLICY IF EXISTS "audit_log_insert" ON security_audit_log;
CREATE POLICY "audit_log_insert" ON security_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);

-- ============================================
-- VERIFICATION QUERIES
-- Run these to verify security is applied
-- ============================================

-- Check RLS is enabled on all tables
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE schemaname = 'public' AND rowsecurity = false;

-- Check policies exist
-- SELECT tablename, policyname, permissive, roles, cmd
-- FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;

-- Check function permissions
-- SELECT proname, proacl FROM pg_proc WHERE pronamespace = 'public'::regnamespace;
