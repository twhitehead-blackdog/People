-- ============================================
-- MIGRACIÓN COMPLETA: work_email en branches
-- ============================================
-- EJECUTA ESTE SCRIPT COMPLETO EN EL SQL EDITOR DE SUPABASE
-- ============================================
-- Este script incluye:
-- 1. Crear la columna work_email
-- 2. Crear el índice
-- 3. Actualizar todas las sucursales con sus correos
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
-- PASO 2: Ver sucursales existentes (opcional)
-- ============================================
-- Descomenta la siguiente línea para ver todas las sucursales antes de actualizar
-- SELECT id, name, short_name, work_email FROM branches ORDER BY name;

-- ============================================
-- PASO 3: Actualizar correos de sucursales
-- ============================================

-- 1. Brisas Norte
UPDATE branches 
SET work_email = 'bdgerenciabrisasnorte@gmail.com' 
WHERE (name ILIKE '%Brisas Norte%' OR short_name = 'BDBN' OR short_name ILIKE '%brisas%norte%')
  AND work_email IS NULL;

-- 2. AF (Albrook o acrónimo AF)
UPDATE branches 
SET work_email = 'gerenciabdaf@gmail.com' 
WHERE (name ILIKE '%AF%' OR short_name = 'AF' OR name ILIKE '%Albrook%')
  AND work_email IS NULL;

-- 3. Golf (BDG)
UPDATE branches 
SET work_email = 'gerenciabdbdgolf@gmail.com' 
WHERE (name ILIKE '%Golf%' OR short_name = 'BDG' OR short_name ILIKE '%golf%')
  AND work_email IS NULL;

-- 4. Vista (BDV)
UPDATE branches 
SET work_email = 'gerenciabdbvista@gmail.com' 
WHERE (name ILIKE '%Vista%' OR short_name = 'BDV' OR short_name ILIKE '%vista%')
  AND work_email IS NULL;

-- 5. C50
UPDATE branches 
SET work_email = 'gerenciabdc50@gmail.com' 
WHERE (name ILIKE '%C50%' OR short_name = 'C50' OR short_name ILIKE '%c50%')
  AND work_email IS NULL;

-- 6. CDMAR (Centro de Mar o similar)
UPDATE branches 
SET work_email = 'gerenciabdcdmar@gmail.com' 
WHERE (name ILIKE '%CDMAR%' OR short_name = 'CDMAR' OR name ILIKE '%Centro%Mar%' OR name ILIKE '%Mar%')
  AND work_email IS NULL;

-- 7. Chiriquí
UPDATE branches 
SET work_email = 'gerenciabdchiriqui@gmail.com' 
WHERE (name ILIKE '%Chiriquí%' OR short_name ILIKE '%chiriqui%' OR name ILIKE '%Chiriqui%')
  AND work_email IS NULL;

-- 8. CV (Costa Verde o acrónimo CV)
UPDATE branches 
SET work_email = 'gerenciabdcv@gmail.com' 
WHERE (name ILIKE '%CV%' OR short_name = 'CV' OR name ILIKE '%Costa Verde%')
  AND work_email IS NULL;

-- 9. PE (acrónimo PE)
UPDATE branches 
SET work_email = 'gerenciabdpe@gmail.com' 
WHERE (name ILIKE '%PE%' OR short_name = 'PE')
  AND work_email IS NULL;

-- 10. SM (San Miguel o acrónimo SM)
UPDATE branches 
SET work_email = 'gerenciabdsm@gmail.com' 
WHERE (name ILIKE '%SM%' OR short_name = 'SM' OR name ILIKE '%San Miguel%')
  AND work_email IS NULL;

-- 11. Vzaita (Vía Zaita o similar)
UPDATE branches 
SET work_email = 'gerenciabdvzaita@gmail.com' 
WHERE (name ILIKE '%Vzaita%' OR short_name ILIKE '%vzaita%' OR name ILIKE '%Zaita%' OR name ILIKE '%Via Zaita%')
  AND work_email IS NULL;

-- 12. CDREY (Centro o acrónimo CDREY)
UPDATE branches 
SET work_email = 'gerenciacdrey@gmail.com' 
WHERE (name ILIKE '%CDREY%' OR short_name = 'CDREY' OR name ILIKE '%Rey%')
  AND work_email IS NULL;

-- 13. Plaza Versalles
UPDATE branches 
SET work_email = 'gerenciaplazaversalles@gmail.com' 
WHERE (name ILIKE '%Plaza Versalles%' OR name ILIKE '%Versalles%' OR short_name ILIKE '%versalles%')
  AND work_email IS NULL;

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

-- Ver sucursales sin correo asignado (requieren atención manual)
SELECT 
  id,
  name AS "Nombre Sucursal",
  short_name AS "Acrónimo"
FROM branches 
WHERE work_email IS NULL
ORDER BY name;

