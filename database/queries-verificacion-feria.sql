-- ============================================
-- QUERIES DE VERIFICACIÓN - SISTEMA DE FERIA DE EMPLEO
-- ============================================
-- Ejecutar estos queries en Supabase SQL Editor para verificar
-- que todas las tablas y configuraciones estén correctas
-- ============================================

-- ============================================
-- 1. VERIFICAR TABLA settings
-- ============================================
-- Verificar que la tabla existe y tiene la estructura correcta
SELECT 
    'settings' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'settings'
ORDER BY ordinal_position;

-- ============================================
-- 2. VERIFICAR SETTINGS DE FERIA
-- ============================================
-- Verificar que los 3 settings de la feria existen
SELECT 
    key,
    value,
    description,
    category,
    is_encrypted,
    created_at,
    updated_at,
    CASE 
        WHEN key = 'job_fair_enabled' AND value IN ('true', 'false') THEN '✓ Válido'
        WHEN key = 'job_fair_enabled' THEN '⚠️ Valor inválido (debe ser "true" o "false")'
        WHEN key LIKE 'job_fair_%_date' AND (value = '' OR value ~ '^\d{4}-\d{2}-\d{2}$') THEN '✓ Válido'
        WHEN key LIKE 'job_fair_%_date' THEN '⚠️ Formato inválido (debe ser YYYY-MM-DD o vacío)'
        ELSE '✓ OK'
    END as estado_validacion
FROM settings
WHERE key IN ('job_fair_enabled', 'job_fair_start_date', 'job_fair_end_date')
ORDER BY key;

-- Verificar si faltan settings
SELECT 
    'FALTANTES' as tipo,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM settings WHERE key = 'job_fair_enabled') 
        THEN '✗ job_fair_enabled NO EXISTE'
        ELSE '✓ job_fair_enabled existe'
    END as job_fair_enabled,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM settings WHERE key = 'job_fair_start_date') 
        THEN '✗ job_fair_start_date NO EXISTE'
        ELSE '✓ job_fair_start_date existe'
    END as job_fair_start_date,
    CASE 
        WHEN NOT EXISTS (SELECT 1 FROM settings WHERE key = 'job_fair_end_date') 
        THEN '✗ job_fair_end_date NO EXISTE'
        ELSE '✓ job_fair_end_date existe'
    END as job_fair_end_date;

-- ============================================
-- 3. VERIFICAR TABLA job_applications
-- ============================================
-- Verificar estructura de la tabla
SELECT 
    'job_applications' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'job_applications'
ORDER BY ordinal_position;

-- Verificar que la tabla existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'job_applications'
        ) 
        THEN '✓ Tabla job_applications EXISTE'
        ELSE '✗ Tabla job_applications NO EXISTE'
    END as estado_tabla;

-- Contar aplicaciones (si hay datos)
SELECT 
    COUNT(*) as total_aplicaciones,
    COUNT(DISTINCT status) as estados_diferentes,
    COUNT(DISTINCT position_id) as posiciones_diferentes
FROM job_applications;

-- ============================================
-- 4. VERIFICAR TABLA job_application_statuses
-- ============================================
-- Verificar estructura de la tabla
SELECT 
    'job_application_statuses' as tabla,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'job_application_statuses'
ORDER BY ordinal_position;

-- Verificar que la tabla existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = 'job_application_statuses'
        ) 
        THEN '✓ Tabla job_application_statuses EXISTE'
        ELSE '✗ Tabla job_application_statuses NO EXISTE'
    END as estado_tabla;

-- Ver estados personalizados creados
SELECT 
    code,
    label,
    severity,
    display_order,
    is_default,
    is_active,
    created_at
FROM job_application_statuses
ORDER BY display_order, code;

-- Verificar estados por defecto
SELECT 
    CASE 
        WHEN COUNT(*) >= 5 THEN '✓ Estados por defecto completos (' || COUNT(*) || ')'
        ELSE '⚠️ Faltan estados por defecto (solo hay ' || COUNT(*) || ')'
    END as estado_defaults,
    string_agg(code, ', ' ORDER BY display_order) as codigos_existentes
FROM job_application_statuses
WHERE is_default = true;

-- ============================================
-- 5. VERIFICAR CAMPO available_for_job_fair EN positions
-- ============================================
-- Verificar que el campo existe
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'positions'
            AND column_name = 'available_for_job_fair'
        ) 
        THEN '✓ Campo available_for_job_fair EXISTE en positions'
        ELSE '✗ Campo available_for_job_fair NO EXISTE en positions'
    END as estado_campo;

