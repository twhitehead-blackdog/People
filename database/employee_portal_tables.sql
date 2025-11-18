-- ============================================
-- TABLAS PARA EL PORTAL DE EMPLEADOS
-- ============================================

-- Asegurar que la función update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabla: employee_disabilities (Incapacidades)
CREATE TABLE IF NOT EXISTS employee_disabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    description TEXT,
    document_url TEXT, -- URL del documento subido
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by UUID, -- ID del usuario de RRHH que revisó
    reviewed_at TIMESTAMP WITH TIME ZONE,
    review_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CHECK (end_date >= start_date)
);

-- Tabla: document_requests (Solicitudes de Documentos)
CREATE TABLE IF NOT EXISTS document_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    document_type VARCHAR(100) NOT NULL, -- work_letter, salary_certificate, employment_certificate, other
    custom_document_type VARCHAR(255), -- Si document_type es 'other'
    reason TEXT,
    required_date DATE, -- Fecha en que el empleado necesita el documento
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
    document_url TEXT, -- URL del documento generado
    processed_by UUID, -- ID del usuario de RRHH que procesó
    processed_at TIMESTAMP WITH TIME ZONE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla: complaints (Buzón de Quejas)
CREATE TABLE IF NOT EXISTS complaints (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID, -- NULL para quejas completamente anónimas, UUID si el empleado permitió contacto
    category VARCHAR(50) NOT NULL CHECK (category IN ('work_environment', 'harassment', 'safety', 'management', 'benefits', 'other')),
    complaint TEXT NOT NULL,
    allow_contact BOOLEAN DEFAULT false,
    contact_method VARCHAR(20) CHECK (contact_method IN ('email', 'phone', 'meeting')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_review', 'resolved')),
    response TEXT, -- Respuesta de RRHH
    responded_by UUID, -- ID del usuario de RRHH que respondió
    response_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_employee_disabilities_employee_id ON employee_disabilities(employee_id);
CREATE INDEX IF NOT EXISTS idx_employee_disabilities_status ON employee_disabilities(status);
CREATE INDEX IF NOT EXISTS idx_employee_disabilities_dates ON employee_disabilities(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_document_requests_employee_id ON document_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_document_requests_status ON document_requests(status);
CREATE INDEX IF NOT EXISTS idx_document_requests_type ON document_requests(document_type);

CREATE INDEX IF NOT EXISTS idx_complaints_employee_id ON complaints(employee_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category ON complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at ON complaints(created_at);

-- ============================================
-- TRIGGERS PARA updated_at
-- ============================================

CREATE TRIGGER update_employee_disabilities_updated_at
    BEFORE UPDATE ON employee_disabilities
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_document_requests_updated_at
    BEFORE UPDATE ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_complaints_updated_at
    BEFORE UPDATE ON complaints
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE employee_disabilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Políticas básicas (ajustar según necesidades)
CREATE POLICY "Enable all access for authenticated users" ON employee_disabilities
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON document_requests
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Enable all access for authenticated users" ON complaints
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE employee_disabilities IS 'Incapacidades médicas de los empleados';
COMMENT ON TABLE document_requests IS 'Solicitudes de documentos por parte de empleados';
COMMENT ON TABLE complaints IS 'Buzón de quejas anónimas y sugerencias de empleados';

