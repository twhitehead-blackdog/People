-- ============================================
-- Script para crear las tablas faltantes en Supabase
-- Ejecuta este archivo completo en el SQL Editor de Supabase
-- ============================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función para actualizar updated_at (si no existe)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- ============================================
-- TABLA: personality_traits (Rasgos de Personalidad)
-- ============================================
CREATE TABLE IF NOT EXISTS public.personality_traits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL, -- Etiqueta mostrada (ej: "Juguetón")
  value TEXT NOT NULL UNIQUE, -- Valor interno (ej: "jugueton")
  description TEXT, -- Descripción del rasgo
  icon TEXT, -- Emoji o icono asociado
  category TEXT, -- Categoría: social, actividad, temperamento, etc.
  display_order INTEGER NOT NULL DEFAULT 0, -- Orden de visualización
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para personality_traits
CREATE INDEX IF NOT EXISTS personality_traits_value_idx ON public.personality_traits(value);
CREATE INDEX IF NOT EXISTS personality_traits_category_idx ON public.personality_traits(category);
CREATE INDEX IF NOT EXISTS personality_traits_is_active_idx ON public.personality_traits(is_active);
CREATE INDEX IF NOT EXISTS personality_traits_display_order_idx ON public.personality_traits(display_order);

-- Trigger para actualizar updated_at en personality_traits
DROP TRIGGER IF EXISTS update_personality_traits_updated_at ON public.personality_traits;
CREATE TRIGGER update_personality_traits_updated_at
  BEFORE UPDATE ON public.personality_traits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para personality_traits
ALTER TABLE public.personality_traits ENABLE ROW LEVEL SECURITY;

-- Políticas para personality_traits
DROP POLICY IF EXISTS "Personality traits are viewable by everyone" ON public.personality_traits;
CREATE POLICY "Personality traits are viewable by everyone"
  ON public.personality_traits FOR SELECT
  USING (is_active = true OR true);

DROP POLICY IF EXISTS "Personality traits are insertable with service role" ON public.personality_traits;
CREATE POLICY "Personality traits are insertable with service role"
  ON public.personality_traits FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Personality traits are updatable with service role" ON public.personality_traits;
CREATE POLICY "Personality traits are updatable with service role"
  ON public.personality_traits FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Personality traits are deletable with service role" ON public.personality_traits;
CREATE POLICY "Personality traits are deletable with service role"
  ON public.personality_traits FOR DELETE
  USING (true);

COMMENT ON TABLE public.personality_traits IS 'Rasgos de personalidad disponibles para mascotas';

-- ============================================
-- TABLA: pet_breeds (Catálogo de Razas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pet_breeds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0, -- Orden de visualización
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(name, species) -- No puede haber dos razas con el mismo nombre para la misma especie
);

-- Índices para pet_breeds
CREATE INDEX IF NOT EXISTS pet_breeds_species_idx ON public.pet_breeds(species);
CREATE INDEX IF NOT EXISTS pet_breeds_is_active_idx ON public.pet_breeds(is_active);
CREATE INDEX IF NOT EXISTS pet_breeds_display_order_idx ON public.pet_breeds(display_order);
CREATE INDEX IF NOT EXISTS pet_breeds_name_idx ON public.pet_breeds(name);

-- Trigger para actualizar updated_at en pet_breeds
DROP TRIGGER IF EXISTS update_pet_breeds_updated_at ON public.pet_breeds;
CREATE TRIGGER update_pet_breeds_updated_at
  BEFORE UPDATE ON public.pet_breeds
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para pet_breeds
ALTER TABLE public.pet_breeds ENABLE ROW LEVEL SECURITY;

-- Políticas para pet_breeds
DROP POLICY IF EXISTS "Pet breeds are viewable by everyone" ON public.pet_breeds;
CREATE POLICY "Pet breeds are viewable by everyone"
  ON public.pet_breeds FOR SELECT
  USING (is_active = true OR true);

DROP POLICY IF EXISTS "Pet breeds are insertable by service role" ON public.pet_breeds;
CREATE POLICY "Pet breeds are insertable by service role"
  ON public.pet_breeds FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Pet breeds are updatable by service role" ON public.pet_breeds;
CREATE POLICY "Pet breeds are updatable by service role"
  ON public.pet_breeds FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Pet breeds are deletable by service role" ON public.pet_breeds;