-- Ver información del campo
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'positions'
    AND column_name = 'available_for_job_fair';

-- Estadísticas de posiciones disponibles para feria
SELECT 
    COUNT(*) as total_posiciones,
    COUNT(*) FILTER (WHERE available_for_job_fair = true) as disponibles_feria,
    COUNT(*) FILTER (WHERE available_for_job_fair = false) as no_disponibles_feria,
    COUNT(*) FILTER (WHERE available_for_job_fair IS NULL) as sin_configurar
FROM positions;

-- ============================================
-- 6. VERIFICAR ÍNDICES
-- ============================================
-- Ver índices de job_applications
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'job_applications'
ORDER BY indexname;

-- Ver índices de job_application_statuses
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'job_application_statuses'
ORDER BY indexname;

-- Ver índices de positions relacionados con feria
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE schemaname = 'public'
    AND tablename = 'positions'
    AND indexdef LIKE '%job_fair%'
ORDER BY indexname;

-- ============================================
-- 7. VERIFICAR TRIGGERS
-- ============================================
-- Ver triggers de job_applications
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table = 'job_applications'
ORDER BY trigger_name;

-- Ver triggers de job_application_statuses
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE event_object_schema = 'public'
    AND event_object_table = 'job_application_statuses'
ORDER BY trigger_name;

-- ============================================
-- 8. VERIFICAR RELACIONES (FOREIGN KEYS)
-- ============================================
-- Ver foreign keys de job_applications
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'job_applications'
ORDER BY tc.table_name, kcu.column_name;

-- ============================================
-- 9. RESUMEN COMPLETO DE VERIFICACIÓN
-- ============================================
SELECT 
    'RESUMEN DE VERIFICACIÓN' as tipo,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings')
        THEN '✓'
        ELSE '✗'
    END || ' Tabla settings' as verificacion_1,
    CASE 
        WHEN EXISTS (SELECT 1 FROM settings WHERE key = 'job_fair_enabled')
        THEN '✓'
        ELSE '✗'
    END || ' Setting job_fair_enabled' as verificacion_2,
    CASE 
        WHEN EXISTS (SELECT 1 FROM settings WHERE key = 'job_fair_start_date')
        THEN '✓'
        ELSE '✗'
    END || ' Setting job_fair_start_date' as verificacion_3,
    CASE 
        WHEN EXISTS (SELECT 1 FROM settings WHERE key = 'job_fair_end_date')
        THEN '✓'
        ELSE '✗'
    END || ' Setting job_fair_end_date' as verificacion_4,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_applications')
        THEN '✓'
        ELSE '✗'
    END || ' Tabla job_applications' as verificacion_5,
    CASE 
        WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'job_application_statuses')
        THEN '✓'
        ELSE '✗'
    END || ' Tabla job_application_statuses' as verificacion_6,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'positions'
            AND column_name = 'available_for_job_fair'
        )
        THEN '✓'
        ELSE '✗'
    END || ' Campo available_for_job_fair en positions' as verificacion_7;

-- ============================================
-- 10. VALORES ACTUALES DE CONFIGURACIÓN
-- ============================================
-- Ver valores actuales de los settings de feria
SELECT 
    'CONFIGURACIÓN ACTUAL' as tipo,
    key,
    value as valor_actual,
    CASE 
        WHEN key = 'job_fair_enabled' THEN 
            CASE 
                WHEN value = 'true' THEN '🟢 Feria ACTIVA'
                WHEN value = 'false' THEN '🔴 Feria INACTIVA'
                ELSE '⚠️ Valor inválido: ' || value
            END
        WHEN key = 'job_fair_start_date' THEN 
            CASE 
                WHEN value = '' OR value IS NULL THEN '📅 Sin fecha de inicio'
                ELSE '📅 Inicio: ' || value
            END
        WHEN key = 'job_fair_end_date' THEN 
            CASE 
                WHEN value = '' OR value IS NULL THEN '📅 Sin fecha de fin'
                ELSE '📅 Fin: ' || value
            END
    END as interpretacion
FROM settings
WHERE key IN ('job_fair_enabled', 'job_fair_start_date', 'job_fair_end_date')
ORDER BY 
    CASE key
        WHEN 'job_fair_enabled' THEN 1
        WHEN 'job_fair_start_date' THEN 2
        WHEN 'job_fair_end_date' THEN 3
    END;

-- ============================================
-- FIN DE VERIFICACIONES
-- ============================================





