-- ============================================
-- Migración: Crear bucket de Storage para job_applications
-- ============================================
-- Este script crea el bucket de Supabase Storage para almacenar
-- las hojas de vida de los aspirantes
-- ============================================
-- NOTA: Este script debe ejecutarse en el SQL Editor de Supabase
-- ============================================

-- Crear bucket para hojas de vida (si no existe)
-- Nota: Los buckets se crean desde el Dashboard de Supabase Storage
-- o usando la API de Storage. Este script es solo para referencia.

-- Para crear el bucket manualmente:
-- 1. Ve a Supabase Dashboard > Storage
-- 2. Crea un nuevo bucket llamado "job-applications"
-- 3. Configura las políticas de acceso:
--    - Public: false (privado)
--    - Allowed MIME types: application/pdf, application/msword, application/vnd.openxmlformats-officedocument.wordprocessingml.document
--    - File size limit: 5MB

-- Política RLS para permitir inserción de archivos (público para aplicaciones)
-- Esto permite que cualquiera pueda subir archivos al bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'job-applications',
  'job-applications',
  false, -- Privado por defecto
  5242880, -- 5MB en bytes
  ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
)
ON CONFLICT (id) DO NOTHING;

-- Política para permitir que cualquiera pueda subir archivos
CREATE POLICY "Allow public uploads to job-applications"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'job-applications');

-- Política para permitir lectura de archivos (solo para administradores)
-- Los archivos son privados, pero los administradores pueden leerlos
CREATE POLICY "Allow authenticated read from job-applications"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'job-applications');

-- Comentario
COMMENT ON POLICY "Allow public uploads to job-applications" ON storage.objects IS 
'Permite que cualquier usuario pueda subir hojas de vida al bucket job-applications';

COMMENT ON POLICY "Allow authenticated read from job-applications" ON storage.objects IS 
'Permite que usuarios autenticados puedan leer archivos del bucket job-applications';

