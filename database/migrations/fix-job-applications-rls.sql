-- ============================================
-- CORREGIR POLÍTICAS RLS PARA TABLA job_applications
-- ============================================
-- Este script corrige las políticas RLS de la tabla job_applications
-- para que permita inserciones públicas (anon) desde el formulario de feria
-- 
-- Problema: Las políticas solo permiten TO public, pero cuando se usa
-- ENV_SUPABASE_ANON_KEY, Supabase trata al usuario como rol 'anon'
-- 
-- Solución: Crear políticas para ambos roles: 'public' y 'anon'
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES
-- ============================================
-- Esto asegura que no haya conflictos

DROP POLICY IF EXISTS "Allow public insert to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated select from job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated update to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated delete from job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow anon insert to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow anon select from job_applications" ON job_applications;

-- ============================================
-- PASO 2: CREAR POLÍTICAS PARA ROL 'public'
-- ============================================

-- INSERT: Permitir que usuarios públicos puedan insertar aplicaciones
CREATE POLICY "Allow public insert to job_applications"
ON job_applications
FOR INSERT 
TO public
WITH CHECK (true);

-- SELECT: Permitir que usuarios públicos puedan leer sus propias aplicaciones (opcional)
-- Por ahora, solo permitimos SELECT a authenticated para seguridad
-- Si necesitas que usuarios públicos puedan leer, descomenta esto:
-- CREATE POLICY "Allow public select from job_applications"
-- ON job_applications
-- FOR SELECT 
-- TO public
-- USING (true);

-- ============================================
-- PASO 3: CREAR POLÍTICAS PARA ROL 'anon' (cuando se usa ANON_KEY)
-- ============================================
-- IMPORTANTE: Estas políticas son necesarias porque el interceptor HTTP
-- usa ENV_SUPABASE_ANON_KEY, lo que hace que Supabase trate al usuario
-- como rol 'anon' en lugar de 'public'.

-- INSERT: Permitir que usuarios anónimos puedan insertar aplicaciones
CREATE POLICY "Allow anon insert to job_applications"
ON job_applications
FOR INSERT 
TO anon
WITH CHECK (true);

-- SELECT: Permitir que usuarios anónimos puedan leer (opcional, solo si es necesario)
-- Por ahora, solo permitimos SELECT a authenticated para seguridad
-- Si necesitas que usuarios anónimos puedan leer, descomenta esto:
-- CREATE POLICY "Allow anon select from job_applications"
-- ON job_applications
-- FOR SELECT 
-- TO anon
-- USING (true);

-- ============================================
-- PASO 4: CREAR POLÍTICAS PARA ROL 'authenticated'
-- ============================================

-- SELECT: Permitir que usuarios autenticados puedan leer todas las aplicaciones
CREATE POLICY "Allow authenticated select from job_applications"
ON job_applications
FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Permitir que usuarios autenticados puedan actualizar aplicaciones
CREATE POLICY "Allow authenticated update to job_applications"
ON job_applications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- DELETE: Permitir que usuarios autenticados puedan eliminar aplicaciones
CREATE POLICY "Allow authenticated delete from job_applications"
ON job_applications
FOR DELETE
TO authenticated
USING (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que las políticas están correctas, ejecuta:
-- SELECT * FROM pg_policies WHERE tablename = 'job_applications';

SELECT 
  policyname, 
  cmd, 
  roles,
  qual,
  with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'job_applications'
ORDER BY policyname;

