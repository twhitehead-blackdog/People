-- ============================================
-- SETUP COMPLETO: MÓDULO DE FERIA DE EMPLEO (VERSIÓN ACTUALIZADA)
-- ============================================
-- Este script crea TODO lo necesario para el módulo de Feria de Empleo
-- Incluye también los campos faltantes en positions necesarios para el sistema
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- 1. CREAR FUNCIÓN update_updated_at_column (si no existe)
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- 2. AGREGAR CAMPOS FALTANTES A positions
-- ============================================
-- Estos campos son necesarios para el funcionamiento del sistema
-- Agregar campo dashboard_access si no existe
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS dashboard_access BOOLEAN DEFAULT false;

-- Agregar campo default_view si no existe
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS default_view VARCHAR(100);

-- Comentarios en los campos
COMMENT ON COLUMN positions.dashboard_access IS 
'Indica si la posición tiene acceso al dashboard administrativo';

COMMENT ON COLUMN positions.default_view IS 
'Vista por defecto del dashboard para esta posición';

-- ============================================
-- 3. AGREGAR CAMPO available_for_job_fair A positions
-- ============================================
ALTER TABLE positions 
ADD COLUMN IF NOT EXISTS available_for_job_fair BOOLEAN DEFAULT true;

COMMENT ON COLUMN positions.available_for_job_fair IS 
'Indica si la posición está disponible para selección en el formulario de feria de empleo';

-- Actualizar posiciones existentes para que estén disponibles por defecto
UPDATE positions 
SET available_for_job_fair = true 
WHERE available_for_job_fair IS NULL;

-- ============================================
-- 4. CREAR TABLA job_applications
-- ============================================
CREATE TABLE IF NOT EXISTS job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone_number VARCHAR(50) NOT NULL,
    position_id UUID REFERENCES positions(id) ON DELETE SET NULL,
    position_name VARCHAR(255), -- Guardar nombre de la posición por si se elimina
    province VARCHAR(100), -- Lugar de residencia (unificado)
    corregimiento VARCHAR(100), -- Mantener por compatibilidad, pero será null
    currently_working BOOLEAN DEFAULT false,
    salary_expectation NUMERIC(12, 2),
    resume_url TEXT, -- URL del archivo de hoja de vida en Supabase Storage
    resume_filename VARCHAR(255), -- Nombre original del archivo
    additional_info TEXT, -- Información adicional del aspirante
    status VARCHAR(50) DEFAULT 'pending', -- pending, reviewed, contacted, rejected, hired
    interview_date TIMESTAMP WITH TIME ZONE, -- Fecha de entrevista programada
    notes TEXT, -- Notas internas sobre la aplicación
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_job_applications_position_id ON job_applications(position_id);
CREATE INDEX IF NOT EXISTS idx_job_applications_status ON job_applications(status);
CREATE INDEX IF NOT EXISTS idx_job_applications_created_at ON job_applications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_applications_email ON job_applications(email);

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_job_applications_updated_at ON job_applications;
CREATE TRIGGER update_job_applications_updated_at
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios en la tabla y columnas
COMMENT ON TABLE job_applications IS 'Almacena las aplicaciones de trabajo de la Feria de Empleo Virtual';
COMMENT ON COLUMN job_applications.status IS 'Estado de la aplicación: pending, reviewed, contacted, rejected, hired';
COMMENT ON COLUMN job_applications.resume_url IS 'URL del archivo de hoja de vida almacenado en Supabase Storage';
COMMENT ON COLUMN job_applications.province IS 'Lugar de residencia del aspirante (campo unificado)';

-- ============================================
-- 5. CONFIGURAR POLÍTICAS RLS PARA job_applications
-- ============================================

-- Habilitar RLS en la tabla
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes si existen
DROP POLICY IF EXISTS "Allow public insert to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated select from job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated update to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated delete from job_applications" ON job_applications;

-- Política para permitir que cualquiera pueda insertar aplicaciones (público)
CREATE POLICY "Allow public insert to job_applications"
ON job_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Política para permitir que usuarios autenticados puedan leer todas las aplicaciones
CREATE POLICY "Allow authenticated select from job_applications"
ON job_applications
FOR SELECT
TO authenticated
USING (true);

-- Política para permitir que usuarios autenticados puedan actualizar aplicaciones
CREATE POLICY "Allow authenticated update to job_applications"
ON job_applications
FOR UPDATE
TO authenticated
USING (true);

-- Política para permitir que usuarios autenticados puedan eliminar aplicaciones
CREATE POLICY "Allow authenticated delete from job_applications"
ON job_applications
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- 6. CREAR/ACTUALIZAR BUCKET DE STORAGE PARA CVs
-- ============================================
-- IMPORTANTE: El bucket debe ser PÚBLICO para permitir subidas anónimas
-- NOTA: La creación del bucket desde SQL puede requerir permisos especiales.
-- Si obtienes un error, crea el bucket manualmente desde el Dashboard de Supabase.

