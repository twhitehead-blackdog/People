-- ============================================
-- MIGRACIÓN: Asignar company_id a Registros Existentes
-- ============================================
-- Este script asigna company_id a todos los registros existentes de Black Dog
-- y obtiene el company_id de Naz para uso en migraciones posteriores
-- Ejecuta este script DESPUÉS de add-company-id-to-shared-tables.sql
-- ============================================

DO $$
DECLARE
    naz_company_id UUID;
    blackdog_company_id UUID;
    record_count INTEGER;
BEGIN
    -- ============================================
    -- 1. OBTENER O CREAR company_id DE NAZ
    -- ============================================
    SELECT id INTO naz_company_id
    FROM companies
    WHERE name ILIKE '%naz%'
    LIMIT 1;
    
    IF naz_company_id IS NULL THEN
        RAISE WARNING 'No se encontró empresa con nombre "Naz". Por favor, créala manualmente o actualiza este script.';
    ELSE
        RAISE NOTICE '✅ Company ID de Naz encontrado: %', naz_company_id;
    END IF;
    
    -- ============================================
    -- 2. OBTENER O CREAR company_id DE BLACK DOG
    -- ============================================
    SELECT id INTO blackdog_company_id
    FROM companies
    WHERE name ILIKE '%black%dog%' OR name ILIKE '%blackdog%'
    LIMIT 1;
    
    IF blackdog_company_id IS NULL THEN
        -- Crear empresa Black Dog si no existe
        INSERT INTO companies (id, name, is_active)
        VALUES (uuid_generate_v4(), 'Black Dog', true)
        RETURNING id INTO blackdog_company_id;
        
        RAISE NOTICE '✅ Empresa Black Dog creada con ID: %', blackdog_company_id;
    ELSE
        RAISE NOTICE '✅ Company ID de Black Dog encontrado: %', blackdog_company_id;
    END IF;
    
    -- ============================================
    -- 3. ASIGNAR company_id A REGISTROS EXISTENTES DE BLACK DOG
    -- ============================================
    
    -- Asignar a employees (solo los que no tienen company_id)
    UPDATE employees
    SET company_id = blackdog_company_id
    WHERE company_id IS NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE '✅ Asignados % empleados a Black Dog', record_count;
    
    -- Asignar a branches (solo los que no tienen company_id)
    UPDATE branches
    SET company_id = blackdog_company_id
    WHERE company_id IS NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE '✅ Asignadas % sucursales a Black Dog', record_count;
    
    -- Asignar a departments (solo los que no tienen company_id)
    UPDATE departments
    SET company_id = blackdog_company_id
    WHERE company_id IS NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE '✅ Asignados % departamentos a Black Dog', record_count;
    
    -- Asignar a positions (solo los que no tienen company_id)
    UPDATE positions
    SET company_id = blackdog_company_id
    WHERE company_id IS NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE '✅ Asignadas % posiciones a Black Dog', record_count;
    
    -- Asignar a schedules (solo los que no tienen company_id)
    UPDATE schedules
    SET company_id = blackdog_company_id
    WHERE company_id IS NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE '✅ Asignados % horarios a Black Dog', record_count;
    
    -- Asignar a employee_schedules (solo los que no tienen company_id)
    -- Usar el company_id del empleado relacionado
    -- Deshabilitar temporalmente el trigger de updated_at para evitar conflictos
    ALTER TABLE employee_schedules DISABLE TRIGGER update_employee_schedules_updated_at;
    
    UPDATE employee_schedules es
    SET company_id = e.company_id
    FROM employees e
    WHERE es.employee_id = e.id
    AND es.company_id IS NULL
    AND e.company_id IS NOT NULL;
    
    -- Rehabilitar el trigger
    ALTER TABLE employee_schedules ENABLE TRIGGER update_employee_schedules_updated_at;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE '✅ Asignados % horarios de empleados a Black Dog', record_count;
    
    -- Asignar a attendance_sheets (solo los que no tienen company_id)
    -- Usar el company_id del empleado relacionado
    UPDATE attendance_sheets att_sheets
    SET company_id = e.company_id
    FROM employees e
    WHERE att_sheets.employee_id = e.id
    AND att_sheets.company_id IS NULL
    AND e.company_id IS NOT NULL;
    
    GET DIAGNOSTICS record_count = ROW_COUNT;
    RAISE NOTICE '✅ Asignadas % hojas de asistencia a Black Dog', record_count;
    
    -- ============================================
    -- 4. VERIFICACIÓN
    -- ============================================
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN DE ASIGNACIONES';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Black Dog Company ID: %', blackdog_company_id;
    IF naz_company_id IS NOT NULL THEN
        RAISE NOTICE 'Naz Company ID: %', naz_company_id;
    END IF;
    RAISE NOTICE '';
    RAISE NOTICE 'Registros sin company_id restantes:';
    
    SELECT COUNT(*) INTO record_count FROM employees WHERE company_id IS NULL;
    IF record_count > 0 THEN
        RAISE WARNING '  - employees: % registros sin company_id', record_count;
    END IF;
    
    SELECT COUNT(*) INTO record_count FROM branches WHERE company_id IS NULL;
    IF record_count > 0 THEN
        RAISE WARNING '  - branches: % registros sin company_id', record_count;
    END IF;
    
    SELECT COUNT(*) INTO record_count FROM departments WHERE company_id IS NULL;
    IF record_count > 0 THEN
        RAISE WARNING '  - departments: % registros sin company_id', record_count;
    END IF;
    
    SELECT COUNT(*) INTO record_count FROM positions WHERE company_id IS NULL;
    IF record_count > 0 THEN
        RAISE WARNING '  - positions: % registros sin company_id', record_count;
    END IF;
    
    SELECT COUNT(*) INTO record_count FROM schedules WHERE company_id IS NULL;
    IF record_count > 0 THEN
        RAISE WARNING '  - schedules: % registros sin company_id', record_count;
    END IF;
    
    SELECT COUNT(*) INTO record_count FROM employee_schedules WHERE company_id IS NULL;
    IF record_count > 0 THEN
        RAISE WARNING '  - employee_schedules: % registros sin company_id', record_count;
    END IF;
    
    SELECT COUNT(*) INTO record_count FROM attendance_sheets WHERE company_id IS NULL;
    IF record_count > 0 THEN
        RAISE WARNING '  - attendance_sheets: % registros sin company_id', record_count;
    END IF;
    
    RAISE NOTICE '========================================';
    
END $$;

-- ============================================
-- FUNCIÓN HELPER: Obtener company_id de Naz
-- ============================================
CREATE OR REPLACE FUNCTION get_naz_company_id()
RETURNS UUID AS $$
DECLARE
    naz_id UUID;
BEGIN
    SELECT id INTO naz_id
    FROM companies
    WHERE name ILIKE '%naz%'
    LIMIT 1;
    
    RETURN naz_id;
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================
-- FUNCIÓN HELPER: Obtener company_id de Black Dog
-- ============================================
CREATE OR REPLACE FUNCTION get_blackdog_company_id()
RETURNS UUID AS $$
DECLARE
    bd_id UUID;
BEGIN
    SELECT id INTO bd_id
    FROM companies
    WHERE name ILIKE '%black%dog%' OR name ILIKE '%blackdog%'
    LIMIT 1;
    
    RETURN bd_id;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION get_naz_company_id() IS 'Retorna el UUID de la empresa Naz para uso en migraciones';
COMMENT ON FUNCTION get_blackdog_company_id() IS 'Retorna el UUID de la empresa Black Dog para uso en migraciones';

