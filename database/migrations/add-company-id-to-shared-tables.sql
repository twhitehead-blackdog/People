-- ============================================
-- MIGRACIÓN: Agregar company_id a Tablas Compartidas
-- ============================================
-- Este script agrega la columna company_id a todas las tablas compartidas
-- que necesitan soportar multi-tenancy
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- ============================================
-- 1. AGREGAR company_id A employees
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employees' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE employees 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;
        
        CREATE INDEX IF NOT EXISTS idx_employees_company_id ON employees(company_id);
        
        COMMENT ON COLUMN employees.company_id IS 'ID de la empresa a la que pertenece el empleado';
    END IF;
END $$;

-- ============================================
-- 2. AGREGAR company_id A branches
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'branches' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE branches 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;
        
        CREATE INDEX IF NOT EXISTS idx_branches_company_id ON branches(company_id);
        
        COMMENT ON COLUMN branches.company_id IS 'ID de la empresa a la que pertenece la sucursal';
    END IF;
END $$;

-- ============================================
-- 3. AGREGAR company_id A departments
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'departments' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE departments 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;
        
        CREATE INDEX IF NOT EXISTS idx_departments_company_id ON departments(company_id);
        
        COMMENT ON COLUMN departments.company_id IS 'ID de la empresa a la que pertenece el departamento';
    END IF;
END $$;

-- ============================================
-- 4. AGREGAR company_id A positions
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'positions' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE positions 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;
        
        CREATE INDEX IF NOT EXISTS idx_positions_company_id ON positions(company_id);
        
        COMMENT ON COLUMN positions.company_id IS 'ID de la empresa a la que pertenece la posición';
    END IF;
END $$;

-- ============================================
-- 5. AGREGAR company_id A schedules
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'schedules' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE schedules 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;
        
        CREATE INDEX IF NOT EXISTS idx_schedules_company_id ON schedules(company_id);
        
        COMMENT ON COLUMN schedules.company_id IS 'ID de la empresa a la que pertenece el horario';
    END IF;
END $$;

-- ============================================
-- 6. AGREGAR company_id A employee_schedules
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'employee_schedules' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE employee_schedules 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;
        
        CREATE INDEX IF NOT EXISTS idx_employee_schedules_company_id ON employee_schedules(company_id);
        
        COMMENT ON COLUMN employee_schedules.company_id IS 'ID de la empresa a la que pertenece el horario del empleado';
    END IF;
END $$;

-- ============================================
-- 7. AGREGAR company_id A attendance_sheets
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'attendance_sheets' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE attendance_sheets 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;
        
        CREATE INDEX IF NOT EXISTS idx_attendance_sheets_company_id ON attendance_sheets(company_id);
        
        COMMENT ON COLUMN attendance_sheets.company_id IS 'ID de la empresa a la que pertenece la hoja de asistencia';
    END IF;
END $$;

-- ============================================
-- 8. AGREGAR company_id A banks (NULLABLE - puede ser compartido)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'banks' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE banks 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_banks_company_id ON banks(company_id);
        
        COMMENT ON COLUMN banks.company_id IS 'ID de la empresa. NULL significa que el banco es compartido entre organizaciones';
    END IF;
END $$;

-- ============================================
-- 9. AGREGAR company_id A creditors (NULLABLE - puede ser compartido)
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'creditors' AND column_name = 'company_id'
    ) THEN
        ALTER TABLE creditors 
        ADD COLUMN company_id UUID REFERENCES companies(id) ON DELETE SET NULL;
        
        CREATE INDEX IF NOT EXISTS idx_creditors_company_id ON creditors(company_id);
        
        COMMENT ON COLUMN creditors.company_id IS 'ID de la empresa. NULL significa que el acreedor es compartido entre organizaciones';
    END IF;
END $$;

-- ============================================
-- VERIFICACIÓN
-- ============================================
DO $$
DECLARE
    missing_columns TEXT[];
BEGIN
    SELECT array_agg(table_name || '.' || column_name)
    INTO missing_columns
    FROM (
        SELECT 'employees' as table_name, 'company_id' as column_name
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employees' AND column_name = 'company_id'
        )
        UNION ALL
        SELECT 'branches', 'company_id'
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'branches' AND column_name = 'company_id'
        )
        UNION ALL
        SELECT 'departments', 'company_id'
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'departments' AND column_name = 'company_id'
        )
        UNION ALL
        SELECT 'positions', 'company_id'
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'positions' AND column_name = 'company_id'
        )
        UNION ALL
        SELECT 'schedules', 'company_id'
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'schedules' AND column_name = 'company_id'
        )
        UNION ALL
        SELECT 'employee_schedules', 'company_id'
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'employee_schedules' AND column_name = 'company_id'
        )
        UNION ALL
        SELECT 'attendance_sheets', 'company_id'
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'attendance_sheets' AND column_name = 'company_id'
        )
        UNION ALL
        SELECT 'banks', 'company_id'
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'banks' AND column_name = 'company_id'
        )
        UNION ALL
        SELECT 'creditors', 'company_id'
        WHERE NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'creditors' AND column_name = 'company_id'
        )
    ) missing;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE WARNING 'Las siguientes columnas company_id no se agregaron: %', array_to_string(missing_columns, ', ');
    ELSE
        RAISE NOTICE '✅ Todas las columnas company_id se agregaron correctamente';
    END IF;
END $$;

