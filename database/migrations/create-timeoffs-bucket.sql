-- ============================================
-- Script para crear el bucket timeoffs
-- ============================================
-- Para subir archivos de documentos de vacaciones
-- ============================================

-- 1. Crear el bucket "timeoffs" si no existe
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'timeoffs',
  'timeoffs',
  true, -- Público para permitir descarga
  10485760, -- 10MB en bytes
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'application/pdf']
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
    AND policyname = 'Permitir subida de archivos de timeoffs'
  ) THEN
    CREATE POLICY "Permitir subida de archivos de timeoffs"
    ON storage.objects
    FOR INSERT
    TO anon
    WITH CHECK (
      bucket_id = 'timeoffs'
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
    AND policyname = 'Permitir lectura de archivos de timeoffs'
  ) THEN
    CREATE POLICY "Permitir lectura de archivos de timeoffs"
    ON storage.objects
    FOR SELECT
    TO public
    USING (
      bucket_id = 'timeoffs'
    );
  END IF;
END $$;

-- Política para UPDATE (actualizar archivos) - Opcional
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir actualización de archivos de timeoffs'
  ) THEN
    CREATE POLICY "Permitir actualización de archivos de timeoffs"
    ON storage.objects
    FOR UPDATE
    TO anon
    USING (
      bucket_id = 'timeoffs'
    );
  END IF;
END $$;

-- Política para DELETE (eliminar archivos) - Opcional
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname = 'Permitir eliminación de archivos de timeoffs'
  ) THEN
    CREATE POLICY "Permitir eliminación de archivos de timeoffs"
    ON storage.objects
    FOR DELETE
    TO anon
    USING (
      bucket_id = 'timeoffs'
    );
  END IF;
END $$;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. El bucket está configurado como PÚBLICO para permitir descarga directa
-- 2. Las políticas permiten subida usando API Key (anon) para compatibilidad
-- 3. Los archivos se organizan por employee_id: timeoffs/{employee_id}/{filename}
-- 4. Tamaño máximo: 10MB
-- 5. Tipos permitidos: PDF, JPG, PNG, GIF

