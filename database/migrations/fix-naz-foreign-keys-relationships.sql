-- ============================================
-- FIX: CONFIGURAR FOREIGN KEYS COMO RELACIONES EN SUPABASE
-- ============================================
-- Este script asegura que las foreign keys estén correctamente configuradas
-- para que Supabase pueda resolver los joins automáticamente
-- ============================================

-- Nota: Supabase detecta automáticamente las relaciones basándose en las foreign keys
-- Si las relaciones no funcionan, puede ser necesario:
-- 1. Verificar que las foreign keys existan
-- 2. Refrescar el esquema en Supabase Dashboard
-- 3. O recrear las foreign keys con nombres explícitos

-- ============================================
-- 1. VERIFICAR Y RECREAR FOREIGN KEYS SI ES NECESARIO
-- ============================================

-- Eliminar foreign keys existentes si tienen nombres incorrectos
DO $$
BEGIN
    -- Eliminar constraint si existe con nombre incorrecto
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_branches_company_id_fkey'
        AND table_name = 'naz_branches'
    ) THEN
        ALTER TABLE naz_branches DROP CONSTRAINT IF EXISTS naz_branches_company_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_positions_department_id_fkey'
        AND table_name = 'naz_positions'
    ) THEN
        ALTER TABLE naz_positions DROP CONSTRAINT IF EXISTS naz_positions_department_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_employees_branch_id_fkey'
        AND table_name = 'naz_employees'
    ) THEN
        ALTER TABLE naz_employees DROP CONSTRAINT IF EXISTS naz_employees_branch_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_employees_department_id_fkey'
        AND table_name = 'naz_employees'
    ) THEN
        ALTER TABLE naz_employees DROP CONSTRAINT IF EXISTS naz_employees_department_id_fkey;
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_employees_position_id_fkey'
        AND table_name = 'naz_employees'
    ) THEN
        ALTER TABLE naz_employees DROP CONSTRAINT IF EXISTS naz_employees_position_id_fkey;
    END IF;
END $$;

-- Recrear foreign keys con nombres explícitos
ALTER TABLE naz_branches 
ADD CONSTRAINT naz_branches_company_id_fkey 
FOREIGN KEY (company_id) REFERENCES naz_companies(id) ON DELETE RESTRICT;

ALTER TABLE naz_positions 
ADD CONSTRAINT naz_positions_department_id_fkey 
FOREIGN KEY (department_id) REFERENCES naz_departments(id) ON DELETE RESTRICT;

ALTER TABLE naz_employees 
ADD CONSTRAINT naz_employees_branch_id_fkey 
FOREIGN KEY (branch_id) REFERENCES naz_branches(id) ON DELETE RESTRICT;

ALTER TABLE naz_employees 
ADD CONSTRAINT naz_employees_department_id_fkey 
FOREIGN KEY (department_id) REFERENCES naz_departments(id) ON DELETE RESTRICT;

ALTER TABLE naz_employees 
ADD CONSTRAINT naz_employees_position_id_fkey 
FOREIGN KEY (position_id) REFERENCES naz_positions(id) ON DELETE RESTRICT;

-- ============================================
-- 2. VERIFICAR QUE LAS FOREIGN KEYS ESTÉN CREADAS
-- ============================================

DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    -- Contar foreign keys en naz_branches
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'naz_branches';
    
    IF fk_count = 0 THEN
        RAISE WARNING 'No se encontraron foreign keys en naz_branches';
    ELSE
        RAISE NOTICE 'Foreign keys en naz_branches: %', fk_count;
    END IF;
    
    -- Contar foreign keys en naz_positions
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'naz_positions';
    
    IF fk_count = 0 THEN
        RAISE WARNING 'No se encontraron foreign keys en naz_positions';
    ELSE
        RAISE NOTICE 'Foreign keys en naz_positions: %', fk_count;
    END IF;
    
    -- Contar foreign keys en naz_employees
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'naz_employees';
    
    IF fk_count < 3 THEN
        RAISE WARNING 'Se esperaban al menos 3 foreign keys en naz_employees, se encontraron: %', fk_count;
    ELSE
        RAISE NOTICE 'Foreign keys en naz_employees: %', fk_count;
    END IF;
END $$;

-- ============================================
-- 3. INSTRUCCIONES PARA SUPABASE DASHBOARD
-- ============================================
-- Después de ejecutar este script:
-- 
-- 1. Ve al Dashboard de Supabase
-- 2. Navega a "Table Editor"
-- 3. Selecciona la tabla "naz_employees"
-- 4. Ve a la pestaña "Relationships"
-- 5. Verifica que aparezcan las relaciones:
--    - naz_employees.branch_id -> naz_branches.id
--    - naz_employees.department_id -> naz_departments.id
--    - naz_employees.position_id -> naz_positions.id
-- 
-- Si las relaciones no aparecen:
-- 1. Refresca la página
-- 2. O ve a "Database" > "Relationships" y verifica manualmente
-- 3. Si aún no aparecen, puede ser necesario recrear las tablas
-- 
-- ============================================

