-- =============================================================================
-- CONSOLIDATED DEV SYNC MIGRATION: ppt2.sql
-- =============================================================================
-- Purpose: Bring a dev database up to parity with production.
-- Contains ALL missing tables, columns, functions, indexes, RLS policies,
-- triggers, and seed data.
--
-- Safety: Uses IF NOT EXISTS, CREATE OR REPLACE, ON CONFLICT, and DO $$ guards
-- throughout so this script is fully idempotent.
--
-- Sections:
--   1. Helper Functions (required by RLS policies)
--   2. New columns on existing tables (timelogs, document_requests)
--   3. New tables (ordered by FK dependencies)
--   4. Indexes
--   5. RLS enable + policies
--   6. Triggers
--   7. Seed data (performance_rules, permission_keys, audit forms, settings)
--   8. Security hardening (revokes, schema info hiding, anon lockdown)
-- =============================================================================


-- =============================================================================
-- 1. HELPER FUNCTIONS (SECURITY DEFINER)
--    Must exist before RLS policies that reference them.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.current_employee_id()
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

CREATE OR REPLACE FUNCTION public.current_company_id()
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

CREATE OR REPLACE FUNCTION public.is_admin()
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
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_schedule_admin()
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

-- Health check (no sensitive info)
CREATE OR REPLACE FUNCTION public.api_health()
RETURNS jsonb
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object('status', 'ok');
$$;

GRANT EXECUTE ON FUNCTION public.api_health() TO authenticated;

-- Manual timelog permission check
CREATE OR REPLACE FUNCTION public.can_create_manual_timelog(creator_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  creator_position RECORD;
BEGIN
  SELECT p.admin, p.schedule_admin, p.schedule_approver
  INTO creator_position
  FROM employees e
  JOIN positions p ON e.position_id = p.id
  WHERE e.id = creator_id;

  RETURN COALESCE(creator_position.admin, false) = true
      OR COALESCE(creator_position.schedule_admin, false) = true
      OR COALESCE(creator_position.schedule_approver, false) = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.can_create_manual_timelog IS 'Verifica si un usuario tiene permisos para crear marcaciones manuales';

-- NOTE: get_my_permissions() and set_employee_permission() are defined AFTER
-- their dependent tables (position_permissions, employee_permissions, audit_logs)
-- in Section 3b below.

-- Trigger functions
CREATE OR REPLACE FUNCTION public.update_overtime_records_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION public.update_audit_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =============================================================================
-- 2. NEW COLUMNS ON EXISTING TABLES
-- =============================================================================

-- --- timelogs: manual timelog support ---
ALTER TABLE timelogs
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'KIOSK',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS punched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reason TEXT;

COMMENT ON COLUMN timelogs.source IS 'Origen de la marcacion: KIOSK (reloj fisico), MANUAL (admin), RPC (legacy)';
COMMENT ON COLUMN timelogs.created_by IS 'ID del administrador que creo la marcacion manual';
COMMENT ON COLUMN timelogs.punched_at IS 'Fecha/hora de la marcacion. Para manuales, puede diferir de created_at';
COMMENT ON COLUMN timelogs.reason IS 'Razon o justificacion de la marcacion manual';

CREATE INDEX IF NOT EXISTS idx_timelogs_source ON timelogs(source);
CREATE INDEX IF NOT EXISTS idx_timelogs_created_by ON timelogs(created_by);

-- --- document_requests: rejection + metadata ---
ALTER TABLE document_requests
  ADD COLUMN IF NOT EXISTS rejection_comment TEXT;

COMMENT ON COLUMN document_requests.rejection_comment IS 'Comentario del revisor explicando la razon del rechazo';

ALTER TABLE document_requests ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_document_requests_metadata ON document_requests USING GIN (metadata);
CREATE INDEX IF NOT EXISTS idx_document_requests_document_type ON document_requests(document_type);

COMMENT ON COLUMN document_requests.metadata IS 'Type-specific data in JSON format. Structure varies by document_type (timelog_correction, uniform_request, etc.)';


-- =============================================================================
-- 3. NEW TABLES (ordered by FK dependencies)
-- =============================================================================

-- --- 3a. employee_overtime_records ---
CREATE TABLE IF NOT EXISTS public.employee_overtime_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
    timelog_date DATE NOT NULL,
    hours NUMERIC(5,2) NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'rejected')),
    reason TEXT,
    confirmed_by UUID REFERENCES public.employees(id) ON DELETE SET NULL,
    confirmed_at TIMESTAMPTZ,
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_employee_overtime_date UNIQUE (employee_id, timelog_date)
);

CREATE INDEX IF NOT EXISTS idx_overtime_records_date ON public.employee_overtime_records(timelog_date);
CREATE INDEX IF NOT EXISTS idx_overtime_records_status ON public.employee_overtime_records(status);
CREATE INDEX IF NOT EXISTS idx_overtime_records_company ON public.employee_overtime_records(company_id);
CREATE INDEX IF NOT EXISTS idx_overtime_records_employee ON public.employee_overtime_records(employee_id);

