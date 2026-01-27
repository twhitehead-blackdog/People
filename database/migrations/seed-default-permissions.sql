-- =====================================================
-- SEED: Permisos por defecto para cargos
-- Ejecutar DESPUÉS de add-system-modules.sql y add-module-permissions.sql
-- =====================================================

-- =====================================================
-- FUNCIÓN AUXILIAR: Asignar todos los permisos a un cargo
-- =====================================================
CREATE OR REPLACE FUNCTION assign_full_access_to_position(p_position_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO position_module_permissions (position_id, module_id, can_view, can_create, can_edit, can_delete)
  SELECT
    p_position_id,
    id,
    TRUE,
    TRUE,
    TRUE,
    TRUE
  FROM system_modules
  WHERE is_active = TRUE
  ON CONFLICT (position_id, module_id) DO UPDATE SET
    can_view = TRUE,
    can_create = TRUE,
    can_edit = TRUE,
    can_delete = TRUE,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- FUNCIÓN AUXILIAR: Asignar permisos de solo lectura
-- =====================================================
CREATE OR REPLACE FUNCTION assign_view_access_to_position(p_position_id UUID, p_module_codes TEXT[])
RETURNS VOID AS $$
BEGIN
  INSERT INTO position_module_permissions (position_id, module_id, can_view, can_create, can_edit, can_delete)
  SELECT
    p_position_id,
    sm.id,
    TRUE,
    FALSE,
    FALSE,
    FALSE
  FROM system_modules sm
  WHERE sm.code = ANY(p_module_codes) AND sm.is_active = TRUE
  ON CONFLICT (position_id, module_id) DO UPDATE SET
    can_view = TRUE,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- ASIGNAR PERMISOS A CARGOS EXISTENTES
-- =====================================================

-- 1. Administradores: Acceso total a todo
DO $$
DECLARE
  v_position_id UUID;
BEGIN
  FOR v_position_id IN
    SELECT id FROM positions WHERE admin = TRUE
  LOOP
    PERFORM assign_full_access_to_position(v_position_id);
  END LOOP;
END $$;

-- 2. Schedule Admins: Acceso total a gestión de tiempo
DO $$
DECLARE
  v_position_id UUID;
  v_time_modules TEXT[] := ARRAY[
    'time_management',
    'time_management.timelogs',
    'time_management.timetables',
    'time_management.schedules',
    'time_management.vet_schedule',
    'time_management.salon_schedule',
    'time_management.shifts',
    'timeclock'
  ];
BEGIN
  FOR v_position_id IN
    SELECT id FROM positions WHERE schedule_admin = TRUE AND admin = FALSE
  LOOP
    -- Acceso total a módulos de tiempo
    INSERT INTO position_module_permissions (position_id, module_id, can_view, can_create, can_edit, can_delete)
    SELECT
      v_position_id,
      sm.id,
      TRUE,
      TRUE,
      TRUE,
      FALSE
    FROM system_modules sm
    WHERE sm.code = ANY(v_time_modules) AND sm.is_active = TRUE
    ON CONFLICT (position_id, module_id) DO UPDATE SET
      can_view = TRUE,
      can_create = TRUE,
      can_edit = TRUE,
      updated_at = NOW();

    -- Acceso de lectura al home
    PERFORM assign_view_access_to_position(v_position_id, ARRAY['home']);
  END LOOP;
END $$;

-- 3. Schedule Approvers: Acceso de lectura y aprobación
DO $$
DECLARE
  v_position_id UUID;
  v_time_modules TEXT[] := ARRAY[
    'time_management',
    'time_management.timelogs',
    'time_management.timetables',
    'timeclock'
  ];
BEGIN
  FOR v_position_id IN
    SELECT id FROM positions WHERE schedule_approver = TRUE AND admin = FALSE AND schedule_admin = FALSE
  LOOP
    -- Acceso de lectura y edición limitada
    INSERT INTO position_module_permissions (position_id, module_id, can_view, can_create, can_edit, can_delete)
    SELECT
      v_position_id,
      sm.id,
      TRUE,
      FALSE,
      TRUE,
      FALSE
    FROM system_modules sm
    WHERE sm.code = ANY(v_time_modules) AND sm.is_active = TRUE
    ON CONFLICT (position_id, module_id) DO UPDATE SET
      can_view = TRUE,
      can_edit = TRUE,
      updated_at = NOW();

    -- Acceso de lectura al home
    PERFORM assign_view_access_to_position(v_position_id, ARRAY['home']);
  END LOOP;
END $$;

-- 4. Gerentes de Tienda: Acceso a gestión de tienda y marcaciones
DO $$
DECLARE
  v_position_id UUID;
  v_modules TEXT[] := ARRAY[
    'home',
    'time_management',
    'time_management.timelogs',
    'time_management.timetables',
    'timeclock',
    'branch_manager'
  ];
BEGIN
  FOR v_position_id IN
    SELECT id FROM positions WHERE LOWER(name) LIKE '%gerente de tienda%'
  LOOP
    INSERT INTO position_module_permissions (position_id, module_id, can_view, can_create, can_edit, can_delete)
    SELECT
      v_position_id,
      sm.id,
      TRUE,
      TRUE,
      TRUE,
      FALSE
    FROM system_modules sm
    WHERE sm.code = ANY(v_modules) AND sm.is_active = TRUE
    ON CONFLICT (position_id, module_id) DO UPDATE SET
      can_view = TRUE,
      can_create = TRUE,
      can_edit = TRUE,
      updated_at = NOW();
  END LOOP;
END $$;

-- 5. Cargos con dashboard_access pero sin permisos especiales: Solo home y reloj
DO $$
DECLARE
  v_position_id UUID;
  v_basic_modules TEXT[] := ARRAY['home', 'timeclock'];
BEGIN
  FOR v_position_id IN
    SELECT id FROM positions
    WHERE dashboard_access = TRUE
    AND admin = FALSE
    AND schedule_admin = FALSE
    AND schedule_approver = FALSE
  LOOP
    PERFORM assign_view_access_to_position(v_position_id, v_basic_modules);
  END LOOP;
END $$;

-- =====================================================
-- LIMPIEZA: Eliminar funciones auxiliares temporales
-- =====================================================
-- Comentar si deseas mantener las funciones para uso futuro
-- DROP FUNCTION IF EXISTS assign_full_access_to_position(UUID);
-- DROP FUNCTION IF EXISTS assign_view_access_to_position(UUID, TEXT[]);

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
-- Descomentar para verificar los permisos asignados:
/*
SELECT
  p.name as cargo,
  sm.code as modulo,
  pmp.can_view,
  pmp.can_create,
  pmp.can_edit,
  pmp.can_delete
FROM position_module_permissions pmp
JOIN positions p ON pmp.position_id = p.id
JOIN system_modules sm ON pmp.module_id = sm.id
ORDER BY p.name, sm.order_index;
*/
