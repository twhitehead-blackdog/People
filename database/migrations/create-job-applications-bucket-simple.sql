-- ============================================
-- Script para crear el bucket job-applications
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Crear el bucket (si no existe)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-applications',
  'job-applications',
  false, -- Privado (no público)
  5242880, -- 5MB en bytes
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que cualquiera pueda subir archivos (INSERT público)
DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
CREATE POLICY "Allow public uploads to job-applications"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'job-applications');

-- Política para permitir lectura de archivos (solo para usuarios autenticados)
DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
CREATE POLICY "Allow authenticated read from job-applications"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'job-applications');

-- Política para permitir actualización de archivos (solo para usuarios autenticados)
DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
CREATE POLICY "Allow authenticated update from job-applications"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'job-applications');

-- Política para permitir eliminación de archivos (solo para usuarios autenticados)
DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;
CREATE POLICY "Allow authenticated delete from job-applications"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-applications');

