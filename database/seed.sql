-- ============================================
-- Peopletrak Seed Data
-- ============================================
-- Datos iniciales para desarrollo/testing
-- Ejecutar DESPUÉS de schema.sql

-- Insertar datos de ejemplo para desarrollo

-- Compañías
INSERT INTO companies (id, name, address, phone_number, is_active) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Empresa Demo', 'Calle Principal 123', '555-0001', true)
ON CONFLICT (id) DO NOTHING;

-- Departamentos
INSERT INTO departments (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Recursos Humanos'),
    ('00000000-0000-0000-0000-000000000002', 'Ventas'),
    ('00000000-0000-0000-0000-000000000003', 'Operaciones'),
    ('00000000-0000-0000-0000-000000000004', 'Administración')
ON CONFLICT (id) DO NOTHING;

-- Posiciones
INSERT INTO positions (id, name, department_id, schedule_admin, admin, schedule_approver) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Gerente de RH', '00000000-0000-0000-0000-000000000001', true, true, true),
    ('00000000-0000-0000-0000-000000000002', 'Asistente de RH', '00000000-0000-0000-0000-000000000001', false, false, false),
    ('00000000-0000-0000-0000-000000000003', 'Vendedor', '00000000-0000-0000-0000-000000000002', false, false, false),
    ('00000000-0000-0000-0000-000000000004', 'Operador', '00000000-0000-0000-0000-000000000003', false, false, false)
ON CONFLICT (id) DO NOTHING;

-- Sucursales
INSERT INTO branches (id, name, short_name, address, is_active, ip) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Sucursal Central', 'CENTRAL', 'Calle Principal 123', true, '192.168.1.100'),
    ('00000000-0000-0000-0000-000000000002', 'Sucursal Norte', 'NORTE', 'Av. Norte 456', true, '192.168.1.101')
ON CONFLICT (id) DO NOTHING;

-- Bancos
INSERT INTO banks (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Banco Nacional'),
    ('00000000-0000-0000-0000-000000000002', 'Banco Popular'),
    ('00000000-0000-0000-0000-000000000003', 'Banco Comercial')
ON CONFLICT (id) DO NOTHING;

-- Acreedores
INSERT INTO creditors (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Préstamo Personal'),
    ('00000000-0000-0000-0000-000000000002', 'Préstamo Vehicular'),
    ('00000000-0000-0000-0000-000000000003', 'Otros')
ON CONFLICT (id) DO NOTHING;

-- Tipos de Permisos
INSERT INTO timeoff_types (id, name) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Vacaciones'),
    ('00000000-0000-0000-0000-000000000002', 'Enfermedad'),
    ('00000000-0000-0000-0000-000000000003', 'Personal'),
    ('00000000-0000-0000-0000-000000000004', 'Maternidad/Paternidad'),
    ('00000000-0000-0000-0000-000000000005', 'Duelo')
ON CONFLICT (id) DO NOTHING;

-- Horarios
INSERT INTO schedules (id, name, entry_time, lunch_start_time, lunch_end_time, exit_time, day_off, minutes_tolerance, min_lunch_minutes, max_lunch_minutes, color) VALUES
    ('00000000-0000-0000-0000-000000000001', 'Horario Normal', '08:00:00', '12:00:00', '13:00:00', '17:00:00', false, 15, 30, 90, '#3b82f6'),
    ('00000000-0000-0000-0000-000000000002', 'Medio Tiempo', '09:00:00', NULL, NULL, '13:00:00', false, 10, NULL, NULL, '#10b981'),
    ('00000000-0000-0000-0000-000000000003', 'Día Libre', NULL, NULL, NULL, NULL, true, 0, NULL, NULL, '#ef4444')
ON CONFLICT (id) DO NOTHING;

-- Nota: Los empleados deben crearse manualmente o a través de la aplicación
-- ya que requieren información específica como document_id, emails, etc.

