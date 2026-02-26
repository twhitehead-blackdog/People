-- ============================================
-- MIGRACIÓN: Corregir Constraint UNIQUE en banks y creditors
-- ============================================
-- Este script cambia el constraint UNIQUE de banks.name y creditors.name
-- a UNIQUE(name, company_id) para permitir el mismo nombre
-- en diferentes empresas o bancos compartidos (company_id NULL)
-- ============================================

DO $$
BEGIN
    -- ============================================
    -- 1. CORREGIR CONSTRAINT EN BANKS
    -- ============================================
    RAISE NOTICE '1. Corrigiendo constraint en banks...';
    
    -- Eliminar el constraint UNIQUE existente en name (si existe con diferentes nombres posibles)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'banks_name_key' 
        AND conrelid = 'banks'::regclass
    ) THEN
        ALTER TABLE banks DROP CONSTRAINT banks_name_key;
        RAISE NOTICE '   ✅ Constraint banks_name_key eliminado';
    END IF;
    
    -- También verificar si existe con otro nombre
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'banks'::regclass
        AND contype = 'u'
        AND array_length(conkey, 1) = 1
        AND (SELECT attname FROM pg_attribute WHERE attrelid = 'banks'::regclass AND attnum = conkey[1]) = 'name'
    ) THEN
        -- Obtener el nombre del constraint
        DECLARE
            constraint_name TEXT;
        BEGIN
            SELECT conname INTO constraint_name
            FROM pg_constraint 
            WHERE conrelid = 'banks'::regclass
            AND contype = 'u'
            AND array_length(conkey, 1) = 1
            AND (SELECT attname FROM pg_attribute WHERE attrelid = 'banks'::regclass AND attnum = conkey[1]) = 'name'
            LIMIT 1;
            
            IF constraint_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE banks DROP CONSTRAINT %I', constraint_name);
                RAISE NOTICE '   ✅ Constraint % eliminado', constraint_name;
            END IF;
        END;
    END IF;
    
    -- Crear el nuevo constraint UNIQUE compuesto (name, company_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'banks_name_company_id_key' 
        AND conrelid = 'banks'::regclass
    ) THEN
        ALTER TABLE banks 
        ADD CONSTRAINT banks_name_company_id_key 
        UNIQUE (name, company_id);
        RAISE NOTICE '   ✅ Constraint banks_name_company_id_key creado';
    ELSE
        RAISE NOTICE '   ℹ️ Constraint banks_name_company_id_key ya existe';
    END IF;
    
    -- ============================================
    -- 2. CORREGIR CONSTRAINT EN CREDITORS
    -- ============================================
    RAISE NOTICE '2. Corrigiendo constraint en creditors...';
    
    -- Eliminar el constraint UNIQUE existente en name (si existe con diferentes nombres posibles)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'creditors_name_key' 
        AND conrelid = 'creditors'::regclass
    ) THEN
        ALTER TABLE creditors DROP CONSTRAINT creditors_name_key;
        RAISE NOTICE '   ✅ Constraint creditors_name_key eliminado';
    END IF;
    
    -- También verificar si existe con otro nombre
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'creditors'::regclass
        AND contype = 'u'
        AND array_length(conkey, 1) = 1
        AND (SELECT attname FROM pg_attribute WHERE attrelid = 'creditors'::regclass AND attnum = conkey[1]) = 'name'
    ) THEN
        -- Obtener el nombre del constraint
        DECLARE
            constraint_name TEXT;
        BEGIN
            SELECT conname INTO constraint_name
            FROM pg_constraint 
            WHERE conrelid = 'creditors'::regclass
            AND contype = 'u'
            AND array_length(conkey, 1) = 1
            AND (SELECT attname FROM pg_attribute WHERE attrelid = 'creditors'::regclass AND attnum = conkey[1]) = 'name'
            LIMIT 1;
            
            IF constraint_name IS NOT NULL THEN
                EXECUTE format('ALTER TABLE creditors DROP CONSTRAINT %I', constraint_name);
                RAISE NOTICE '   ✅ Constraint % eliminado', constraint_name;
            END IF;
        END;
    END IF;
    
    -- Crear el nuevo constraint UNIQUE compuesto (name, company_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'creditors_name_company_id_key' 
        AND conrelid = 'creditors'::regclass
    ) THEN
        ALTER TABLE creditors 
        ADD CONSTRAINT creditors_name_company_id_key 
        UNIQUE (name, company_id);
        RAISE NOTICE '   ✅ Constraint creditors_name_company_id_key creado';
    ELSE
        RAISE NOTICE '   ℹ️ Constraint creditors_name_company_id_key ya existe';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE 'Ahora se permite el mismo nombre de banco/acreedor en diferentes empresas o compartidos';
    RAISE NOTICE '========================================';
END $$;

