-- ============================================
-- Organigrama Completo Black Dog
-- ============================================
-- Este script crea y configura el organigrama completo de Black Dog
-- Ejecutar en el SQL Editor de Supabase
-- 
-- Estructura:
-- CEO (mismo nivel que COO)
-- COO (mismo nivel que CEO)
--   └── Administrador
--       ├── RRHH
--       │   └── Asistente de RRHH / Encargada de Planilla
--       ├── Jefa de Contabilidad
--       │   └── Asistente de Contabilidad
--       ├── Mercadeo
--       ├── Operaciones
--       │   └── Gerente de Tienda
--       │       ├── Subgerente de Tienda
--       │       ├── Piso de Venta
--       │       ├── Peluquero
--       │       └── Veterinario
--       ├── Compras
--       ├── Distribución
--       └── IT Manager
--           └── IT 2

-- Obtener IDs de departamentos existentes
DO $$
DECLARE
    v_admin_dept_id UUID;
    v_operaciones_dept_id UUID;
    v_contabilidad_dept_id UUID;
    v_rrhh_dept_id UUID;
    v_mercadotecnia_dept_id UUID;
    v_compras_dept_id UUID;
    v_distribucion_dept_id UUID;
    v_it_dept_id UUID;
    v_tienda_dept_id UUID;
