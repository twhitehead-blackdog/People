-- ============================================
-- EXPORTAR ESTRUCTURA - QUERIES INDIVIDUALES
-- ============================================
-- Ejecuta cada sección por separado para obtener todos los resultados
-- ============================================

-- ============================================
-- QUERY 1: TABLAS Y COLUMNAS
-- ============================================
-- Copia y ejecuta este query primero
SELECT
  c.table_schema,
  c.table_name,
  c.ordinal_position AS column_position,
  c.column_name,
  c.data_type,
  c.udt_name,
  c.character_maximum_length,
  c.numeric_precision,
  c.numeric_scale,
  c.datetime_precision,
  c.is_nullable,
  c.column_default,
  pgd.description AS column_comment
FROM information_schema.columns c
LEFT JOIN pg_catalog.pg_class pc
  ON pc.relname = c.table_name
  AND pc.relkind IN ('r','p','v','m')
LEFT JOIN pg_catalog.pg_namespace pn
  ON pn.oid = pc.relnamespace
  AND pn.nspname = c.table_schema
LEFT JOIN pg_catalog.pg_attribute pa
  ON pa.attrelid = pc.oid
  AND pa.attname = c.column_name
LEFT JOIN pg_catalog.pg_description pgd
  ON pgd.objoid = pa.attrelid
  AND pgd.objsubid = pa.attnum
WHERE c.table_schema NOT IN ('pg_catalog','information_schema')
ORDER BY c.table_schema, c.table_name, c.ordinal_position;

-- ============================================
-- QUERY 2: FOREIGN KEYS Y RELACIONES
-- ============================================
SELECT
  tc.table_schema AS source_schema,
  tc.table_name   AS source_table,
  kcu.column_name AS source_column,
  ccu.table_schema AS target_schema,
  ccu.table_name   AS target_table,
  ccu.column_name  AS target_column,
  rc.update_rule,
  rc.delete_rule,
  tc.constraint_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
  AND rc.constraint_schema = tc.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.constraint_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema NOT IN ('pg_catalog','information_schema')
ORDER BY source_schema, source_table, tc.constraint_name, kcu.ordinal_position;

-- ============================================
-- QUERY 3: ÍNDICES
-- ============================================
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  i.relname AS index_name,
  pg_get_indexdef(i.oid) AS index_def,
  ix.indisunique AS is_unique,
  ix.indisprimary AS is_primary,
  ix.indisvalid   AS is_valid
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
JOIN pg_index ix ON ix.indrelid = c.oid
JOIN pg_class i ON i.oid = ix.indexrelid
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND c.relkind IN ('r','p')
ORDER BY schema_name, table_name, index_name;

-- ============================================
-- QUERY 4: CONSTRAINTS
-- ============================================
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    WHEN 'x' THEN 'EXCLUDE'
    ELSE con.contype::text
  END AS constraint_type,
  pg_get_constraintdef(con.oid, true) AS constraint_def
FROM pg_constraint con
JOIN pg_class c ON c.oid = con.conrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY schema_name, table_name, constraint_type, constraint_name;

-- ============================================
-- QUERY 5: FUNCIONES ALMACENADAS (CORREGIDO)
-- ============================================
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  CASE 
    WHEN p.prokind IN ('f', 'p') THEN pg_get_functiondef(p.oid)
    ELSE '-- Función de agregación (no se puede obtener definición)'
  END AS definition,
  l.lanname AS language,
  CASE p.prokind
    WHEN 'f' THEN 'function'
    WHEN 'p' THEN 'procedure'
    WHEN 'a' THEN 'aggregate'
    WHEN 'w' THEN 'window'
    ELSE 'other'
  END AS kind,
  p.prosecdef AS security_definer,
  CASE p.provolatile
    WHEN 'i' THEN 'immutable'
    WHEN 's' THEN 'stable'
    WHEN 'v' THEN 'volatile'
    ELSE 'unknown'
  END AS volatility
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
JOIN pg_language l ON l.oid = p.prolang
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
  AND p.prokind IN ('f', 'p')  -- Solo funciones y procedimientos
ORDER BY schema_name, function_name, arguments;

-- ============================================
-- QUERY 6: TRIGGERS
-- ============================================
SELECT
  evt_tg.tgname AS trigger_name,
  n.nspname AS schema_name,
  c.relname AS table_name,
  pg_get_triggerdef(evt_tg.oid, true) AS trigger_def,
  CASE evt_tg.tgenabled
    WHEN 'O' THEN 'enabled'
    WHEN 'D' THEN 'disabled'
    WHEN 'R' THEN 'replica'
    WHEN 'A' THEN 'always'
  END AS enabled_state
FROM pg_trigger evt_tg
JOIN pg_class c ON c.oid = evt_tg.tgrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE NOT evt_tg.tgisinternal
  AND n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY schema_name, table_name, trigger_name;

-- ============================================
-- QUERY 7: VISTAS
-- ============================================
SELECT
  v.table_schema AS schema_name,
  v.table_name   AS view_name,
  pg_get_viewdef(quote_ident(v.table_schema)||'.'||quote_ident(v.table_name), true) AS view_def,
  obj_description((quote_ident(v.table_schema)||'.'||quote_ident(v.table_name))::regclass, 'pg_class') AS comment
FROM information_schema.views v
WHERE v.table_schema NOT IN ('pg_catalog','information_schema')
ORDER BY schema_name, view_name;

-- ============================================
-- QUERY 8: POLÍTICAS RLS (CORREGIDO)
-- ============================================
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  pol.polname AS policy_name,
  CASE pol.polcmd
    WHEN 'r' THEN 'SELECT'
    WHEN 'a' THEN 'INSERT'
    WHEN 'w' THEN 'UPDATE'
    WHEN 'd' THEN 'DELETE'
    WHEN '*' THEN 'ALL'
  END AS for_cmd,
  pg_get_expr(pol.polqual, pol.polrelid) AS using_expr,
  pg_get_expr(pol.polwithcheck, pol.polrelid) AS with_check_expr,
  pg_catalog.pg_get_userbyid(c.relowner) AS table_owner,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_force
FROM pg_policy pol
JOIN pg_class c ON c.oid = pol.polrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog','information_schema')
ORDER BY schema_name, table_name, policy_name, for_cmd;

-- ============================================
-- QUERY 9: EXTENSIONES (YA LO TIENES)
-- ============================================
SELECT
  e.extname AS extension_name,
  n.nspname AS schema_name,
  e.extversion AS version,
  obj_description(e.oid, 'pg_extension') AS description
FROM pg_extension e
LEFT JOIN pg_namespace n ON n.oid = e.extnamespace
ORDER BY extension_name;

