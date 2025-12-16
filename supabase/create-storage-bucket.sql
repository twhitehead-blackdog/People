-- ============================================
-- Script para crear el bucket de Storage
-- ============================================
-- IMPORTANTE: Este script debe ejecutarse con permisos de service_role
-- o crear el bucket manualmente desde el Dashboard de Supabase
--
-- Opción 1: Crear manualmente desde el Dashboard
-- 1. Ve a Storage en el Dashboard de Supabase
-- 2. Haz clic en "New bucket"
-- 3. Nombre: pet-photos
-- 4. Marca como "Public bucket"
-- 5. File size limit: 10MB
-- 6. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
--
-- Opción 2: Usar la función de Supabase (requiere permisos de service_role)
-- ============================================

-- Intentar crear el bucket usando la función de Supabase
-- Nota: Esto solo funciona si tienes permisos de service_role
DO $$
BEGIN
  -- Verificar si el bucket ya existe
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'pet-photos'
  ) THEN
    -- Intentar crear el bucket
    -- Nota: Esta función puede no estar disponible en todas las versiones
    PERFORM storage.create_bucket(
      'pet-photos',
      'pet-photos',
      true, -- público
      10485760, -- 10MB
      ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    );
    RAISE NOTICE 'Bucket pet-photos creado exitosamente';
  ELSE
    RAISE NOTICE 'El bucket pet-photos ya existe';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'No se pudo crear el bucket automáticamente. Por favor, créalo manualmente desde el Dashboard de Supabase. Error: %', SQLERRM;
END $$;

-- ============================================
-- Políticas de acceso para el bucket pet-photos
-- ============================================
-- Estas políticas se crearán solo si el bucket existe

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'pet-photos'
  ) THEN
    -- Política para permitir lectura pública de las imágenes
    DROP POLICY IF EXISTS "Public Access pet-photos" ON storage.objects;
    CREATE POLICY "Public Access pet-photos"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'pet-photos');
    
    -- Política para permitir subida de imágenes a usuarios autenticados
    DROP POLICY IF EXISTS "Authenticated users can upload images pet-photos" ON storage.objects;
    CREATE POLICY "Authenticated users can upload images pet-photos"
    ON storage.objects FOR INSERT
    WITH CHECK (
      bucket_id = 'pet-photos'
      AND (
        (storage.foldername(name))[1] = 'pet-matches'
        OR (storage.foldername(name))[1] = 'pets'
        OR (storage.foldername(name))[1] = 'user-pets'
      )
    );
    
    -- Política para permitir actualización de imágenes
    DROP POLICY IF EXISTS "Users can update images pet-photos" ON storage.objects;
    CREATE POLICY "Users can update images pet-photos"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'pet-photos');
    
    -- Política para permitir eliminación de imágenes
    DROP POLICY IF EXISTS "Users can delete images pet-photos" ON storage.objects;
    CREATE POLICY "Users can delete images pet-photos"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'pet-photos');
    
    RAISE NOTICE 'Políticas de acceso creadas para el bucket pet-photos';
  ELSE
    RAISE NOTICE 'El bucket pet-photos no existe. Por favor, créalo manualmente desde el Dashboard de Supabase antes de ejecutar las políticas.';
  END IF;
END $$;