COMMENT ON TABLE public.employee_overtime_records IS 'Stores overtime confirmation records for payroll processing';
COMMENT ON COLUMN public.employee_overtime_records.status IS 'pending = not reviewed, confirmed = approved for payroll, rejected = denied';
COMMENT ON COLUMN public.employee_overtime_records.confirmed_by IS 'Employee ID of admin/HR who confirmed/rejected the overtime';
COMMENT ON COLUMN public.employee_overtime_records.confirmed_at IS 'Timestamp when the overtime was confirmed/rejected';

-- --- 3b. audit_tasks ---
CREATE TABLE IF NOT EXISTS public.audit_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  recurrence_type TEXT NOT NULL DEFAULT 'daily' CHECK (recurrence_type IN ('daily', 'weekly', 'monthly', 'custom')),
  recurrence_config JSONB DEFAULT '{}',
  assignment_type TEXT NOT NULL DEFAULT 'all' CHECK (assignment_type IN ('all', 'specific', 'by_branch')),
  assigned_branch_ids UUID[] DEFAULT '{}',
  assigned_manager_ids UUID[] DEFAULT '{}',
  due_days INTEGER NOT NULL DEFAULT 1,
  reminder_days_before INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES employees(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tasks_company ON audit_tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_tasks_active ON audit_tasks(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_audit_tasks_category ON audit_tasks(category);

-- --- 3c. audit_task_instances ---
CREATE TABLE IF NOT EXISTS public.audit_task_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_task_id UUID NOT NULL REFERENCES audit_tasks(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES employees(id),
  branch_id UUID REFERENCES branches(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'not_applicable', 'overdue')),
  scheduled_date DATE NOT NULL,
  due_date DATE NOT NULL,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES employees(id),
  completion_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_task_instances_company ON audit_task_instances(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_assigned_to ON audit_task_instances(assigned_to);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_status ON audit_task_instances(status);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_scheduled ON audit_task_instances(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_due ON audit_task_instances(due_date);
CREATE INDEX IF NOT EXISTS idx_audit_task_instances_branch ON audit_task_instances(branch_id);

-- --- 3d. performance_rules ---
CREATE TABLE IF NOT EXISTS public.performance_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  min_score NUMERIC(5,2) NOT NULL,
  max_score NUMERIC(5,2) NOT NULL,
  multiplier NUMERIC(3,2) NOT NULL,
  severity TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- 3e. audit_forms ---
CREATE TABLE IF NOT EXISTS public.audit_forms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  business_unit TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_forms_company ON audit_forms(company_id);

-- --- 3f. audit_sections ---
CREATE TABLE IF NOT EXISTS public.audit_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_form_id UUID NOT NULL REFERENCES audit_forms(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  weight_percentage NUMERIC(5,2) NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- 3g. audit_questions ---
CREATE TABLE IF NOT EXISTS public.audit_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_section_id UUID NOT NULL REFERENCES audit_sections(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  question_text TEXT NOT NULL,
  weight_relative NUMERIC(5,2) NOT NULL,
  is_critical BOOLEAN DEFAULT false,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- 3h. audit_evaluations ---
CREATE TABLE IF NOT EXISTS public.audit_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),
  branch_id UUID NOT NULL REFERENCES branches(id),
  audit_form_id UUID NOT NULL REFERENCES audit_forms(id),
  form_version INTEGER NOT NULL,
  audited_by UUID NOT NULL REFERENCES employees(id),
  evaluated_employee_id UUID REFERENCES employees(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed', 'archived')),
  total_score NUMERIC(5,2),
  performance_level TEXT,
  observations TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_evaluations_company ON audit_evaluations(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_evaluations_branch ON audit_evaluations(branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_evaluations_date ON audit_evaluations(created_at);

-- --- 3i. audit_answers ---
CREATE TABLE IF NOT EXISTS public.audit_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  audit_evaluation_id UUID NOT NULL REFERENCES audit_evaluations(id) ON DELETE CASCADE,
  audit_question_id UUID NOT NULL REFERENCES audit_questions(id),
  answer_value TEXT NOT NULL CHECK (answer_value IN ('yes', 'no', 'na')),
  notes TEXT,
  question_text_snapshot TEXT,
  weight_relative_snapshot NUMERIC(5,2),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_answers_eval ON audit_answers(audit_evaluation_id);

-- --- 3j. permission_keys ---
CREATE TABLE IF NOT EXISTS public.permission_keys (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  domain TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- 3k. position_permissions ---
CREATE TABLE IF NOT EXISTS public.position_permissions (
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_keys(key) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (position_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_position_permissions_position ON position_permissions(position_id);

-- --- 3l. employee_permissions ---
CREATE TABLE IF NOT EXISTS public.employee_permissions (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_keys(key) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT TRUE,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (employee_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_employee_permissions_employee ON employee_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_permissions_expires ON employee_permissions(expires_at);

-- --- 3m. audit_logs (permission change trail) ---
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID NOT NULL,
  permission_key TEXT NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id, created_at DESC);

-- --- 3b. DEFERRED FUNCTIONS (depend on tables above) ---

CREATE OR REPLACE FUNCTION public.get_my_permissions()
RETURNS TABLE(permission_key TEXT, allowed BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH me AS (
    SELECT e.id AS employee_id, e.position_id
    FROM employees e
    WHERE e.work_email = (select email from auth.users where id = auth.uid())
       OR e.id::text = auth.uid()::text
    LIMIT 1
  ),
  base AS (
    SELECT pp.permission_key, pp.allowed
    FROM position_permissions pp
    JOIN me ON me.position_id = pp.position_id
  ),
  overrides AS (
    SELECT ep.permission_key, ep.allowed
    FROM employee_permissions ep
    JOIN me ON me.employee_id = ep.employee_id
    WHERE ep.allowed = TRUE
      AND (ep.expires_at IS NULL OR ep.expires_at > NOW())
  )
  SELECT
    COALESCE(b.permission_key, o.permission_key) AS permission_key,
    COALESCE(b.allowed, FALSE) OR COALESCE(o.allowed, FALSE) AS allowed
  FROM base b
  FULL OUTER JOIN overrides o USING(permission_key);
$$;

CREATE OR REPLACE FUNCTION public.set_employee_permission(
  p_employee_id UUID,
  p_key TEXT,
  p_allowed BOOLEAN,
  p_reason TEXT DEFAULT NULL,
  p_expires_at TIMESTAMPTZ DEFAULT NULL
) RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actor UUID := auth.uid();
  v_actor_email TEXT;
  v_old BOOLEAN;
  v_is_admin BOOLEAN;
BEGIN
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;

  SELECT EXISTS (
    SELECT 1 FROM employees e
    LEFT JOIN positions p ON p.id = e.position_id
    LEFT JOIN position_permissions pp ON pp.position_id = p.id AND pp.permission_key = 'admin.permissions'
    WHERE (e.work_email = v_actor_email OR e.id::text = v_actor::text)
      AND (p.admin = TRUE OR pp.allowed = TRUE)
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to manage permissions.';
  END IF;

  SELECT allowed INTO v_old
  FROM employee_permissions
  WHERE employee_id = p_employee_id AND permission_key = p_key;

  IF p_allowed = TRUE THEN
    INSERT INTO employee_permissions(employee_id, permission_key, allowed, reason, expires_at, created_by)
    VALUES (p_employee_id, p_key, TRUE, p_reason, p_expires_at, v_actor)
    ON CONFLICT (employee_id, permission_key)
    DO UPDATE SET
      allowed = TRUE,
      reason = EXCLUDED.reason,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW();
  ELSE
    DELETE FROM employee_permissions
    WHERE employee_id = p_employee_id AND permission_key = p_key;
  END IF;

  INSERT INTO audit_logs(actor_user_id, target_type, target_id, permission_key, old_value, new_value, reason)
  VALUES (v_actor, 'employee', p_employee_id, p_key, v_old, p_allowed, p_reason);
END;
$$;

-- --- 3n. security_audit_log ---
CREATE TABLE IF NOT EXISTS public.security_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(50) NOT NULL,
    table_name VARCHAR(100),
    record_id UUID,
    user_email TEXT,
    ip_address INET,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_audit_log_created_at ON security_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_log_event_type ON security_audit_log(event_type);

-- --- 3o. login_attempts ---
CREATE TABLE IF NOT EXISTS public.login_attempts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  ip_address TEXT,
  attempted_at TIMESTAMPTZ DEFAULT now(),
  success BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_email_time ON public.login_attempts(email, attempted_at DESC);

-- --- 3p. password_reset_audit ---
CREATE TABLE IF NOT EXISTS public.password_reset_audit (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  requested_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  completed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_reset_audit_email ON public.password_reset_audit(email, requested_at DESC);


-- =============================================================================
-- 4. ENABLE RLS ON ALL NEW TABLES
-- =============================================================================

ALTER TABLE public.employee_overtime_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_task_instances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_evaluations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permission_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.position_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.login_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.password_reset_audit ENABLE ROW LEVEL SECURITY;


-- =============================================================================
-- 5. RLS POLICIES (using DO $$ blocks with IF NOT EXISTS)
-- =============================================================================

-- --- employee_overtime_records ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'employee_overtime_records'
        AND policyname = 'overtime_records_read'
    ) THEN
        CREATE POLICY overtime_records_read
            ON public.employee_overtime_records
            FOR SELECT
            USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'employee_overtime_records'
        AND policyname = 'overtime_records_insert'
    ) THEN
        CREATE POLICY overtime_records_insert
            ON public.employee_overtime_records
            FOR INSERT
            WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'employee_overtime_records'
        AND policyname = 'overtime_records_update'
    ) THEN
        CREATE POLICY overtime_records_update
            ON public.employee_overtime_records
            FOR UPDATE
            USING (true);
    END IF;
END $$;

-- --- audit_tasks ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_tasks'
        AND policyname = 'Users can view audit tasks in their company'
    ) THEN
        CREATE POLICY "Users can view audit tasks in their company"
          ON audit_tasks FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_tasks'
        AND policyname = 'Users can insert audit tasks in their company'
    ) THEN
        CREATE POLICY "Users can insert audit tasks in their company"
          ON audit_tasks FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_tasks'
        AND policyname = 'Users can update audit tasks in their company'
    ) THEN
        CREATE POLICY "Users can update audit tasks in their company"
          ON audit_tasks FOR UPDATE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_tasks'
        AND policyname = 'Users can delete audit tasks in their company'
    ) THEN
        CREATE POLICY "Users can delete audit tasks in their company"
          ON audit_tasks FOR DELETE USING (true);
    END IF;
END $$;

-- --- audit_task_instances ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_task_instances'
        AND policyname = 'Users can view audit task instances in their company'
    ) THEN
        CREATE POLICY "Users can view audit task instances in their company"
          ON audit_task_instances FOR SELECT USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_task_instances'
        AND policyname = 'Users can insert audit task instances'
    ) THEN
        CREATE POLICY "Users can insert audit task instances"
          ON audit_task_instances FOR INSERT WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_task_instances'
        AND policyname = 'Users can update audit task instances'
    ) THEN
        CREATE POLICY "Users can update audit task instances"
          ON audit_task_instances FOR UPDATE USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_task_instances'
        AND policyname = 'Users can delete audit task instances'
    ) THEN
        CREATE POLICY "Users can delete audit task instances"
          ON audit_task_instances FOR DELETE USING (true);
    END IF;
END $$;

-- --- performance_rules ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'performance_rules'
        AND policyname = 'Auth users read rules'
    ) THEN
        CREATE POLICY "Auth users read rules" ON performance_rules FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- --- audit_forms ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_forms'
        AND policyname = 'Auth users read forms'
    ) THEN
        CREATE POLICY "Auth users read forms" ON audit_forms FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- --- audit_sections ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_sections'
        AND policyname = 'Auth users read sections'
    ) THEN
        CREATE POLICY "Auth users read sections" ON audit_sections FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- --- audit_questions ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_questions'
        AND policyname = 'Auth users read questions'
    ) THEN
        CREATE POLICY "Auth users read questions" ON audit_questions FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

