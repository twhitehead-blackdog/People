-- ============================================
-- MIGRACIÓN: Agregar campo personality a las tablas
-- Ejecuta este script en tu base de datos de Supabase
-- ============================================

-- Agregar campo personality a la tabla pets
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS personality TEXT[];

-- Agregar campo personality a la tabla adoption_applications
ALTER TABLE public.adoption_applications 
ADD COLUMN IF NOT EXISTS personality TEXT[];

-- Comentarios
COMMENT ON COLUMN public.pets.personality IS 'Array de rasgos de personalidad de la mascota';
COMMENT ON COLUMN public.adoption_applications.personality IS 'Array de rasgos de personalidad preferidos por el adoptante';

