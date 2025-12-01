-- ============================================
-- Script para corregir las políticas RLS de Storage para job-applications
-- ============================================
-- Este script corrige las políticas para que funcionen exactamente como disabilities
-- ============================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;

-- Política para INSERT (subir archivos) - Usando anon (igual que disabilities)
CREATE POLICY "Permitir subida de archivos de job-applications"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'job-applications'
);

-- Política para SELECT (descargar/leer archivos) - Público (igual que disabilities)
CREATE POLICY "Permitir lectura de archivos de job-applications"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'job-applications'
);

-- Política para UPDATE (actualizar archivos) - Opcional, usando anon
CREATE POLICY "Permitir actualización de archivos de job-applications"
ON storage.objects
FOR UPDATE
TO anon
USING (
  bucket_id = 'job-applications'
);

-- Política para DELETE (eliminar archivos) - Opcional, usando anon
CREATE POLICY "Permitir eliminación de archivos de job-applications"
ON storage.objects
FOR DELETE
TO anon
USING (
  bucket_id = 'job-applications'
);

-- ============================================
-- Verificación (opcional - ejecutar para confirmar)
-- ============================================
-- SELECT policyname, roles, cmd 
-- FROM pg_policies 
-- WHERE tablename = 'objects' 
-- AND schemaname = 'storage'
-- AND policyname LIKE '%job-applications%';
-- ============================================

