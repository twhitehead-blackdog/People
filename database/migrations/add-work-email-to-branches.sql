-- ============================================
-- Migración: Agregar work_email a branches
-- ============================================
-- Este script agrega el campo work_email a la tabla branches
-- Los correos de trabajo ahora están ligados a la sucursal
-- Esto permite que los supervisores que usan el correo de la sucursal
-- puedan ver solo los empleados y marcaciones de esa sucursal

-- Agregar columna work_email a branches
ALTER TABLE branches 
ADD COLUMN IF NOT EXISTS work_email VARCHAR(255) UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_branches_work_email ON branches(work_email);

-- Ejemplo de actualización de sucursales con sus correos:
-- UPDATE branches SET work_email = 'gerenciabdbdgolf@gmail.com' WHERE name LIKE '%Golf%' OR short_name = 'BDG';
-- UPDATE branches SET work_email = 'gerenciabdc50@gmail.com' WHERE name LIKE '%C50%' OR short_name = 'C50';
-- UPDATE branches SET work_email = 'gerenciabdbrisasnorte@gmail.com' WHERE name LIKE '%Brisas Norte%' OR short_name = 'BDBN';
-- ... (continuar con todas las sucursales)

