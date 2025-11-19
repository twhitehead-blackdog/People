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

-- 2. Eliminar políticas existentes si existen (para evitar conflictos)
DROP POLICY IF EXISTS "Permitir subida de archivos de incapacidades" ON storage.objects;
DROP POLICY IF EXISTS "Permitir subida con API Key" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura de archivos de incapacidades" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de archivos propios" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de archivos propios" ON storage.objects;

-- 3. Política para permitir INSERT (subir archivos)
-- Como estamos usando API Key (anon), permitimos subida con anon
-- Esto es necesario porque la aplicación usa ENV_SUPABASE_API_KEY
CREATE POLICY "Permitir subida de archivos de incapacidades"
ON storage.objects
FOR INSERT
TO anon
WITH CHECK (
  bucket_id = 'disabilities'
);

-- 4. Política para SELECT (descargar/leer archivos) - Público
CREATE POLICY "Permitir lectura de archivos de incapacidades"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'disabilities'
);

-- 5. Política para UPDATE (actualizar archivos) - Opcional, solo anon por ahora
-- Nota: Si necesitas restricciones más estrictas, puedes ajustar esto
CREATE POLICY "Permitir actualización de archivos de incapacidades"
ON storage.objects
FOR UPDATE
TO anon
USING (
  bucket_id = 'disabilities'
);

-- 6. Política para DELETE (eliminar archivos) - Opcional, solo anon por ahora
-- Nota: Si necesitas restricciones más estrictas, puedes ajustar esto
CREATE POLICY "Permitir eliminación de archivos de incapacidades"
ON storage.objects
FOR DELETE
TO anon
USING (
  bucket_id = 'disabilities'
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

