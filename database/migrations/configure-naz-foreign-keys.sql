-- ============================================
-- CONFIGURAR FOREIGN KEYS COMO RELACIONES EN SUPABASE
-- ============================================
-- Este script configura las foreign keys de las tablas naz_* como relaciones
-- para que Supabase pueda resolver los joins automáticamente
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Nota: Las foreign keys ya están creadas en create-naz-marcacion-tables.sql
-- Este script solo verifica que estén correctamente configuradas

-- Verificar que las foreign keys existan
DO $$
BEGIN
    -- Verificar foreign key de naz_branches -> naz_companies
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_branches_company_id_fkey'
        AND table_name = 'naz_branches'
    ) THEN
        RAISE NOTICE 'Foreign key naz_branches_company_id_fkey no encontrada';
    END IF;

    -- Verificar foreign key de naz_positions -> naz_departments
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_positions_department_id_fkey'
        AND table_name = 'naz_positions'
    ) THEN
        RAISE NOTICE 'Foreign key naz_positions_department_id_fkey no encontrada';
    END IF;

    -- Verificar foreign key de naz_employees -> naz_branches
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_employees_branch_id_fkey'
        AND table_name = 'naz_employees'
    ) THEN
        RAISE NOTICE 'Foreign key naz_employees_branch_id_fkey no encontrada';
    END IF;

    -- Verificar foreign key de naz_employees -> naz_departments
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_employees_department_id_fkey'
        AND table_name = 'naz_employees'
    ) THEN
        RAISE NOTICE 'Foreign key naz_employees_department_id_fkey no encontrada';
    END IF;

    -- Verificar foreign key de naz_employees -> naz_positions
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'naz_employees_position_id_fkey'
        AND table_name = 'naz_employees'
    ) THEN
        RAISE NOTICE 'Foreign key naz_employees_position_id_fkey no encontrada';
    END IF;

    RAISE NOTICE 'Verificación de foreign keys completada';
END $$;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Las foreign keys deben estar creadas correctamente
-- 2. Supabase detecta automáticamente las relaciones basándose en las foreign keys
-- 3. Si las relaciones no funcionan, verifica en el dashboard de Supabase:
--    - Ve a Table Editor
--    - Selecciona la tabla (ej: naz_employees)
--    - Ve a la pestaña "Relationships"
--    - Verifica que las relaciones estén listadas
-- 4. Si las relaciones no aparecen, puede ser necesario:
--    - Refrescar el esquema en Supabase
--    - O recrear las foreign keys con nombres explícitos
-- ============================================

