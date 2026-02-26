-- ============================================
-- Configuración de Supabase Storage
-- Para subir archivos PDF de solicitudes de tiempo compensatorio
-- ============================================

-- 1. Crear el bucket "compensatory" si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'compensatory',
  'compensatory',
  true, -- Público para permitir descarga
  5242880, -- 5MB en bytes
  ARRAY['application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Crear políticas solo si no existen (versión segura sin DROP)
-- Esto evita operaciones destructivas y es seguro ejecutar múltiples veces

-- Política para INSERT (subir archivos) - Usando API Key (anon)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Permitir subida de archivos de compensatorio'
  ) THEN
    CREATE POLICY "Permitir subida de archivos de compensatorio"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (
      bucket_id = 'compensatory'
    );
  END IF;
END $$;

-- Política para SELECT (descargar/leer archivos) - Público
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname = 'Permitir lectura de archivos de compensatorio'
  ) THEN
    CREATE POLICY "Permitir lectura de archivos de compensatorio"
    ON storage.objects
    FOR SELECT
    TO public
    USING (
      bucket_id = 'compensatory'
    );
  END IF;
END $$;

-- 3. Comentarios para documentación
COMMENT ON COLUMN storage.buckets.file_size_limit IS 'Límite de tamaño de archivo: 5MB para PDFs de compensatorio';
COMMENT ON COLUMN storage.buckets.allowed_mime_types IS 'Solo se permiten PDFs para solicitudes de tiempo compensatorio';

-- 4. Verificar configuración
-- Los archivos se organizan por employee_id: compensatory/{employee_id}/{filename}
-- Ejemplo: compensatory/123e4567-e89b-12d3-a456-426614174000/1703123456789.pdf