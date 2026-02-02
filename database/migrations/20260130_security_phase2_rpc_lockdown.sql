-- =============================================================================
-- Migration PARTE 2: RPC Function Lockdown (REQUIERE VERIFICAR JOB FAIR)
-- Date: 2026-01-30
-- ⚠️  EJECUTAR SOLO DESPUÉS DE VERIFICAR QUE /job-fair FUNCIONA CON PARTE 1
-- =============================================================================
--
-- ANTES DE EJECUTAR:
-- 1. Aplica la Parte 1
-- 2. Despliega el server.ts actualizado
-- 3. Prueba que /job-fair funciona (cargar formulario, enviar aplicación)
-- 4. Prueba que el dashboard funciona (login, navegar, marcar entrada/salida)
-- 5. Si todo está OK, ejecuta esta migración
--
-- SI ALGO FALLA DESPUÉS DE EJECUTAR:
-- Rollback: GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, public, authenticated;
-- =============================================================================

-- #6: Revocar ejecución de funciones RPC para anon y public
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM public;

-- Re-otorgar funciones de seguridad a authenticated
DO $$
BEGIN
  -- Core security helpers (usadas por RLS policies internamente como SECURITY DEFINER,
  -- pero también necesitan ser ejecutables por authenticated para RPC directo)
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_admin' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'is_schedule_admin' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.is_schedule_admin() TO authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_employee_id' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_employee_id() TO authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_company_id' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.current_company_id() TO authenticated';
  END IF;

  -- Permission system v2
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_permissions' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.get_my_permissions() TO authenticated';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_employee_permission' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.set_employee_permission(uuid, text, boolean, text, timestamptz) TO authenticated';
  END IF;

  -- Health check
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'api_health' AND pronamespace = 'public'::regnamespace) THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.api_health() TO authenticated';
  END IF;
END $$;

-- Bloquear funciones futuras para anon/public por defecto
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  REVOKE EXECUTE ON FUNCTIONS FROM anon, public;

-- =============================================================================
-- ROLLBACK (ejecutar si algo falla):
-- =============================================================================
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, public, authenticated;
-- ALTER DEFAULT PRIVILEGES IN SCHEMA public
--   GRANT EXECUTE ON FUNCTIONS TO anon, public, authenticated;
-- =============================================================================
