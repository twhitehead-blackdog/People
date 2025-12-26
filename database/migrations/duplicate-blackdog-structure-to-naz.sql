-- ============================================
-- MIGRACIÓN: Duplicar Estructura Organizacional entre Compañías
-- ============================================
-- Este script identifica la compañía con la estructura organizacional más completa
-- (más departamentos y puestos) y duplica esa estructura a todas las demás compañías
-- que no la tengan, asegurando que todas tengan la misma estructura base
-- 
-- IMPORTANTE: Ejecutar en el SQL Editor de Supabase
-- Este script es genérico y funciona con cualquier número de compañías
-- ============================================

DO $$
DECLARE
    source_company_id UUID;
    target_company_id UUID;
    dept_record RECORD;
    pos_record RECORD;
    new_dept_id UUID;
    new_pos_id UUID;
    dept_count INTEGER := 0;
    pos_count INTEGER := 0;
    skipped_dept_count INTEGER := 0;
    skipped_pos_count INTEGER := 0;
    total_companies INTEGER := 0;
    processed_companies INTEGER := 0;
    company_record RECORD;
BEGIN
    -- ============================================
    -- 1. IDENTIFICAR COMPAÑÍA CON ESTRUCTURA MÁS COMPLETA
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'IDENTIFICANDO COMPAÑÍA CON ESTRUCTURA MÁS COMPLETA';
    RAISE NOTICE '========================================';
    
    -- Buscar la compañía con más departamentos y puestos
    -- Priorizar compañías activas y ordenar por cantidad de departamentos + puestos
    SELECT 
        c.id,
        COUNT(DISTINCT d.id) + COUNT(DISTINCT p.id) as structure_count
    INTO source_company_id
    FROM companies c
    LEFT JOIN departments d ON d.company_id = c.id
    LEFT JOIN positions p ON p.company_id = c.id
    WHERE c.is_active = true
    GROUP BY c.id
    ORDER BY structure_count DESC, c.created_at ASC
    LIMIT 1;
    
    IF source_company_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró ninguna compañía activa en la tabla companies.';
    END IF;
    
    -- Obtener el nombre de la compañía fuente para logging
    DECLARE
        source_company_name TEXT;
    BEGIN
        SELECT name INTO source_company_name FROM companies WHERE id = source_company_id;
        RAISE NOTICE 'Compañía fuente identificada: % (ID: %)', source_company_name, source_company_id;
        
        -- Contar departamentos y puestos de la compañía fuente
        SELECT COUNT(*) INTO dept_count FROM departments WHERE company_id = source_company_id;
        SELECT COUNT(*) INTO pos_count FROM positions WHERE company_id = source_company_id;
        RAISE NOTICE 'Estructura: % departamentos, % puestos', dept_count, pos_count;
    END;
    
    RAISE NOTICE '';
    
    -- ============================================
    -- 2. PROCESAR TODAS LAS DEMÁS COMPAÑÍAS
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'DUPLICANDO ESTRUCTURA A OTRAS COMPAÑÍAS';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- Contar total de compañías a procesar
    SELECT COUNT(*) INTO total_companies
    FROM companies
    WHERE is_active = true AND id != source_company_id;
    
    IF total_companies = 0 THEN
        RAISE NOTICE 'No hay otras compañías activas para procesar.';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Compañías a procesar: %', total_companies;
    RAISE NOTICE '';
    
    -- Procesar cada compañía
    FOR company_record IN 
        SELECT id, name
        FROM companies
        WHERE is_active = true AND id != source_company_id
        ORDER BY created_at ASC
    LOOP
        target_company_id := company_record.id;
        processed_companies := processed_companies + 1;
        
        RAISE NOTICE '----------------------------------------';
        RAISE NOTICE '[%/%] Procesando: % (ID: %)', 
            processed_companies, total_companies, company_record.name, target_company_id;
        RAISE NOTICE '----------------------------------------';
        
        -- Resetear contadores para esta compañía
        dept_count := 0;
        pos_count := 0;
        skipped_dept_count := 0;
        skipped_pos_count := 0;
        
        -- ============================================
        -- 2.1 DUPLICAR DEPARTAMENTOS
        -- ============================================
        RAISE NOTICE 'Duplicando departamentos...';
        
        FOR dept_record IN 
            SELECT * FROM departments 
            WHERE company_id = source_company_id
            ORDER BY name
        LOOP
            -- Verificar si ya existe en la compañía destino
            SELECT id INTO new_dept_id 
            FROM departments 
            WHERE name = dept_record.name 
              AND company_id = target_company_id
            LIMIT 1;
            
            IF new_dept_id IS NULL THEN
                -- Crear nuevo departamento
                INSERT INTO departments (name, company_id, created_at)
                VALUES (dept_record.name, target_company_id, COALESCE(dept_record.created_at, NOW()))
                RETURNING id INTO new_dept_id;
                
                dept_count := dept_count + 1;
                RAISE NOTICE '   ✅ Creado departamento: %', dept_record.name;
            ELSE
                skipped_dept_count := skipped_dept_count + 1;
                RAISE NOTICE '   ⏭️  Departamento ya existe: %', dept_record.name;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Departamentos: % creados, % omitidos', dept_count, skipped_dept_count;
        RAISE NOTICE '';
        
        -- ============================================
        -- 2.2 DUPLICAR PUESTOS
        -- ============================================
        RAISE NOTICE 'Duplicando puestos...';
        
        FOR pos_record IN 
            SELECT 
                p.id,
                p.name,
                p.department_id,
                p.admin,
                p.schedule_admin,
                p.schedule_approver,
                p.dashboard_access,
                p.default_view,
                p.available_for_job_fair,
                p.created_at,
                d.name as dept_name
            FROM positions p
            JOIN departments d ON p.department_id = d.id
            WHERE p.company_id = source_company_id
            ORDER BY d.name, p.name
        LOOP
            -- Encontrar el department_id correspondiente en la compañía destino
            SELECT id INTO new_dept_id
            FROM departments
            WHERE name = pos_record.dept_name 
              AND company_id = target_company_id
            LIMIT 1;
            
            IF new_dept_id IS NULL THEN
                RAISE WARNING '   ⚠️  No se encontró departamento "%" en % para el puesto "%". Omitiendo...', 
                    pos_record.dept_name, company_record.name, pos_record.name;
                skipped_pos_count := skipped_pos_count + 1;
                CONTINUE;
            END IF;
            
            -- Verificar si el puesto ya existe
            SELECT id INTO new_pos_id
            FROM positions
            WHERE name = pos_record.name 
              AND company_id = target_company_id
              AND department_id = new_dept_id
            LIMIT 1;
            
            IF new_pos_id IS NULL THEN
                -- Crear nuevo puesto
                INSERT INTO positions (
                    name, 
                    department_id, 
                    company_id,
                    admin, 
                    schedule_admin, 
                    schedule_approver,
                    dashboard_access, 
                    default_view, 
                    available_for_job_fair,
                    created_at
                )
                VALUES (
                    pos_record.name, 
                    new_dept_id, 
                    target_company_id,
                    COALESCE(pos_record.admin, false), 
                    COALESCE(pos_record.schedule_admin, false), 
                    COALESCE(pos_record.schedule_approver, false),
                    COALESCE(pos_record.dashboard_access, true),
                    pos_record.default_view,
                    COALESCE(pos_record.available_for_job_fair, true),
                    COALESCE(pos_record.created_at, NOW())
                )
                RETURNING id INTO new_pos_id;
                
                pos_count := pos_count + 1;
                RAISE NOTICE '   ✅ Creado puesto: "%" en departamento "%"', 
                    pos_record.name, pos_record.dept_name;
            ELSE
                skipped_pos_count := skipped_pos_count + 1;
                RAISE NOTICE '   ⏭️  Puesto ya existe: "%" en departamento "%"', 
                    pos_record.name, pos_record.dept_name;
            END IF;
        END LOOP;
        
        RAISE NOTICE 'Puestos: % creados, % omitidos', pos_count, skipped_pos_count;
        RAISE NOTICE '';
    END LOOP;
    
    -- ============================================
    -- RESUMEN FINAL
    -- ============================================
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Compañías procesadas: %', processed_companies;
    RAISE NOTICE '========================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error durante la migración: %', SQLERRM;
END $$;