CREATE POLICY "Pet breeds are deletable by service role"
  ON public.pet_breeds FOR DELETE
  USING (true);

COMMENT ON TABLE public.pet_breeds IS 'Catálogo de razas de perros y gatos disponibles en el sistema';

-- ============================================
-- TABLA: user_pets (Mascotas de los usuarios)
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- ID del usuario dueño (de Auth0/users)
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  breed_type TEXT NOT NULL CHECK (breed_type IN ('pure', 'mixed', 'none')) DEFAULT 'none', -- Tipo: pura, mixta, sin raza
  breed_primary TEXT, -- Raza principal (si es pura o mixta)
  breed_secondary TEXT, -- Raza secundaria (si es mixta)
  breed_percentage_primary INTEGER CHECK (breed_percentage_primary >= 0 AND breed_percentage_primary <= 100), -- Porcentaje raza principal (si es mixta)
  breed_percentage_secondary INTEGER CHECK (breed_percentage_secondary >= 0 AND breed_percentage_secondary <= 100), -- Porcentaje raza secundaria (si es mixta)
  birth_date DATE, -- Fecha de cumpleaños
  age_years INTEGER, -- Edad en años
  age_months INTEGER CHECK (age_months >= 0 AND age_months < 12), -- Edad en meses (0-11)
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large')),
  color TEXT,
  weight NUMERIC(5,2), -- Peso en kilogramos
  description TEXT,
  health_status TEXT,
  personality TEXT[], -- Array de rasgos de personalidad
  photos TEXT[], -- Array de URLs de fotos
  is_vaccinated BOOLEAN NOT NULL DEFAULT false,
  is_sterilized BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para user_pets
CREATE INDEX IF NOT EXISTS user_pets_user_id_idx ON public.user_pets(user_id);
CREATE INDEX IF NOT EXISTS user_pets_species_idx ON public.user_pets(species);
CREATE INDEX IF NOT EXISTS user_pets_breed_type_idx ON public.user_pets(breed_type);
CREATE INDEX IF NOT EXISTS user_pets_breed_primary_idx ON public.user_pets(breed_primary);
CREATE INDEX IF NOT EXISTS user_pets_created_at_idx ON public.user_pets(created_at DESC);

-- Trigger para actualizar updated_at en user_pets
DROP TRIGGER IF EXISTS update_user_pets_updated_at ON public.user_pets;
CREATE TRIGGER update_user_pets_updated_at
  BEFORE UPDATE ON public.user_pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para user_pets
ALTER TABLE public.user_pets ENABLE ROW LEVEL SECURITY;

-- Políticas para user_pets
DROP POLICY IF EXISTS "Users can view their own pets" ON public.user_pets;
CREATE POLICY "Users can view their own pets"
  ON public.user_pets FOR SELECT
  USING (true); -- Con API key se puede ver (validar en la app)

DROP POLICY IF EXISTS "Users can create their own pets" ON public.user_pets;
CREATE POLICY "Users can create their own pets"
  ON public.user_pets FOR INSERT
  WITH CHECK (true); -- Con API key se puede insertar (validar en la app)

DROP POLICY IF EXISTS "Users can update their own pets" ON public.user_pets;
CREATE POLICY "Users can update their own pets"
  ON public.user_pets FOR UPDATE
  USING (true); -- Con API key se puede actualizar (validar en la app)

DROP POLICY IF EXISTS "Users can delete their own pets" ON public.user_pets;
CREATE POLICY "Users can delete their own pets"
  ON public.user_pets FOR DELETE
  USING (true); -- Con API key se puede eliminar (validar en la app)

COMMENT ON TABLE public.user_pets IS 'Mascotas registradas por los usuarios en sus perfiles';

-- ============================================
-- TABLA: pet_matches (Mascotas buscando pareja)
-- Esta tabla depende de user_pets, así que debe crearse después
-- ============================================

