-- Migración: Crear tabla para gestionar estados personalizados de aplicaciones de trabajo
-- ============================================

-- 1. Crear tabla de estados personalizados
CREATE TABLE IF NOT EXISTS job_application_statuses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL, -- Código único del estado (ej: 'pending', 'reviewed')
    label VARCHAR(100) NOT NULL, -- Etiqueta para mostrar (ej: 'Pendiente', 'Revisada')
    severity VARCHAR(20) DEFAULT 'secondary', -- Color del tag: success, info, warn, danger, secondary, contrast
    display_order INTEGER DEFAULT 0, -- Orden de visualización
    is_default BOOLEAN DEFAULT false, -- Si es un estado por defecto (no se puede eliminar)
    is_active BOOLEAN DEFAULT true, -- Si está activo y se puede usar
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices
CREATE INDEX IF NOT EXISTS idx_job_application_statuses_code ON job_application_statuses(code);
CREATE INDEX IF NOT EXISTS idx_job_application_statuses_active ON job_application_statuses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_job_application_statuses_order ON job_application_statuses(display_order);

-- 3. Crear trigger para updated_at
DROP TRIGGER IF EXISTS update_job_application_statuses_updated_at ON job_application_statuses;
CREATE TRIGGER update_job_application_statuses_updated_at
    BEFORE UPDATE ON job_application_statuses
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 4. Insertar estados por defecto
INSERT INTO job_application_statuses (code, label, severity, display_order, is_default, is_active)
VALUES
    ('pending', 'Pendiente', 'warn', 1, true, true),
    ('reviewed', 'Revisada', 'info', 2, true, true),
    ('contacted', 'Contactada', 'info', 3, true, true),
    ('rejected', 'Rechazada', 'danger', 4, true, true),
    ('hired', 'Contratada', 'success', 5, true, true)
ON CONFLICT (code) DO NOTHING;

-- 5. Habilitar RLS
ALTER TABLE job_application_statuses ENABLE ROW LEVEL SECURITY;

-- 6. Políticas RLS (permitir todo a usuarios autenticados)
DROP POLICY IF EXISTS "Allow authenticated users to manage job_application_statuses" ON job_application_statuses;
CREATE POLICY "Allow authenticated users to manage job_application_statuses"
ON job_application_statuses
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 7. Comentarios
COMMENT ON TABLE job_application_statuses IS 'Estados personalizados para aplicaciones de trabajo';
COMMENT ON COLUMN job_application_statuses.code IS 'Código único del estado (usado en job_applications.status)';
COMMENT ON COLUMN job_application_statuses.label IS 'Etiqueta para mostrar en la interfaz';
COMMENT ON COLUMN job_application_statuses.severity IS 'Color del tag en PrimeNG: success, info, warn, danger, secondary, contrast';
COMMENT ON COLUMN job_application_statuses.is_default IS 'Si es true, es un estado por defecto y no se puede eliminar';

