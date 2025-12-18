-- ============================================
-- CORREGIR POLÍTICAS RLS PARA TABLA SETTINGS
-- ============================================
-- Este script corrige las políticas RLS de la tabla settings
-- para que los PATCH retornen correctamente los registros actualizados
-- 
-- Problema: Hay políticas duplicadas y conflictivas que causan
-- que UPDATE retorne array vacío aunque se ejecute correctamente
-- 
-- Solución: Eliminar TODAS las políticas existentes y crear
-- políticas limpias y consistentes con USING y WITH CHECK apropiados
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================
-- Esto asegura que no haya conflictos

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON settings;
DROP POLICY IF EXISTS "Authenticated users can insert settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can read settings" ON settings;
DROP POLICY IF EXISTS "Authenticated users can update settings" ON settings;
DROP POLICY IF EXISTS "settings_insert_anon" ON settings;
DROP POLICY IF EXISTS "settings_select_anon" ON settings;
DROP POLICY IF EXISTS "Settings: Delete for authenticated" ON settings;
DROP POLICY IF EXISTS "Settings: Insert for authenticated" ON settings;
DROP POLICY IF EXISTS "Settings: Read for authenticated" ON settings;
DROP POLICY IF EXISTS "Settings: Update for authenticated" ON settings;
-- Eliminar también las nuevas políticas que vamos a crear (por si ya existen)
DROP POLICY IF EXISTS "Settings: Read for anon" ON settings;
DROP POLICY IF EXISTS "Settings: Insert for anon" ON settings;
DROP POLICY IF EXISTS "Settings: Update for anon" ON settings;
DROP POLICY IF EXISTS "Settings: Delete for anon" ON settings;

-- ============================================
-- PASO 2: CREAR POLÍTICAS LIMPIAS Y CONSISTENTES
-- ============================================
-- IMPORTANTE: La aplicación usa ENV_SUPABASE_ANON_KEY, por lo que
-- Supabase trata al usuario como rol 'anon', no 'authenticated'.
-- Por eso necesitamos políticas para ambos roles.

-- ============================================
-- POLÍTICAS PARA ROL 'authenticated'
-- ============================================

-- SELECT: Todos los usuarios autenticados pueden leer
CREATE POLICY "Settings: Read for authenticated" ON settings
    FOR SELECT 
    TO authenticated
    USING (true);

-- INSERT: Todos los usuarios autenticados pueden crear
CREATE POLICY "Settings: Insert for authenticated" ON settings
    FOR INSERT 
    TO authenticated
    WITH CHECK (true);

-- UPDATE: Todos los usuarios autenticados pueden actualizar
-- CRÍTICO: Usar tanto USING como WITH CHECK para UPDATE
-- Esto permite que return=representation funcione correctamente
CREATE POLICY "Settings: Update for authenticated" ON settings
    FOR UPDATE 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- DELETE: Todos los usuarios autenticados pueden eliminar
CREATE POLICY "Settings: Delete for authenticated" ON settings
    FOR DELETE 
    TO authenticated
    USING (true);

-- ============================================
-- POLÍTICAS PARA ROL 'anon' (cuando se usa ANON_KEY)
-- ============================================
-- NOTA: Estas políticas son necesarias porque el interceptor HTTP
-- usa ENV_SUPABASE_ANON_KEY, lo que hace que Supabase trate al usuario
-- como rol 'anon' en lugar de 'authenticated'.

-- SELECT: Usuarios anónimos pueden leer
CREATE POLICY "Settings: Read for anon" ON settings
    FOR SELECT 
    TO anon
    USING (true);

-- INSERT: Usuarios anónimos pueden crear
CREATE POLICY "Settings: Insert for anon" ON settings
    FOR INSERT 
    TO anon
    WITH CHECK (true);

-- UPDATE: Usuarios anónimos pueden actualizar
-- CRÍTICO: Usar tanto USING como WITH CHECK para UPDATE
-- Esto permite que return=representation funcione correctamente
CREATE POLICY "Settings: Update for anon" ON settings
    FOR UPDATE 
    TO anon
    USING (true)
    WITH CHECK (true);

-- DELETE: Usuarios anónimos pueden eliminar
CREATE POLICY "Settings: Delete for anon" ON settings
    FOR DELETE 
    TO anon
    USING (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que las políticas están correctas, ejecuta:
-- SELECT * FROM pg_policies WHERE tablename = 'settings';

