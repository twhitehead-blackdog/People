-- =====================================================
-- SISTEMA DE PERMISOS GRANULAR POR MÓDULO
-- Migración 1: Tablas base de módulos del sistema
--
-- SEGURIDAD: Esta migración es SEGURA para producción
-- - Solo crea tablas NUEVAS
-- - No modifica datos existentes
-- - Usa IF NOT EXISTS para evitar errores
-- =====================================================

-- Tabla de módulos y submódulos del sistema
CREATE TABLE IF NOT EXISTS system_modules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT,
  route TEXT NOT NULL,
  parent_id UUID REFERENCES system_modules(id) ON DELETE CASCADE,
  order_index INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  company_id UUID,  -- Sin FK para evitar dependencias
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_system_modules_parent ON system_modules(parent_id);
CREATE INDEX IF NOT EXISTS idx_system_modules_code ON system_modules(code);
CREATE INDEX IF NOT EXISTS idx_system_modules_company ON system_modules(company_id);

-- Trigger para updated_at (con DROP IF EXISTS para idempotencia)
CREATE OR REPLACE FUNCTION update_system_modules_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_system_modules_updated ON system_modules;
CREATE TRIGGER trigger_system_modules_updated
  BEFORE UPDATE ON system_modules
  FOR EACH ROW
  EXECUTE FUNCTION update_system_modules_timestamp();

-- =====================================================
-- SEED: Módulos principales del sistema
-- Usa ON CONFLICT para ser idempotente (ejecutar múltiples veces sin error)
-- =====================================================

-- Módulos raíz (nivel 1)
INSERT INTO system_modules (code, name, description, icon, route, order_index) VALUES
  ('home', 'Inicio', 'Panel principal con métricas y resumen', 'pi pi-home', '/home', 0),
  ('admin', 'Administración', 'Gestión de empleados, cargos y configuración', 'pi pi-building', '/admin', 1),
  ('payroll', 'Nómina', 'Planillas, pagos y deducciones', 'pi pi-money-bill', '/payroll', 2),
  ('time_management', 'Gestión de Tiempo', 'Horarios, turnos y marcaciones', 'pi pi-calendar', '/time-management', 3),
  ('timeclock', 'Reloj de Marcación', 'Registro de entrada y salida', 'pi pi-clock', '/timeclock', 4),
  ('branch_manager', 'Gestión de Tienda', 'Panel de gerente de sucursal', 'pi pi-shop', '/branch-manager', 5)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  route = EXCLUDED.route,
  order_index = EXCLUDED.order_index;

-- Submódulos de Administración
INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.employees', 'Empleados', 'Lista y gestión de empleados', 'pi pi-users', '/admin/employees', id, 0
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.organigrama', 'Organigrama', 'Estructura organizacional', 'pi pi-sitemap', '/admin/organigrama', id, 1
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.companies', 'Empresas', 'Gestión de empresas', 'pi pi-building', '/admin/companies', id, 2
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.departments', 'Departamentos', 'Gestión de departamentos', 'pi pi-th-large', '/admin/departments', id, 3
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.positions', 'Cargos', 'Gestión de cargos y posiciones', 'pi pi-id-card', '/admin/positions', id, 4
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.branches', 'Sucursales', 'Gestión de sucursales', 'pi pi-map-marker', '/admin/branches', id, 5
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.settings', 'Configuración', 'Ajustes del sistema', 'pi pi-cog', '/admin/settings', id, 6
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.user_management', 'Gestión de Usuarios', 'Acceso al portal de empleados', 'pi pi-user-edit', '/admin/user-management', id, 7
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.permissions', 'Permisos', 'Gestión de permisos del sistema', 'pi pi-lock', '/admin/permissions', id, 8
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.complaints', 'Buzón de Quejas', 'Quejas y sugerencias anónimas', 'pi pi-inbox', '/admin/complaints-inbox', id, 9
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.job_applications', 'Solicitudes de Empleo', 'Reclutamiento y candidatos', 'pi pi-file', '/admin/job-applications', id, 10
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.hr', 'Recursos Humanos', 'Dashboard y gestión de RRHH', 'pi pi-users', '/admin/hr', id, 11
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.audit_tasks', 'Tareas de Auditoría', 'Tareas y verificaciones', 'pi pi-check-square', '/admin/audit-tasks', id, 12
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'admin.performance', 'Performance 360', 'Evaluaciones de desempeño', 'pi pi-chart-line', '/admin/performance', id, 13
FROM system_modules WHERE code = 'admin'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Submódulos de Nómina
INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'payroll.payrolls', 'Planillas', 'Gestión de planillas de pago', 'pi pi-file-edit', '/payroll/payrolls', id, 0
FROM system_modules WHERE code = 'payroll'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'payroll.creditors', 'Acreedores', 'Gestión de acreedores y deudas', 'pi pi-wallet', '/payroll/creditors', id, 1
FROM system_modules WHERE code = 'payroll'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'payroll.banks', 'Bancos', 'Gestión de bancos', 'pi pi-credit-card', '/payroll/banks', id, 2
FROM system_modules WHERE code = 'payroll'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- Submódulos de Gestión de Tiempo
INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'time_management.timelogs', 'Marcaciones', 'Registro de marcaciones', 'pi pi-clock', '/time-management/timelogs', id, 0
FROM system_modules WHERE code = 'time_management'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'time_management.timetables', 'Cuadro de Horarios', 'Vista de horarios por empleado', 'pi pi-table', '/time-management/timetables', id, 1
FROM system_modules WHERE code = 'time_management'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'time_management.schedules', 'Horarios', 'Definición de horarios', 'pi pi-calendar', '/time-management/schedules', id, 2
FROM system_modules WHERE code = 'time_management'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'time_management.vet_schedule', 'Horario Veterinarios', 'Asignación de veterinarios', 'pi pi-heart', '/time-management/vet-schedule', id, 3
FROM system_modules WHERE code = 'time_management'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'time_management.salon_schedule', 'Horario Peluquería', 'Asignación de peluqueros', 'pi pi-sparkles', '/time-management/salon-schedule', id, 4
FROM system_modules WHERE code = 'time_management'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

INSERT INTO system_modules (code, name, description, icon, route, parent_id, order_index)
SELECT 'time_management.shifts', 'Turnos', 'Gestión de turnos', 'pi pi-sync', '/time-management/shifts', id, 5
FROM system_modules WHERE code = 'time_management'
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description;

-- =====================================================
-- RLS: DESHABILITADO POR DEFECTO
-- El sistema usa Auth0, no Supabase Auth, por lo que auth.uid() no funciona
-- La seguridad se maneja a nivel de API con el service role key
-- =====================================================

-- NO habilitar RLS para evitar bloqueos
-- ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;

-- Si necesitas RLS en el futuro, descomenta esto:
/*
ALTER TABLE system_modules ENABLE ROW LEVEL SECURITY;

-- Política permisiva: todos pueden leer
CREATE POLICY "allow_read_modules" ON system_modules
  FOR SELECT USING (true);

-- Política: solo service role puede modificar (manejado por API)
CREATE POLICY "service_role_manage_modules" ON system_modules
  FOR ALL USING (true);
*/

-- =====================================================
-- VERIFICACIÓN (ejecutar manualmente para confirmar)
-- =====================================================
-- SELECT code, name, parent_id IS NULL as is_root FROM system_modules ORDER BY order_index;
