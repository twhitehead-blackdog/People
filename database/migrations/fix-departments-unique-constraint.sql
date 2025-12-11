-- ============================================
-- MIGRACIÓN: Corregir Constraint UNIQUE en departments
-- ============================================
-- Este script cambia el constraint UNIQUE de departments.name
-- a UNIQUE(name, company_id) para permitir el mismo nombre
-- en diferentes empresas (multi-tenancy)
-- ============================================

DO $$
BEGIN
    -- Eliminar el constraint UNIQUE existente en name (si existe)
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'department_name_key' 
        AND conrelid = 'departments'::regclass
    ) THEN
        ALTER TABLE departments DROP CONSTRAINT department_name_key;
        RAISE NOTICE '✅ Constraint department_name_key eliminado';
    END IF;
    
    -- Crear el nuevo constraint UNIQUE compuesto (name, company_id)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'departments_name_company_id_key' 
        AND conrelid = 'departments'::regclass
    ) THEN
        ALTER TABLE departments 
        ADD CONSTRAINT departments_name_company_id_key 
        UNIQUE (name, company_id);
        RAISE NOTICE '✅ Constraint departments_name_company_id_key creado';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE 'Ahora se permite el mismo nombre de departamento en diferentes empresas';
    RAISE NOTICE '========================================';
END $$;

