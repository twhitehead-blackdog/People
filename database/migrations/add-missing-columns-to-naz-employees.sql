-- ============================================
-- AGREGAR COLUMNAS FALTANTES A naz_employees
-- ============================================
-- Este script agrega las columnas company_id, has_portal_access y account_approved
-- que son necesarias para la consulta de la API y funcionalidades del portal
-- ============================================

-- 1. Agregar company_id (puede obtenerse a través de branch_id, pero es útil tenerlo directo)
ALTER TABLE naz_employees 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES naz_companies(id) ON DELETE RESTRICT;

-- Crear índice para company_id
CREATE INDEX IF NOT EXISTS idx_naz_employees_company_id ON naz_employees(company_id);

-- 2. Agregar has_portal_access
ALTER TABLE naz_employees 
ADD COLUMN IF NOT EXISTS has_portal_access BOOLEAN DEFAULT false;

-- 3. Agregar account_approved
ALTER TABLE naz_employees 
ADD COLUMN IF NOT EXISTS account_approved BOOLEAN DEFAULT NULL;

-- 4. Crear índices para las nuevas columnas
CREATE INDEX IF NOT EXISTS idx_naz_employees_portal_access ON naz_employees(has_portal_access) WHERE has_portal_access = true;
CREATE INDEX IF NOT EXISTS idx_naz_employees_account_approved ON naz_employees(account_approved) WHERE account_approved IS NULL OR account_approved = FALSE;

-- 5. Poblar company_id desde branch_id si ya hay datos
-- Esto actualiza todos los registros existentes que tengan branch_id válido
UPDATE naz_employees ne
SET company_id = nb.company_id
FROM naz_branches nb
WHERE ne.branch_id = nb.id
AND ne.company_id IS NULL
AND nb.company_id IS NOT NULL;

-- 6. Agregar comentarios
COMMENT ON COLUMN naz_employees.company_id IS 'ID de la empresa (puede obtenerse desde branch_id, pero se mantiene para consultas directas)';
COMMENT ON COLUMN naz_employees.has_portal_access IS 'Indica si el empleado tiene acceso al portal de empleados';
COMMENT ON COLUMN naz_employees.account_approved IS 'Estado de aprobación de la cuenta: NULL = pendiente, true = aprobada, false = rechazada';

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Verificar que las columnas se agregaron correctamente
DO $$
DECLARE
    total_employees INTEGER;
    employees_with_company INTEGER;
BEGIN
    RAISE NOTICE '=== VERIFICANDO COLUMNAS AGREGADAS ===';
    
    -- Verificar company_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'naz_employees' AND column_name = 'company_id'
    ) THEN
        RAISE NOTICE '✅ company_id agregada correctamente';
    ELSE
        RAISE WARNING '❌ company_id NO se agregó';
    END IF;
    
    -- Verificar has_portal_access
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'naz_employees' AND column_name = 'has_portal_access'
    ) THEN
        RAISE NOTICE '✅ has_portal_access agregada correctamente';
    ELSE
        RAISE WARNING '❌ has_portal_access NO se agregó';
    END IF;
    
    -- Verificar account_approved
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'naz_employees' AND column_name = 'account_approved'
    ) THEN
        RAISE NOTICE '✅ account_approved agregada correctamente';
    ELSE
        RAISE WARNING '❌ account_approved NO se agregó';
    END IF;
    
    -- Contar cuántos registros tienen company_id poblado
    SELECT COUNT(*) INTO total_employees FROM naz_employees;
    SELECT COUNT(*) INTO employees_with_company FROM naz_employees WHERE company_id IS NOT NULL;
    
    RAISE NOTICE '';
    RAISE NOTICE 'Total de empleados: %', total_employees;
    RAISE NOTICE 'Empleados con company_id poblado: %', employees_with_company;
    
    IF employees_with_company < total_employees THEN
        RAISE WARNING '⚠️  Algunos empleados no tienen company_id. Verifica que sus branch_id sean válidos.';
    END IF;
END $$;

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================

