-- =============================================================================
-- MIGRATION: 20260130_permissions_system_v2
-- DESCRIPTION: Implement user-level granular permissions with catalog & overrides
-- AUTHOR: Gemini (Antigravity)
-- =============================================================================

-- 1. Permission Keys Catalog
-- Defines all available system permissions grouped by domain
CREATE TABLE IF NOT EXISTS permission_keys (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  domain TEXT NOT NULL, -- e.g., 'dashboard', 'hr', 'finance'
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed Initial Permission Keys (MVP)
INSERT INTO permission_keys (key, label, domain, description) VALUES
  -- Dashboard
  ('dashboard.access', 'Acceso al Dashboard', 'dashboard', 'Permite ingresar al panel administrativo'),
  -- Employees
  ('employees.read', 'Ver Empleados', 'employees', 'Ver lista y detalles de empleados'),
  ('employees.write', 'Gestionar Empleados', 'employees', 'Crear, editar y eliminar empleados'),
  -- Structure
  ('structure.read', 'Ver Estructura', 'structure', 'Ver empresas, departamentos y cargos'),
  ('structure.write', 'Gestionar Estructura', 'structure', 'Editar empresas, departamentos y cargos'),
  -- HR Time
  ('hr.time.read', 'Ver Gestión de Tiempo', 'hr', 'Ver dashboard de tiempo e incapacidades'),
  ('hr.time.write', 'Gestionar Tiempo', 'hr', 'Gestionar incapacidades y vacaciones'),
  -- Schedules
  ('schedules.read', 'Ver Horarios', 'schedules', 'Ver asignaciones de horarios'),
  ('schedules.write', 'Gestionar Horarios', 'schedules', 'Crear y editar turnos y horarios'),
  -- Payroll
  ('payroll.read', 'Ver Planilla', 'payroll', 'Ver cálculos de planilla'),
  ('payroll.write', 'Gestionar Planilla', 'payroll', 'Procesar planilla y pagos'),
  -- Finance
  ('finance.read', 'Ver Finanzas', 'finance', 'Ver bancos y acreedores'),
  ('finance.write', 'Gestionar Finanzas', 'finance', 'Editar bancos y acreedores'),
  ('salaries.view', 'Ver Salarios', 'salary', 'Ver información salarial sensible'),
  -- Admin
  ('admin.users', 'Gestionar Usuarios', 'admin', 'Administrar cuentas de acceso'),
  ('admin.permissions', 'Gestionar Permisos', 'admin', 'Configurar permisos y roles'),
  ('admin.settings', 'Configuraciones', 'admin', 'Acceso a configuraciones globales')
ON CONFLICT (key) DO NOTHING;


-- 2. Position Permissions (Normalized)
-- Stores the baseline permissions for each job title
CREATE TABLE IF NOT EXISTS position_permissions (
  position_id UUID NOT NULL REFERENCES positions(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_keys(key) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (position_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_position_permissions_position ON position_permissions(position_id);


-- 3. Employee Permission Overrides
-- Stores user-specific elevations (exceptions)
CREATE TABLE IF NOT EXISTS employee_permissions (
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  permission_key TEXT NOT NULL REFERENCES permission_keys(key) ON DELETE CASCADE,
  allowed BOOLEAN NOT NULL DEFAULT TRUE, -- Phase 1: Only elevations allowed
  reason TEXT,
  expires_at TIMESTAMPTZ, -- Auto-expiration support
  created_by UUID, -- Audit trail
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (employee_id, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_employee_permissions_employee ON employee_permissions(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_permissions_expires ON employee_permissions(expires_at);


-- 4. Audit Logs
-- Immutable log of security changes
CREATE TABLE IF NOT EXISTS audit_logs (
  id BIGSERIAL PRIMARY KEY,
  actor_user_id UUID NOT NULL, -- auth.uid()
  target_type TEXT NOT NULL, -- 'position' | 'employee'
  target_id UUID NOT NULL,
  permission_key TEXT NOT NULL,
  old_value BOOLEAN,
  new_value BOOLEAN,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON audit_logs(target_type, target_id, created_at DESC);


-- 5. Row Level Security Policies

-- Enable RLS
ALTER TABLE permission_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read permission definitions
CREATE POLICY "Public read permission definitions" ON permission_keys FOR SELECT USING (true);


-- 6. RPC: Resolve My Permissions
-- Returns effective permissions for the current authenticated user
CREATE OR REPLACE FUNCTION get_my_permissions()
RETURNS TABLE(permission_key TEXT, allowed BOOLEAN)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH me AS (
    SELECT e.id AS employee_id, e.position_id
    FROM employees e
    -- Logic to match authenticated user to employee record
    -- Assuming a linkage via email or ID
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


-- 7. RPC: Set Employee Permission (Secure Write)
-- Updates or creates an override, with auditing
CREATE OR REPLACE FUNCTION set_employee_permission(
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
  -- Get actor email
  SELECT email INTO v_actor_email FROM auth.users WHERE id = v_actor;

  -- 1. Verify Actor is Admin (Legacy check + Future check)
  SELECT EXISTS (
    SELECT 1 FROM employees e
    LEFT JOIN positions p ON p.id = e.position_id
    LEFT JOIN position_permissions pp ON pp.position_id = p.id AND pp.permission_key = 'admin.permissions'
    WHERE (e.work_email = v_actor_email OR e.id::text = v_actor::text)
      AND (p.admin = TRUE OR pp.allowed = TRUE) -- Support both legacy and new
  ) INTO v_is_admin;

  IF NOT v_is_admin THEN
    RAISE EXCEPTION 'Access Denied: You do not have permission to manage permissions.';
  END IF;

  -- 2. Get Old Value
  SELECT allowed INTO v_old
  FROM employee_permissions
  WHERE employee_id = p_employee_id AND permission_key = p_key;

  -- 3. Update/Insert or Delete
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
    -- Phase 1: "Remove permission" means deleting the override
    DELETE FROM employee_permissions
    WHERE employee_id = p_employee_id AND permission_key = p_key;
  END IF;

  -- 4. Audit Log
  INSERT INTO audit_logs(actor_user_id, target_type, target_id, permission_key, old_value, new_value, reason)
  VALUES (v_actor, 'employee', p_employee_id, p_key, v_old, p_allowed, p_reason);

END;
$$;
