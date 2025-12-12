-- ============================================
-- MIGRACIÓN: Eliminar todas las tablas naz_*
-- ============================================
-- Este script elimina todas las tablas naz_* ya que ahora
-- todo se maneja por company_id en las tablas compartidas
-- ============================================
-- ADVERTENCIA: Ejecutar solo después de migrar todos los datos
-- a las tablas compartidas usando company_id
-- ============================================

DO $$
DECLARE
    tbl_name TEXT;
    naz_tables TEXT[] := ARRAY[
        'naz_payroll_payment_employee_items',
        'naz_payroll_payment_employees',
        'naz_payroll_payments',
        'naz_payroll_debts',
        'naz_employee_payrolls',
        'naz_payroll_deductions',
        'naz_payrolls',
        'naz_attendance_sheets',
        'naz_timelogs',
        'naz_employee_schedules',
        'naz_schedules',
        'naz_employees',
        'naz_positions',
        'naz_departments',
        'naz_branches',
        'naz_banks',
        'naz_creditors',
        'naz_companies'
    ];
    i INTEGER;
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'ELIMINANDO TABLAS naz_*';
    RAISE NOTICE '========================================';

    -- Eliminar en orden inverso (más dependientes primero)
    FOR i IN REVERSE array_length(naz_tables, 1)..1
    LOOP
        tbl_name := naz_tables[i];
        
        -- Verificar si la tabla existe (usando alias para evitar ambigüedad)
        IF EXISTS (
            SELECT 1 FROM information_schema.tables t
            WHERE t.table_schema = 'public' 
            AND t.table_name = tbl_name
        ) THEN
            EXECUTE format('DROP TABLE IF EXISTS %I CASCADE', tbl_name);
            RAISE NOTICE '   ✅ Eliminada tabla: %', tbl_name;
        ELSE
            RAISE NOTICE '   ℹ️ Tabla no existe (ya eliminada): %', tbl_name;
        END IF;
    END LOOP;

    -- Eliminar cualquier constraint, índice o función relacionada con naz_*
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Limpieza adicional de objetos relacionados...';
    RAISE NOTICE '========================================';

    -- Eliminar funciones que puedan estar relacionadas
    FOR tbl_name IN 
        SELECT r.routine_name 
        FROM information_schema.routines r
        WHERE r.routine_schema = 'public' 
        AND r.routine_name LIKE 'naz_%'
    LOOP
        EXECUTE format('DROP FUNCTION IF EXISTS %I CASCADE', tbl_name);
        RAISE NOTICE '   ✅ Eliminada función: %', tbl_name;
    END LOOP;

    -- Eliminar secuencias relacionadas
    FOR tbl_name IN 
        SELECT s.sequence_name 
        FROM information_schema.sequences s
        WHERE s.sequence_schema = 'public' 
        AND s.sequence_name LIKE 'naz_%'
    LOOP
        EXECUTE format('DROP SEQUENCE IF EXISTS %I CASCADE', tbl_name);
        RAISE NOTICE '   ✅ Eliminada secuencia: %', tbl_name;
    END LOOP;

    -- Eliminar vistas relacionadas
    FOR tbl_name IN 
        SELECT v.table_name 
        FROM information_schema.views v
        WHERE v.table_schema = 'public' 
        AND v.table_name LIKE 'naz_%'
    LOOP
        EXECUTE format('DROP VIEW IF EXISTS %I CASCADE', tbl_name);
        RAISE NOTICE '   ✅ Eliminada vista: %', tbl_name;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'MIGRACIÓN COMPLETADA';
    RAISE NOTICE 'Todas las tablas naz_* han sido eliminadas';
    RAISE NOTICE 'Ahora todo se maneja por company_id en tablas compartidas';
    RAISE NOTICE '========================================';
END $$;

