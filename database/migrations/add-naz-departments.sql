-- ============================================
-- Crear departamentos en Naz
-- ============================================
-- Este script crea los departamentos comunes en naz_departments
-- Ejecutar en el SQL Editor de Supabase
-- Solo crea los departamentos que no existan (evita duplicados)

-- Insertar departamentos comunes
INSERT INTO naz_departments (name)
SELECT 'Administración'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Administración');

INSERT INTO naz_departments (name)
SELECT 'Ventas'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Ventas');

INSERT INTO naz_departments (name)
SELECT 'Tienda'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Tienda');

INSERT INTO naz_departments (name)
SELECT 'Operaciones'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Operaciones');

INSERT INTO naz_departments (name)
SELECT 'Recursos Humanos'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Recursos Humanos');

INSERT INTO naz_departments (name)
SELECT 'Contabilidad'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Contabilidad');

INSERT INTO naz_departments (name)
SELECT 'Mercadeo'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Mercadeo');

INSERT INTO naz_departments (name)
SELECT 'Compras'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Compras');

INSERT INTO naz_departments (name)
SELECT 'Distribución'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Distribución');

INSERT INTO naz_departments (name)
SELECT 'Tecnología'
WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Tecnología');

-- Mostrar los departamentos creados
SELECT 
    id,
    name,
    created_at
FROM naz_departments
ORDER BY name;

-- Nota: Si necesitas agregar más departamentos, simplemente copia el patrón:
-- INSERT INTO naz_departments (name)
-- SELECT 'Nombre del Departamento'
-- WHERE NOT EXISTS (SELECT 1 FROM naz_departments WHERE name = 'Nombre del Departamento');

