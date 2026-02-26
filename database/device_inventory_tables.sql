-- ============================================
-- IT DEVICE INVENTORY SYSTEM - Tablas para Supabase
-- ============================================

-- Tabla de Dispositivos
CREATE TABLE IF NOT EXISTS devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    model VARCHAR(100),
    serial_number VARCHAR(100),
    device_type VARCHAR(50) NOT NULL CHECK (device_type IN ('laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'printer', 'scanner', 'phone', 'tablet', 'headset', 'webcam', 'other')),
    status VARCHAR(50) NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'assigned', 'maintenance', 'retired')),
    purchase_date DATE,
    warranty_expiry DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de Asignaciones de Dispositivos
CREATE TABLE IF NOT EXISTS device_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_by UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
    return_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'returned', 'lost', 'damaged')),
    
    -- Confirmación por el empleado
    employee_confirmed BOOLEAN NOT NULL DEFAULT FALSE,
    employee_confirmed_at TIMESTAMP WITH TIME ZONE,
    employee_signature_url TEXT,
    employee_notes TEXT,
    
    -- Información de la entrega
    condition_notes TEXT,
    accessories_included TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_devices_company_id ON devices(company_id);
CREATE INDEX IF NOT EXISTS idx_devices_status ON devices(status);
CREATE INDEX IF NOT EXISTS idx_devices_device_type ON devices(device_type);
CREATE INDEX IF NOT EXISTS idx_devices_serial_number ON devices(serial_number);

CREATE INDEX IF NOT EXISTS idx_device_assignments_company_id ON device_assignments(company_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_device_id ON device_assignments(device_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_employee_id ON device_assignments(employee_id);
CREATE INDEX IF NOT EXISTS idx_device_assignments_status ON device_assignments(status);
CREATE INDEX IF NOT EXISTS idx_device_assignments_assigned_date ON device_assignments(assigned_date);

-- Trigger para actualizar el timestamp de updated_at en devices
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_devices_updated_at ON devices;
CREATE TRIGGER update_devices_updated_at
    BEFORE UPDATE ON devices
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_device_assignments_updated_at ON device_assignments;
CREATE TRIGGER update_device_assignments_updated_at
    BEFORE UPDATE ON device_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Políticas de Row Level Security (RLS) para Supabase

-- Habilitar RLS en las tablas
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_assignments ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios solo pueden ver dispositivos de su empresa
DROP POLICY IF EXISTS devices_select_company ON devices;
CREATE POLICY devices_select_company ON devices
    FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM employees WHERE id = auth.uid()
    ));

-- Política: Los usuarios solo pueden insertar dispositivos en su empresa
DROP POLICY IF EXISTS devices_insert_company ON devices;
CREATE POLICY devices_insert_company ON devices
    FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM employees WHERE id = auth.uid()
    ));

-- Política: Los usuarios solo pueden actualizar dispositivos de su empresa
DROP POLICY IF EXISTS devices_update_company ON devices;
CREATE POLICY devices_update_company ON devices
    FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM employees WHERE id = auth.uid()
    ));

-- Política: Los usuarios solo pueden eliminar dispositivos de su empresa
DROP POLICY IF EXISTS devices_delete_company ON devices;
CREATE POLICY devices_delete_company ON devices
    FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM employees WHERE id = auth.uid()
    ));

-- Políticas para device_assignments
DROP POLICY IF EXISTS device_assignments_select_company ON device_assignments;
CREATE POLICY device_assignments_select_company ON device_assignments
    FOR SELECT
    USING (company_id IN (
        SELECT company_id FROM employees WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS device_assignments_insert_company ON device_assignments;
CREATE POLICY device_assignments_insert_company ON device_assignments
    FOR INSERT
    WITH CHECK (company_id IN (
        SELECT company_id FROM employees WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS device_assignments_update_company ON device_assignments;
CREATE POLICY device_assignments_update_company ON device_assignments
    FOR UPDATE
    USING (company_id IN (
        SELECT company_id FROM employees WHERE id = auth.uid()
    ));

DROP POLICY IF EXISTS device_assignments_delete_company ON device_assignments;
CREATE POLICY device_assignments_delete_company ON device_assignments
    FOR DELETE
    USING (company_id IN (
        SELECT company_id FROM employees WHERE id = auth.uid()
    ));

-- Comentarios para documentación
COMMENT ON TABLE devices IS 'Inventario de dispositivos IT (laptops, celulares, etc.)';
COMMENT ON TABLE device_assignments IS 'Registro de asignaciones de dispositivos a empleados';

COMMENT ON COLUMN devices.device_type IS 'Tipo de dispositivo: laptop, desktop, monitor, keyboard, mouse, printer, scanner, phone, tablet, headset, webcam, other';
COMMENT ON COLUMN devices.status IS 'Estado del dispositivo: available (disponible), assigned (asignado), maintenance (en mantenimiento), retired (retirado)';

COMMENT ON COLUMN device_assignments.status IS 'Estado de la asignación: active (activa), returned (devuelta), lost (perdida), damaged (dañada)';
COMMENT ON COLUMN device_assignments.employee_confirmed IS 'Indica si el empleado confirmó la recepción del dispositivo';
COMMENT ON COLUMN device_assignments.employee_confirmed_at IS 'Fecha y hora en que el empleado confirmó la recepción';
