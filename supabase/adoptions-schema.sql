-- ============================================
-- Schema para el módulo de Adopciones
-- Ejecuta este archivo en tu proyecto de Supabase
-- ============================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: foundations (Fundaciones)
-- ============================================
CREATE TABLE IF NOT EXISTS public.foundations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para foundations
CREATE INDEX IF NOT EXISTS foundations_is_active_idx ON public.foundations(is_active);
CREATE INDEX IF NOT EXISTS foundations_email_idx ON public.foundations(email);

-- ============================================
-- TABLA: pets (Mascotas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  foundation_id UUID NOT NULL REFERENCES public.foundations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  breed TEXT,
  age NUMERIC(4,1),
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large')),
  color TEXT,
  weight NUMERIC(5,2), -- Peso en kilogramos
  description TEXT,
  health_status TEXT,
  location_type TEXT, -- Tipo de ubicación (Tienda, Sede, Hogar temporal, Refugio, etc.)
  location_detail TEXT, -- Detalle específico de la ubicación
  is_vaccinated BOOLEAN NOT NULL DEFAULT false,
  is_sterilized BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  personality TEXT[], -- Array de rasgos de personalidad
  photos TEXT[], -- Array de URLs de fotos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para pets
CREATE INDEX IF NOT EXISTS pets_foundation_id_idx ON public.pets(foundation_id);
CREATE INDEX IF NOT EXISTS pets_species_idx ON public.pets(species);
CREATE INDEX IF NOT EXISTS pets_is_available_idx ON public.pets(is_available);
CREATE INDEX IF NOT EXISTS pets_created_at_idx ON public.pets(created_at DESC);

-- ============================================
-- TABLA: adoption_applications (Solicitudes de Adopción)
-- ============================================
CREATE TABLE IF NOT EXISTS public.adoption_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  applicant_address TEXT NOT NULL,
  applicant_document_id TEXT,
  reason_for_adoption TEXT,
  has_other_pets BOOLEAN NOT NULL DEFAULT false,
  other_pets_info TEXT,
  has_children BOOLEAN NOT NULL DEFAULT false,
  children_info TEXT,
  living_situation TEXT,
  personality TEXT[], -- Array de rasgos de personalidad preferidos
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para adoption_applications
CREATE INDEX IF NOT EXISTS adoption_applications_pet_id_idx ON public.adoption_applications(pet_id);
CREATE INDEX IF NOT EXISTS adoption_applications_status_idx ON public.adoption_applications(status);
CREATE INDEX IF NOT EXISTS adoption_applications_applicant_email_idx ON public.adoption_applications(applicant_email);
CREATE INDEX IF NOT EXISTS adoption_applications_created_at_idx ON public.adoption_applications(created_at DESC);

-- ============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
CREATE TRIGGER update_foundations_updated_at
  BEFORE UPDATE ON public.foundations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adoption_applications_updated_at
  BEFORE UPDATE ON public.adoption_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- NOTA: Como usamos Auth0 (no Supabase Auth), las políticas RLS
-- están configuradas para permitir acceso con la API key de servicio
-- que se envía en el header 'apikey'. Para producción, deberías
-- implementar políticas más restrictivas basadas en JWT de Auth0.

-- Habilitar RLS en todas las tablas
ALTER TABLE public.foundations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_applications ENABLE ROW LEVEL SECURITY;

-- Políticas para foundations: Lectura pública, escritura con API key
-- En desarrollo: permite todo con API key
-- En producción: ajusta según tus necesidades de seguridad
CREATE POLICY "Foundations are viewable by everyone"
  ON public.foundations FOR SELECT
  USING (true);

CREATE POLICY "Foundations are insertable with service role"
  ON public.foundations FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

CREATE POLICY "Foundations are updatable with service role"
  ON public.foundations FOR UPDATE
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "Foundations are deletable with service role"
  ON public.foundations FOR DELETE
  USING (true); -- Permitir con API key de servicio

-- Políticas para pets: Lectura pública, escritura con API key
CREATE POLICY "Pets are viewable by everyone"
  ON public.pets FOR SELECT
  USING (true);

CREATE POLICY "Pets are insertable with service role"
  ON public.pets FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

CREATE POLICY "Pets are updatable with service role"
  ON public.pets FOR UPDATE
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "Pets are deletable with service role"
  ON public.pets FOR DELETE
  USING (true); -- Permitir con API key de servicio

-- Políticas para adoption_applications: Lectura y escritura con API key
CREATE POLICY "Adoption applications are viewable with service role"
  ON public.adoption_applications FOR SELECT
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "Adoption applications are insertable with service role"
  ON public.adoption_applications FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

CREATE POLICY "Adoption applications are updatable with service role"
  ON public.adoption_applications FOR UPDATE
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "Adoption applications are deletable with service role"
  ON public.adoption_applications FOR DELETE
  USING (true); -- Permitir con API key de servicio

-- ============================================
-- COMENTARIOS EN LAS TABLAS
-- ============================================
COMMENT ON TABLE public.foundations IS 'Fundaciones y refugios de animales';
COMMENT ON TABLE public.pets IS 'Mascotas disponibles para adopción';
COMMENT ON TABLE public.adoption_applications IS 'Solicitudes de adopción de mascotas';

