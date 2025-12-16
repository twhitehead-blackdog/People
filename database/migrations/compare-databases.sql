-- ============================================
-- COMPARAR DOS BASES DE DATOS EN SUPABASE
-- ============================================
-- Este script proporciona queries para comparar estructuras entre bases de datos
-- Puedes ejecutar estas queries en diferentes proyectos de Supabase y comparar resultados
-- ============================================

-- ============================================
-- OPCIÓN 1: COMPARAR TABLAS (Qué tablas existen)
-- ============================================

-- Listar todas las tablas en la base de datos actual
SELECT 
    table_schema,
    table_name,
    table_type
FROM information_schema.tables
WHERE table_schema NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY table_schema, table_name;

-- ============================================
-- OPCIÓN 2: COMPARAR COLUMNAS DE UNA TABLA ESPECÍFICA
-- ============================================

-- Reemplaza 'employees' con el nombre de la tabla que quieres comparar
SELECT 
    column_name,
    data_type,
    character_maximum_length,
    numeric_precision,
    numeric_scale,
    is_nullable,
    column_default,
    udt_name
FROM information_schema.columns
WHERE table_name = 'employees'  -- Cambia aquí el nombre de la tabla
  AND table_schema = 'public'
ORDER BY ordinal_position;

-- ============================================
-- OPCIÓN 3: COMPARAR TODAS LAS COLUMNAS DE TODAS LAS TABLAS
-- ============================================

SELECT 
    t.table_name,
    c.column_name,
    c.data_type,
    c.character_maximum_length,
    c.is_nullable,
    c.column_default,
    c.ordinal_position
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name, c.ordinal_position;

-- ============================================
-- OPCIÓN 4: COMPARAR ÍNDICES
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
-- OPCIÓN 5: COMPARAR CONSTRAINTS (PRIMARY KEYS, FOREIGN KEYS, UNIQUE, ETC.)
-- ============================================

SELECT
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    pg_get_constraintdef(cc.oid) AS constraint_definition
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
LEFT JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
LEFT JOIN pg_constraint cc
    ON cc.conname = tc.constraint_name
WHERE tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name;

-- ============================================
-- OPCIÓN 6: COMPARAR FUNCIONES Y PROCEDIMIENTOS
-- ============================================

SELECT 
    routine_schema,
    routine_name,
    routine_type,
    data_type AS return_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;

-- Ver definición completa de una función específica
SELECT 
    proname AS function_name,
    pg_get_functiondef(oid) AS function_definition
FROM pg_proc
WHERE pronamespace = 'public'::regnamespace
ORDER BY proname;

-- ============================================
-- OPCIÓN 7: COMPARAR TRIGGERS
-- ============================================

SELECT 
    trigger_schema,
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement,
    action_timing
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ============================================
-- OPCIÓN 8: COMPARAR SECUENCIAS
-- ============================================

SELECT 
    sequence_schema,
    sequence_name,
    data_type,
    numeric_precision,
    start_value,
    minimum_value,
    maximum_value,
    increment
FROM information_schema.sequences
WHERE sequence_schema = 'public'
ORDER BY sequence_name;

-- ============================================
-- OPCIÓN 9: COMPARAR VIEWS
-- ============================================

SELECT 
    table_schema,
    table_name,
    view_definition
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;

-- ============================================
-- OPCIÓN 10: RESUMEN COMPLETO DE LA BASE DE DATOS
-- ============================================

-- Este query genera un resumen completo que puedes copiar y comparar
SELECT 
    'TABLE' AS object_type,
    table_name AS object_name,
    NULL AS detail
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'

UNION ALL

SELECT 
    'COLUMN' AS object_type,
    table_name || '.' || column_name AS object_name,
    data_type || 
    CASE 
        WHEN character_maximum_length IS NOT NULL 
        THEN '(' || character_maximum_length || ')'
        ELSE ''
    END || 
    CASE 
        WHEN is_nullable = 'NO' THEN ' NOT NULL'
        ELSE ''
    END AS detail
FROM information_schema.columns
WHERE table_schema = 'public'

UNION ALL

SELECT 
    'INDEX' AS object_type,
    tablename || '.' || indexname AS object_name,
    indexdef AS detail
FROM pg_indexes
WHERE schemaname = 'public'

UNION ALL

SELECT 
    'CONSTRAINT' AS object_type,
    table_name || '.' || constraint_name AS object_name,
    constraint_type || ': ' || pg_get_constraintdef(oid) AS detail
FROM information_schema.table_constraints tc
LEFT JOIN pg_constraint pc ON pc.conname = tc.constraint_name
WHERE tc.table_schema = 'public'

UNION ALL

SELECT 
    'FUNCTION' AS object_type,
    routine_name AS object_name,
    routine_type AS detail
FROM information_schema.routines
WHERE routine_schema = 'public'

ORDER BY object_type, object_name;

-- ============================================
-- OPCIÓN 11: COMPARAR ROW LEVEL SECURITY (RLS)
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
-- OPCIÓN 12: EXPORTAR ESQUEMA COMPLETO PARA COMPARACIÓN
-- ============================================

-- Este query genera un script que puedes usar para comparar
SELECT 
    'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' || E'\n' ||
    string_agg(
        '    ' || column_name || ' ' || 
        CASE 
            WHEN data_type = 'character varying' THEN 'VARCHAR(' || character_maximum_length || ')'
            WHEN data_type = 'character' THEN 'CHAR(' || character_maximum_length || ')'
            WHEN data_type = 'numeric' THEN 'NUMERIC(' || numeric_precision || ',' || numeric_scale || ')'
            ELSE UPPER(data_type)
        END ||
        CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
        CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
        ',' || E'\n'
        ORDER BY ordinal_position
    ) || E'\n' || ');' AS create_table_statement
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'employees'  -- Cambia aquí el nombre de la tabla
GROUP BY table_name
ORDER BY table_name;

-- ============================================
-- INSTRUCCIONES DE USO
-- ============================================
-- 1. Ejecuta estos queries en tu base de datos ORIGEN
-- 2. Copia los resultados
-- 3. Ejecuta los mismos queries en tu base de datos DESTINO
-- 4. Compara los resultados manualmente o usando herramientas de diff
-- 
-- ALTERNATIVA: Usa herramientas externas como:
-- - pgAdmin (herramienta de comparación de esquemas)
-- - DBeaver (comparación de bases de datos)
-- - apgdiff (herramienta de línea de comandos)
-- - SchemaSpy (genera documentación HTML)
-- ============================================

