-- ============================================
-- FIX: NOMBRAR FOREIGN KEYS DE TIMEOFFS CORRECTAMENTE PARA SUPABASE
-- ============================================
-- Este script asegura que las foreign keys de la tabla timeoffs
-- tengan los nombres correctos que Supabase espera para resolver relaciones
-- ============================================

-- 1. ELIMINAR FOREIGN KEYS EXISTENTES SI TIENEN NOMBRES INCORRECTOS
DO $$
DECLARE
    constraint_name_var TEXT;
BEGIN
    -- Buscar y eliminar foreign key de employee_id si existe con nombre incorrecto
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'timeoffs'
        AND kcu.column_name = 'employee_id'
        AND tc.constraint_name != 'time_offs_employee_id_fkey';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE timeoffs DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
        RAISE NOTICE 'Eliminada foreign key antigua de employee_id: %', constraint_name_var;
    END IF;
    
    -- Buscar y eliminar foreign key de reviewed_by si existe con nombre incorrecto
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'timeoffs'
        AND kcu.column_name = 'reviewed_by'
        AND tc.constraint_name != 'timeoffs_reviewed_by_fkey';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE timeoffs DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
        RAISE NOTICE 'Eliminada foreign key antigua de reviewed_by: %', constraint_name_var;
    END IF;
    
    -- Buscar y eliminar foreign key de registered_by si existe con nombre incorrecto
    SELECT constraint_name INTO constraint_name_var
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = 'timeoffs'
        AND kcu.column_name = 'registered_by'
        AND tc.constraint_name != 'timeoffs_registered_by_fkey';
    
    IF constraint_name_var IS NOT NULL THEN
        EXECUTE format('ALTER TABLE timeoffs DROP CONSTRAINT IF EXISTS %I', constraint_name_var);
        RAISE NOTICE 'Eliminada foreign key antigua de registered_by: %', constraint_name_var;
    END IF;
END $$;

-- 2. RECREAR FOREIGN KEYS CON NOMBRES CORRECTOS
-- Nota: Solo creamos si no existen ya con el nombre correcto

-- Foreign key para employee_id (nombre esperado por Supabase: time_offs_employee_id_fkey)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'time_offs_employee_id_fkey'
        AND table_name = 'timeoffs'
    ) THEN
        ALTER TABLE timeoffs 
        ADD CONSTRAINT time_offs_employee_id_fkey 
        FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE;
        RAISE NOTICE 'Creada foreign key time_offs_employee_id_fkey';
    ELSE
        RAISE NOTICE 'Foreign key time_offs_employee_id_fkey ya existe';
    END IF;
END $$;

-- Foreign key para reviewed_by (nombre esperado por Supabase: timeoffs_reviewed_by_fkey)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'timeoffs_reviewed_by_fkey'
        AND table_name = 'timeoffs'
    ) THEN
        ALTER TABLE timeoffs 
        ADD CONSTRAINT timeoffs_reviewed_by_fkey 
        FOREIGN KEY (reviewed_by) REFERENCES employees(id) ON DELETE SET NULL;
        RAISE NOTICE 'Creada foreign key timeoffs_reviewed_by_fkey';
    ELSE
        RAISE NOTICE 'Foreign key timeoffs_reviewed_by_fkey ya existe';
    END IF;
END $$;

-- Foreign key para registered_by (nombre esperado por Supabase: timeoffs_registered_by_fkey)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'timeoffs_registered_by_fkey'
        AND table_name = 'timeoffs'
    ) THEN
        ALTER TABLE timeoffs 
        ADD CONSTRAINT timeoffs_registered_by_fkey 
        FOREIGN KEY (registered_by) REFERENCES employees(id) ON DELETE SET NULL;
        RAISE NOTICE 'Creada foreign key timeoffs_registered_by_fkey';
    ELSE
        RAISE NOTICE 'Foreign key timeoffs_registered_by_fkey ya existe';
    END IF;
END $$;

-- 3. VERIFICAR QUE LAS FOREIGN KEYS ESTÉN CORRECTAMENTE CREADAS
DO $$
DECLARE
    fk_count INTEGER;
    fk_names TEXT[];
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '=== VERIFICANDO FOREIGN KEYS DE TIMEOFFS ===';
    
    -- Listar todas las foreign keys de timeoffs
    SELECT array_agg(constraint_name ORDER BY constraint_name) INTO fk_names
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'timeoffs';
    
    SELECT COUNT(*) INTO fk_count
    FROM information_schema.table_constraints 
    WHERE constraint_type = 'FOREIGN KEY'
        AND table_name = 'timeoffs';
    
    IF fk_count >= 3 THEN
        RAISE NOTICE '✅ timeoffs tiene % foreign key(s): %', fk_count, array_to_string(fk_names, ', ');
    ELSE
        RAISE WARNING '❌ timeoffs tiene solo % foreign key(s) (esperado: mínimo 3)', fk_count;
    END IF;
    
    -- Verificar nombres específicos
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'time_offs_employee_id_fkey'
        AND table_name = 'timeoffs'
    ) THEN
        RAISE NOTICE '✅ time_offs_employee_id_fkey existe';
    ELSE
        RAISE WARNING '❌ time_offs_employee_id_fkey NO existe';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'timeoffs_reviewed_by_fkey'
        AND table_name = 'timeoffs'
    ) THEN
        RAISE NOTICE '✅ timeoffs_reviewed_by_fkey existe';
    ELSE
        RAISE WARNING '❌ timeoffs_reviewed_by_fkey NO existe';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'timeoffs_registered_by_fkey'
        AND table_name = 'timeoffs'
    ) THEN
        RAISE NOTICE '✅ timeoffs_registered_by_fkey existe';
    ELSE
        RAISE WARNING '❌ timeoffs_registered_by_fkey NO existe';
    END IF;
END $$;

-- ============================================
-- INSTRUCCIONES POST-EJECUCIÓN
-- ============================================
-- Después de ejecutar este script:
-- 1. Ve al Dashboard de Supabase
-- 2. Ve a Database > Relationships
-- 3. Refresca el esquema o espera unos minutos para que Supabase detecte los cambios
-- 4. Verifica que las relaciones aparezcan correctamente
-- ============================================