-- --- audit_evaluations ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_evaluations'
        AND policyname = 'Users view company evals'
    ) THEN
        CREATE POLICY "Users view company evals" ON audit_evaluations FOR SELECT TO authenticated
        USING (company_id = (SELECT company_id FROM employees WHERE id = auth.uid() LIMIT 1));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_evaluations'
        AND policyname = 'Users create evals'
    ) THEN
        CREATE POLICY "Users create evals" ON audit_evaluations FOR INSERT TO authenticated
        WITH CHECK (company_id = (SELECT company_id FROM employees WHERE id = auth.uid() LIMIT 1));
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_evaluations'
        AND policyname = 'Users update own/company evals'
    ) THEN
        CREATE POLICY "Users update own/company evals" ON audit_evaluations FOR UPDATE TO authenticated
        USING (company_id = (SELECT company_id FROM employees WHERE id = auth.uid() LIMIT 1));
    END IF;
END $$;

-- --- audit_answers ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_answers'
        AND policyname = 'Users view answers'
    ) THEN
        CREATE POLICY "Users view answers" ON audit_answers FOR SELECT TO authenticated USING (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_answers'
        AND policyname = 'Users create answers'
    ) THEN
        CREATE POLICY "Users create answers" ON audit_answers FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'audit_answers'
        AND policyname = 'Users update answers'
    ) THEN
        CREATE POLICY "Users update answers" ON audit_answers FOR UPDATE TO authenticated USING (true);
    END IF;
