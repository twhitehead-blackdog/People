-- ============================================
-- Consulta de permisos para un ID específico
-- ============================================
-- Este script verifica los permisos de un ID en diferentes tablas
-- ID a consultar: 564c578b-d7cd-412a-a8de-17c663cce6eb
-- ============================================

DO $$
DECLARE
    target_id UUID := '564c578b-d7cd-412a-a8de-17c663cce6eb';
    found_in TEXT;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONSULTA DE PERMISOS PARA ID: %', target_id;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';

    -- Verificar si es una POSICIÓN
    IF EXISTS (SELECT 1 FROM positions WHERE id = target_id) THEN
        RAISE NOTICE '✅ ENCONTRADO EN: positions (Posición/Cargo)';
        RAISE NOTICE '';
        RAISE NOTICE 'PERMISOS DE LA POSICIÓN:';
        
        PERFORM (
            SELECT 
                p.name AS nombre_posicion,
                p.admin AS es_admin,
                p.schedule_admin AS es_schedule_admin,
                p.schedule_approver AS es_schedule_approver,
                p.dashboard_access AS tiene_dashboard_access,
                p.default_view AS vista_por_defecto,
                p.available_for_job_fair AS disponible_para_feria_trabajo,
                d.name AS departamento,
                c.name AS empresa
            FROM positions p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN companies c ON p.company_id = c.id
            WHERE p.id = target_id
        );
        
        -- Mostrar los detalles
        FOR found_in IN 
            SELECT 
                'Nombre: ' || COALESCE(p.name, 'N/A') || E'\n' ||
                'Departamento: ' || COALESCE(d.name, 'N/A') || E'\n' ||
                'Empresa: ' || COALESCE(c.name, 'N/A') || E'\n' ||
                'Admin: ' || COALESCE(p.admin::TEXT, 'false') || E'\n' ||
                'Schedule Admin: ' || COALESCE(p.schedule_admin::TEXT, 'false') || E'\n' ||
                'Schedule Approver: ' || COALESCE(p.schedule_approver::TEXT, 'false') || E'\n' ||
                'Dashboard Access: ' || COALESCE(p.dashboard_access::TEXT, 'true') || E'\n' ||
                'Default View: ' || COALESCE(p.default_view, 'N/A') || E'\n' ||
                'Available for Job Fair: ' || COALESCE(p.available_for_job_fair::TEXT, 'false')
            FROM positions p
            LEFT JOIN departments d ON p.department_id = d.id
            LEFT JOIN companies c ON p.company_id = c.id
            WHERE p.id = target_id
        LOOP
            RAISE NOTICE '%', found_in;
        END LOOP;
        
    -- Verificar si es un EMPLEADO
    ELSIF EXISTS (SELECT 1 FROM employees WHERE id = target_id) THEN
        RAISE NOTICE '✅ ENCONTRADO EN: employees (Empleado)';
        RAISE NOTICE '';
        RAISE NOTICE 'INFORMACIÓN DEL EMPLEADO Y SUS PERMISOS:';
        
        FOR found_in IN 
            SELECT 
                'Nombre: ' || COALESCE(e.first_name || ' ' || COALESCE(e.father_name, ''), 'N/A') || E'\n' ||
                'Email: ' || COALESCE(e.work_email, 'N/A') || E'\n' ||
                'Posición: ' || COALESCE(p.name, 'N/A') || E'\n' ||
                'Empresa: ' || COALESCE(c.name, 'N/A') || E'\n' ||
                'Activo: ' || COALESCE(e.is_active::TEXT, 'false') || E'\n' ||
                'Portal Access: ' || COALESCE(e.has_portal_access::TEXT, 'false') || E'\n' ||
                E'\n' ||
                'PERMISOS DE LA POSICIÓN:' || E'\n' ||
                '  - Admin: ' || COALESCE(p.admin::TEXT, 'false') || E'\n' ||
                '  - Schedule Admin: ' || COALESCE(p.schedule_admin::TEXT, 'false') || E'\n' ||
                '  - Schedule Approver: ' || COALESCE(p.schedule_approver::TEXT, 'false') || E'\n' ||
                '  - Dashboard Access: ' || COALESCE(p.dashboard_access::TEXT, 'true') || E'\n' ||
                '  - Default View: ' || COALESCE(p.default_view, 'N/A')
            FROM employees e
            LEFT JOIN positions p ON e.position_id = p.id
            LEFT JOIN companies c ON e.company_id = c.id
            WHERE e.id = target_id
        LOOP
            RAISE NOTICE '%', found_in;
        END LOOP;
        
    -- Verificar si es un DEPARTAMENTO
    ELSIF EXISTS (SELECT 1 FROM departments WHERE id = target_id) THEN
        RAISE NOTICE '✅ ENCONTRADO EN: departments (Departamento)';
        RAISE NOTICE '';
        RAISE NOTICE 'INFORMACIÓN DEL DEPARTAMENTO:';
        
        FOR found_in IN 
            SELECT 
                'Nombre: ' || COALESCE(d.name, 'N/A') || E'\n' ||
                'Empresa: ' || COALESCE(c.name, 'N/A')
            FROM departments d
            LEFT JOIN companies c ON d.company_id = c.id
            WHERE d.id = target_id
        LOOP
            RAISE NOTICE '%', found_in;
        END LOOP;
        
    -- Verificar si es una EMPRESA
    ELSIF EXISTS (SELECT 1 FROM companies WHERE id = target_id) THEN
        RAISE NOTICE '✅ ENCONTRADO EN: companies (Empresa)';
        RAISE NOTICE '';
        RAISE NOTICE 'INFORMACIÓN DE LA EMPRESA:';
        
        FOR found_in IN 
            SELECT 
                'Nombre: ' || COALESCE(c.name, 'N/A') || E'\n' ||
                'Activa: ' || COALESCE(c.is_active::TEXT, 'false')
            FROM companies c
            WHERE c.id = target_id
        LOOP
            RAISE NOTICE '%', found_in;
        END LOOP;
        
    ELSE
        RAISE WARNING '❌ ID NO ENCONTRADO en ninguna tabla relevante (positions, employees, departments, companies)';
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    
END $$;

