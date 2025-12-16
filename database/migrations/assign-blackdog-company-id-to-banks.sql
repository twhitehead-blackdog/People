-- ============================================
-- MIGRACIÓN: Asignar company_id de Blackdog a bancos con NULL
-- ============================================
-- Este script asigna el company_id de Blackdog a todos los bancos
-- que actualmente tienen company_id NULL
-- 
-- IMPORTANTE: Ejecutar primero fix-banks-creditors-unique-constraint.sql
-- para cambiar el constraint a UNIQUE(name, company_id)
-- ============================================

DO $$
DECLARE
    blackdog_company_id UUID;
    banks_updated INTEGER;
    trimmed_count INTEGER;
    dup_record RECORD;
    new_name TEXT;
    counter INTEGER;
    oldest_id UUID;
BEGIN
    -- ============================================
    -- 0. VERIFICAR/CREAR COLUMNA company_id EN banks
    -- ============================================
    RAISE NOTICE '0. Verificando columna company_id en banks...';
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'company_id'
    ) THEN
        RAISE NOTICE '   ⚠️ Columna company_id no existe, creándola...';
        ALTER TABLE banks 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_banks_company_id ON banks(company_id);
        
        COMMENT ON COLUMN banks.company_id IS 'ID de la empresa. NULL significa que el banco es compartido entre organizaciones';
        
        RAISE NOTICE '   ✅ Columna company_id creada en banks';
    ELSE
        RAISE NOTICE '   ✅ Columna company_id ya existe en banks';
    END IF;
    
    -- ============================================
    -- 1. OBTENER EL COMPANY_ID DE BLACKDOG
    -- ============================================
    RAISE NOTICE '1. Obteniendo company_id de Blackdog...';
    
    blackdog_company_id := get_blackdog_company_id();
    
    IF blackdog_company_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró la empresa Blackdog. Por favor verifica que exista en la tabla companies.';
    END IF;
    
    RAISE NOTICE '   ✅ Company ID de Blackdog encontrado: %', blackdog_company_id;
    
    -- ============================================
    -- 2. LIMPIAR ESPACIOS AL FINAL DE LOS NOMBRES
    -- ============================================
    RAISE NOTICE '2. Limpiando espacios al final de los nombres de bancos...';
    
    UPDATE banks
    SET name = TRIM(name)
    WHERE name != TRIM(name);
    
    GET DIAGNOSTICS trimmed_count = ROW_COUNT;
    IF trimmed_count > 0 THEN
        RAISE NOTICE '   ✅ Limpiados % nombres de bancos', trimmed_count;
    ELSE
        RAISE NOTICE '   ℹ️ No se encontraron nombres con espacios al final';
    END IF;
    
    -- ============================================
    -- 3. MANEJAR DUPLICADOS ANTES DE ASIGNAR COMPANY_ID
    -- ============================================
    RAISE NOTICE '3. Verificando duplicados antes de asignar company_id...';
    
    -- Buscar bancos que después de limpiar espacios tienen el mismo nombre
    -- pero diferentes company_id (uno NULL y otro con Blackdog)
    FOR dup_record IN 
        SELECT 
            b1.id as id1,
            b1.name as name1,
            b1.company_id as company_id1,
            b2.id as id2,
            b2.name as name2,
            b2.company_id as company_id2
        FROM banks b1
        INNER JOIN banks b2 ON b1.name = b2.name AND b1.id < b2.id
        WHERE (b1.company_id IS NULL AND b2.company_id = blackdog_company_id)
           OR (b1.company_id = blackdog_company_id AND b2.company_id IS NULL)
    LOOP
        -- Si uno es NULL y otro ya tiene Blackdog, mantener el que tiene Blackdog
        -- y eliminar el que tiene NULL (o renombrarlo si es necesario)
        IF dup_record.company_id1 = blackdog_company_id THEN
            -- El primero ya tiene Blackdog, eliminar el segundo (NULL)
            RAISE NOTICE '   ⚠️ Eliminando banco duplicado "%" (id: %) que tiene NULL', dup_record.name2, dup_record.id2;
            DELETE FROM banks WHERE id = dup_record.id2;
        ELSE
            -- El segundo tiene Blackdog, eliminar el primero (NULL)
            RAISE NOTICE '   ⚠️ Eliminando banco duplicado "%" (id: %) que tiene NULL', dup_record.name1, dup_record.id1;
            DELETE FROM banks WHERE id = dup_record.id1;
        END IF;
    END LOOP;
    
    -- Ahora manejar duplicados donde ambos tienen NULL (después de limpiar espacios)
    FOR dup_record IN 
        SELECT 
            b1.id as id1,
            b1.name as name1,
            b2.id as id2,
            b2.name as name2
        FROM banks b1
        INNER JOIN banks b2 ON b1.name = b2.name AND b1.id < b2.id
        WHERE b1.company_id IS NULL AND b2.company_id IS NULL
    LOOP
        -- Mantener el más antiguo, eliminar el más reciente
        IF dup_record.id1 < dup_record.id2 THEN
            RAISE NOTICE '   ⚠️ Eliminando banco duplicado "%" (id: %) - se mantiene el más antiguo', dup_record.name2, dup_record.id2;
            DELETE FROM banks WHERE id = dup_record.id2;
        ELSE
            RAISE NOTICE '   ⚠️ Eliminando banco duplicado "%" (id: %) - se mantiene el más antiguo', dup_record.name1, dup_record.id1;
            DELETE FROM banks WHERE id = dup_record.id1;
        END IF;
    END LOOP;
    
    -- ============================================
    -- 4. ASIGNAR COMPANY_ID A BANCOS CON NULL
    -- ============================================
    RAISE NOTICE '4. Asignando company_id de Blackdog a bancos con NULL...';
    
    -- Actualizar bancos que tienen company_id NULL
    UPDATE banks
    SET company_id = blackdog_company_id
    WHERE company_id IS NULL;
    
    GET DIAGNOSTICS banks_updated = ROW_COUNT;
    RAISE NOTICE '   ✅ Actualizados % bancos', banks_updated;
    
    -- ============================================
    -- 5. VERIFICAR DUPLICADOS FINALES (por si acaso)
    -- ============================================
    RAISE NOTICE '5. Verificando duplicados finales...';
    
    FOR dup_record IN 
        SELECT 
            b1.id as id1,
            b1.name as name1,
            b1.company_id as company_id1,
            b1.created_at as created_at1,
            b2.id as id2,
            b2.name as name2,
            b2.company_id as company_id2,
            b2.created_at as created_at2
        FROM banks b1
        INNER JOIN banks b2 ON b1.name = b2.name 
                            AND b1.company_id = b2.company_id 
                            AND b1.id < b2.id
    LOOP
        -- Mantener el más antiguo, renombrar el más reciente
        IF dup_record.created_at1 < dup_record.created_at2 THEN
            oldest_id := dup_record.id1;
            counter := 1;
            new_name := dup_record.name1 || ' (' || counter || ')';
        ELSE
            oldest_id := dup_record.id2;
            counter := 1;
            new_name := dup_record.name1 || ' (' || counter || ')';
        END IF;
        
        -- Buscar un nombre único
        WHILE EXISTS (
            SELECT 1 FROM banks
            WHERE name = new_name
            AND company_id = blackdog_company_id
        ) LOOP
            counter := counter + 1;
            new_name := dup_record.name1 || ' (' || counter || ')';
        END LOOP;
        
        -- Renombrar el duplicado más reciente
        IF oldest_id = dup_record.id1 THEN
            UPDATE banks SET name = new_name WHERE id = dup_record.id2;
            RAISE NOTICE '   ⚠️ Banco duplicado renombrado: "%" → "%" (id: %)', dup_record.name2, new_name, dup_record.id2;
        ELSE
            UPDATE banks SET name = new_name WHERE id = dup_record.id1;
            RAISE NOTICE '   ⚠️ Banco duplicado renombrado: "%" → "%" (id: %)', dup_record.name1, new_name, dup_record.id1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE 'Total de bancos actualizados: %', banks_updated;
    RAISE NOTICE 'Company ID de Blackdog: %', blackdog_company_id;
    RAISE NOTICE '========================================';
END $$;