END $$;

-- --- permission_keys ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'permission_keys'
        AND policyname = 'Public read permission definitions'
    ) THEN
        CREATE POLICY "Public read permission definitions" ON permission_keys FOR SELECT USING (true);
    END IF;
END $$;

-- --- login_attempts ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'login_attempts'
        AND policyname = 'No public access on login_attempts'
    ) THEN
        CREATE POLICY "No public access on login_attempts"
          ON public.login_attempts FOR ALL USING (false);
    END IF;
END $$;

-- --- password_reset_audit ---
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'password_reset_audit'
        AND policyname = 'No public access on password_reset_audit'
    ) THEN
        CREATE POLICY "No public access on password_reset_audit"
          ON public.password_reset_audit FOR ALL USING (false);
    END IF;
END $$;

-- --- security_audit_log ---
DROP POLICY IF EXISTS "audit_log_admin" ON security_audit_log;
CREATE POLICY "audit_log_admin" ON security_audit_log
    FOR SELECT TO authenticated
    USING (is_admin());

DROP POLICY IF EXISTS "audit_log_insert" ON security_audit_log;
CREATE POLICY "audit_log_insert" ON security_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (true);


-- =============================================================================
-- 6. TRIGGERS
-- =============================================================================

-- employee_overtime_records
DROP TRIGGER IF EXISTS trg_overtime_records_updated_at ON public.employee_overtime_records;
CREATE TRIGGER trg_overtime_records_updated_at
    BEFORE UPDATE ON public.employee_overtime_records
    FOR EACH ROW
    EXECUTE FUNCTION update_overtime_records_updated_at();

-- audit_tasks
DROP TRIGGER IF EXISTS audit_tasks_updated_at ON audit_tasks;
CREATE TRIGGER audit_tasks_updated_at
  BEFORE UPDATE ON audit_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_tasks_updated_at();

-- audit_task_instances
DROP TRIGGER IF EXISTS audit_task_instances_updated_at ON audit_task_instances;
CREATE TRIGGER audit_task_instances_updated_at
  BEFORE UPDATE ON audit_task_instances
  FOR EACH ROW
  EXECUTE FUNCTION update_audit_tasks_updated_at();


