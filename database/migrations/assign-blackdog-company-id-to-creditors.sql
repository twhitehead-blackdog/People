-- ============================================
-- MIGRACIÓN: Asignar company_id de Blackdog a creditors con NULL
-- ============================================
-- Este script asigna el company_id de Blackdog a todos los creditors
-- que actualmente tienen company_id NULL
-- 
-- IMPORTANTE: Ejecutar primero fix-banks-creditors-unique-constraint.sql
-- para cambiar el constraint a UNIQUE(name, company_id)
-- ============================================

-- ============================================
-- FUNCIÓN HELPER: Obtener company_id de Blackdog
-- ============================================
CREATE OR REPLACE FUNCTION get_blackdog_company_id()
RETURNS UUID AS $$
DECLARE
    bd_id UUID;
BEGIN
    SELECT id INTO bd_id
    FROM companies
    WHERE name ILIKE '%blackdog%'
       OR (name ILIKE '%black%' AND name ILIKE '%dog%')
    ORDER BY created_at ASC
    LIMIT 1;
    
    RETURN bd_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_blackdog_company_id() IS 'Retorna el UUID de la empresa Blackdog (Blackdog Panamá) para uso en migraciones';

DO $$
DECLARE
    blackdog_company_id UUID;
    creditors_updated INTEGER;
    trimmed_count INTEGER;
    dup_record RECORD;
    new_name TEXT;
    counter INTEGER;
    oldest_id UUID;
