-- ============================================
-- Agregar cargos a Naz: Vendedora, Subencargada, Encargada, Analista
-- ============================================
-- Este script agrega los cargos especificados en las tablas naz
-- Ejecutar en el SQL Editor de Supabase

-- ============================================
-- PASO 1: Seleccionar o crear el departamento
-- ============================================
-- Ajusta el nombre del departamento según necesites
-- Opciones comunes: 'Administración', 'Ventas', 'Tienda', 'Operaciones', etc.

DO $$
DECLARE
    v_department_id UUID;
    v_department_name VARCHAR(255) := 'Administración'; -- ⚠️ CAMBIA ESTE NOMBRE SEGÚN NECESITES
BEGIN
    -- Buscar el departamento por nombre
    SELECT id INTO v_department_id
    FROM naz_departments
    WHERE name ILIKE '%' || v_department_name || '%'
    LIMIT 1;
    
    -- Si no existe, crearlo
    IF v_department_id IS NULL THEN
        INSERT INTO naz_departments (name)
        VALUES (v_department_name)
        RETURNING id INTO v_department_id;
        
        RAISE NOTICE 'Se creó el departamento "%" con ID: %', v_department_name, v_department_id;
    ELSE
        RAISE NOTICE 'Se encontró el departamento "%" con ID: %', v_department_name, v_department_id;
    END IF;
    
    -- ============================================
    -- PASO 2: Insertar los cargos
    -- ============================================
    
    -- Vendedora
    INSERT INTO naz_positions (name, department_id, schedule_admin, admin, schedule_approver) 
    SELECT 'Vendedora', v_department_id, false, false, false
    WHERE NOT EXISTS (SELECT 1 FROM naz_positions WHERE name = 'Vendedora' AND department_id = v_department_id);
    
    -- Subencargada
    INSERT INTO naz_positions (name, department_id, schedule_admin, admin, schedule_approver) 
    SELECT 'Subencargada', v_department_id, false, false, false
    WHERE NOT EXISTS (SELECT 1 FROM naz_positions WHERE name = 'Subencargada' AND department_id = v_department_id);
    
    -- Encargada (con permisos de administración de horarios)
    INSERT INTO naz_positions (name, department_id, schedule_admin, admin, schedule_approver) 
    SELECT 'Encargada', v_department_id, true, false, true
    WHERE NOT EXISTS (SELECT 1 FROM naz_positions WHERE name = 'Encargada' AND department_id = v_department_id);
    
    -- Analista
    INSERT INTO naz_positions (name, department_id, schedule_admin, admin, schedule_approver) 
    SELECT 'Analista', v_department_id, false, false, false
    WHERE NOT EXISTS (SELECT 1 FROM naz_positions WHERE name = 'Analista' AND department_id = v_department_id);
    
    RAISE NOTICE 'Cargos insertados exitosamente en el departamento "%"', v_department_name;
END $$;

-- ============================================
-- NOTAS:
-- ============================================
-- 1. Cambia 'Administración' en la línea 12 por el nombre del departamento que necesites
-- 2. Si el departamento no existe, se creará automáticamente
-- 3. Los permisos de cada cargo:
--    - schedule_admin: puede administrar horarios (Encargada = true)
--    - admin: tiene permisos administrativos generales (todos = false)
--    - schedule_approver: puede aprobar solicitudes de horarios (Encargada = true)
-- 4. Si necesitas usar un department_id específico en lugar de buscar por nombre,
--    puedes modificar el script para usar directamente el UUID

