-- ============================================
-- Migración: Agregar campo frontend_permissions a positions
-- Fecha: 2025-02-06
-- Descripción: Agrega soporte para permisos de frontend por módulo/submódulo
-- ============================================

-- Agregar columna frontend_permissions (JSONB para PostgreSQL/Supabase)
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS frontend_permissions JSONB DEFAULT NULL;

-- Comentario de documentación
COMMENT ON COLUMN positions.frontend_permissions IS 'Permisos de frontend por módulo/submódulo en formato JSON. Estructura: { version: 1, modules: { moduleId: { enabled: true, subModules: { subId: true } } } }';

-- ============================================
-- Datos iniciales: Actualizar cargos existentes
-- ============================================

-- Función para generar permisos por defecto según el tipo de cargo
CREATE OR REPLACE FUNCTION generate_default_frontend_permissions(
  is_admin BOOLEAN,
  is_schedule_admin BOOLEAN,
  has_dashboard_access BOOLEAN
) RETURNS JSONB AS $$
DECLARE
  result JSONB;
  modules JSONB := '{}';
BEGIN
  -- Definir módulos del sistema
  -- admin, time_management, payroll, hr, performance, branch_manager, employee_portal, timeclock
  
  -- Administrador: acceso a casi todo excepto portal de empleado y reloj checador
  IF is_admin THEN
    modules := jsonb_build_object(
      'admin', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object(
        'employees', true, 'organigrama', true, 'companies', true, 'departments', true,
        'positions', true, 'branches', true, 'settings', true, 'user_management', true,
        'permissions', true, 'complaints', true, 'job_applications', true, 'audit_tasks', true
      )),
      'time_management', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object(
        'timelogs', true, 'timetables', true, 'schedules', true, 'vet_schedule', true,
        'salon_schedule', true, 'shifts', true
      )),
      'payroll', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object(
        'payrolls', true, 'creditors', true, 'banks', true
      )),
      'hr', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object(
        'hr_time_dashboard', true, 'hr_disabilities', true
      )),
      'performance', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object(
        'perf_dashboard', true, 'perf_templates', true, 'perf_cycles', true, 'perf_reports', true
      )),
      'branch_manager', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object(
        'bm_dashboard', true, 'bm_gestiones', true
      )),
      'employee_portal', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object('portal_access', false)),
      'timeclock', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object('timeclock_access', false))
    );
  
  -- Schedule admin: acceso a gestión de tiempo y admin básico
  ELSIF is_schedule_admin THEN
    modules := jsonb_build_object(
      'admin', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object(
        'employees', true, 'organigrama', true, 'companies', false, 'departments', false,
        'positions', false, 'branches', false, 'settings', false, 'user_management', false,
        'permissions', false, 'complaints', false, 'job_applications', false, 'audit_tasks', false
      )),
      'time_management', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object(
        'timelogs', true, 'timetables', true, 'schedules', true, 'vet_schedule', true,
        'salon_schedule', true, 'shifts', true
      )),
      'payroll', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'payrolls', false, 'creditors', false, 'banks', false
      )),
      'hr', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'hr_time_dashboard', false, 'hr_disabilities', false
      )),
      'performance', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'perf_dashboard', false, 'perf_templates', false, 'perf_cycles', false, 'perf_reports', false
      )),
      'branch_manager', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'bm_dashboard', false, 'bm_gestiones', false
      )),
      'employee_portal', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object('portal_access', true)),
      'timeclock', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object('timeclock_access', false))
    );
  
  -- Dashboard access básico: solo admin empleados y organigrama
  ELSIF has_dashboard_access THEN
    modules := jsonb_build_object(
      'admin', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object(
        'employees', true, 'organigrama', true, 'companies', false, 'departments', false,
        'positions', false, 'branches', false, 'settings', false, 'user_management', false,
        'permissions', false, 'complaints', false, 'job_applications', false, 'audit_tasks', false
      )),
      'time_management', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'timelogs', false, 'timetables', false, 'schedules', false, 'vet_schedule', false,
        'salon_schedule', false, 'shifts', false
      )),
      'payroll', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'payrolls', false, 'creditors', false, 'banks', false
      )),
      'hr', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'hr_time_dashboard', false, 'hr_disabilities', false
      )),
      'performance', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'perf_dashboard', false, 'perf_templates', false, 'perf_cycles', false, 'perf_reports', false
      )),
      'branch_manager', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'bm_dashboard', false, 'bm_gestiones', false
      )),
      'employee_portal', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object('portal_access', true)),
      'timeclock', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object('timeclock_access', false))
    );
  
  -- Empleado básico: solo portal
  ELSE
    modules := jsonb_build_object(
      'admin', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'employees', false, 'organigrama', false, 'companies', false, 'departments', false,
        'positions', false, 'branches', false, 'settings', false, 'user_management', false,
        'permissions', false, 'complaints', false, 'job_applications', false, 'audit_tasks', false
      )),
      'time_management', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'timelogs', false, 'timetables', false, 'schedules', false, 'vet_schedule', false,
        'salon_schedule', false, 'shifts', false
      )),
      'payroll', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'payrolls', false, 'creditors', false, 'banks', false
      )),
      'hr', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'hr_time_dashboard', false, 'hr_disabilities', false
      )),
      'performance', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'perf_dashboard', false, 'perf_templates', false, 'perf_cycles', false, 'perf_reports', false
      )),
      'branch_manager', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object(
        'bm_dashboard', false, 'bm_gestiones', false
      )),
      'employee_portal', jsonb_build_object('enabled', true, 'subModules', jsonb_build_object('portal_access', true)),
      'timeclock', jsonb_build_object('enabled', false, 'subModules', jsonb_build_object('timeclock_access', false))
    );
  END IF;

  result := jsonb_build_object(
    'version', 1,
    'modules', modules
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Actualizar cargos existentes con permisos por defecto
UPDATE positions 
SET frontend_permissions = generate_default_frontend_permissions(
  COALESCE(admin, false),
  COALESCE(schedule_admin, false),
  COALESCE(dashboard_access, false)
)
WHERE frontend_permissions IS NULL;

-- Limpiar función temporal
DROP FUNCTION IF EXISTS generate_default_frontend_permissions;

-- ============================================
-- Verificación
-- ============================================

-- Verificar que todos los cargos tienen permisos
SELECT 
  id,
  name,
  admin,
  schedule_admin,
  dashboard_access,
  CASE 
    WHEN frontend_permissions IS NOT NULL THEN 'OK'
    ELSE 'MISSING'
  END as status
FROM positions
ORDER BY name;
