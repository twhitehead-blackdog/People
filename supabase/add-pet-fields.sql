-- ============================================
-- Migración: Agregar campos faltantes a la tabla pets
-- Ejecuta este script en Supabase SQL Editor
-- ============================================

-- Agregar campo weight (peso en kilogramos)
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS weight NUMERIC(5,2);

-- Agregar campo location_type (tipo de ubicación)
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS location_type TEXT;

-- Agregar campo location_detail (detalle específico de ubicación)
ALTER TABLE public.pets 
ADD COLUMN IF NOT EXISTS location_detail TEXT;

-- Comentarios en los nuevos campos
COMMENT ON COLUMN public.pets.weight IS 'Peso de la mascota en kilogramos';
COMMENT ON COLUMN public.pets.location_type IS 'Tipo de ubicación (Tienda, Sede, Hogar temporal, Refugio, etc.)';
COMMENT ON COLUMN public.pets.location_detail IS 'Detalle específico de la ubicación de la mascota';

