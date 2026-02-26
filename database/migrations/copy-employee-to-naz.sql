-- ============================================
-- MIGRACIÓN: COPIAR EMPLEADO DE BLACK DOG A NAZ
-- ============================================
-- Este script copia un empleado de la tabla employees (Black Dog) 
-- a la tabla naz_employees (Naz) con los mismos datos
-- 
-- INSTRUCCIONES:
-- 1. Reemplaza 'TU_EMAIL_AQUI' con tu work_email de Black Dog
-- 2. Asegúrate de que existan los siguientes en Naz:
--    - Una empresa (naz_companies)
--    - Una sucursal "Calle 50" (naz_branches) 
--    - Un departamento equivalente (naz_departments)
--    - Una posición equivalente (naz_positions)
-- 3. Ejecuta este script en el SQL Editor de Supabase
-- ============================================

DO $$
DECLARE
    v_employee employees%ROWTYPE;
    v_naz_company_id UUID;
    v_naz_branch_id UUID;
    v_naz_department_id UUID;
    v_naz_position_id UUID;
    v_work_email TEXT := 'soporte2@blackdogpanama.com';
    v_new_employee_id UUID;
BEGIN
    -- 1. Buscar el empleado en Black Dog por work_email
    SELECT * INTO v_employee
    FROM employees
    WHERE work_email = v_work_email
    LIMIT 1;

    -- Verificar que se encontró el empleado
    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró empleado con work_email: %', v_work_email;
    END IF;

    -- 2. Obtener o crear empresa Naz (buscar por nombre que contenga "Naz")
    SELECT id INTO v_naz_company_id
    FROM naz_companies
    WHERE LOWER(name) LIKE '%naz%'
    AND is_active = true
    LIMIT 1;

    IF v_naz_company_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró empresa Naz. Por favor crea una empresa en naz_companies primero.';
    END IF;

    -- 3. Obtener sucursal "Calle 50" de Naz
    SELECT id INTO v_naz_branch_id
    FROM naz_branches
    WHERE (LOWER(name) LIKE '%calle 50%' OR LOWER(name) LIKE '%calle50%')
    AND company_id = v_naz_company_id
    AND is_active = true
    LIMIT 1;

    IF v_naz_branch_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró sucursal "Calle 50" en Naz. Por favor crea la sucursal primero.';
    END IF;

    -- 4. Obtener departamento equivalente en Naz
    -- Buscar por nombre del departamento del empleado en Black Dog
    SELECT nd.id INTO v_naz_department_id
    FROM naz_departments nd
    WHERE nd.name = (
        SELECT d.name 
        FROM departments d 
        WHERE d.id = v_employee.department_id
    )
    LIMIT 1;

    -- Si no existe, usar el primer departamento disponible
    IF v_naz_department_id IS NULL THEN
        SELECT id INTO v_naz_department_id
        FROM naz_departments
        LIMIT 1;
        
        -- Si no hay ningún departamento, crear uno genérico
        IF v_naz_department_id IS NULL THEN
            INSERT INTO naz_departments (name)
            VALUES ('Administración')
            RETURNING id INTO v_naz_department_id;
            
            RAISE NOTICE 'Se creó un departamento genérico "Administración" en Naz.';
        END IF;
    END IF;

    -- 5. Obtener posición equivalente en Naz
    -- Buscar por nombre de la posición del empleado en Black Dog
    SELECT np.id INTO v_naz_position_id
    FROM naz_positions np
    WHERE np.name = (
        SELECT p.name 
        FROM positions p 
        WHERE p.id = v_employee.position_id
    )
    AND np.department_id = v_naz_department_id
    LIMIT 1;

    -- Si no existe, usar la primera posición disponible del departamento
    IF v_naz_position_id IS NULL THEN
        SELECT id INTO v_naz_position_id
        FROM naz_positions
        WHERE department_id = v_naz_department_id
        LIMIT 1;
        
        -- Si no hay ninguna posición, crear una genérica
        IF v_naz_position_id IS NULL THEN
            INSERT INTO naz_positions (name, department_id, admin, schedule_admin, schedule_approver)
            VALUES ('Administrador', v_naz_department_id, true, false, false)
            RETURNING id INTO v_naz_position_id;
            
            RAISE NOTICE 'Se creó una posición genérica "Administrador" en Naz.';
        END IF;
    END IF;

    -- 6. Verificar si el empleado ya existe en Naz
    IF EXISTS (SELECT 1 FROM naz_employees WHERE work_email = v_work_email) THEN
        RAISE NOTICE 'El empleado con work_email % ya existe en naz_employees. Actualizando datos...', v_work_email;
        
        -- Actualizar empleado existente
        UPDATE naz_employees
        SET
            document_id = v_employee.document_id,
            first_name = v_employee.first_name,
            middle_name = v_employee.middle_name,
            father_name = v_employee.father_name,
            mother_name = v_employee.mother_name,
            birth_date = v_employee.birth_date,
            gender = v_employee.gender,
            start_date = v_employee.start_date,
            monthly_salary = v_employee.monthly_salary,
            hourly_salary = v_employee.hourly_salary,
            branch_id = v_naz_branch_id,
            department_id = v_naz_department_id,
            position_id = v_naz_position_id,
            email = v_employee.email,
            work_email = v_employee.work_email,
            phone_number = v_employee.phone_number,
            address = v_employee.address,
            end_date = v_employee.end_date,
            is_active = v_employee.is_active,
            uniform_size = v_employee.uniform_size,
            qr_code = v_employee.qr_code,
            code_uri = v_employee.code_uri,
            bank = v_employee.bank,
            account_number = v_employee.account_number,
            bank_account_type = v_employee.bank_account_type,
            full_name = TRIM(CONCAT_WS(' ', v_employee.first_name, v_employee.middle_name, v_employee.father_name, v_employee.mother_name))
        WHERE work_email = v_work_email;
        
        RAISE NOTICE 'Empleado actualizado exitosamente en naz_employees.';
    ELSE
        -- 7. Insertar nuevo empleado en Naz
        INSERT INTO naz_employees (
            document_id,
            first_name,
            middle_name,
            father_name,
            mother_name,
            birth_date,
            gender,
            start_date,
            monthly_salary,
            hourly_salary,
            branch_id,
            department_id,
            position_id,
            email,
            work_email,
            phone_number,
            address,
            end_date,
            is_active,
            uniform_size,
            qr_code,
            code_uri,
            bank,
            account_number,
            bank_account_type,
            full_name
        ) VALUES (
            v_employee.document_id,
            v_employee.first_name,
            v_employee.middle_name,
            v_employee.father_name,
            v_employee.mother_name,
            v_employee.birth_date,
            v_employee.gender,
            v_employee.start_date,
            v_employee.monthly_salary,
            v_employee.hourly_salary,
            v_naz_branch_id,
            v_naz_department_id,
            v_naz_position_id,
            v_employee.email,
            v_employee.work_email,
            v_employee.phone_number,
            v_employee.address,
            v_employee.end_date,
            v_employee.is_active,
            v_employee.uniform_size,
            v_employee.qr_code,
            v_employee.code_uri,
            v_employee.bank,
            v_employee.account_number,
            v_employee.bank_account_type,
            TRIM(CONCAT_WS(' ', v_employee.first_name, v_employee.middle_name, v_employee.father_name, v_employee.mother_name))
        )
        RETURNING id INTO v_new_employee_id;
        
        RAISE NOTICE 'Empleado copiado exitosamente a naz_employees con ID: %', v_new_employee_id;
    END IF;

    RAISE NOTICE 'Proceso completado. El empleado % ahora tiene acceso a ambos sistemas (Black Dog y Naz).', v_work_email;
END $$;

