-- ============================================
-- DESHABILITAR RLS SOLO EN TABLAS DEL SCHEMA PUBLIC
-- ============================================
-- Este script deshabilita RLS solo en las tablas de tu aplicación
-- (schema 'public'), sin tocar las tablas del sistema de Supabase
-- ============================================

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT quote_ident(n.nspname) AS schema_name, quote_ident(c.relname) AS table_name
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE c.relkind = 'r' 
      AND n.nspname = 'public'  -- Solo tablas del schema public
      AND c.relname NOT LIKE 'pg_%'  -- Excluir tablas que empiezan con pg_
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE %s.%s DISABLE ROW LEVEL SECURITY;', r.schema_name, r.table_name);
      RAISE NOTICE 'RLS deshabilitado en: %.%', r.schema_name, r.table_name;
    EXCEPTION
      WHEN OTHERS THEN
        RAISE NOTICE 'Error al deshabilitar RLS en %.%: %', r.schema_name, r.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================
-- ¡LISTO! RLS deshabilitado en tablas del schema public
-- ============================================

