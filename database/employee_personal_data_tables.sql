-- ============================================
-- TABLAS ADICIONALES PARA DATOS PERSONALES
-- ============================================

-- Asegurar que la función update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabla: emergency_contacts (Contactos de Emergencia)
CREATE TABLE IF NOT EXISTS emergency_contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    relationship VARCHAR(100) NOT NULL, -- Padre, Madre, Cónyuge, Hijo/a, Otro
    phone_number VARCHAR(50) NOT NULL,
    alternate_phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: employee_documents (Documentos del Empleado)
CREATE TABLE IF NOT EXISTS employee_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- Cédula, Pasaporte, Licencia, Contrato, Otro
    document_number VARCHAR(255),
    issue_date DATE,
    expiry_date DATE,
    issuing_authority VARCHAR(255), -- Autoridad que emitió el documento
    file_url TEXT, -- URL del archivo almacenado
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: employee_notes (Notas sobre el Empleado)
CREATE TABLE IF NOT EXISTS employee_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    note_type VARCHAR(50) NOT NULL DEFAULT 'GENERAL', -- GENERAL, MEDICAL, DISCIPLINARY, PERFORMANCE, OTHER
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_by UUID, -- ID del usuario que creó la nota
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: employee_skills (Habilidades del Empleado)
CREATE TABLE IF NOT EXISTS employee_skills (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    skill_name VARCHAR(255) NOT NULL,
    skill_level VARCHAR(50) CHECK (skill_level IN ('BASICO', 'INTERMEDIO', 'AVANZADO', 'EXPERTO')),
    certification_date DATE,
    certification_authority VARCHAR(255),
    expiry_date DATE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: employee_languages (Idiomas del Empleado)
CREATE TABLE IF NOT EXISTS employee_languages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    language VARCHAR(100) NOT NULL,
    proficiency_level VARCHAR(50) CHECK (proficiency_level IN ('BASICO', 'INTERMEDIO', 'AVANZADO', 'NATIVO')),
    is_native BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_employee_id ON emergency_contacts(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_documents_employee_id ON employee_documents(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_notes_employee_id ON employee_notes(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_skills_employee_id ON employee_skills(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_languages_employee_id ON employee_languages(employee_id);

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================

CREATE TRIGGER update_emergency_contacts_updated_at
    BEFORE UPDATE ON emergency_contacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_documents_updated_at
    BEFORE UPDATE ON employee_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_notes_updated_at
    BEFORE UPDATE ON employee_notes
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_employee_skills_updated_at
    BEFORE UPDATE ON employee_skills
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_languages ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
CREATE POLICY "Enable all access for authenticated users" ON emergency_contacts
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON employee_documents
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON employee_notes
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON employee_skills
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON employee_languages
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE emergency_contacts IS 'Contactos de emergencia de los empleados';
COMMENT ON TABLE employee_documents IS 'Documentos personales y legales de los empleados';
COMMENT ON TABLE employee_notes IS 'Notas y observaciones sobre empleados';
COMMENT ON TABLE employee_skills IS 'Habilidades y competencias de los empleados';
COMMENT ON TABLE employee_languages IS 'Idiomas que hablan los empleados';