-- =============================================================================
-- 7. SEED DATA
-- =============================================================================

-- --- 7a. performance_rules ---
INSERT INTO performance_rules (name, min_score, max_score, multiplier, severity) VALUES
('Critico', 0.00, 60.99, 0.30, 'danger'),
('Moderado', 61.00, 80.99, 0.70, 'warn'),
('Aceptable', 81.00, 100.00, 1.00, 'success')
ON CONFLICT DO NOTHING;

-- --- 7b. permission_keys ---
INSERT INTO permission_keys (key, label, domain, description) VALUES
  ('dashboard.access', 'Acceso al Dashboard', 'dashboard', 'Permite ingresar al panel administrativo'),
  ('employees.read', 'Ver Empleados', 'employees', 'Ver lista y detalles de empleados'),
  ('employees.write', 'Gestionar Empleados', 'employees', 'Crear, editar y eliminar empleados'),
  ('structure.read', 'Ver Estructura', 'structure', 'Ver empresas, departamentos y cargos'),
  ('structure.write', 'Gestionar Estructura', 'structure', 'Editar empresas, departamentos y cargos'),
  ('hr.time.read', 'Ver Gestion de Tiempo', 'hr', 'Ver dashboard de tiempo e incapacidades'),
  ('hr.time.write', 'Gestionar Tiempo', 'hr', 'Gestionar incapacidades y vacaciones'),
  ('schedules.read', 'Ver Horarios', 'schedules', 'Ver asignaciones de horarios'),
  ('schedules.write', 'Gestionar Horarios', 'schedules', 'Crear y editar turnos y horarios'),
  ('payroll.read', 'Ver Planilla', 'payroll', 'Ver calculos de planilla'),
  ('payroll.write', 'Gestionar Planilla', 'payroll', 'Procesar planilla y pagos'),
  ('finance.read', 'Ver Finanzas', 'finance', 'Ver bancos y acreedores'),
  ('finance.write', 'Gestionar Finanzas', 'finance', 'Editar bancos y acreedores'),
  ('salaries.view', 'Ver Salarios', 'salary', 'Ver informacion salarial sensible'),
  ('admin.users', 'Gestionar Usuarios', 'admin', 'Administrar cuentas de acceso'),
  ('admin.permissions', 'Gestionar Permisos', 'admin', 'Configurar permisos y roles'),
  ('admin.settings', 'Configuraciones', 'admin', 'Acceso a configuraciones globales')
ON CONFLICT (key) DO NOTHING;

-- --- 7c. audit forms seed data (3 forms: Petshop, Grooming, Clinica) ---
DO $$
DECLARE
  v_company_id UUID;
  v_form_id UUID;
  v_sec_id UUID;