BEGIN
    -- ============================================
    -- 0. VERIFICAR/CREAR COLUMNA company_id EN creditors
    -- ============================================
    RAISE NOTICE '0. Verificando columna company_id en creditors...';
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'creditors' AND column_name = 'company_id'
    ) THEN
        RAISE NOTICE '   ⚠️ Columna company_id no existe, creándola...';
        ALTER TABLE creditors 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_creditors_company_id ON creditors(company_id);
        
        COMMENT ON COLUMN creditors.company_id IS 'ID de la empresa. NULL significa que el acreedor es compartido entre organizaciones';
        
        RAISE NOTICE '   ✅ Columna company_id creada en creditors';
    ELSE
        RAISE NOTICE '   ✅ Columna company_id ya existe en creditors';
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
    RAISE NOTICE '2. Limpiando espacios al final de los nombres de creditors...';
    
    UPDATE creditors
    SET name = TRIM(name)
    WHERE name != TRIM(name);
    
    GET DIAGNOSTICS trimmed_count = ROW_COUNT;
    IF trimmed_count > 0 THEN
        RAISE NOTICE '   ✅ Limpiados % nombres de creditors', trimmed_count;
    ELSE
        RAISE NOTICE '   ℹ️ No se encontraron nombres con espacios al final';
    END IF;
    
    -- ============================================
    -- 3. MANEJAR DUPLICADOS ANTES DE ASIGNAR COMPANY_ID
    -- ============================================
    RAISE NOTICE '3. Verificando duplicados antes de asignar company_id...';
    
    -- Buscar creditors que después de limpiar espacios tienen el mismo nombre
    -- pero diferentes company_id (uno NULL y otro con Blackdog)
    FOR dup_record IN 
        SELECT 
            c1.id as id1,
            c1.name as name1,
            c1.company_id as company_id1,
            c2.id as id2,
            c2.name as name2,
            c2.company_id as company_id2
        FROM creditors c1
        INNER JOIN creditors c2 ON c1.name = c2.name AND c1.id < c2.id
        WHERE (c1.company_id IS NULL AND c2.company_id = blackdog_company_id)
           OR (c1.company_id = blackdog_company_id AND c2.company_id IS NULL)
    LOOP
        -- Si uno es NULL y otro ya tiene Blackdog, mantener el que tiene Blackdog
        -- y eliminar el que tiene NULL (o renombrarlo si es necesario)
        IF dup_record.company_id1 = blackdog_company_id THEN
            -- El primero ya tiene Blackdog, eliminar el segundo (NULL)
            RAISE NOTICE '   ⚠️ Eliminando creditor duplicado "%" (id: %) que tiene NULL', dup_record.name2, dup_record.id2;
            DELETE FROM creditors WHERE id = dup_record.id2;
        ELSE
            -- El segundo tiene Blackdog, eliminar el primero (NULL)
            RAISE NOTICE '   ⚠️ Eliminando creditor duplicado "%" (id: %) que tiene NULL', dup_record.name1, dup_record.id1;
            DELETE FROM creditors WHERE id = dup_record.id1;
        END IF;
    END LOOP;
    
    -- Ahora manejar duplicados donde ambos tienen NULL (después de limpiar espacios)
    FOR dup_record IN 
        SELECT 
            c1.id as id1,
            c1.name as name1,
            c2.id as id2,
            c2.name as name2
        FROM creditors c1
        INNER JOIN creditors c2 ON c1.name = c2.name AND c1.id < c2.id
        WHERE c1.company_id IS NULL AND c2.company_id IS NULL
    LOOP
        -- Mantener el más antiguo, eliminar el más reciente
        IF dup_record.id1 < dup_record.id2 THEN
            RAISE NOTICE '   ⚠️ Eliminando creditor duplicado "%" (id: %) - se mantiene el más antiguo', dup_record.name2, dup_record.id2;
            DELETE FROM creditors WHERE id = dup_record.id2;
        ELSE
            RAISE NOTICE '   ⚠️ Eliminando creditor duplicado "%" (id: %) - se mantiene el más antiguo', dup_record.name1, dup_record.id1;
            DELETE FROM creditors WHERE id = dup_record.id1;
        END IF;
    END LOOP;
    
    -- ============================================
    -- 4. ASIGNAR COMPANY_ID A CREDITORS CON NULL
    -- ============================================
    RAISE NOTICE '4. Asignando company_id de Blackdog a creditors con NULL...';
    
    -- Actualizar creditors que tienen company_id NULL
    UPDATE creditors
    SET company_id = blackdog_company_id
    WHERE company_id IS NULL;
    
    GET DIAGNOSTICS creditors_updated = ROW_COUNT;
    RAISE NOTICE '   ✅ Actualizados % creditors', creditors_updated;
    
    -- ============================================
    -- 5. VERIFICAR DUPLICADOS FINALES (por si acaso)
    -- ============================================
    RAISE NOTICE '5. Verificando duplicados finales...';
    
    FOR dup_record IN 
        SELECT 
            c1.id as id1,
            c1.name as name1,
            c1.company_id as company_id1,
            c1.created_at as created_at1,
            c2.id as id2,
            c2.name as name2,
            c2.company_id as company_id2,
            c2.created_at as created_at2
        FROM creditors c1
        INNER JOIN creditors c2 ON c1.name = c2.name 
                            AND c1.company_id = c2.company_id 
                            AND c1.id < c2.id
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
            SELECT 1 FROM creditors
            WHERE name = new_name
            AND company_id = blackdog_company_id
        ) LOOP
            counter := counter + 1;
            new_name := dup_record.name1 || ' (' || counter || ')';
        END LOOP;
        
        -- Renombrar el duplicado más reciente
        IF oldest_id = dup_record.id1 THEN
            UPDATE creditors SET name = new_name WHERE id = dup_record.id2;
            RAISE NOTICE '   ⚠️ Creditor duplicado renombrado: "%" → "%" (id: %)', dup_record.name2, new_name, dup_record.id2;
        ELSE
            UPDATE creditors SET name = new_name WHERE id = dup_record.id1;
            RAISE NOTICE '   ⚠️ Creditor duplicado renombrado: "%" → "%" (id: %)', dup_record.name1, new_name, dup_record.id1;
        END IF;
    END LOOP;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE 'Total de creditors actualizados: %', creditors_updated;
    RAISE NOTICE 'Company ID de Blackdog: %', blackdog_company_id;
    RAISE NOTICE '========================================';
END $$;

