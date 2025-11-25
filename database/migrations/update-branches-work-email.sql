-- ============================================
-- Actualizar correos de trabajo de sucursales
-- ============================================
-- EJECUTA ESTE SCRIPT DESPUÉS DE LA MIGRACIÓN
-- ============================================
-- Este script asigna los correos de trabajo a las sucursales
-- Basado en los acrónimos y nombres de las sucursales

-- Primero, veamos todas las sucursales para identificar cuáles necesitan correo
SELECT id, name, short_name, work_email 
FROM branches 
ORDER BY name;

-- ============================================
-- ACTUALIZACIONES DE SUCURSALES
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
-- VERIFICACIÓN FINAL
-- ============================================
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

