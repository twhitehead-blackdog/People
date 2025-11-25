-- ============================================
-- Migración: Crear tabla job_applications
-- ============================================
-- Este script crea la tabla para almacenar las aplicaciones
-- de trabajo de la Feria de Empleo Virtual
-- ============================================

-- Crear tabla job_applications
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    position_id UUID REFERENCES positions(id),
    position_name VARCHAR(255), -- Guardar nombre de la posición por si se elimina
    resume_url TEXT, -- URL del archivo de hoja de vida en Supabase Storage
    resume_filename VARCHAR(255), -- Nombre original del archivo
    additional_info TEXT, -- Información adicional del aspirante
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, contacted, rejected, hired
    interview_date TIMESTAMP WITH TIME ZONE, -- Fecha de entrevista programada
    notes TEXT, -- Notas internas sobre la aplicación
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_job_applications_position_id ON job_applications(position_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);

-- Crear trigger para actualizar updated_at
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en la tabla y columnas
COMMENT ON TABLE job_applications IS 'Almacena las aplicaciones de trabajo de la Feria de Empleo Virtual';
COMMENT ON COLUMN job_applications.status IS 'Estado de la aplicación: pending, reviewed, contacted, rejected, hired';
COMMENT ON COLUMN job_applications.resume_url IS 'URL del archivo de hoja de vida almacenado en Supabase Storage';