BEGIN
    -- Obtener o crear departamentos
    SELECT id INTO v_admin_dept_id FROM departments WHERE name ILIKE '%administraci%' LIMIT 1;
    IF v_admin_dept_id IS NULL THEN
        INSERT INTO departments (id, name) VALUES ('00000000-0000-0000-0000-000000000010', 'Administración') RETURNING id INTO v_admin_dept_id;
    END IF;

    SELECT id INTO v_operaciones_dept_id FROM departments WHERE name ILIKE '%operaci%' LIMIT 1;
    IF v_operaciones_dept_id IS NULL THEN
        INSERT INTO departments (id, name) VALUES ('00000000-0000-0000-0000-000000000011', 'Operaciones') RETURNING id INTO v_operaciones_dept_id;
    END IF;

    SELECT id INTO v_contabilidad_dept_id FROM departments WHERE name ILIKE '%contabilidad%' LIMIT 1;
    IF v_contabilidad_dept_id IS NULL THEN
        INSERT INTO departments (id, name) VALUES ('00000000-0000-0000-0000-000000000012', 'Contabilidad') RETURNING id INTO v_contabilidad_dept_id;
    END IF;

    SELECT id INTO v_rrhh_dept_id FROM departments WHERE name ILIKE '%recursos humanos%' OR name ILIKE '%rrhh%' LIMIT 1;
    IF v_rrhh_dept_id IS NULL THEN
        INSERT INTO departments (id, name) VALUES ('00000000-0000-0000-0000-000000000013', 'Recursos Humanos') RETURNING id INTO v_rrhh_dept_id;
    END IF;

    SELECT id INTO v_mercadotecnia_dept_id FROM departments WHERE name ILIKE '%mercad%' OR name ILIKE '%marketing%' LIMIT 1;
    IF v_mercadotecnia_dept_id IS NULL THEN
        INSERT INTO departments (id, name) VALUES ('00000000-0000-0000-0000-000000000014', 'Mercadeo') RETURNING id INTO v_mercadotecnia_dept_id;
    END IF;

    SELECT id INTO v_compras_dept_id FROM departments WHERE name ILIKE '%compras%' LIMIT 1;
    IF v_compras_dept_id IS NULL THEN
        INSERT INTO departments (id, name) VALUES ('00000000-0000-0000-0000-000000000015', 'Compras') RETURNING id INTO v_compras_dept_id;
    END IF;

    SELECT id INTO v_distribucion_dept_id FROM departments WHERE name ILIKE '%distribuci%' OR name ILIKE '%bodega%' LIMIT 1;
    IF v_distribucion_dept_id IS NULL THEN
        INSERT INTO departments (id, name) VALUES ('00000000-0000-0000-0000-000000000016', 'Distribución') RETURNING id INTO v_distribucion_dept_id;
    END IF;

    SELECT id INTO v_it_dept_id FROM departments WHERE name ILIKE '%tecnolog%' OR name ILIKE '%it%' OR name ILIKE '%sistemas%' LIMIT 1;
    IF v_it_dept_id IS NULL THEN
        INSERT INTO departments (id, name) VALUES ('00000000-0000-0000-0000-000000000017', 'Tecnología') RETURNING id INTO v_it_dept_id;
    END IF;

    SELECT id INTO v_tienda_dept_id FROM departments WHERE name ILIKE '%tienda%' OR name ILIKE '%venta%' LIMIT 1;
    IF v_tienda_dept_id IS NULL THEN
        INSERT INTO departments (id, name) VALUES ('00000000-0000-0000-0000-000000000018', 'Tienda') RETURNING id INTO v_tienda_dept_id;
    END IF;

    -- ============================================
    -- NIVEL 1: CEO y COO (ya existen en el sistema)
    -- ============================================
    
    -- CEO (ya existe: 6baa44a3-9e5e-4f44-b589-a454800805fd)
    -- COO (ya existe: 274282fd-70fc-4836-bc90-0692200bb11c)
    -- No necesitamos crearlos, solo asegurarnos de que tengan los permisos correctos
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id IN ('6baa44a3-9e5e-4f44-b589-a454800805fd', '274282fd-70fc-4836-bc90-0692200bb11c');

    -- ============================================
    -- NIVEL 2: Administrador (reporta a CEO)
    -- ============================================
    
    -- Administrador (ya existe: eeacbf8d-f046-4603-83e0-4795f1941383)
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id = 'eeacbf8d-f046-4603-83e0-4795f1941383';

    -- ============================================
    -- NIVEL 3: Reportan a Administrador
    -- ============================================
    
    -- RRHH (usar "Encargada de Recursos Humanos" existente: dff05302-d03c-41df-a047-49551bbc337a)
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id = 'dff05302-d03c-41df-a047-49551bbc337a';

    -- Jefa de Contabilidad (usar "Encargada de Contabilidad" existente: 68089fb1-cd40-46af-8826-b3d5f58d71c2)
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id = '68089fb1-cd40-46af-8826-b3d5f58d71c2';

    -- Mercadeo (usar "Encargado de Marketing" existente: 6d7d6e2a-22e8-4488-86dd-e7c208fb6283)
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id = '6d7d6e2a-22e8-4488-86dd-e7c208fb6283';

    -- Operaciones (usar "Gerente de Operaciones" existente: dc8b4463-6e05-48e9-adbb-043d928ec1bf)
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id = 'dc8b4463-6e05-48e9-adbb-043d928ec1bf';

    -- Compras (usar "Jefe de Compras" existente: 9a12dd78-55a7-44e2-8bf4-e00723de75f7)
    -- O usar "Coordinadora de Compras y Cadena de Suministro": 51a458d7-ed89-4d1b-b76a-35cfaf89199b
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id IN ('9a12dd78-55a7-44e2-8bf4-e00723de75f7', '51a458d7-ed89-4d1b-b76a-35cfaf89199b');

    -- Distribución (usar "Jefe de Bodega" existente: 9ad2ac54-9817-4b78-8a74-d1479d2969e8)
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id = '9ad2ac54-9817-4b78-8a74-d1479d2969e8';

    -- IT Manager (usar "Desarrollador y Soporte IT" existente: 4ca524c8-072f-4e87-b244-3fce005a291c)
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id = '4ca524c8-072f-4e87-b244-3fce005a291c';

    -- ============================================
    -- NIVEL 4: Reportan a RRHH
    -- ============================================
    
    -- Asistente de RRHH / Encargada de Planilla (usar "Asistente RR HH y Contabilidad" existente: 782c2f11-f10d-4b5a-8c29-27089db74ae2)
    -- O usar "Especialista de Nómina y Gestión Administrativa": 9645e59c-16ec-4d1b-b14e-f8ca4d3b6278
    UPDATE positions SET schedule_admin = true, admin = true, schedule_approver = true 
    WHERE id IN ('782c2f11-f10d-4b5a-8c29-27089db74ae2', '9645e59c-16ec-4d1b-b14e-f8ca4d3b6278');

    -- ============================================
    -- NIVEL 4: Reportan a Jefa de Contabilidad
    -- ============================================
    
    -- Asistente de Contabilidad (ya existe: 08e1136d-7b29-49c4-9e32-a4ea8a383811)
    -- Mantener permisos como están (false, false, false)

    -- ============================================
    -- NIVEL 4: Reportan a Operaciones
    -- ============================================
    
    -- Gerente de Tienda (ya existe: 0b660014-936f-498b-80ea-c13bbf43f59c)
    UPDATE positions SET schedule_admin = true 
    WHERE id = '0b660014-936f-498b-80ea-c13bbf43f59c';

    -- ============================================
    -- NIVEL 4: Reportan a IT Manager
    -- ============================================
    
    -- IT 2 (crear nueva posición si no existe)
    INSERT INTO positions (id, name, department_id, schedule_admin, admin, schedule_approver) 
    SELECT '00000000-0000-0000-0000-000000000113'::uuid, 'IT 2', v_it_dept_id, false, false, false
    WHERE NOT EXISTS (SELECT 1 FROM positions WHERE id = '00000000-0000-0000-0000-000000000113'::uuid)
    ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, schedule_admin = EXCLUDED.schedule_admin, admin = EXCLUDED.admin, schedule_approver = EXCLUDED.schedule_approver;

    -- ============================================
    -- NIVEL 5: Reportan a Gerente de Tienda
    -- ============================================
    
    -- Subgerente de Tienda (ya existe como "Sub Gerente": 4e58edc4-2943-4a71-920c-a2f0f4d31bcc)
    UPDATE positions SET schedule_admin = true 
    WHERE id = '4e58edc4-2943-4a71-920c-a2f0f4d31bcc';

    -- Piso de Venta (ya existe)
    -- Peluquero (ya existe)
    -- Veterinario (ya existe como "Médico Veterinario")

    -- ============================================
    -- CONFIGURAR JERARQUÍA EN ORGANIZATION_CHART
    -- ============================================
    
    -- CEO y COO están en el mismo nivel jerárquico (ninguno reporta al otro)
    -- Ambos son el nivel más alto de la organización
    -- No se configura parent_position_id para ninguno de los dos (NULL)
    -- Si ya existe una relación, se elimina estableciendo parent_position_id como NULL
    UPDATE organization_chart SET parent_position_id = NULL 
    WHERE position_id IN ('6baa44a3-9e5e-4f44-b589-a454800805fd', '274282fd-70fc-4836-bc90-0692200bb11c');
    
    -- Asegurar que CEO y COO no tengan parent (son el nivel más alto)
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('6baa44a3-9e5e-4f44-b589-a454800805fd', NULL)
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = NULL;
    
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('274282fd-70fc-4836-bc90-0692200bb11c', NULL)
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = NULL;
    
    -- Administrador reporta a COO (según la estructura: Dirección Administrativa reporta a COO)
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('eeacbf8d-f046-4603-83e0-4795f1941383', '274282fd-70fc-4836-bc90-0692200bb11c')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- RRHH reporta a Administrador
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('dff05302-d03c-41df-a047-49551bbc337a', 'eeacbf8d-f046-4603-83e0-4795f1941383')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Jefa de Contabilidad reporta a Administrador
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('68089fb1-cd40-46af-8826-b3d5f58d71c2', 'eeacbf8d-f046-4603-83e0-4795f1941383')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Mercadeo reporta a Administrador
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('6d7d6e2a-22e8-4488-86dd-e7c208fb6283', 'eeacbf8d-f046-4603-83e0-4795f1941383')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Operaciones reporta a Administrador
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('dc8b4463-6e05-48e9-adbb-043d928ec1bf', 'eeacbf8d-f046-4603-83e0-4795f1941383')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Compras reporta a Administrador (usar Jefe de Compras o Coordinadora)
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('9a12dd78-55a7-44e2-8bf4-e00723de75f7', 'eeacbf8d-f046-4603-83e0-4795f1941383')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Distribución reporta a Administrador
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('9ad2ac54-9817-4b78-8a74-d1479d2969e8', 'eeacbf8d-f046-4603-83e0-4795f1941383')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- IT Manager reporta a Administrador
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('4ca524c8-072f-4e87-b244-3fce005a291c', 'eeacbf8d-f046-4603-83e0-4795f1941383')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Asistente de RRHH / Encargada de Planilla reporta a RRHH
    -- Usar "Asistente RR HH y Contabilidad" o "Especialista de Nómina"
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('782c2f11-f10d-4b5a-8c29-27089db74ae2', 'dff05302-d03c-41df-a047-49551bbc337a')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Asistente de Contabilidad reporta a Jefa de Contabilidad
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('08e1136d-7b29-49c4-9e32-a4ea8a383811', '68089fb1-cd40-46af-8826-b3d5f58d71c2')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Gerente de Tienda reporta a Operaciones
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('0b660014-936f-498b-80ea-c13bbf43f59c', 'dc8b4463-6e05-48e9-adbb-043d928ec1bf')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- IT 2 reporta a IT Manager
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('00000000-0000-0000-0000-000000000113', '4ca524c8-072f-4e87-b244-3fce005a291c')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Subgerente de Tienda reporta a Gerente de Tienda
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('4e58edc4-2943-4a71-920c-a2f0f4d31bcc', '0b660014-936f-498b-80ea-c13bbf43f59c')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Configurar posiciones de tienda que reportan a Gerente de Tienda
    -- Piso de Venta reporta a Gerente de Tienda
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('37798195-2f2b-43b7-835e-c3fcfd491f37', '0b660014-936f-498b-80ea-c13bbf43f59c')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Peluquero reporta a Gerente de Tienda
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('8fae41e2-6054-48c6-91f9-7388a87d6245', '0b660014-936f-498b-80ea-c13bbf43f59c')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- Médico Veterinario reporta a Gerente de Tienda
    INSERT INTO organization_chart (position_id, parent_position_id)
    VALUES ('dd002d82-10b9-49e5-8e8d-a49bbcbe0d34', '0b660014-936f-498b-80ea-c13bbf43f59c')
    ON CONFLICT (position_id) DO UPDATE SET parent_position_id = EXCLUDED.parent_position_id;

    -- NOTA: Si hay múltiples Gerentes de Tienda (una por cada una de las 14 tiendas),
    -- deberás configurar manualmente desde la interfaz del organigrama cuál Piso de Venta,
    -- Peluquero y Veterinario reporta a cada Gerente de Tienda específico.

END $$;

