-- ============================================
-- EXPORTAR DEFINICIONES DE FUNCIONES Y TRIGGERS
-- ============================================
-- Este script extrae las definiciones completas de funciones y triggers
-- para poder recrearlas en otra base de datos
-- ============================================

-- ============================================
-- 1. DEFINICIONES DE FUNCIONES
-- ============================================
SELECT 
    '-- Función: ' || p.proname as comentario,
    pg_get_functiondef(p.oid) as definicion
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')  -- Solo funciones y procedimientos, NO agregaciones
    AND p.proname IN (
        'update_updated_at_column',
        'update_complaint_last_message_at',
        'sync_thread_id_to_messages',
        'get_pos_config_names',
        'handle_new_user',
        'has_pos_access'
    )
ORDER BY p.proname;

-- ============================================
-- 2. DEFINICIONES DE TRIGGERS
-- ============================================
SELECT 
    '-- Trigger: ' || trigger_name || ' en tabla: ' || event_object_table as comentario,
    'CREATE TRIGGER ' || trigger_name || E'\n' ||
    '    ' || action_timing || ' ' || event_manipulation || ' ON ' || event_object_table || E'\n' ||
    '    FOR EACH ROW' || E'\n' ||
    '    EXECUTE FUNCTION ' || action_statement || ';' as definicion
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND trigger_name IN (
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
)
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 3. FUNCIONES COMPLETAS (ALTERNATIVA)
-- ============================================
-- Si la consulta anterior no funciona, usa esta:
SELECT 
    n.nspname as schema_name,
    p.proname as function_name,
    pg_get_functiondef(p.oid) as full_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')  -- Solo funciones y procedimientos, NO agregaciones
    AND p.proname IN (
        'update_updated_at_column',
        'update_complaint_last_message_at',
        'sync_thread_id_to_messages',
        'get_pos_config_names',
        'handle_new_user',
        'has_pos_access'
    )
ORDER BY p.proname;