BEGIN
  SELECT id INTO v_company_id FROM companies LIMIT 1;

  IF v_company_id IS NOT NULL THEN

    -- Skip if forms already seeded
    IF EXISTS (SELECT 1 FROM audit_forms WHERE business_unit = 'Petshop' LIMIT 1) THEN
      RETURN;
    END IF;

    -- ==========================================
    -- FORMULARIO 1: PETSHOP (TIENDA)
    -- ==========================================
    INSERT INTO audit_forms (company_id, title, business_unit, version, is_active)
    VALUES (v_company_id, 'Evaluacion en Tienda', 'Petshop', 1, true)
    RETURNING id INTO v_form_id;

    -- Seccion OP (30%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'OP', 'Operaciones - Punto de Venta', 30.00, 1)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'OP.1', 'Se realiza el protocolo de cierre de punto de venta al finalizar el turno (arqueo de caja, reporte de ventas).', 0.40, 1),
    (v_sec_id, 'OP.2', 'Se valida que la venta de medicamentos con receta se realice bajo prescripcion medica.', 0.30, 2),
    (v_sec_id, 'OP.3', 'Se mantiene la integridad de precios (el precio marcado en estanteria coincide con el sistema).', 0.10, 3),
    (v_sec_id, 'OP.4', 'Se revisa y valida que los descuentos y promociones especiales se apliquen correctamente.', 0.10, 4),
    (v_sec_id, 'OP.5', 'Se emiten los comprobantes fiscales/facturas electronicas correctamente.', 0.10, 5);

    -- Seccion AC (20%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'AC', 'Atencion a Clientes', 20.00, 2)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'AC.1', 'Se implementa y vive la experiencia de marca "BLACK DOG" (saludo, amabilidad, asesoria).', 0.40, 1),
    (v_sec_id, 'AC.2', 'El personal esta capacitado para proporcionar la informacion tecnica basica de los productos.', 0.30, 2),
    (v_sec_id, 'AC.3', 'Se registran y gestionan de forma protocolaria las quejas y sugerencias de los clientes.', 0.20, 3),
    (v_sec_id, 'AC.4', 'Se envian fotos a los clientes al final de cada servicio (si aplica).', 0.05, 4),
    (v_sec_id, 'AC.5', 'Se ofrece una despedida profesional al cliente (se agradece la visita).', 0.05, 5);

    -- Seccion GI (30%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'GI', 'Gestion de Inventario', 30.00, 3)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'GI.1', 'Realizan bisemanalmente un control riguroso de la fecha de vencimiento de los productos.', 0.45, 1),
    (v_sec_id, 'GI.2', 'Sistema FEFO aplicado a medicamentos y alimentos perecederos.', 0.30, 2),
    (v_sec_id, 'GI.3', 'Se solicita la dotacion de mercancia baja en stock (requisicion a tiempo).', 0.15, 3),
    (v_sec_id, 'GI.4', 'Cuentan con un espacio de almacenamiento dentro de las instalaciones ordenado.', 0.10, 4);

    -- Seccion SL (15%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'SL', 'Seguridad y Limpieza', 15.00, 4)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'SL.1', 'Las estanterias y exhibidores se encuentran organizadas, limpias y seguras.', 0.40, 1),
    (v_sec_id, 'SL.2', 'Los productos pesados o voluminosos estan colocados en lugares seguros.', 0.30, 2),
    (v_sec_id, 'SL.3', 'Se realiza diariamente la limpieza general de las areas comunes.', 0.30, 3);

    -- Seccion AE (5%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'AE', 'Auto-Diagnostico', 5.00, 5)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'AE.1', 'Revision objetiva y honesta del nivel de cumplimiento y responsabilidad.', 1.00, 1);

    -- ==========================================
    -- FORMULARIO 2: GROOMING (PELUQUERIA)
    -- ==========================================
    INSERT INTO audit_forms (company_id, title, business_unit, version, is_active)
    VALUES (v_company_id, 'Evaluacion en Peluqueria', 'Grooming', 1, true)
    RETURNING id INTO v_form_id;

    -- Seccion BA (45%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'BA', 'Bienestar Animal', 45.00, 1)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'BA.1', 'Se mantiene un protocolo de manejo de animales nerviosos o agresivos.', 0.35, 1),
    (v_sec_id, 'BA.2', 'Utilizan equipos de sujecion seguros y adecuados para cada talla.', 0.20, 2),
    (v_sec_id, 'BA.3', 'Nunca dejan a los animales solos en las baneras o en las mesas.', 0.20, 3),
    (v_sec_id, 'BA.4', 'Se realiza el triage en la peluqueria para conocer problemas preexistentes.', 0.15, 4),
    (v_sec_id, 'BA.5', 'Todas las jaulas mantienen su comanda y un correcto cronograma.', 0.10, 5);

    -- Seccion HD (30%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'HD', 'Higiene y Desinfeccion', 30.00, 2)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'HD.1', 'Realizan la limpieza y desinfeccion de las herramientas entre cada servicio.', 0.40, 1),
    (v_sec_id, 'HD.2', 'Mantienen una limpieza diaria de baneras, mesas y suelo.', 0.30, 2),
    (v_sec_id, 'HD.3', 'Utilizan los productos (champus, acondicionadores) de grado profesional adecuados.', 0.30, 3);

    -- Seccion PC (20%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'PC', 'Personal Capacitado', 20.00, 3)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'PC.1', 'Se cuenta con el personal capacitado o con experiencia en cortes de raza.', 0.60, 1),
    (v_sec_id, 'PC.2', 'Este personal cuenta con conocimientos basicos en primeros auxilios.', 0.40, 2);

    -- Seccion AE (5%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'AE', 'Auto-Diagnostico', 5.00, 4)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'AE.1', 'Revision objetiva y honesta del nivel de cumplimiento y responsabilidad.', 1.00, 1);

    -- ==========================================
    -- FORMULARIO 3: CLINICA (VETERINARIA)
    -- ==========================================
    INSERT INTO audit_forms (company_id, title, business_unit, version, is_active)
    VALUES (v_company_id, 'Evaluacion en Veterinaria', 'Clinica', 1, true)
    RETURNING id INTO v_form_id;

    -- Seccion GF (47.5%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'GF', 'Gestion Farmacologica', 47.50, 1)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'GF.1', 'Realiza el uso obligatorio de Equipo de Proteccion Personal (EPP).', 0.40, 1),
    (v_sec_id, 'GF.2', 'Protocolo de manejo y desecho adecuado de material punzocortante y biologico.', 0.40, 2),
    (v_sec_id, 'GF.3', 'Se mantiene un debido control y registro de medicamentos controlados.', 0.10, 3),
    (v_sec_id, 'GF.4', 'Se verifica la cadena de frio para vacunas y medicamentos refrigerados.', 0.10, 4);

    -- Seccion PR (47.5%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'PR', 'Procedimiento y Registro Medico', 47.50, 2)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'PR.1', 'Realiza la revision de la historia clinica de los pacientes antes de atender.', 0.25, 1),
    (v_sec_id, 'PR.2', 'El HC incluye la identificacion completa del propietario y paciente.', 0.25, 2),
    (v_sec_id, 'PR.3', 'Se realiza la verificacion de los protocolos de comunicacion de diagnosticos.', 0.25, 3),
    (v_sec_id, 'PR.4', 'Realiza la revision de disponibilidad y mantenimiento de equipos medicos.', 0.10, 4),
    (v_sec_id, 'PR.5', 'Mantiene un protocolos de limpieza y esterilizacion del instrumental.', 0.10, 5),
    (v_sec_id, 'PR.6', 'Mantiene un protocolo de desinfeccion entre pacientes en la mesa de exploracion.', 0.05, 6);

    -- Seccion AE (5%)
    INSERT INTO audit_sections (audit_form_id, code, title, weight_percentage, order_index)
    VALUES (v_form_id, 'AE', 'Auto-Diagnostico', 5.00, 3)
    RETURNING id INTO v_sec_id;

    INSERT INTO audit_questions (audit_section_id, code, question_text, weight_relative, order_index) VALUES
    (v_sec_id, 'AE.1', 'Revision objetiva y honesta del nivel de cumplimiento y responsabilidad.', 1.00, 1);

  END IF;
