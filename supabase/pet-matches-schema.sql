-- ============================================
-- Schema para el módulo de "Busco Pareja"
-- Ejecuta este archivo en tu proyecto de Supabase
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
-- TABLA: pet_matches (Mascotas buscando pareja)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pet_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL, -- ID del usuario dueño (de Auth0/users)
  user_pet_id UUID REFERENCES public.user_pets(id) ON DELETE SET NULL, -- Referencia a mascota del perfil (opcional)
  pet_name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  breed TEXT, -- Mantener para compatibilidad
  breed_type TEXT CHECK (breed_type IN ('pure', 'mixed', 'none')), -- Tipo: pura, mixta, sin raza
  breed_primary TEXT, -- Raza principal (si es pura o mixta)
  breed_secondary TEXT, -- Raza secundaria (si es mixta)
  breed_percentage_primary INTEGER CHECK (breed_percentage_primary >= 0 AND breed_percentage_primary <= 100), -- Porcentaje raza principal
  breed_percentage_secondary INTEGER CHECK (breed_percentage_secondary >= 0 AND breed_percentage_secondary <= 100), -- Porcentaje raza secundaria
  birth_date DATE, -- Fecha de cumpleaños
  age NUMERIC(4,1), -- Mantener para compatibilidad
  age_years INTEGER, -- Edad en años
  age_months INTEGER CHECK (age_months >= 0 AND age_months < 12), -- Edad en meses (0-11)
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large')),
  color TEXT,
  weight NUMERIC(5,2), -- Peso en kilogramos
  description TEXT,
  health_status TEXT,
  location TEXT, -- Ubicación de la mascota
  contact_info JSONB, -- Información de contacto del dueño (email, teléfono, etc.)
  preferred_breed_match TEXT NOT NULL CHECK (preferred_breed_match IN ('same', 'different', 'both')) DEFAULT 'both', -- Preferencia: misma raza, diferente, o ambas
  personality TEXT[], -- Array de rasgos de personalidad
  photos TEXT[], -- Array de URLs de fotos
  is_vaccinated BOOLEAN NOT NULL DEFAULT false,
  is_sterilized BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true, -- Si la publicación está activa
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

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
-- Permitir ver todas las publicaciones activas
DROP POLICY IF EXISTS "Pet matches are viewable by everyone" ON public.pet_matches;
CREATE POLICY "Pet matches are viewable by everyone"
  ON public.pet_matches FOR SELECT
  USING (is_active = true OR true); -- Permitir ver todos con API key

-- Permitir que usuarios autenticados creen publicaciones
DROP POLICY IF EXISTS "Pet matches are insertable by authenticated users" ON public.pet_matches;
CREATE POLICY "Pet matches are insertable by authenticated users"
  ON public.pet_matches FOR INSERT
  WITH CHECK (true); -- Con API key se puede insertar

-- Permitir que el dueño actualice su propia publicación
DROP POLICY IF EXISTS "Pet matches are updatable by owner" ON public.pet_matches;
CREATE POLICY "Pet matches are updatable by owner"
  ON public.pet_matches FOR UPDATE
  USING (true); -- Con API key se puede actualizar (validar en la app)

-- Permitir que el dueño elimine su propia publicación
DROP POLICY IF EXISTS "Pet matches are deletable by owner" ON public.pet_matches;
CREATE POLICY "Pet matches are deletable by owner"
  ON public.pet_matches FOR DELETE
  USING (true); -- Con API key se puede eliminar (validar en la app)

COMMENT ON TABLE public.pet_matches IS 'Mascotas de usuarios registrados que buscan pareja para reproducción';

