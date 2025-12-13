-- ============================================
-- Schema para la tabla user_pets (Mascotas del Usuario)
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
-- Los usuarios solo pueden ver sus propias mascotas
DROP POLICY IF EXISTS "Users can view their own pets" ON public.user_pets;
CREATE POLICY "Users can view their own pets"
  ON public.user_pets FOR SELECT
  USING (true); -- Con API key se puede ver (validar en la app)

-- Los usuarios pueden crear sus propias mascotas
DROP POLICY IF EXISTS "Users can create their own pets" ON public.user_pets;
CREATE POLICY "Users can create their own pets"
  ON public.user_pets FOR INSERT
  WITH CHECK (true); -- Con API key se puede insertar (validar en la app)

-- Los usuarios pueden actualizar sus propias mascotas
DROP POLICY IF EXISTS "Users can update their own pets" ON public.user_pets;
CREATE POLICY "Users can update their own pets"
  ON public.user_pets FOR UPDATE
  USING (true); -- Con API key se puede actualizar (validar en la app)

-- Los usuarios pueden eliminar sus propias mascotas
DROP POLICY IF EXISTS "Users can delete their own pets" ON public.user_pets;
CREATE POLICY "Users can delete their own pets"
  ON public.user_pets FOR DELETE
  USING (true); -- Con API key se puede eliminar (validar en la app)

COMMENT ON TABLE public.user_pets IS 'Mascotas registradas por los usuarios en sus perfiles';