-- Verificar si la tabla pet_matches ya existe
DO $$ 
BEGIN
  -- Si la tabla no existe, crearla
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pet_matches'
  ) THEN
    -- Crear la tabla completa (sin foreign key por ahora, se agregará después)
    EXECUTE '
    CREATE TABLE public.pet_matches (
      id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id TEXT NOT NULL,
      user_pet_id UUID,
      pet_name TEXT NOT NULL,
      species TEXT NOT NULL CHECK (species IN (''dog'', ''cat'', ''other'')),
      breed TEXT,
      breed_type TEXT CHECK (breed_type IN (''pure'', ''mixed'', ''none'')),
      breed_primary TEXT,
      breed_secondary TEXT,
      breed_percentage_primary INTEGER CHECK (breed_percentage_primary >= 0 AND breed_percentage_primary <= 100),
      breed_percentage_secondary INTEGER CHECK (breed_percentage_secondary >= 0 AND breed_percentage_secondary <= 100),
      birth_date DATE,
      age NUMERIC(4,1),
      age_years INTEGER,
      age_months INTEGER CHECK (age_months >= 0 AND age_months < 12),
      gender TEXT NOT NULL CHECK (gender IN (''M'', ''F'')),
      size TEXT NOT NULL CHECK (size IN (''small'', ''medium'', ''large'')),
      color TEXT,
      weight NUMERIC(5,2),
      description TEXT,
      health_status TEXT,
      location TEXT,
      contact_info JSONB,
      preferred_breed_match TEXT NOT NULL CHECK (preferred_breed_match IN (''same'', ''different'', ''both'')) DEFAULT ''both'',
      personality TEXT[],
      photos TEXT[],
      is_vaccinated BOOLEAN NOT NULL DEFAULT false,
      is_sterilized BOOLEAN NOT NULL DEFAULT false,
      is_active BOOLEAN NOT NULL DEFAULT true,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )';
    
    -- Agregar la foreign key después de crear la tabla, si user_pets existe
    IF EXISTS (
      SELECT 1 FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'user_pets'
    ) THEN
      EXECUTE 'ALTER TABLE public.pet_matches
        ADD CONSTRAINT pet_matches_user_pet_id_fkey 
        FOREIGN KEY (user_pet_id) REFERENCES public.user_pets(id) ON DELETE SET NULL';
    END IF;
  ELSE
    -- Si la tabla existe, agregar la columna user_pet_id si no existe
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'user_pet_id'
    ) THEN
      ALTER TABLE public.pet_matches 
      ADD COLUMN user_pet_id UUID;
      
      -- Agregar la foreign key después, solo si la tabla user_pets existe
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'user_pets'
      ) THEN
        -- Verificar si la constraint ya existe
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.table_constraints 
          WHERE table_schema = 'public' 
          AND table_name = 'pet_matches' 
          AND constraint_name = 'pet_matches_user_pet_id_fkey'
        ) THEN
          ALTER TABLE public.pet_matches
          ADD CONSTRAINT pet_matches_user_pet_id_fkey 
          FOREIGN KEY (user_pet_id) REFERENCES public.user_pets(id) ON DELETE SET NULL;
        END IF;
      END IF;
      
      CREATE INDEX IF NOT EXISTS pet_matches_user_pet_id_idx ON public.pet_matches(user_pet_id);
    END IF;
  END IF;
END $$;

-- Si la tabla ya existe, no intentar crearla de nuevo
-- Solo asegurarnos de que tenga todas las columnas necesarias
DO $$
BEGIN
  -- Agregar columnas que puedan faltar si la tabla ya existe
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'pet_matches'
  ) THEN
    -- Agregar columnas que puedan faltar
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'breed_type'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN breed_type TEXT CHECK (breed_type IN ('pure', 'mixed', 'none'));
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'breed_primary'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN breed_primary TEXT;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'breed_secondary'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN breed_secondary TEXT;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'breed_percentage_primary'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN breed_percentage_primary INTEGER CHECK (breed_percentage_primary >= 0 AND breed_percentage_primary <= 100);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'breed_percentage_secondary'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN breed_percentage_secondary INTEGER CHECK (breed_percentage_secondary >= 0 AND breed_percentage_secondary <= 100);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'birth_date'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN birth_date DATE;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'age_years'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN age_years INTEGER;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'age_months'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN age_months INTEGER CHECK (age_months >= 0 AND age_months < 12);
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'contact_info'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN contact_info JSONB;
    END IF;
    
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'pet_matches' 
      AND column_name = 'preferred_breed_match'
    ) THEN
      ALTER TABLE public.pet_matches ADD COLUMN preferred_breed_match TEXT NOT NULL DEFAULT 'both' CHECK (preferred_breed_match IN ('same', 'different', 'both'));
    END IF;
  END IF;
END $$;

