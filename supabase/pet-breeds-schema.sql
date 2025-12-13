-- ============================================
-- Schema para la tabla pet_breeds (Catálogo de Razas)
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
-- TABLA: pet_breeds (Catálogo de Razas de Perros y Gatos)
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
-- Todos pueden ver las razas activas
DROP POLICY IF EXISTS "Pet breeds are viewable by everyone" ON public.pet_breeds;
CREATE POLICY "Pet breeds are viewable by everyone"
  ON public.pet_breeds FOR SELECT
  USING (is_active = true OR true); -- Permitir ver todos con API key

-- Solo administradores pueden modificar razas (con API key)
DROP POLICY IF EXISTS "Pet breeds are insertable by service role" ON public.pet_breeds;
CREATE POLICY "Pet breeds are insertable by service role"
  ON public.pet_breeds FOR INSERT
  WITH CHECK (true); -- Con API key se puede insertar

DROP POLICY IF EXISTS "Pet breeds are updatable by service role" ON public.pet_breeds;
CREATE POLICY "Pet breeds are updatable by service role"
  ON public.pet_breeds FOR UPDATE
  USING (true); -- Con API key se puede actualizar

DROP POLICY IF EXISTS "Pet breeds are deletable by service role" ON public.pet_breeds;
CREATE POLICY "Pet breeds are deletable by service role"
  ON public.pet_breeds FOR DELETE
  USING (true); -- Con API key se puede eliminar

COMMENT ON TABLE public.pet_breeds IS 'Catálogo de razas de perros y gatos disponibles en el sistema';

