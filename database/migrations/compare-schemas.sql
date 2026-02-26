-- ============================================
-- COMPARAR ESTRUCTURAS ENTRE BASES DE DATOS
-- ============================================
-- Este script ayuda a identificar diferencias entre dos bases de datos
-- Ejecutar en cada base de datos y comparar los resultados
-- ============================================

-- ============================================
-- COMPARACIÓN 1: TABLAS QUE FALTAN O SOBRAN
-- ============================================
SELECT 
    'TABLA' as tipo,
    table_name as nombre,
    'EXISTE' as estado
FROM information_schema.tables
WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- ============================================
-- COMPARACIÓN 2: COLUMNAS POR TABLA
-- ============================================
-- Ejecuta esto para cada tabla importante y compara
SELECT 
    table_name,
    column_name,
    data_type,
    character_maximum_length,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name IN (
        'employee_disabilities',
        'branches',
        'settings',
        'employees',
        'positions',
        'timelogs'
    )
ORDER BY table_name, ordinal_position;

-- ============================================
-- COMPARACIÓN 3: CAMPOS ESPECÍFICOS V2.0
-- ============================================
-- Verificar si existen los campos nuevos de la versión 2.0

-- Campo rejection_comment en employee_disabilities
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'employee_disabilities' 
            AND column_name = 'rejection_comment'
        ) THEN '✓ EXISTE'
        ELSE '✗ NO EXISTE'
    END as rejection_comment_status;

-- Campo work_email en branches
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'branches' 
            AND column_name = 'work_email'
        ) THEN '✓ EXISTE'
        ELSE '✗ NO EXISTE'
    END as work_email_status;

-- Settings de feria
SELECT 
    key,
    CASE 
        WHEN EXISTS (SELECT 1 FROM settings WHERE key = 'job_fair_start_date') 
        THEN '✓ EXISTE' 
        ELSE '✗ NO EXISTE' 
    END as job_fair_start_date_status,
    CASE 
        WHEN EXISTS (SELECT 1 FROM settings WHERE key = 'job_fair_end_date') 
        THEN '✓ EXISTE' 
        ELSE '✗ NO EXISTE' 
    END as job_fair_end_date_status
FROM (VALUES 
    ('job_fair_start_date'),
    ('job_fair_end_date')
) AS required_keys(key);

-- ============================================
-- COMPARACIÓN 4: ESTRUCTURA COMPLETA DE TABLAS CLAVE
-- ============================================

-- employee_disabilities
SELECT 
    'employee_disabilities' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'employee_disabilities'
ORDER BY ordinal_position;

-- branches
SELECT 
    'branches' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'branches'
ORDER BY ordinal_position;

-- settings (solo keys relacionadas con feria)
SELECT 
    key,
    value,
    description,
    category
FROM settings
WHERE key LIKE 'job_fair%'
ORDER BY key;

-- ============================================
-- COMPARACIÓN 5: ÍNDICES
-- ============================================
SELECT
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename IN (
        'employee_disabilities',
        'branches',
        'settings'
    )
ORDER BY tablename, indexname;

-- ============================================
-- COMPARACIÓN 6: FUNCIONES Y TRIGGERS
-- ============================================
SELECT
    'FUNCION' as tipo,
    routine_name as nombre
FROM information_schema.routines
WHERE routine_schema = 'public'
UNION ALL
SELECT
    'TRIGGER' as tipo,
    trigger_name as nombre
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY tipo, nombre;

-- ============================================
-- COMPARACIÓN 7: VERIFICAR FUNCIONES ESPECÍFICAS V2.0
-- ============================================
WITH expected_functions AS (
    SELECT unnest(ARRAY[
        'update_updated_at_column',
        'update_complaint_last_message_at',
        'sync_thread_id_to_messages',
        'get_pos_config_names',
        'handle_new_user',
        'has_pos_access'
    ]) as function_name
),
existing_functions AS (
    SELECT routine_name as function_name
    FROM information_schema.routines
    WHERE routine_schema = 'public'
    AND routine_type = 'FUNCTION'
)
SELECT 
    ef.function_name,
    CASE 
        WHEN exf.function_name IS NOT NULL THEN '✓ EXISTE'
        ELSE '✗ NO EXISTE'
    END as estado
FROM expected_functions ef
LEFT JOIN existing_functions exf ON ef.function_name = exf.function_name
ORDER BY ef.function_name;

-- ============================================
-- COMPARACIÓN 8: VERIFICAR TRIGGERS ESPECÍFICOS V2.0
-- ============================================
WITH expected_triggers AS (
    SELECT unnest(ARRAY[
        'update_employee_schedules_updated_at',
        'update_emergency_contacts_updated_at',
        'update_employee_documents_updated_at',
        'update_employee_notes_updated_at',
        'update_employee_skills_updated_at',
        'update_employee_disabilities_updated_at',
        'update_document_requests_updated_at',
        'update_complaints_updated_at',
        'update_complaint_messages_updated_at',
        'update_settings_updated_at',
        'update_complaint_last_message_trigger',
        'sync_complaint_thread_id'
    ]) as trigger_name
),
existing_triggers AS (
    SELECT DISTINCT trigger_name
    FROM information_schema.triggers
    WHERE trigger_schema = 'public'
)
SELECT 
    et.trigger_name,
    CASE 
        WHEN ext.trigger_name IS NOT NULL THEN '✓ EXISTE'
        ELSE '✗ NO EXISTE'
    END as estado
FROM expected_triggers et
LEFT JOIN existing_triggers ext ON et.trigger_name = ext.trigger_name
ORDER BY et.trigger_name;