-- Índices para pet_matches
CREATE INDEX IF NOT EXISTS pet_matches_user_id_idx ON public.pet_matches(user_id);
CREATE INDEX IF NOT EXISTS pet_matches_user_pet_id_idx ON public.pet_matches(user_pet_id);
CREATE INDEX IF NOT EXISTS pet_matches_species_idx ON public.pet_matches(species);
CREATE INDEX IF NOT EXISTS pet_matches_breed_idx ON public.pet_matches(breed);
CREATE INDEX IF NOT EXISTS pet_matches_breed_type_idx ON public.pet_matches(breed_type);
CREATE INDEX IF NOT EXISTS pet_matches_breed_primary_idx ON public.pet_matches(breed_primary);
CREATE INDEX IF NOT EXISTS pet_matches_gender_idx ON public.pet_matches(gender);
CREATE INDEX IF NOT EXISTS pet_matches_size_idx ON public.pet_matches(size);
CREATE INDEX IF NOT EXISTS pet_matches_location_idx ON public.pet_matches(location);
CREATE INDEX IF NOT EXISTS pet_matches_preferred_breed_match_idx ON public.pet_matches(preferred_breed_match);
CREATE INDEX IF NOT EXISTS pet_matches_is_active_idx ON public.pet_matches(is_active);
CREATE INDEX IF NOT EXISTS pet_matches_created_at_idx ON public.pet_matches(created_at DESC);

-- Trigger para actualizar updated_at en pet_matches
DROP TRIGGER IF EXISTS update_pet_matches_updated_at ON public.pet_matches;
CREATE TRIGGER update_pet_matches_updated_at
  BEFORE UPDATE ON public.pet_matches
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para pet_matches
ALTER TABLE public.pet_matches ENABLE ROW LEVEL SECURITY;

-- Políticas para pet_matches
DROP POLICY IF EXISTS "Pet matches are viewable by everyone" ON public.pet_matches;
CREATE POLICY "Pet matches are viewable by everyone"
  ON public.pet_matches FOR SELECT
  USING (is_active = true OR true); -- Permitir ver todos con API key

DROP POLICY IF EXISTS "Pet matches are insertable by authenticated users" ON public.pet_matches;
CREATE POLICY "Pet matches are insertable by authenticated users"
  ON public.pet_matches FOR INSERT
  WITH CHECK (true); -- Con API key se puede insertar

DROP POLICY IF EXISTS "Pet matches are updatable by owner" ON public.pet_matches;
CREATE POLICY "Pet matches are updatable by owner"
  ON public.pet_matches FOR UPDATE
  USING (true); -- Con API key se puede actualizar (validar en la app)

DROP POLICY IF EXISTS "Pet matches are deletable by owner" ON public.pet_matches;
CREATE POLICY "Pet matches are deletable by owner"
  ON public.pet_matches FOR DELETE
  USING (true); -- Con API key se puede eliminar (validar en la app)

COMMENT ON TABLE public.pet_matches IS 'Mascotas de usuarios registrados que buscan pareja para reproducción';

-- ============================================
-- STORAGE: Crear bucket para fotos de mascotas
-- ============================================
-- NOTA: Los buckets deben crearse manualmente desde el Dashboard de Supabase
-- o usando la función storage.create_bucket() con permisos de service_role
-- 
-- Para crear el bucket manualmente:
-- 1. Ve a Storage en el Dashboard de Supabase
-- 2. Haz clic en "New bucket"
-- 3. Nombre: pet-photos
-- 4. Marca como "Public bucket"
-- 5. File size limit: 10MB
-- 6. Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
--
-- O ejecuta este código usando el service_role key en una función edge o desde el dashboard:
-- SELECT storage.create_bucket('pet-photos', {
--   public: true,
--   file_size_limit: 10485760,
--   allowed_mime_types: ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
-- });

-- Políticas de acceso para el bucket pet-photos
-- (Solo ejecutar estas políticas después de crear el bucket manualmente)

-- Política para permitir lectura pública de las imágenes
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'pet-photos'
  ) THEN
    -- Eliminar políticas existentes si existen
    DROP POLICY IF EXISTS "Public Access pet-photos" ON storage.objects;
    
    -- Crear política de lectura pública
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
  ELSE
    RAISE NOTICE 'El bucket pet-photos no existe. Por favor, créalo manualmente desde el Dashboard de Supabase antes de ejecutar las políticas.';
  END IF;
END $$;

