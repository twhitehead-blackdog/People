-- ============================================
-- MIGRACIÓN: Agregar columna employee_number a employees y naz_employees
-- ============================================
-- Esta migración:
-- 1. Agrega la columna employee_number a employees
-- 2. Agrega la columna employee_number a naz_employees
-- 3. Genera números para empleados existentes basado en company_id
-- 4. Crea un índice único para employee_number

-- ============================================
-- 1. AGREGAR COLUMNA A employees
-- ============================================
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS employee_number VARCHAR(6) UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_employees_employee_number ON employees(employee_number);

-- ============================================
-- 2. AGREGAR COLUMNA A naz_employees
-- ============================================
ALTER TABLE naz_employees 
ADD COLUMN IF NOT EXISTS employee_number VARCHAR(6) UNIQUE;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_naz_employees_employee_number ON naz_employees(employee_number);

-- ============================================
-- 3. FUNCIÓN PARA GENERAR NÚMERO DE EMPLEADO
-- ============================================
CREATE OR REPLACE FUNCTION generate_employee_number(
    p_company_id UUID,
    p_table_name TEXT DEFAULT 'employees'
) RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_naz_company_id UUID;
    v_blackdog_company_id UUID;
    v_max_correlative INTEGER;
    v_next_number TEXT;
BEGIN
    -- Obtener los company_ids de Naz y Blackdog usando las funciones helper
    v_naz_company_id := get_naz_company_id();
    v_blackdog_company_id := get_blackdog_company_id();
    
    -- Determinar el prefijo basado en company_id
    IF p_company_id = v_naz_company_id THEN
        v_prefix := 'NZ';
    ELSIF p_company_id = v_blackdog_company_id THEN
        v_prefix := 'BD';
    ELSE
        -- Prefijo genérico si no coincide
        v_prefix := 'XX';
    END IF;
    
    -- Obtener el máximo correlativo existente para este prefijo
    IF p_table_name = 'employees' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 3) AS INTEGER)), 0)
        INTO v_max_correlative
        FROM employees
        WHERE employee_number IS NOT NULL 
        AND employee_number LIKE v_prefix || '%';
    ELSIF p_table_name = 'naz_employees' THEN
        SELECT COALESCE(MAX(CAST(SUBSTRING(employee_number FROM 3) AS INTEGER)), 0)
        INTO v_max_correlative
        FROM naz_employees
        WHERE employee_number IS NOT NULL 
        AND employee_number LIKE v_prefix || '%';
    ELSE
        RAISE EXCEPTION 'Tabla no válida: %', p_table_name;
    END IF;
    
    -- Generar el siguiente número
    v_next_number := v_prefix || LPAD((v_max_correlative + 1)::TEXT, 4, '0');
    
    RETURN v_next_number;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 4. POBLAR NÚMEROS PARA EMPLEADOS EXISTENTES (employees)
-- ============================================
DO $$
DECLARE
    v_emp RECORD;
    v_naz_company_id UUID;
    v_blackdog_company_id UUID;
    v_prefix TEXT;
    v_correlative INTEGER;
    v_employee_number TEXT;
BEGIN
    -- Obtener company_ids usando las funciones helper
    v_naz_company_id := get_naz_company_id();
    v_blackdog_company_id := get_blackdog_company_id();
    
    -- Procesar empleados de Blackdog primero
    v_correlative := 0;
    FOR v_emp IN 
        SELECT id, company_id 
        FROM employees 
        WHERE employee_number IS NULL 
        AND company_id = v_blackdog_company_id
        ORDER BY created_at ASC
    LOOP
        v_correlative := v_correlative + 1;
        v_employee_number := 'BD' || LPAD(v_correlative::TEXT, 4, '0');
        
        UPDATE employees 
        SET employee_number = v_employee_number
        WHERE id = v_emp.id;
    END LOOP;
    
    -- Procesar empleados de Naz
    v_correlative := 0;
    FOR v_emp IN 
        SELECT id 
        FROM employees 
        WHERE employee_number IS NULL 
        AND company_id = v_naz_company_id
        ORDER BY created_at ASC
    LOOP
        v_correlative := v_correlative + 1;
        v_employee_number := 'NZ' || LPAD(v_correlative::TEXT, 4, '0');
        
        UPDATE employees 
        SET employee_number = v_employee_number
        WHERE id = v_emp.id;
    END LOOP;
    
    -- Procesar empleados sin company_id o con company_id desconocido
    v_correlative := 0;
    FOR v_emp IN 
        SELECT id 
        FROM employees 
        WHERE employee_number IS NULL 
        AND (company_id IS NULL OR (company_id != v_naz_company_id AND company_id != v_blackdog_company_id))
        ORDER BY created_at ASC
    LOOP
        v_correlative := v_correlative + 1;
        v_employee_number := 'XX' || LPAD(v_correlative::TEXT, 4, '0');
        
        UPDATE employees 
        SET employee_number = v_employee_number
        WHERE id = v_emp.id;
    END LOOP;
END $$;

-- ============================================
-- 5. POBLAR NÚMEROS PARA EMPLEADOS EXISTENTES (naz_employees)
-- ============================================
DO $$
DECLARE
    v_emp RECORD;
    v_correlative INTEGER;
    v_employee_number TEXT;
BEGIN
    -- Todos los naz_employees son de Naz, usar prefijo NZ
    v_correlative := 0;
    FOR v_emp IN 
        SELECT id 
        FROM naz_employees 
        WHERE employee_number IS NULL 
        ORDER BY created_at ASC
    LOOP
        v_correlative := v_correlative + 1;
        v_employee_number := 'NZ' || LPAD(v_correlative::TEXT, 4, '0');
        
        UPDATE naz_employees 
        SET employee_number = v_employee_number
        WHERE id = v_emp.id;
    END LOOP;
END $$;

-- ============================================
-- 6. COMENTARIOS
-- ============================================
COMMENT ON COLUMN employees.employee_number IS 'Número único de empleado formato: BD0001, NZ0001 (prefijo de 2 letras + 4 dígitos)';
COMMENT ON COLUMN naz_employees.employee_number IS 'Número único de empleado formato: NZ0001 (prefijo NZ + 4 dígitos)';
COMMENT ON FUNCTION generate_employee_number IS 'Genera el siguiente número de empleado disponible basado en company_id';

