-- ============================================
-- Script para SOLO corregir políticas de Storage
-- ============================================
-- Ejecuta este script si el error es específicamente de Storage (403/400)
-- ============================================

-- IMPORTANTE: Asegúrate de que el bucket existe primero
-- Si no existe, créalo desde Storage > New bucket

-- Eliminar TODAS las políticas existentes del bucket job-applications
DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;

-- Verificar que RLS está habilitado en storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Política CRÍTICA: Permitir que cualquiera pueda subir archivos (INSERT público)
-- Esta es la política más importante para que funcione la subida
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

-- Política para permitir actualización de archivos (solo para usuarios autenticados)
CREATE POLICY "Allow authenticated update from job-applications"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'job-applications')
WITH CHECK (bucket_id = 'job-applications');

-- Política para permitir eliminación de archivos (solo para usuarios autenticados)
CREATE POLICY "Allow authenticated delete from job-applications"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-applications');

-- Verificar que las políticas se crearon
SELECT 
    policyname,
    cmd,
    roles
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND (qual::text LIKE '%job-applications%' OR with_check::text LIKE '%job-applications%')
ORDER BY policyname;

