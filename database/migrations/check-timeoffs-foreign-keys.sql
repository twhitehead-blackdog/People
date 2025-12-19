-- ============================================
-- VERIFICAR NOMBRES ACTUALES DE FOREIGN KEYS EN TIMEOFFS
-- ============================================
-- Este script lista todas las foreign keys de la tabla timeoffs
-- para verificar qué nombres tienen actualmente
-- ============================================

SELECT 
    tc.constraint_name AS "Nombre de la Foreign Key",
    tc.table_name AS "Tabla",
    kcu.column_name AS "Columna",
    ccu.table_name AS "Tabla Referenciada",
    ccu.column_name AS "Columna Referenciada"
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name = 'timeoffs'
ORDER BY kcu.column_name;

-- Verificar específicamente los nombres esperados por Supabase
SELECT 
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'time_offs_employee_id_fkey'
            AND table_name = 'timeoffs'
        ) THEN '✅ time_offs_employee_id_fkey existe'
        ELSE '❌ time_offs_employee_id_fkey NO existe'
    END AS "Estado employee_id FK",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'timeoffs_reviewed_by_fkey'
            AND table_name = 'timeoffs'
        ) THEN '✅ timeoffs_reviewed_by_fkey existe'
        ELSE '❌ timeoffs_reviewed_by_fkey NO existe'
    END AS "Estado reviewed_by FK",
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'timeoffs_registered_by_fkey'
            AND table_name = 'timeoffs'
        ) THEN '✅ timeoffs_registered_by_fkey existe'
        ELSE '❌ timeoffs_registered_by_fkey NO existe'
    END AS "Estado registered_by FK";