END $$;

-- --- 7d. settings: email configuration ---
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'email_enabled',
  'true',
  'Master switch: si es false, NO se enviara ningun correo del sistema.',
  'email',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_notify_vacations',
  'true',
  'Si es true, al crear una solicitud de vacaciones se enviara un correo de notificacion a RRHH.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_recipients_vacations',
  'Verley@blackdogpanama.com',
  'Destinatarios para notificaciones de solicitudes de vacaciones.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_notify_uniform',
  'true',
  'Si es true, al crear una solicitud de uniforme se enviara un correo de notificacion a RRHH.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_recipients_uniform',
  'Verley@blackdogpanama.com',
  'Destinatarios para notificaciones de solicitudes de uniforme.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_notify_timelog_correction',
  'true',
  'Si es true, al crear una solicitud de correccion de marcacion se enviara un correo de notificacion a RRHH.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_recipients_timelog_correction',
  'Verley@blackdogpanama.com',
  'Destinatarios para notificaciones de correccion de marcacion.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'employee_email_notify_approvals',
  'true',
  'Si es true, se enviara un correo al empleado cuando RRHH apruebe su solicitud.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'employee_email_notify_rejections',
  'true',
  'Si es true, se enviara un correo al empleado cuando RRHH rechace su solicitud.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;


-- =============================================================================
-- 8. SECURITY HARDENING
-- =============================================================================

-- Enable RLS on all core existing tables (idempotent)
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

-- Revoke public execute on all public-schema functions
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
            NULL;
        END;
    END LOOP;
END $$;

-- Grant execute to authenticated only
REVOKE ALL ON FUNCTION is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION is_admin() FROM anon;
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;

REVOKE ALL ON FUNCTION is_schedule_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION is_schedule_admin() FROM anon;
GRANT EXECUTE ON FUNCTION is_schedule_admin() TO authenticated;

REVOKE ALL ON FUNCTION current_employee_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION current_employee_id() FROM anon;
GRANT EXECUTE ON FUNCTION current_employee_id() TO authenticated;

REVOKE ALL ON FUNCTION current_company_id() FROM PUBLIC;
REVOKE ALL ON FUNCTION current_company_id() FROM anon;
GRANT EXECUTE ON FUNCTION current_company_id() TO authenticated;

-- Hide schema info from anon
REVOKE SELECT ON pg_catalog.pg_settings FROM anon;
REVOKE ALL ON SCHEMA information_schema FROM anon;
REVOKE SELECT ON pg_catalog.pg_proc FROM anon;
REVOKE SELECT ON pg_catalog.pg_namespace FROM anon;

-- Drop overly permissive "Enable all access" policies
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

-- --- COMPANIES ---
DROP POLICY IF EXISTS "companies_select_authenticated" ON companies;
CREATE POLICY "companies_select_authenticated" ON companies
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "companies_modify_admin" ON companies;
CREATE POLICY "companies_modify_admin" ON companies
    FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- --- BRANCHES ---
DROP POLICY IF EXISTS "branches_select_authenticated" ON branches;
CREATE POLICY "branches_select_authenticated" ON branches
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "branches_modify_admin" ON branches;
CREATE POLICY "branches_modify_admin" ON branches
    FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- --- DEPARTMENTS ---
DROP POLICY IF EXISTS "departments_select_authenticated" ON departments;
CREATE POLICY "departments_select_authenticated" ON departments
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "departments_modify_admin" ON departments;
CREATE POLICY "departments_modify_admin" ON departments
    FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- --- POSITIONS ---
DROP POLICY IF EXISTS "positions_select_authenticated" ON positions;
CREATE POLICY "positions_select_authenticated" ON positions
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "positions_modify_admin" ON positions;
CREATE POLICY "positions_modify_admin" ON positions
    FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- --- EMPLOYEES ---
DROP POLICY IF EXISTS "employees_select_own" ON employees;
CREATE POLICY "employees_select_own" ON employees
    FOR SELECT TO authenticated
    USING (
        work_email = auth.jwt() ->> 'email'
        OR (is_admin() AND is_active = true)
        OR is_active = true
    );

DROP POLICY IF EXISTS "employees_modify_admin" ON employees;
CREATE POLICY "employees_modify_admin" ON employees
    FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- --- TIMELOGS ---
DROP POLICY IF EXISTS "timelogs_select" ON timelogs;
CREATE POLICY "timelogs_select" ON timelogs
    FOR SELECT TO authenticated
    USING (employee_id = current_employee_id() OR is_admin());

DROP POLICY IF EXISTS "timelogs_insert_own" ON timelogs;
CREATE POLICY "timelogs_insert_own" ON timelogs
    FOR INSERT TO authenticated
    WITH CHECK (employee_id = current_employee_id() OR is_admin());