-- Consulta directa para obtener los permisos si es una posición
SELECT 
    'POSICIÓN' AS tipo,
    p.id,
    p.name AS nombre,
    d.name AS departamento,
    c.name AS empresa,
    p.admin AS es_admin,
    p.schedule_admin AS es_schedule_admin,
    p.schedule_approver AS es_schedule_approver,
    COALESCE(p.dashboard_access, true) AS tiene_dashboard_access,
    p.default_view AS vista_por_defecto,
    COALESCE(p.available_for_job_fair, false) AS disponible_para_feria_trabajo
FROM positions p
LEFT JOIN departments d ON p.department_id = d.id
LEFT JOIN companies c ON p.company_id = c.id
WHERE p.id = '564c578b-d7cd-412a-a8de-17c663cce6eb'

UNION ALL

-- Consulta directa para obtener información si es un empleado
SELECT 
    'EMPLEADO' AS tipo,
    e.id,
    (e.first_name || ' ' || COALESCE(e.father_name, '')) AS nombre,
    p.name AS departamento,
    c.name AS empresa,
    p.admin AS es_admin,
    p.schedule_admin AS es_schedule_admin,
    p.schedule_approver AS es_schedule_approver,
    COALESCE(p.dashboard_access, true) AS tiene_dashboard_access,
    p.default_view AS vista_por_defecto,
    COALESCE(e.has_portal_access, false) AS disponible_para_feria_trabajo
FROM employees e
LEFT JOIN positions p ON e.position_id = p.id
LEFT JOIN companies c ON e.company_id = c.id
WHERE e.id = '564c578b-d7cd-412a-a8de-17c663cce6eb'

UNION ALL

-- Consulta directa para obtener información si es un departamento
SELECT 
    'DEPARTAMENTO' AS tipo,
    d.id,
    d.name AS nombre,
    NULL AS departamento,
    c.name AS empresa,
    NULL AS es_admin,
    NULL AS es_schedule_admin,
    NULL AS es_schedule_approver,
    NULL AS tiene_dashboard_access,
    NULL AS vista_por_defecto,
    NULL AS disponible_para_feria_trabajo
FROM departments d
LEFT JOIN companies c ON d.company_id = c.id
WHERE d.id = '564c578b-d7cd-412a-a8de-17c663cce6eb'

UNION ALL

-- Consulta directa para obtener información si es una empresa
SELECT 
    'EMPRESA' AS tipo,
    c.id,
    c.name AS nombre,
    NULL AS departamento,
    NULL AS empresa,
    NULL AS es_admin,
    NULL AS es_schedule_admin,
    NULL AS es_schedule_approver,
    NULL AS tiene_dashboard_access,
    NULL AS vista_por_defecto,
    NULL AS disponible_para_feria_trabajo
FROM companies c
WHERE c.id = '564c578b-d7cd-412a-a8de-17c663cce6eb';



