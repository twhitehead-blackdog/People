-- ============================================
-- Configuración de Supabase Storage
-- Para subir archivos de incapacidades
-- ============================================

-- 1. Crear el bucket "disabilities" si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'disabilities',
  'disabilities',
  true, -- Público para permitir descarga
  10485760, -- 10MB en bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Política para permitir INSERT (subir archivos) - Solo empleados autenticados
-- Nota: Esto requiere que el usuario esté autenticado con Auth0
-- Como estamos usando API Key, necesitamos una política más permisiva

-- Política para INSERT: Permitir subir archivos a empleados autenticados
CREATE POLICY IF NOT EXISTS "Permitir subida de archivos de incapacidades"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'disabilities' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política alternativa: Permitir subida usando service role (para API Key)
-- Esta política permite subir archivos usando la API Key
CREATE POLICY IF NOT EXISTS "Permitir subida con API Key"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'disabilities'
);

-- 3. Política para SELECT (descargar/leer archivos) - Público
CREATE POLICY IF NOT EXISTS "Permitir lectura de archivos de incapacidades"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'disabilities'
);

-- 4. Política para UPDATE (actualizar archivos) - Solo el propietario
CREATE POLICY IF NOT EXISTS "Permitir actualización de archivos propios"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'disabilities' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 5. Política para DELETE (eliminar archivos) - Solo el propietario
CREATE POLICY IF NOT EXISTS "Permitir eliminación de archivos propios"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'disabilities' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. El bucket está configurado como PÚBLICO para permitir descarga directa
-- 2. Las políticas permiten subida usando API Key (anon) para compatibilidad
-- 3. Los archivos se organizan por employee_id: disabilities/{employee_id}/{filename}
-- 4. Tamaño máximo: 10MB
-- 5. Tipos permitidos: PDF, JPG, PNG, GIF
--
-- Si necesitas más seguridad, puedes:
-- - Cambiar public = false y usar signed URLs
-- - Restringir las políticas a solo authenticated users
-- - Agregar validación adicional en las políticas