DROP POLICY IF EXISTS "timelogs_modify_admin" ON timelogs;
CREATE POLICY "timelogs_modify_admin" ON timelogs
    FOR UPDATE TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "timelogs_delete_admin" ON timelogs;
CREATE POLICY "timelogs_delete_admin" ON timelogs
    FOR DELETE TO authenticated USING (is_admin());

-- --- ATTENDANCE_SHEETS ---
DROP POLICY IF EXISTS "attendance_sheets_select" ON attendance_sheets;
CREATE POLICY "attendance_sheets_select" ON attendance_sheets
    FOR SELECT TO authenticated
    USING (employee_id = current_employee_id() OR is_admin());

DROP POLICY IF EXISTS "attendance_sheets_modify_admin" ON attendance_sheets;
CREATE POLICY "attendance_sheets_modify_admin" ON attendance_sheets
    FOR ALL TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

-- --- EMPLOYEE_SCHEDULES ---
DROP POLICY IF EXISTS "employee_schedules_select" ON employee_schedules;
CREATE POLICY "employee_schedules_select" ON employee_schedules
    FOR SELECT TO authenticated
    USING (employee_id = current_employee_id() OR is_admin() OR is_schedule_admin());

DROP POLICY IF EXISTS "employee_schedules_modify" ON employee_schedules;
CREATE POLICY "employee_schedules_modify" ON employee_schedules
    FOR ALL TO authenticated
    USING (is_admin() OR is_schedule_admin())
    WITH CHECK (is_admin() OR is_schedule_admin());

-- --- SCHEDULES ---
DROP POLICY IF EXISTS "schedules_select" ON schedules;
CREATE POLICY "schedules_select" ON schedules
    FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "schedules_modify" ON schedules;
CREATE POLICY "schedules_modify" ON schedules
    FOR ALL TO authenticated
    USING (is_admin() OR is_schedule_admin())
    WITH CHECK (is_admin() OR is_schedule_admin());

-- --- TIMEOFFS ---
DROP POLICY IF EXISTS "timeoffs_select" ON timeoffs;
CREATE POLICY "timeoffs_select" ON timeoffs
    FOR SELECT TO authenticated
    USING (employee_id = current_employee_id() OR is_admin());

DROP POLICY IF EXISTS "timeoffs_insert" ON timeoffs;
CREATE POLICY "timeoffs_insert" ON timeoffs
    FOR INSERT TO authenticated
    WITH CHECK (employee_id = current_employee_id() OR is_admin());

DROP POLICY IF EXISTS "timeoffs_modify_admin" ON timeoffs;
CREATE POLICY "timeoffs_modify_admin" ON timeoffs
    FOR UPDATE TO authenticated
    USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "timeoffs_delete_admin" ON timeoffs;
CREATE POLICY "timeoffs_delete_admin" ON timeoffs
    FOR DELETE TO authenticated USING (is_admin());

-- --- PAYROLL TABLES ---
DROP POLICY IF EXISTS "payrolls_admin" ON payrolls;
CREATE POLICY "payrolls_admin" ON payrolls
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payroll_deductions_admin" ON payroll_deductions;
CREATE POLICY "payroll_deductions_admin" ON payroll_deductions
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "employee_payrolls_admin" ON employee_payrolls;
CREATE POLICY "employee_payrolls_admin" ON employee_payrolls
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payroll_payments_admin" ON payroll_payments;
CREATE POLICY "payroll_payments_admin" ON payroll_payments
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payroll_debts_admin" ON payroll_debts;
CREATE POLICY "payroll_debts_admin" ON payroll_debts
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

DROP POLICY IF EXISTS "payroll_payment_employees_select" ON payroll_payment_employees;
CREATE POLICY "payroll_payment_employees_select" ON payroll_payment_employees
    FOR SELECT TO authenticated
    USING (employee_id = current_employee_id() OR is_admin());

DROP POLICY IF EXISTS "payroll_payment_employees_modify" ON payroll_payment_employees;
CREATE POLICY "payroll_payment_employees_modify" ON payroll_payment_employees
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

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
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- MASTER TABLES ---
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

-- --- EMPLOYEE PERSONAL DATA TABLES ---
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

-- --- TERMINATIONS ---
DROP POLICY IF EXISTS "terminations_admin" ON terminations;
CREATE POLICY "terminations_admin" ON terminations
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- COMPLAINTS ---
DROP POLICY IF EXISTS "complaints_select" ON complaints;
CREATE POLICY "complaints_select" ON complaints
    FOR SELECT TO authenticated
    USING (is_admin() OR creator_employee_id = current_employee_id());

DROP POLICY IF EXISTS "complaints_insert" ON complaints;
CREATE POLICY "complaints_insert" ON complaints
    FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "complaints_update" ON complaints;
CREATE POLICY "complaints_update" ON complaints
    FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- --- COMPLAINT MESSAGES ---
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

-- --- SETTINGS ---
DROP POLICY IF EXISTS "settings_admin" ON settings;
CREATE POLICY "settings_admin" ON settings
    FOR ALL TO authenticated USING (is_admin()) WITH CHECK (is_admin());

-- Block anon access to all public tables
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


-- =============================================================================
-- END OF MIGRATION ppt2.sql
-- =============================================================================
