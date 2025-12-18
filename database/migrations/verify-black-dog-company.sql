-- ============================================
-- VERIFICAR Y CREAR EMPRESA "Black Dog" SI NO EXISTE
-- ============================================
-- Este script verifica si existe la empresa "Black Dog" 
-- y la crea si no existe.
--
-- INSTRUCCIONES:
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Verificar si existe alguna empresa con "black" y "dog" en el nombre
SELECT 
  id, 
  name, 
  created_at
FROM companies
WHERE LOWER(name) LIKE '%black%' 
  AND LOWER(name) LIKE '%dog%'
ORDER BY created_at ASC
LIMIT 5;

-- Si no existe ninguna empresa con "black" y "dog", crear "Black Dog"
-- NOTA: La tabla companies no tiene columna updated_at según el esquema
INSERT INTO companies (name, is_active, created_at)
SELECT 
  'Black Dog',
  true,
  NOW()
WHERE NOT EXISTS (
  SELECT 1 
  FROM companies 
  WHERE LOWER(name) LIKE '%black%' 
    AND LOWER(name) LIKE '%dog%'
)
RETURNING id, name;

-- Verificar el resultado
SELECT 
  id, 
  name, 
  is_active,
  created_at
FROM companies
WHERE LOWER(name) LIKE '%black%' 
  AND LOWER(name) LIKE '%dog%'
ORDER BY created_at ASC;

