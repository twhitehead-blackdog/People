-- =====================================================
-- SISTEMA DE PERMISOS GRANULAR POR MÓDULO
-- Migración 2: Permisos por cargo y overrides por empleado
--
-- SEGURIDAD: Esta migración es SEGURA para producción
-- - Solo crea tablas NUEVAS
-- - No modifica tablas existentes
-- - Usa IF NOT EXISTS para idempotencia
-- - RLS deshabilitado (Auth0 no usa auth.uid())
--
-- PREREQUISITO: Ejecutar add-system-modules.sql primero
-- =====================================================

-- Verificar que system_modules existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_modules') THEN
    RAISE EXCEPTION 'La tabla system_modules no existe. Ejecuta add-system-modules.sql primero.';
  END IF;
END $$;

-- =====================================================
-- PERMISOS POR CARGO (BASE)
-- Define los permisos predeterminados para cada cargo
-- =====================================================
CREATE TABLE IF NOT EXISTS position_module_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  position_id UUID NOT NULL,  -- FK a positions pero sin constraint para flexibilidad
  module_id UUID NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,
  can_view BOOLEAN DEFAULT false,
  can_create BOOLEAN DEFAULT false,
  can_edit BOOLEAN DEFAULT false,
  can_delete BOOLEAN DEFAULT false,
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(position_id, module_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_position_module_perms_position ON position_module_permissions(position_id);
CREATE INDEX IF NOT EXISTS idx_position_module_perms_module ON position_module_permissions(module_id);
CREATE INDEX IF NOT EXISTS idx_position_module_perms_company ON position_module_permissions(company_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_position_module_permissions_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_position_perms_updated ON position_module_permissions;
CREATE TRIGGER trigger_position_perms_updated
  BEFORE UPDATE ON position_module_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_position_module_permissions_timestamp();

-- =====================================================
-- OVERRIDES POR EMPLEADO (EXCEPCIONES INDIVIDUALES)
-- Permite ajustar permisos para un empleado específico
-- =====================================================
CREATE TABLE IF NOT EXISTS employee_permission_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id UUID NOT NULL,  -- FK a employees pero sin constraint
  module_id UUID NOT NULL REFERENCES system_modules(id) ON DELETE CASCADE,

  -- NULL = heredar del cargo, true/false = override explícito
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,

  -- Bloqueo total (ignora todos los permisos)
  is_blocked BOOLEAN DEFAULT false,

  reason TEXT,
  granted_by UUID,  -- FK a employees pero sin constraint
  granted_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,

  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(employee_id, module_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_employee_overrides_employee ON employee_permission_overrides(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_overrides_module ON employee_permission_overrides(module_id);
CREATE INDEX IF NOT EXISTS idx_employee_overrides_company ON employee_permission_overrides(company_id);
CREATE INDEX IF NOT EXISTS idx_employee_overrides_expires ON employee_permission_overrides(expires_at) WHERE expires_at IS NOT NULL;

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_employee_overrides_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_employee_overrides_updated ON employee_permission_overrides;
CREATE TRIGGER trigger_employee_overrides_updated
  BEFORE UPDATE ON employee_permission_overrides
  FOR EACH ROW
  EXECUTE FUNCTION update_employee_overrides_timestamp();

-- =====================================================
-- LOG DE AUDITORÍA DE PERMISOS
-- Registra todos los cambios para trazabilidad
-- =====================================================
CREATE TABLE IF NOT EXISTS permission_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type TEXT NOT NULL CHECK (target_type IN ('position', 'employee')),
  target_id UUID NOT NULL,
  module_id UUID,
  module_code TEXT,
  action TEXT NOT NULL CHECK (action IN ('grant', 'revoke', 'block', 'unblock', 'clone', 'reset', 'bulk_update')),
  old_value JSONB,
  new_value JSONB,
  reason TEXT,
  performed_by UUID NOT NULL,
  performed_at TIMESTAMPTZ DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  company_id UUID
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_audit_target ON permission_audit_log(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_performed_by ON permission_audit_log(performed_by);
CREATE INDEX IF NOT EXISTS idx_audit_performed_at ON permission_audit_log(performed_at);
CREATE INDEX IF NOT EXISTS idx_audit_company ON permission_audit_log(company_id);

-- =====================================================
-- FUNCIÓN: Calcular permisos efectivos de un empleado
-- Esta función es SEGURA - solo hace SELECT, no modifica datos
-- =====================================================
CREATE OR REPLACE FUNCTION get_effective_permissions(p_employee_id UUID)
RETURNS TABLE (
  module_id UUID,
  module_code TEXT,
  module_name TEXT,
  module_icon TEXT,
  module_route TEXT,
  parent_id UUID,
  order_index INT,
  can_view BOOLEAN,
  can_create BOOLEAN,
  can_edit BOOLEAN,
  can_delete BOOLEAN,
  is_blocked BOOLEAN,
  source TEXT,
  expires_at TIMESTAMPTZ
) AS $$
DECLARE
  v_position_id UUID;
BEGIN
  -- Obtener position_id del empleado
  SELECT e.position_id INTO v_position_id
  FROM employees e
  WHERE e.id = p_employee_id;

  -- Si no existe el empleado, retornar vacío (no error)
  IF v_position_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH position_perms AS (
    SELECT
      pmp.module_id,
      pmp.can_view,
      pmp.can_create,
      pmp.can_edit,
      pmp.can_delete
    FROM position_module_permissions pmp
    WHERE pmp.position_id = v_position_id
  ),
  employee_overrides AS (
    SELECT
      epo.module_id,
      epo.can_view,
      epo.can_create,
      epo.can_edit,
      epo.can_delete,
      epo.is_blocked,
      epo.expires_at
    FROM employee_permission_overrides epo
    WHERE epo.employee_id = p_employee_id
      AND (epo.expires_at IS NULL OR epo.expires_at > NOW())
  )
  SELECT
    sm.id AS module_id,
    sm.code AS module_code,
    sm.name AS module_name,
    sm.icon AS module_icon,
    sm.route AS module_route,
    sm.parent_id,
    sm.order_index,
    -- Calcular permiso efectivo
    CASE
      WHEN COALESCE(eo.is_blocked, FALSE) THEN FALSE
      WHEN eo.can_view IS NOT NULL THEN eo.can_view
      ELSE COALESCE(pp.can_view, FALSE)
    END AS can_view,
    CASE
      WHEN COALESCE(eo.is_blocked, FALSE) THEN FALSE
      WHEN eo.can_create IS NOT NULL THEN eo.can_create
      ELSE COALESCE(pp.can_create, FALSE)
    END AS can_create,
    CASE
      WHEN COALESCE(eo.is_blocked, FALSE) THEN FALSE
      WHEN eo.can_edit IS NOT NULL THEN eo.can_edit
      ELSE COALESCE(pp.can_edit, FALSE)
    END AS can_edit,
    CASE
      WHEN COALESCE(eo.is_blocked, FALSE) THEN FALSE
      WHEN eo.can_delete IS NOT NULL THEN eo.can_delete
      ELSE COALESCE(pp.can_delete, FALSE)
    END AS can_delete,
    COALESCE(eo.is_blocked, FALSE) AS is_blocked,
    -- Determinar origen del permiso
    CASE
      WHEN eo.module_id IS NOT NULL THEN
        CASE WHEN eo.is_blocked THEN 'blocked' ELSE 'employee_override' END
      WHEN pp.module_id IS NOT NULL THEN 'position'
      ELSE 'none'
    END AS source,
    eo.expires_at
  FROM system_modules sm
  LEFT JOIN position_perms pp ON pp.module_id = sm.id
  LEFT JOIN employee_overrides eo ON eo.module_id = sm.id
  WHERE sm.is_active = TRUE
  ORDER BY sm.order_index, sm.name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Clonar permisos de un empleado a otro
-- =====================================================
CREATE OR REPLACE FUNCTION clone_employee_permissions(
  p_source_employee_id UUID,
  p_target_employee_id UUID,
  p_include_overrides BOOLEAN DEFAULT true,
  p_performed_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_source_position_id UUID;
  v_target_position_id UUID;
BEGIN
  -- Verificar que ambos empleados existen
  SELECT position_id INTO v_source_position_id FROM employees WHERE id = p_source_employee_id;
  SELECT position_id INTO v_target_position_id FROM employees WHERE id = p_target_employee_id;

  IF v_source_position_id IS NULL THEN
    RAISE EXCEPTION 'Empleado origen no encontrado: %', p_source_employee_id;
  END IF;

  IF v_target_position_id IS NULL THEN
    RAISE EXCEPTION 'Empleado destino no encontrado: %', p_target_employee_id;
  END IF;

  -- Eliminar overrides existentes del target
  DELETE FROM employee_permission_overrides WHERE employee_id = p_target_employee_id;

  -- Si include_overrides, copiar los overrides del source
  IF p_include_overrides THEN
    INSERT INTO employee_permission_overrides (
      employee_id, module_id, can_view, can_create, can_edit, can_delete,
      is_blocked, reason, granted_by, company_id
    )
    SELECT
      p_target_employee_id,
      epo.module_id,
      epo.can_view,
      epo.can_create,
      epo.can_edit,
      epo.can_delete,
      epo.is_blocked,
      'Clonado de otro empleado',
      COALESCE(p_performed_by, epo.granted_by),
      epo.company_id
    FROM employee_permission_overrides epo
    WHERE epo.employee_id = p_source_employee_id;
  END IF;

  -- Registrar en auditoría
  INSERT INTO permission_audit_log (
    target_type, target_id, action, reason, performed_by, new_value
  ) VALUES (
    'employee',
    p_target_employee_id,
    'clone',
    'Permisos clonados de empleado ' || p_source_employee_id::TEXT,
    COALESCE(p_performed_by, p_source_employee_id),
    jsonb_build_object('source_employee_id', p_source_employee_id, 'include_overrides', p_include_overrides)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- FUNCIÓN: Resetear permisos de empleado a su cargo
-- =====================================================
CREATE OR REPLACE FUNCTION reset_employee_permissions(
  p_employee_id UUID,
  p_performed_by UUID DEFAULT NULL
)
RETURNS VOID AS $$
DECLARE
  v_old_overrides JSONB;
BEGIN
  -- Verificar que el empleado existe
  IF NOT EXISTS (SELECT 1 FROM employees WHERE id = p_employee_id) THEN
    RAISE EXCEPTION 'Empleado no encontrado: %', p_employee_id;
  END IF;

  -- Guardar overrides actuales para auditoría
  SELECT jsonb_agg(row_to_json(epo))
  INTO v_old_overrides
  FROM employee_permission_overrides epo
  WHERE epo.employee_id = p_employee_id;

  -- Eliminar todos los overrides
  DELETE FROM employee_permission_overrides WHERE employee_id = p_employee_id;

  -- Registrar en auditoría
  INSERT INTO permission_audit_log (
    target_type, target_id, action, reason, performed_by, old_value
  ) VALUES (
    'employee',
    p_employee_id,
    'reset',
    'Permisos restaurados a los del cargo',
    COALESCE(p_performed_by, p_employee_id),
    v_old_overrides
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RLS: DESHABILITADO
-- El sistema usa Auth0, no Supabase Auth
-- La seguridad se maneja a nivel de API con service role key
-- =====================================================

-- NO habilitar RLS para evitar bloqueos con Auth0
-- ALTER TABLE position_module_permissions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_permission_overrides ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE permission_audit_log ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Ejecutar para confirmar que las tablas se crearon:
-- SELECT table_name FROM information_schema.tables WHERE table_name IN ('position_module_permissions', 'employee_permission_overrides', 'permission_audit_log');
