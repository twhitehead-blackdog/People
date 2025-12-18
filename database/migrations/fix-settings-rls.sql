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

-- ============================================
-- PASO 2: CREAR POLÍTICAS LIMPIAS Y CONSISTENTES
-- ============================================
-- Solo para usuarios autenticados (authenticated role)

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
-- VERIFICACIÓN
-- ============================================
-- Para verificar que las políticas están correctas, ejecuta:
-- SELECT * FROM pg_policies WHERE tablename = 'settings';

