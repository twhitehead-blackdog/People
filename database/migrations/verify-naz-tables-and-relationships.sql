-- ============================================
-- VERIFICAR TABLAS Y RELACIONES DE NAZ
-- ============================================
-- Este script verifica que todas las tablas naz_* existan
-- y que las foreign keys estén correctamente configuradas
-- ============================================

-- 1. Verificar que las tablas existan
DO $$
BEGIN
    RAISE NOTICE '=== VERIFICANDO TABLAS NAZ ===';
    
    -- Verificar naz_companies
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'naz_companies') THEN
        RAISE NOTICE '✅ naz_companies existe';
    ELSE
        RAISE WARNING '❌ naz_companies NO existe';
    END IF;
    
    -- Verificar naz_branches
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'naz_branches') THEN
        RAISE NOTICE '✅ naz_branches existe';
    ELSE
        RAISE WARNING '❌ naz_branches NO existe';
    END IF;
    
    -- Verificar naz_departments
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'naz_departments') THEN
        RAISE NOTICE '✅ naz_departments existe';
    ELSE
        RAISE WARNING '❌ naz_departments NO existe';
    END IF;
    
    -- Verificar naz_positions
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'naz_positions') THEN
        RAISE NOTICE '✅ naz_positions existe';
    ELSE
        RAISE WARNING '❌ naz_positions NO existe';
    END IF;
    
    -- Verificar naz_employees
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'naz_employees') THEN
        RAISE NOTICE '✅ naz_employees existe';
    ELSE
        RAISE WARNING '❌ naz_employees NO existe';
    END IF;
END $$;

-- 2. Verificar foreign keys
DO $$
DECLARE
    fk_count INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICANDO FOREIGN KEYS ===';
    
    -- Foreign keys en naz_branches
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'naz_branches';
    
    IF fk_count > 0 THEN
        RAISE NOTICE '✅ naz_branches tiene % foreign key(s)', fk_count;
    ELSE
        RAISE WARNING '❌ naz_branches NO tiene foreign keys';
    END IF;
    
    -- Foreign keys en naz_positions
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'naz_positions';
    
    IF fk_count > 0 THEN
        RAISE NOTICE '✅ naz_positions tiene % foreign key(s)', fk_count;
    ELSE
        RAISE WARNING '❌ naz_positions NO tiene foreign keys';
    END IF;
    
    -- Foreign keys en naz_employees (debería tener 3 o 4: branch_id, department_id, position_id, y opcionalmente company_id)
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
    AND table_name = 'naz_employees';
    
    IF fk_count >= 3 THEN
        RAISE NOTICE '✅ naz_employees tiene % foreign key(s) (mínimo esperado: 3)', fk_count;
    ELSE
        RAISE WARNING '❌ naz_employees tiene solo % foreign key(s) (esperado: mínimo 3)', fk_count;
    END IF;
END $$;

-- 3. Listar todas las foreign keys de naz_employees
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'naz_employees'
ORDER BY tc.constraint_name;

-- 4. Verificar RLS (Row Level Security)
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICANDO RLS ===';
    
    -- Verificar si RLS está habilitado en naz_employees
    IF EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'naz_employees' 
        AND rowsecurity = true
    ) THEN
        RAISE NOTICE '⚠️  RLS está habilitado en naz_employees';
        RAISE NOTICE '   Verifica que las políticas permitan SELECT';
    ELSE
        RAISE NOTICE '✅ RLS NO está habilitado en naz_employees (o la tabla no existe)';
    END IF;
END $$;

-- 5. Verificar columnas requeridas en naz_employees
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICANDO COLUMNAS EN naz_employees ===';
    
    -- Verificar company_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'naz_employees' AND column_name = 'company_id'
    ) THEN
        RAISE NOTICE '✅ company_id existe';
    ELSE
        RAISE WARNING '❌ company_id NO existe - Ejecuta add-missing-columns-to-naz-employees.sql';
    END IF;
    
    -- Verificar has_portal_access
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'naz_employees' AND column_name = 'has_portal_access'
    ) THEN
        RAISE NOTICE '✅ has_portal_access existe';
    ELSE
        RAISE WARNING '❌ has_portal_access NO existe - Ejecuta add-missing-columns-to-naz-employees.sql';
    END IF;
    
    -- Verificar account_approved
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'naz_employees' AND column_name = 'account_approved'
    ) THEN
        RAISE NOTICE '✅ account_approved existe';
    ELSE
        RAISE WARNING '❌ account_approved NO existe - Ejecuta add-missing-columns-to-naz-employees.sql';
    END IF;
END $$;

-- 6. Contar registros en cada tabla
DO $$
DECLARE
    count_companies INTEGER;
    count_branches INTEGER;
    count_departments INTEGER;
    count_positions INTEGER;
    count_employees INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== CONTEO DE REGISTROS ===';
    
    SELECT COUNT(*) INTO count_companies FROM naz_companies;
    RAISE NOTICE 'naz_companies: % registros', count_companies;
    
    SELECT COUNT(*) INTO count_branches FROM naz_branches;
    RAISE NOTICE 'naz_branches: % registros', count_branches;
    
    SELECT COUNT(*) INTO count_departments FROM naz_departments;
    RAISE NOTICE 'naz_departments: % registros', count_departments;
    
    SELECT COUNT(*) INTO count_positions FROM naz_positions;
    RAISE NOTICE 'naz_positions: % registros', count_positions;
    
    SELECT COUNT(*) INTO count_employees FROM naz_employees;
    RAISE NOTICE 'naz_employees: % registros', count_employees;
END $$;

-- ============================================
-- RESUMEN
-- ============================================
-- Si todas las verificaciones pasan pero aún tienes error 400:
-- 1. Ejecuta add-missing-columns-to-naz-employees.sql para agregar las columnas faltantes
-- 2. Refresca el esquema en Supabase Dashboard
-- 3. Ve a Database > Relationships y verifica que aparezcan las relaciones
-- 4. Si las relaciones no aparecen, ejecuta fix-naz-foreign-keys-relationships.sql
-- ============================================


