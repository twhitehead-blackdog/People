-- ============================================
-- MIGRACIÓN COMPLETA: work_email en branches
-- ============================================
-- EJECUTA ESTE SCRIPT COMPLETO EN EL SQL EDITOR DE SUPABASE
-- ============================================
-- Este script incluye:
-- 1. Crear la columna work_email
-- 2. Crear el índice
-- 3. Actualizar sucursales con sus correos
-- ============================================

-- ============================================
-- PASO 1: Crear columna e índice
-- ============================================

-- Agregar columna work_email a branches
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS work_email VARCHAR(255) UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_branches_work_email ON branches(work_email);

-- ============================================
-- PASO 2: Ver sucursales existentes
-- ============================================
-- Descomenta la siguiente línea para ver todas las sucursales antes de actualizar
-- SELECT id, name, short_name, work_email FROM branches ORDER BY name;

-- ============================================
-- PASO 3: Actualizar correos de sucursales
-- ============================================
-- Actualiza los correos según los acrónimos y nombres de las sucursales
-- Ajusta estos UPDATE según tus sucursales reales

-- Ejemplo 1: Golf (BDG)
UPDATE branches 
SET work_email = 'gerenciabdbdgolf@gmail.com' 
WHERE (name ILIKE '%Golf%' OR short_name = 'BDG' OR short_name ILIKE '%golf%')
  AND work_email IS NULL;

-- Ejemplo 2: C50
UPDATE branches 
SET work_email = 'gerenciabdc50@gmail.com' 
WHERE (name ILIKE '%C50%' OR short_name = 'C50' OR short_name ILIKE '%c50%')
  AND work_email IS NULL;

-- Ejemplo 3: Brisas Norte (BDBN)
UPDATE branches 
SET work_email = 'gerenciabdbrisasnorte@gmail.com' 
WHERE (name ILIKE '%Brisas Norte%' OR short_name = 'BDBN' OR short_name ILIKE '%brisas%norte%')
  AND work_email IS NULL;

-- ============================================
-- AGREGAR MÁS SUCURSALES AQUÍ
-- ============================================
-- Copia y pega el patrón de arriba para cada sucursal adicional
-- Ejemplo:
-- UPDATE branches 
-- SET work_email = 'gerenciabdbd[acronimo]@gmail.com' 
-- WHERE (name ILIKE '%[Nombre]%' OR short_name = '[ACRONIMO]')
--   AND work_email IS NULL;

-- ============================================
-- PASO 4: Verificación
-- ============================================

-- Verificar que se creó correctamente la columna
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'branches' AND column_name = 'work_email';

-- Ver todas las sucursales con sus correos asignados
SELECT 
  id,
  name AS "Nombre Sucursal",
  short_name AS "Acrónimo",
  work_email AS "Correo de Trabajo",
  CASE 
    WHEN work_email IS NULL THEN '⚠️ Sin correo asignado'
    ELSE '✅ Correo asignado'
  END AS "Estado"
FROM branches 
ORDER BY 
  CASE WHEN work_email IS NULL THEN 0 ELSE 1 END,
  name;

-- Ver sucursales sin correo asignado (requieren atención)
SELECT 
  id,
  name AS "Nombre Sucursal",
  short_name AS "Acrónimo"
FROM branches 
WHERE work_email IS NULL
ORDER BY name;

