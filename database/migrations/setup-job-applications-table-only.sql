-- ============================================
-- Setup: Solo Tabla job_applications
-- ============================================
-- Este script crea SOLO la tabla job_applications y sus políticas RLS.
-- NO incluye la creación del bucket de Storage (hazlo manualmente).
-- ============================================
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu proyecto de Supabase
-- 2. Copia y pega todo este script
-- 3. Ejecuta el script
-- 4. Luego configura Storage manualmente (ver instrucciones abajo)
-- ============================================

-- ============================================
-- 1. CREAR FUNCIÓN update_updated_at_column (si no existe)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 2. CREAR TABLA job_applications
-- ============================================
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
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en la tabla y columnas
COMMENT ON TABLE job_applications IS 'Almacena las aplicaciones de trabajo de la Feria de Empleo Virtual';
COMMENT ON COLUMN job_applications.status IS 'Estado de la aplicación: pending, reviewed, contacted, rejected, hired';
COMMENT ON COLUMN job_applications.resume_url IS 'URL del archivo de hoja de vida almacenado en Supabase Storage';

-- ============================================
-- 3. CONFIGURAR POLÍTICAS RLS PARA LA TABLA
-- ============================================

-- Habilitar RLS en la tabla
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow public insert to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated select from job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated update to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated delete from job_applications" ON job_applications;

-- Política para permitir que cualquiera pueda insertar aplicaciones (público)
CREATE POLICY "Allow public insert to job_applications"
ON job_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Política para permitir que usuarios autenticados puedan leer todas las aplicaciones
CREATE POLICY "Allow authenticated select from job_applications"
ON job_applications
FOR SELECT
TO authenticated
USING (true);

-- Política para permitir que usuarios autenticados puedan actualizar aplicaciones
CREATE POLICY "Allow authenticated update to job_applications"
ON job_applications
FOR UPDATE
TO authenticated
USING (true);

-- Política para permitir que usuarios autenticados puedan eliminar aplicaciones
CREATE POLICY "Allow authenticated delete from job_applications"
ON job_applications
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- ¡LISTO! La tabla está creada
-- ============================================
-- Ahora configura Storage manualmente desde el Dashboard:
-- 1. Ve a Storage > Create bucket
-- 2. Nombre: "job-applications"
-- 3. Public: false
-- 4. File size limit: 5MB
-- 5. Allowed MIME types: application/pdf, application/msword, 
--    application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- 6. Crea las políticas desde Storage > Policies (ver instrucciones completas)
-- ============================================


