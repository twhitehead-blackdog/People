-- ============================================
-- TABLA DE CONFIGURACIONES
-- ============================================

-- Tabla: settings (Configuraciones del Sistema)
CREATE TABLE IF NOT EXISTS settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    key VARCHAR(255) UNIQUE NOT NULL,
    value TEXT,
    description TEXT,
    category VARCHAR(100) DEFAULT 'general',
    is_encrypted BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por key
CREATE INDEX IF NOT EXISTS idx_settings_key ON settings(key);
CREATE INDEX IF NOT EXISTS idx_settings_category ON settings(category);

-- Trigger para actualizar updated_at
CREATE TRIGGER update_settings_updated_at
    BEFORE UPDATE ON settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ROW LEVEL SECURITY
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Política: Solo admins pueden ver y modificar configuraciones
CREATE POLICY "Only admins can manage settings" ON settings
    FOR ALL USING (auth.role() = 'authenticated');

-- Insertar configuración inicial para Wassenger
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
    'wassenger_api_key',
    '',
    'API Key de Wassenger para envío de mensajes',
    'integrations',
    true
) ON CONFLICT (key) DO NOTHING;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
    'wassenger_enabled',
    'false',
    'Habilita o deshabilita la integración con Wassenger',
    'integrations',
    false
) ON CONFLICT (key) DO NOTHING;

-- Comentarios
COMMENT ON TABLE settings IS 'Configuraciones del sistema y integraciones';
COMMENT ON COLUMN settings.is_encrypted IS 'Indica si el valor debe ser encriptado (para API keys, passwords, etc.)';

