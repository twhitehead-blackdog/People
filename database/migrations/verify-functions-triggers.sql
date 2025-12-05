-- ============================================
-- VERIFICAR FUNCIONES Y TRIGGERS
-- ============================================
-- Este script verifica qué funciones y triggers existen
-- y cuáles faltan comparado con la lista esperada
-- ============================================

-- ============================================
-- FUNCIONES ESPERADAS (v2.0)
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
-- TRIGGERS ESPERADOS (v2.0)
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

-- ============================================
-- RESUMEN
-- ============================================
SELECT 
    'FUNCIONES' as tipo,
    COUNT(*) FILTER (WHERE routine_name IN (
        'update_updated_at_column',
        'update_complaint_last_message_at',
        'sync_thread_id_to_messages',
        'get_pos_config_names',
        'handle_new_user',
        'has_pos_access'
    )) as existen,
    6 - COUNT(*) FILTER (WHERE routine_name IN (
        'update_updated_at_column',
        'update_complaint_last_message_at',
        'sync_thread_id_to_messages',
        'get_pos_config_names',
        'handle_new_user',
        'has_pos_access'
    )) as faltan,
    6 as total
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
UNION ALL
SELECT 
    'TRIGGERS' as tipo,
    COUNT(DISTINCT trigger_name) FILTER (WHERE trigger_name IN (
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
    )) as existen,
    12 - COUNT(DISTINCT trigger_name) FILTER (WHERE trigger_name IN (
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
    )) as faltan,
    12 as total
FROM information_schema.triggers
WHERE trigger_schema = 'public';