DO $$
BEGIN
  -- Intentar actualizar el bucket existente a público
  UPDATE storage.buckets
  SET 
    public = true, -- PÚBLICO para permitir subidas anónimas
    file_size_limit = 5242880, -- 5MB en bytes
    allowed_mime_types = ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
  WHERE id = 'job-applications';

  -- Si no existe, crearlo como público
  IF NOT FOUND THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'job-applications',
      'job-applications',
      true, -- PÚBLICO para permitir subidas anónimas
      5242880, -- 5MB en bytes
      ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    );
  END IF;

  RAISE NOTICE 'Bucket job-applications configurado correctamente como público.';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'No se pudo crear/actualizar el bucket automáticamente. Créalo manualmente desde el Dashboard de Supabase y configúralo como PÚBLICO.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al crear/actualizar bucket: %. Créalo manualmente desde el Dashboard.', SQLERRM;
END $$;

-- ============================================
-- 7. CONFIGURAR POLÍTICAS RLS PARA STORAGE
-- ============================================
-- IMPORTANTE: Estas políticas permiten subidas y lecturas públicas
-- NOTA: Las políticas de Storage requieren permisos de owner.
-- Si obtienes un error, configura las políticas manualmente desde el Dashboard.

DO $$
BEGIN
  -- Eliminar políticas existentes si existen
  DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public read from job-applications" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;

  -- Política para permitir que cualquiera pueda subir archivos (público para aplicaciones)
  CREATE POLICY "Allow public uploads to job-applications"
  ON storage.objects
  FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'job-applications');

  -- Política para permitir lectura pública de archivos (necesario para descargar CVs)
  CREATE POLICY "Allow public read from job-applications"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'job-applications');

  -- Política para permitir lectura de archivos para usuarios autenticados (backup)
  CREATE POLICY "Allow authenticated read from job-applications"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'job-applications');

  -- Política para permitir que usuarios autenticados puedan actualizar archivos
  CREATE POLICY "Allow authenticated update from job-applications"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'job-applications');

  -- Política para permitir que usuarios autenticados puedan eliminar archivos
  CREATE POLICY "Allow authenticated delete from job-applications"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'job-applications');

  RAISE NOTICE 'Políticas de Storage creadas correctamente.';
EXCEPTION
  WHEN insufficient_privilege THEN
    RAISE NOTICE 'No se pudieron crear las políticas de Storage automáticamente. Configúralas manualmente desde el Dashboard.';
  WHEN OTHERS THEN
    RAISE NOTICE 'Error al crear políticas de Storage: %. Configúralas manualmente desde el Dashboard.', SQLERRM;
END $$;

-- ============================================
-- 8. INSERTAR SETTING INICIAL PARA TOGGLE DE FERIA
-- ============================================
-- La tabla settings ya existe, solo insertamos el setting inicial
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES ('job_fair_enabled', 'true', 'Estado de la Feria de Empleo', 'job_fair', false)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 9. VERIFICACIÓN FINAL
-- ============================================
-- Verificar que el bucket existe y es público
DO $$
DECLARE
  bucket_record RECORD;
BEGIN
  SELECT id, name, public, file_size_limit 
  INTO bucket_record
  FROM storage.buckets 
  WHERE id = 'job-applications';
  
  IF FOUND THEN
    RAISE NOTICE '✅ Bucket verificado: id=%, name=%, public=%, file_size_limit=%', 
      bucket_record.id, bucket_record.name, bucket_record.public, bucket_record.file_size_limit;
  ELSE
    RAISE WARNING '⚠️  Bucket job-applications no encontrado. Créalo manualmente desde el Dashboard.';
  END IF;
END $$;

-- Verificar que las políticas de storage existen
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects' 
    AND policyname LIKE '%job-applications%';
  
  RAISE NOTICE '✅ Políticas de Storage encontradas: %', policy_count;
  
  IF policy_count < 3 THEN
    RAISE WARNING '⚠️  Se esperaban al menos 3 políticas. Verifica manualmente desde el Dashboard.';
  END IF;
END $$;

-- ============================================
-- ¡LISTO! El módulo de Feria de Empleo está configurado
-- ============================================
-- VERIFICACIÓN COMPLETA:
-- 1. ✅ Campos dashboard_access y default_view agregados a positions
-- 2. ✅ Campo available_for_job_fair agregado a positions
-- 3. ✅ Tabla job_applications creada con todos los campos
-- 4. ✅ Políticas RLS configuradas para job_applications
-- 5. ✅ Bucket job-applications configurado como PÚBLICO
-- 6. ✅ Políticas RLS de Storage configuradas (subidas y lecturas públicas)
-- 7. ✅ Setting job_fair_enabled insertado
-- ============================================
-- 
-- IMPORTANTE: Si obtuviste errores al crear el bucket o las políticas de Storage,
-- ve al Dashboard de Supabase > Storage y:
-- 1. Crea el bucket 'job-applications' manualmente
-- 2. Configúralo como PÚBLICO
-- 3. Configura las políticas RLS manualmente desde Storage > Policies
-- ============================================

