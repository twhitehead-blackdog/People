-- ============================================
-- Script: Recrear tabla job_applications desde cero
-- ============================================
-- Este script elimina y recrea la tabla job_applications
-- con todas sus políticas RLS correctamente configuradas
-- ============================================

-- 1. Eliminar políticas RLS existentes (si existen)
DROP POLICY IF EXISTS "Allow anon insert to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow public insert to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated select from job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated update to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated delete from job_applications" ON job_applications;

-- 2. Eliminar trigger si existe
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;

-- 3. Eliminar índices si existen
DROP INDEX IF EXISTS idx_job_applications_position_id;
DROP INDEX IF EXISTS idx_job_applications_status;
DROP INDEX IF EXISTS idx_job_applications_created_at;
DROP INDEX IF EXISTS idx_job_applications_email;

-- 4. Eliminar tabla si existe (CASCADE para eliminar dependencias)
DROP TABLE IF EXISTS job_applications CASCADE;

-- 5. Crear tabla job_applications
CREATE TABLE job_applications (
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

-- 6. Crear índices para búsquedas rápidas
CREATE INDEX idx_job_applications_position_id ON job_applications(position_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_job_applications_created_at ON job_applications(created_at DESC);
CREATE INDEX idx_job_applications_email ON job_applications(email);

-- 7. Crear trigger para actualizar updated_at
-- Asegurar que la función update_updated_at_column existe
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 8. Comentarios en la tabla y columnas
COMMENT ON TABLE job_applications IS 'Almacena las aplicaciones de trabajo de la Feria de Empleo Virtual';
COMMENT ON COLUMN job_applications.status IS 'Estado de la aplicación: pending, reviewed, contacted, rejected, hired';
COMMENT ON COLUMN job_applications.resume_url IS 'URL del archivo de hoja de vida almacenado en Supabase Storage';

-- 9. Habilitar Row Level Security
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- 10. Crear políticas RLS
-- Política para permitir que usuarios anónimos puedan insertar aplicaciones
CREATE POLICY "Allow anon insert to job_applications"
ON job_applications
FOR INSERT
TO anon
WITH CHECK (true);

-- Política alternativa para public (por si anon no funciona)
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
USING (true)
WITH CHECK (true);

-- Política para permitir que usuarios autenticados puedan eliminar aplicaciones
CREATE POLICY "Allow authenticated delete from job_applications"
ON job_applications
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- Verificación
-- ============================================
-- Ejecutar estas consultas para verificar que todo está correcto:

-- Verificar que la tabla existe
-- SELECT * FROM information_schema.tables WHERE table_name = 'job_applications';

-- Verificar que RLS está habilitado
-- SELECT tablename, rowsecurity FROM pg_tables WHERE tablename = 'job_applications';

-- Verificar políticas RLS
-- SELECT policyname, roles, cmd, qual, with_check 
-- FROM pg_policies 
-- WHERE tablename = 'job_applications'
-- ORDER BY cmd, policyname;

