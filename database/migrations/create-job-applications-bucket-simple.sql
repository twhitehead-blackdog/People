-- ============================================
-- Script para crear el bucket job-applications
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Crear el bucket (si no existe) - Público como disabilities
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-applications',
  'job-applications',
  true, -- Público para permitir descarga (igual que disabilities)
  5242880, -- 5MB en bytes
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO UPDATE SET public = true; -- Asegurar que sea público

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida de archivos de job-applications" ON storage.objects;

-- Política para INSERT (subir archivos) - Usando anon (igual que disabilities)
CREATE POLICY "Permitir subida de archivos de job-applications"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'job-applications'
);

-- Eliminar políticas de lectura existentes
DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura de archivos de job-applications" ON storage.objects;

-- Política para SELECT (descargar/leer archivos) - Público (igual que disabilities)
CREATE POLICY "Permitir lectura de archivos de job-applications"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'job-applications'
);

-- Eliminar políticas de actualización existentes
DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de archivos de job-applications" ON storage.objects;

-- Política para UPDATE (actualizar archivos) - Opcional, usando anon
CREATE POLICY "Permitir actualización de archivos de job-applications"
ON storage.objects
FOR UPDATE
TO anon
USING (
  bucket_id = 'job-applications'
);

-- Eliminar políticas de eliminación existentes
DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de archivos de job-applications" ON storage.objects;

-- Política para DELETE (eliminar archivos) - Opcional, usando anon
CREATE POLICY "Permitir eliminación de archivos de job-applications"
ON storage.objects
FOR DELETE
TO anon
USING (
  bucket_id = 'job-applications'
);

