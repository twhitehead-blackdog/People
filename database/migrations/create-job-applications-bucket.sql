-- ============================================
-- CREAR BUCKET job-applications EN SUPABASE STORAGE
-- ============================================
-- Este script crea el bucket necesario para almacenar los CVs
-- de las aplicaciones de la feria de empleo.
--
-- INSTRUCCIONES:
-- 1. Ejecuta este script en el SQL Editor de Supabase
-- 2. Si obtienes un error de permisos, crea el bucket manualmente:
--    - Ve a Storage > Buckets > New Bucket
--    - Nombre: job-applications
--    - Público: SÍ (marcar como público)
--    - File size limit: 5MB
--    - Allowed MIME types: application/pdf, application/msword, 
--      application/vnd.openxmlformats-officedocument.wordprocessingml.document
-- ============================================

-- Crear el bucket si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-applications',
  'job-applications',
  true, -- PÚBLICO para permitir subidas anónimas desde el formulario público
  5242880, -- 5MB en bytes
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]
)
ON CONFLICT (id) DO UPDATE
SET 
  public = true, -- Asegurar que sea público
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ];

-- ============================================
-- CONFIGURAR POLÍTICAS RLS PARA STORAGE
-- ============================================

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;

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
-- VERIFICACIÓN
-- ============================================
-- Verificar que el bucket existe y es público
SELECT 
  id, 
  name, 
  public, 
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE id = 'job-applications';

-- Verificar que las políticas existen
SELECT 
  policyname, 
  cmd, 
  roles 
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects' 
  AND policyname LIKE '%job-applications%';

