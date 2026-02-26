-- ============================================
-- MIGRACIÓN: Mover Datos de naz_* a Tablas Compartidas
-- ============================================
-- Este script migra todos los datos de las tablas naz_* a las tablas compartidas
-- con el company_id de Naz
-- 
-- IMPORTANTE: Ejecutar en este orden:
-- 1. add-company-id-to-shared-tables.sql
-- 2. assign-company-id-to-existing-records.sql
-- 3. Este script
-- ============================================

DO $$
DECLARE
    naz_company_id UUID;
    migrated_count INTEGER;
    error_count INTEGER := 0;
BEGIN
    -- Obtener company_id de Naz
    naz_company_id := get_naz_company_id();
    
    IF naz_company_id IS NULL THEN
        RAISE EXCEPTION 'No se encontró company_id de Naz. Por favor, ejecuta assign-company-id-to-existing-records.sql primero.';
    END IF;
    
    RAISE NOTICE '========================================';
    RAISE NOTICE 'INICIANDO MIGRACIÓN DE DATOS NAZ';
    RAISE NOTICE 'Company ID de Naz: %', naz_company_id;
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    
    -- ============================================
    -- 1. MIGRAR naz_companies → companies
    -- ============================================
    RAISE NOTICE '1. Migrando companies...';
    
    -- Manejar constraint UNIQUE en name si existe
    DECLARE
        nc RECORD;
        final_name VARCHAR(255);
        name_exists BOOLEAN;
        counter INTEGER := 0;
    BEGIN
        FOR nc IN SELECT * FROM naz_companies LOOP
            -- Verificar si el nombre ya existe
            SELECT EXISTS(SELECT 1 FROM companies WHERE name = nc.name) INTO name_exists;
            
            IF name_exists THEN
                -- Si existe, agregar sufijo
                final_name := nc.name || ' (Naz)';
                counter := 0;
                
                -- Si el nombre con sufijo también existe, agregar contador
                WHILE EXISTS(SELECT 1 FROM companies WHERE name = final_name) LOOP
                    counter := counter + 1;
                    final_name := nc.name || ' (Naz ' || counter || ')';
                END LOOP;
            ELSE
                final_name := nc.name;
            END IF;
            
            -- Insertar la empresa
            BEGIN
                INSERT INTO companies (id, name, address, phone_number, is_active, created_at)
                VALUES (
                    nc.id,
                    final_name,
                    nc.address,
                    nc.phone_number,
                    nc.is_active,
                    nc.created_at
                )
                ON CONFLICT (id) DO NOTHING;
            EXCEPTION
                WHEN unique_violation THEN
                    -- Si hay conflicto de nombre único, intentar con nombre más único usando ID
                    BEGIN
                        INSERT INTO companies (id, name, address, phone_number, is_active, created_at)
                        VALUES (
                            nc.id,
                            nc.name || ' (Naz - ' || SUBSTRING(nc.id::text, 1, 8) || ')',
                            nc.address,
                            nc.phone_number,
                            nc.is_active,
                            nc.created_at
                        )
                        ON CONFLICT (id) DO NOTHING;
                    EXCEPTION
                        WHEN OTHERS THEN
                            -- Si aún falla, simplemente omitir esta empresa
                            RAISE NOTICE '   ⚠️ No se pudo migrar empresa %: %', nc.id, SQLERRM;
                    END;
            END;
        END LOOP;
        
        -- Contar empresas migradas
        SELECT COUNT(*) INTO migrated_count 
        FROM companies 
        WHERE id IN (SELECT id FROM naz_companies);
        
        RAISE NOTICE '   ✅ Migradas % empresas', migrated_count;
    END;
    
    -- ============================================
    -- 2. MIGRAR naz_branches → branches
    -- ============================================
    RAISE NOTICE '2. Migrando branches...';
    
    -- Manejar constraint UNIQUE en name: agregar sufijo cuando hay duplicados
    -- Usar un bucle para manejar cada sucursal individualmente y evitar conflictos
    DECLARE
        nb RECORD;
        final_name VARCHAR(255);
        name_exists BOOLEAN;
        counter INTEGER := 0;
    BEGIN
        FOR nb IN SELECT * FROM naz_branches LOOP
            -- Verificar si el nombre ya existe
            SELECT EXISTS(SELECT 1 FROM branches WHERE name = nb.name) INTO name_exists;
            
            IF name_exists THEN
                -- Si existe, agregar sufijo
                final_name := nb.name || ' (Naz)';
                counter := 0;
                
                -- Si el nombre con sufijo también existe, agregar contador
                WHILE EXISTS(SELECT 1 FROM branches WHERE name = final_name) LOOP
                    counter := counter + 1;
                    final_name := nb.name || ' (Naz ' || counter || ')';
                END LOOP;
            ELSE
                final_name := nb.name;
            END IF;
            
            -- Insertar la sucursal
            BEGIN
                INSERT INTO branches (id, name, short_name, address, is_active, ip, company_id, created_at)
                VALUES (
                    nb.id,
                    final_name,
                    nb.short_name,
                    nb.address,
                    nb.is_active,
                    nb.ip,
                    naz_company_id,
                    nb.created_at
                )
                ON CONFLICT (id) DO NOTHING;
            EXCEPTION
                WHEN unique_violation THEN
                    -- Si hay conflicto de nombre único, intentar con nombre más único usando ID
                    BEGIN
                        INSERT INTO branches (id, name, short_name, address, is_active, ip, company_id, created_at)
                        VALUES (
                            nb.id,
                            nb.name || ' (Naz - ' || SUBSTRING(nb.id::text, 1, 8) || ')',
                            nb.short_name,
                            nb.address,
                            nb.is_active,
                            nb.ip,
                            naz_company_id,
                            nb.created_at
                        )
                        ON CONFLICT (id) DO NOTHING;
                    EXCEPTION
                        WHEN OTHERS THEN
                            -- Si aún falla, simplemente omitir esta sucursal
                            RAISE NOTICE '   ⚠️ No se pudo migrar sucursal %: %', nb.id, SQLERRM;
                    END;
            END;
        END LOOP;
        
        -- Contar sucursales migradas
        SELECT COUNT(*) INTO migrated_count 
        FROM branches 
        WHERE company_id = naz_company_id 
        AND id IN (SELECT id FROM naz_branches);
        
        RAISE NOTICE '   ✅ Migradas % sucursales', migrated_count;
    END;
    
    -- ============================================
    -- 3. MIGRAR naz_departments → departments
    -- ============================================
    RAISE NOTICE '3. Migrando departments...';
    
    -- Manejar constraint UNIQUE en name: agregar sufijo cuando hay duplicados
    DECLARE
        nd RECORD;
        final_name VARCHAR(255);
        name_exists BOOLEAN;
        counter INTEGER := 0;
    BEGIN
        FOR nd IN SELECT * FROM naz_departments LOOP
            -- Verificar si el nombre ya existe
            SELECT EXISTS(SELECT 1 FROM departments WHERE name = nd.name) INTO name_exists;
            
            IF name_exists THEN
                -- Si existe, agregar sufijo
                final_name := nd.name || ' (Naz)';
                counter := 0;
                
                -- Si el nombre con sufijo también existe, agregar contador
                WHILE EXISTS(SELECT 1 FROM departments WHERE name = final_name) LOOP
                    counter := counter + 1;
                    final_name := nd.name || ' (Naz ' || counter || ')';
                END LOOP;
            ELSE
                final_name := nd.name;
            END IF;
            
            -- Insertar el departamento
            BEGIN
                INSERT INTO departments (id, name, company_id, created_at)
                VALUES (
                    nd.id,
                    final_name,
                    naz_company_id,
                    nd.created_at
                )
                ON CONFLICT (id) DO NOTHING;
            EXCEPTION
                WHEN unique_violation THEN
                    -- Si hay conflicto de nombre único, intentar con nombre más único usando ID
                    BEGIN
                        INSERT INTO departments (id, name, company_id, created_at)
                        VALUES (
                            nd.id,
                            nd.name || ' (Naz - ' || SUBSTRING(nd.id::text, 1, 8) || ')',
                            naz_company_id,
                            nd.created_at
                        )
                        ON CONFLICT (id) DO NOTHING;
                    EXCEPTION
                        WHEN OTHERS THEN
                            -- Si aún falla, simplemente omitir este departamento
                            RAISE NOTICE '   ⚠️ No se pudo migrar departamento %: %', nd.id, SQLERRM;
                    END;
            END;
        END LOOP;
        
        -- Contar departamentos migrados
        SELECT COUNT(*) INTO migrated_count 
        FROM departments 
        WHERE company_id = naz_company_id 
        AND id IN (SELECT id FROM naz_departments);
        
        RAISE NOTICE '   ✅ Migrados % departamentos', migrated_count;
    END;
    
    -- ============================================
    -- 4. MIGRAR naz_positions → positions
    -- ============================================
    RAISE NOTICE '4. Migrando positions...';
    
    -- Primero verificar que todos los department_id existen en departments
    IF EXISTS (
        SELECT 1 FROM naz_positions np
        WHERE NOT EXISTS (
            SELECT 1 FROM departments d WHERE d.id = np.department_id
        )
    ) THEN
        RAISE WARNING '   ⚠️  Algunas posiciones tienen department_id que no existen en departments';
    END IF;
    
    INSERT INTO positions (
        id, 
        name, 
        department_id, 
        schedule_admin, 
        admin, 
        schedule_approver,
        company_id, -- Asignar company_id de Naz
        created_at
    )
    SELECT 
        id, 
        name, 
        department_id, 
        schedule_admin, 
        admin, 
        schedule_approver,
        naz_company_id,
        created_at
    FROM naz_positions
    WHERE NOT EXISTS (SELECT 1 FROM positions WHERE positions.id = naz_positions.id)
    AND EXISTS (SELECT 1 FROM departments WHERE departments.id = naz_positions.department_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migradas % posiciones', migrated_count;
    
    -- ============================================
    -- 5. MIGRAR naz_schedules → schedules
    -- ============================================
    RAISE NOTICE '5. Migrando schedules...';
    
    INSERT INTO schedules (
        id, 
        name, 
        entry_time, 
        lunch_start_time, 
        lunch_end_time, 
        exit_time, 
        color, 
        day_off, 
        minutes_tolerance, 
        min_lunch_minutes, 
        max_lunch_minutes,
        company_id, -- Asignar company_id de Naz
        created_at
    )
    SELECT 
        id, 
        name, 
        entry_time, 
        lunch_start_time, 
        lunch_end_time, 
        exit_time, 
        color, 
        day_off, 
        minutes_tolerance, 
        min_lunch_minutes, 
        max_lunch_minutes,
        naz_company_id,
        created_at
    FROM naz_schedules
    WHERE NOT EXISTS (SELECT 1 FROM schedules WHERE schedules.id = naz_schedules.id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migrados % horarios', migrated_count;
    
    -- ============================================
    -- 6. MIGRAR naz_employees → employees
    -- ============================================
    RAISE NOTICE '6. Migrando employees...';
    
    -- Verificar integridad referencial
    IF EXISTS (
        SELECT 1 FROM naz_employees ne
        WHERE NOT EXISTS (SELECT 1 FROM branches b WHERE b.id = ne.branch_id)
        OR NOT EXISTS (SELECT 1 FROM departments d WHERE d.id = ne.department_id)
        OR NOT EXISTS (SELECT 1 FROM positions p WHERE p.id = ne.position_id)
    ) THEN
        RAISE WARNING '   ⚠️  Algunos empleados tienen referencias inválidas (branch_id, department_id o position_id)';
    END IF;
    
    INSERT INTO employees (
        id,
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
        company_id, -- Asignar company_id de Naz
        created_at
    )
    SELECT 
        id,
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
        naz_company_id,
        created_at
    FROM naz_employees
    WHERE NOT EXISTS (SELECT 1 FROM employees WHERE employees.id = naz_employees.id)
    AND EXISTS (SELECT 1 FROM branches WHERE branches.id = naz_employees.branch_id)
    AND EXISTS (SELECT 1 FROM departments WHERE departments.id = naz_employees.department_id)
    AND EXISTS (SELECT 1 FROM positions WHERE positions.id = naz_employees.position_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migrados % empleados', migrated_count;
    
    -- ============================================
    -- 7. MIGRAR naz_employee_schedules → employee_schedules
    -- ============================================
    RAISE NOTICE '7. Migrando employee_schedules...';
    
    INSERT INTO employee_schedules (
        id,
        employee_id,
        branch_id,
        schedule_id,
        start_date,
        end_date,
        approved,
        approved_at,
        company_id, -- Asignar company_id de Naz
        created_at
    )
    SELECT 
        es.id,
        es.employee_id,
        es.branch_id,
        es.schedule_id,
        es.start_date,
        es.end_date,
        es.approved,
        es.approved_at,
        naz_company_id,
        es.created_at
    FROM naz_employee_schedules es
    WHERE NOT EXISTS (SELECT 1 FROM employee_schedules WHERE employee_schedules.id = es.id)
    AND EXISTS (SELECT 1 FROM employees WHERE employees.id = es.employee_id)
    AND EXISTS (SELECT 1 FROM schedules WHERE schedules.id = es.schedule_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migrados % horarios de empleados', migrated_count;
    
    -- ============================================
    -- 8. MIGRAR naz_timelogs → timelogs
    -- ============================================
    RAISE NOTICE '8. Migrando timelogs...';
    
    INSERT INTO timelogs (
        id,
        employee_id,
        company_id, -- Ya tiene company_id, usar el de Naz
        branch_id,
        type,
        ip,
        created_at
    )
    SELECT 
        id,
        employee_id,
        naz_company_id,
        branch_id,
        type::timelog_type, -- CAST explícito de VARCHAR a ENUM
        ip,
        created_at
    FROM naz_timelogs
    WHERE NOT EXISTS (SELECT 1 FROM timelogs WHERE timelogs.id = naz_timelogs.id)
    AND EXISTS (SELECT 1 FROM employees WHERE employees.id = naz_timelogs.employee_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migrados % registros de timelogs', migrated_count;
    
    -- ============================================
    -- 9. MIGRAR naz_attendance_sheets → attendance_sheets
    -- ============================================
    RAISE NOTICE '9. Migrando attendance_sheets...';
    
    INSERT INTO attendance_sheets (
        id,
        employee_id,
        branch_id,
        schedule_id,
        date,
        entry_time,
        exit_time,
        lunch_start_time,
        lunch_end_time,
        is_late,
        is_sunday,
        is_holiday,
        is_justified,
        justification_notes,
        justification_cause,
        worked_hours,
        late_hours,
        company_id, -- Asignar company_id de Naz
        created_at
    )
    SELECT 
        id,
        employee_id,
        branch_id,
        schedule_id,
        date,
        entry_time,
        exit_time,
        lunch_start_time,
        lunch_end_time,
        is_late,
        is_sunday,
        is_holiday,
        is_justified,
        justification_notes,
        justification_cause,
        worked_hours,
        late_hours,
        naz_company_id,
        created_at
    FROM naz_attendance_sheets
    WHERE NOT EXISTS (SELECT 1 FROM attendance_sheets WHERE attendance_sheets.id = naz_attendance_sheets.id)
    AND EXISTS (SELECT 1 FROM employees WHERE employees.id = naz_attendance_sheets.employee_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migradas % hojas de asistencia', migrated_count;
    
    -- ============================================
    -- 10. MIGRAR naz_banks → banks
    -- ============================================
    RAISE NOTICE '10. Migrando banks...';
    
    -- Manejar constraint UNIQUE en name si existe
    DECLARE
        nb RECORD;
        final_name VARCHAR(255);
        name_exists BOOLEAN;
        counter INTEGER := 0;
    BEGIN
        FOR nb IN SELECT * FROM naz_banks LOOP
            -- Verificar si el nombre ya existe
            SELECT EXISTS(SELECT 1 FROM banks WHERE name = nb.name) INTO name_exists;
            
            IF name_exists THEN
                -- Si existe, agregar sufijo
                final_name := nb.name || ' (Naz)';
                counter := 0;
                
                -- Si el nombre con sufijo también existe, agregar contador
                WHILE EXISTS(SELECT 1 FROM banks WHERE name = final_name) LOOP
                    counter := counter + 1;
                    final_name := nb.name || ' (Naz ' || counter || ')';
                END LOOP;
            ELSE
                final_name := nb.name;
            END IF;
            
            -- Insertar el banco
            BEGIN
                INSERT INTO banks (id, name, company_id, created_at)
                VALUES (
                    nb.id,
                    final_name,
                    naz_company_id,
                    nb.created_at
                )
                ON CONFLICT (id) DO NOTHING;
            EXCEPTION
                WHEN unique_violation THEN
                    -- Si hay conflicto de nombre único, intentar con nombre más único usando ID
                    BEGIN
                        INSERT INTO banks (id, name, company_id, created_at)
                        VALUES (
                            nb.id,
                            nb.name || ' (Naz - ' || SUBSTRING(nb.id::text, 1, 8) || ')',
                            naz_company_id,
                            nb.created_at
                        )
                        ON CONFLICT (id) DO NOTHING;
                    EXCEPTION
                        WHEN OTHERS THEN
                            -- Si aún falla, simplemente omitir este banco
                            RAISE NOTICE '   ⚠️ No se pudo migrar banco %: %', nb.id, SQLERRM;
                    END;
            END;
        END LOOP;
        
        -- Contar bancos migrados
        SELECT COUNT(*) INTO migrated_count 
        FROM banks 
        WHERE company_id = naz_company_id 
        AND id IN (SELECT id FROM naz_banks);
        
        RAISE NOTICE '   ✅ Migrados % bancos', migrated_count;
    END;
    
    -- ============================================
    -- 11. MIGRAR naz_creditors → creditors
    -- ============================================
    RAISE NOTICE '11. Migrando creditors...';
    
    -- Manejar constraint UNIQUE en name si existe
    DECLARE
        nc RECORD;
        final_name VARCHAR(255);
        name_exists BOOLEAN;
        counter INTEGER := 0;
    BEGIN
        FOR nc IN SELECT * FROM naz_creditors LOOP
            -- Verificar si el nombre ya existe
            SELECT EXISTS(SELECT 1 FROM creditors WHERE name = nc.name) INTO name_exists;
            
            IF name_exists THEN
                -- Si existe, agregar sufijo
                final_name := nc.name || ' (Naz)';
                counter := 0;
                
                -- Si el nombre con sufijo también existe, agregar contador
                WHILE EXISTS(SELECT 1 FROM creditors WHERE name = final_name) LOOP
                    counter := counter + 1;
                    final_name := nc.name || ' (Naz ' || counter || ')';
                END LOOP;
            ELSE
                final_name := nc.name;
            END IF;
            
            -- Insertar el acreedor
            BEGIN
                INSERT INTO creditors (id, name, company_id, created_at)
                VALUES (
                    nc.id,
                    final_name,
                    naz_company_id,
                    nc.created_at
                )
                ON CONFLICT (id) DO NOTHING;
            EXCEPTION
                WHEN unique_violation THEN
                    -- Si hay conflicto de nombre único, intentar con nombre más único usando ID
                    BEGIN
                        INSERT INTO creditors (id, name, company_id, created_at)
                        VALUES (
                            nc.id,
                            nc.name || ' (Naz - ' || SUBSTRING(nc.id::text, 1, 8) || ')',
                            naz_company_id,
                            nc.created_at
                        )
                        ON CONFLICT (id) DO NOTHING;
                    EXCEPTION
                        WHEN OTHERS THEN
                            -- Si aún falla, simplemente omitir este acreedor
                            RAISE NOTICE '   ⚠️ No se pudo migrar acreedor %: %', nc.id, SQLERRM;
                    END;
            END;
        END LOOP;
        
        -- Contar acreedores migrados
        SELECT COUNT(*) INTO migrated_count 
        FROM creditors 
        WHERE company_id = naz_company_id 
        AND id IN (SELECT id FROM naz_creditors);
        
        RAISE NOTICE '   ✅ Migrados % acreedores', migrated_count;
    END;
    
    -- ============================================
    -- 12. MIGRAR naz_payrolls → payrolls
    -- ============================================
    RAISE NOTICE '12. Migrando payrolls...';
    
    INSERT INTO payrolls (id, name, company_id, created_at)
    SELECT 
        id, 
        name,
        naz_company_id, -- Asignar company_id de Naz
        created_at
    FROM naz_payrolls
    WHERE NOT EXISTS (SELECT 1 FROM payrolls WHERE payrolls.id = naz_payrolls.id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migradas % planillas', migrated_count;
    
    -- ============================================
    -- 13. MIGRAR naz_payroll_deductions → payroll_deductions
    -- ============================================
    RAISE NOTICE '13. Migrando payroll_deductions...';
    
    INSERT INTO payroll_deductions (
        id,
        payroll_id,
        name,
        value,
        min_salary,
        income_tax,
        calculation_type,
        created_at
    )
    SELECT 
        id,
        payroll_id,
        name,
        value,
        min_salary,
        income_tax,
        calculation_type,
        created_at
    FROM naz_payroll_deductions
    WHERE NOT EXISTS (SELECT 1 FROM payroll_deductions WHERE payroll_deductions.id = naz_payroll_deductions.id)
    AND EXISTS (SELECT 1 FROM payrolls WHERE payrolls.id = naz_payroll_deductions.payroll_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migradas % deducciones de planilla', migrated_count;
    
    -- ============================================
    -- 14. MIGRAR naz_employee_payrolls → employee_payrolls
    -- ============================================
    RAISE NOTICE '14. Migrando employee_payrolls...';
    
    INSERT INTO employee_payrolls (
        id,
        payroll_id,
        employee_id,
        monthly_salary,
        hourly_salary,
        created_at
    )
    SELECT 
        id,
        payroll_id,
        employee_id,
        monthly_salary,
        hourly_salary,
        created_at
    FROM naz_employee_payrolls
    WHERE NOT EXISTS (SELECT 1 FROM employee_payrolls WHERE employee_payrolls.id = naz_employee_payrolls.id)
    AND EXISTS (SELECT 1 FROM payrolls WHERE payrolls.id = naz_employee_payrolls.payroll_id)
    AND EXISTS (SELECT 1 FROM employees WHERE employees.id = naz_employee_payrolls.employee_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migradas % relaciones empleado-planilla', migrated_count;
    
    -- ============================================
    -- 15. MIGRAR naz_payroll_payments → payroll_payments
    -- ============================================
    RAISE NOTICE '15. Migrando payroll_payments...';
    
    INSERT INTO payroll_payments (
        id,
        title,
        payroll_id,
        start_date,
        end_date,
        status,
        created_at
    )
    SELECT 
        id,
        title,
        payroll_id,
        start_date,
        end_date,
        status,
        created_at
    FROM naz_payroll_payments
    WHERE NOT EXISTS (SELECT 1 FROM payroll_payments WHERE payroll_payments.id = naz_payroll_payments.id)
    AND EXISTS (SELECT 1 FROM payrolls WHERE payrolls.id = naz_payroll_payments.payroll_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migrados % pagos de planilla', migrated_count;
    
    -- ============================================
    -- 16. MIGRAR naz_payroll_debts → payroll_debts
    -- ============================================
    RAISE NOTICE '16. Migrando payroll_debts...';
    
    INSERT INTO payroll_debts (
        id,
        payroll_id,
        creditor_id,
        employee_id,
        account_id,
        description,
        amount,
        start_date,
        due_date,
        balance,
        created_at
    )
    SELECT 
        id,
        payroll_id,
        creditor_id,
        employee_id,
        account_id,
        description,
        amount,
        start_date,
        due_date,
        balance,
        created_at
    FROM naz_payroll_debts
    WHERE NOT EXISTS (SELECT 1 FROM payroll_debts WHERE payroll_debts.id = naz_payroll_debts.id)
    AND EXISTS (SELECT 1 FROM payrolls WHERE payrolls.id = naz_payroll_debts.payroll_id)
    AND EXISTS (SELECT 1 FROM creditors WHERE creditors.id = naz_payroll_debts.creditor_id)
    AND EXISTS (SELECT 1 FROM employees WHERE employees.id = naz_payroll_debts.employee_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migradas % deudas de planilla', migrated_count;
    
    -- ============================================
    -- 17. MIGRAR naz_payroll_payment_employees → payroll_payment_employees
    -- ============================================
    RAISE NOTICE '17. Migrando payroll_payment_employees...';
    
    INSERT INTO payroll_payment_employees (
        id,
        payroll_id,
        employee_id,
        payroll_payment_id,
        total_amount,
        income_amount,
        deduction_amount,
        debt_amount,
        late_amount,
        absence_amount,
        created_at
    )
    SELECT 
        id,
        payroll_id,
        employee_id,
        payroll_payment_id,
        total_amount,
        income_amount,
        deduction_amount,
        debt_amount,
        late_amount,
        absence_amount,
        created_at
    FROM naz_payroll_payment_employees
    WHERE NOT EXISTS (SELECT 1 FROM payroll_payment_employees WHERE payroll_payment_employees.id = naz_payroll_payment_employees.id)
    AND EXISTS (SELECT 1 FROM payrolls WHERE payrolls.id = naz_payroll_payment_employees.payroll_id)
    AND EXISTS (SELECT 1 FROM employees WHERE employees.id = naz_payroll_payment_employees.employee_id)
    AND EXISTS (SELECT 1 FROM payroll_payments WHERE payroll_payments.id = naz_payroll_payment_employees.payroll_payment_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migrados % registros de pago de empleados', migrated_count;
    
    -- ============================================
    -- 18. MIGRAR naz_payroll_payment_employee_items → payroll_payment_employee_items
    -- ============================================
    RAISE NOTICE '18. Migrando payroll_payment_employee_items...';
    
    INSERT INTO payroll_payment_employee_items (
        id,
        payment_employee_id,
        type,
        amount,
        description,
        created_at
    )
    SELECT 
        id,
        payment_employee_id,
        type,
        amount,
        description,
        created_at
    FROM naz_payroll_payment_employee_items
    WHERE NOT EXISTS (SELECT 1 FROM payroll_payment_employee_items WHERE payroll_payment_employee_items.id = naz_payroll_payment_employee_items.id)
    AND EXISTS (SELECT 1 FROM payroll_payment_employees WHERE payroll_payment_employees.id = naz_payroll_payment_employee_items.payment_employee_id)
    ON CONFLICT (id) DO NOTHING;
    
    GET DIAGNOSTICS migrated_count = ROW_COUNT;
    RAISE NOTICE '   ✅ Migrados % items de pago de empleados', migrated_count;
    
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE '========================================';
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error durante la migración: %', SQLERRM;
END $$;

