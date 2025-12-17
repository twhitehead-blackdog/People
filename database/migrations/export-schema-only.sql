-- ============================================
-- EXPORTAR SOLO ESTRUCTURA (SIN DATOS)
-- ============================================
-- Este script genera un reporte completo de la estructura de la base de datos
-- Incluye: tablas, columnas, índices, constraints, funciones, triggers, etc.
-- NO incluye datos (INSERT statements)
-- ============================================

-- ============================================
-- 1. LISTADO DE TODAS LAS TABLAS
-- ============================================
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 2. ESTRUCTURA DE COLUMNAS POR TABLA
-- ============================================
SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    CASE 
        WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY'
        WHEN fk.column_name IS NOT NULL THEN 'FOREIGN KEY'
        ELSE ''
    END as key_type
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku 
        ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'PRIMARY KEY'
) pk ON c.table_name = pk.table_name AND c.column_name = pk.column_name
LEFT JOIN (
    SELECT ku.table_name, ku.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage ku 
        ON tc.constraint_name = ku.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
) fk ON c.table_name = fk.table_name AND c.column_name = fk.column_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================
-- 3. FOREIGN KEYS (RELACIONES)
-- ============================================
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 4. ÍNDICES
-- ============================================
SELECT
    schemaname,
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ============================================
-- 5. CHECK CONSTRAINTS
-- ============================================
SELECT
    tc.table_name,
    tc.constraint_name,
    cc.check_clause
FROM information_schema.table_constraints tc
JOIN information_schema.check_constraints cc
    ON tc.constraint_name = cc.constraint_name
WHERE tc.constraint_type = 'CHECK'
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- ============================================
-- 6. FUNCIONES (EXCLUYE FUNCIONES DE AGREGACIÓN Y DEL SISTEMA)
-- ============================================
SELECT
    p.proname as routine_name,
    CASE 
        WHEN p.prokind = 'f' THEN 'FUNCTION'
        WHEN p.prokind = 'p' THEN 'PROCEDURE'
        WHEN p.prokind = 'a' THEN 'AGGREGATE'
        WHEN p.prokind = 'w' THEN 'WINDOW'
        ELSE 'OTHER'
    END as routine_type,
    pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
    AND p.prokind IN ('f', 'p')  -- Solo funciones y procedimientos, NO agregaciones
    AND p.proname NOT LIKE 'pg_%'  -- Excluir funciones del sistema
    AND p.proname NOT LIKE 'crypto_%'  -- Excluir funciones de crypto que pueden ser agregaciones
ORDER BY p.proname;

-- ============================================
-- 7. TRIGGERS
-- ============================================
SELECT
    trigger_name,
    event_object_table as table_name,
    event_manipulation as event,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- 8. VIEWS
-- ============================================
SELECT
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- 9. ROW LEVEL SECURITY (RLS)
-- ============================================
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ============================================
-- 10. COMENTARIOS EN COLUMNAS
-- ============================================
SELECT
    t.table_name,
    c.column_name,
    col_description(
        (t.table_schema || '.' || t.table_name)::regclass,
        c.ordinal_position
    ) as column_comment
FROM information_schema.tables t
JOIN information_schema.columns c 
    ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
    AND col_description(
        (t.table_schema || '.' || t.table_name)::regclass,
        c.ordinal_position
    ) IS NOT NULL
ORDER BY t.table_name, c.ordinal_position;

-- ============================================
-- 11. EXTENSIONES HABILITADAS
-- ============================================
SELECT
    extname,
    extversion
FROM pg_extension
ORDER BY extname;

-- ============================================
-- 12. RESUMEN: TABLAS Y SUS COLUMNAS
-- ============================================
SELECT
    t.table_name,
    COUNT(c.column_name) as total_columns,
    STRING_AGG(c.column_name, ', ' ORDER BY c.ordinal_position) as columns
FROM information_schema.tables t
LEFT JOIN information_schema.columns c 
    ON t.table_name = c.table_name AND c.table_schema = 'public'
WHERE t.table_schema = 'public'
    AND t.table_type = 'BASE TABLE'
GROUP BY t.table_name
ORDER BY t.table_name;

