-- ============================================
-- Setup Completo: Formulario de Aplicaciones de Trabajo
-- ============================================
-- Este script crea TODO lo necesario para que el formulario
-- de aplicaciones de trabajo funcione correctamente
-- ============================================
-- INSTRUCCIONES:
-- 1. Abre el SQL Editor en tu proyecto de Supabase
-- 2. Copia y pega todo este script
-- 3. Ejecuta el script
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
-- 3. CREAR BUCKET DE STORAGE (OPCIONAL - Ver instrucciones abajo)
-- ============================================
-- NOTA: La creación del bucket desde SQL puede requerir permisos especiales.
-- Si obtienes un error, crea el bucket manualmente desde el Dashboard de Supabase.
-- 
-- Intenta crear el bucket (puede fallar si no tienes permisos)
DO $$
BEGIN
  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'job-applications',
    'job-applications',
    false, -- Privado por defecto
    5242880, -- 5MB en bytes
    ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  )
  ON CONFLICT (id) DO UPDATE
  SET 
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'No se pudo crear el bucket automáticamente. Créalo manualmente desde el Dashboard de Supabase.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al crear bucket: %. Créalo manualmente desde el Dashboard.', SQLERRM;
END $$;

-- ============================================
-- 4. CONFIGURAR POLÍTICAS RLS PARA STORAGE
-- ============================================
-- NOTA: Las políticas de Storage requieren permisos de owner.
-- Si obtienes un error, configura las políticas manualmente desde el Dashboard.
-- 
-- Intenta crear las políticas (puede fallar si no tienes permisos)
DO $$
BEGIN
  -- Eliminar políticas existentes si existen
  DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;

  -- Política para permitir que cualquiera pueda subir archivos (público para aplicaciones)
  CREATE POLICY "Allow public uploads to job-applications"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'job-applications');

  -- Política para permitir lectura de archivos (solo para usuarios autenticados)
  CREATE POLICY "Allow authenticated read from job-applications"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'job-applications');

  -- Política para permitir que usuarios autenticados puedan actualizar archivos
  CREATE POLICY "Allow authenticated update from job-applications"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'job-applications');

  -- Política para permitir que usuarios autenticados puedan eliminar archivos
  CREATE POLICY "Allow authenticated delete from job-applications"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-applications');

  RAISE NOTICE 'Políticas de Storage creadas correctamente.';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'No se pudieron crear las políticas de Storage automáticamente. Configúralas manualmente desde el Dashboard.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al crear políticas de Storage: %. Configúralas manualmente desde el Dashboard.', SQLERRM;
END $$;

-- ============================================
-- 5. CONFIGURAR POLÍTICAS RLS PARA LA TABLA
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
-- ¡LISTO! La tabla job_applications está creada
-- ============================================
-- IMPORTANTE: Si las políticas de Storage no se crearon automáticamente,
-- debes configurarlas manualmente desde el Dashboard de Supabase:
--
-- PASOS MANUALES PARA STORAGE:
-- 1. Ve a Storage en el Dashboard de Supabase
-- 2. Crea un nuevo bucket llamado "job-applications" (si no existe)
--    - Public: false (privado)
--    - File size limit: 5MB
--    - Allowed MIME types: application/pdf, application/msword, 
--      application/vnd.openxmlformats-officedocument.wordprocessingml.document
--
-- 3. Ve a Policies en el bucket "job-applications"
-- 4. Crea las siguientes políticas:
--
--    a) INSERT (Público):
--       - Name: "Allow public uploads to job-applications"
--       - Allowed operation: INSERT
--       - Target roles: public
--       - USING expression: (vacío)
--       - WITH CHECK expression: bucket_id = 'job-applications'
--
--    b) SELECT (Autenticado):
--       - Name: "Allow authenticated read from job-applications"
--       - Allowed operation: SELECT
--       - Target roles: authenticated
--       - USING expression: bucket_id = 'job-applications'
--       - WITH CHECK expression: (vacío)
--
--    c) UPDATE (Autenticado):
--       - Name: "Allow authenticated update from job-applications"
--       - Allowed operation: UPDATE
--       - Target roles: authenticated
--       - USING expression: bucket_id = 'job-applications'
--       - WITH CHECK expression: (vacío)
--
--    d) DELETE (Autenticado):
--       - Name: "Allow authenticated delete from job-applications"
--       - Allowed operation: DELETE
--       - Target roles: authenticated
--       - USING expression: bucket_id = 'job-applications'
--       - WITH CHECK expression: (vacío)
--
-- Verifica que:
-- 1. La tabla job_applications existe y tiene los índices ✅
-- 2. El bucket "job-applications" existe en Storage
-- 3. Las políticas RLS de Storage están configuradas correctamente
-- 4. Las políticas RLS de la tabla están configuradas ✅
-- ============================================

