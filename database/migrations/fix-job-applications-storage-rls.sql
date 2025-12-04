-- ============================================
-- FIX: Configurar bucket job-applications como público
-- y asegurar políticas RLS correctas para subidas públicas
-- ============================================

-- 1. Actualizar el bucket para que sea público
UPDATE storage.buckets
SET public = true
WHERE id = 'job-applications';

-- Si el bucket no existe, crearlo como público
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-applications',
  'job-applications',
  true, -- PÚBLICO para permitir subidas anónimas
  5242880, -- 5MB en bytes
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true, -- Asegurar que sea público
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

-- 2. Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;

-- 3. Crear políticas RLS para Storage
-- Política para permitir que cualquiera pueda subir archivos (público para aplicaciones)
CREATE POLICY "Allow public uploads to job-applications"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'job-applications');

-- Política para permitir lectura pública de archivos (necesario para descargar CVs)
CREATE POLICY "Allow public read from job-applications"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'job-applications');

-- Política para permitir lectura de archivos para usuarios autenticados (backup)
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

-- ============================================
-- Verificación
-- ============================================
-- Verificar que el bucket existe y es público
SELECT id, name, public, file_size_limit 
FROM storage.buckets 
WHERE id = 'job-applications';

-- Verificar que las políticas existen
SELECT policyname, cmd, roles 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%job-applications%';

