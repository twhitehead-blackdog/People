-- ============================================
-- Script para corregir políticas RLS de job_applications
-- ============================================
-- Ejecuta este script si obtienes el error:
-- "new row violates row-level security policy"
-- ============================================

-- Eliminar todas las políticas existentes
DROP POLICY IF EXISTS "Allow public insert to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated select from job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated update to job_applications" ON job_applications;
DROP POLICY IF EXISTS "Allow authenticated delete from job_applications" ON job_applications;

-- Política para permitir que cualquiera pueda insertar aplicaciones (público)
-- IMPORTANTE: Esta política debe permitir INSERT sin restricciones para usuarios públicos
CREATE POLICY "Allow public insert to job_applications"
ON job_applications
FOR INSERT
TO public
WITH CHECK (true);

-- Política para permitir que usuarios autenticados puedan leer todas las aplicaciones
CREATE POLICY "Allow authenticated select from job_applications"
ON job_applications
FOR SELECT
TO authenticated
USING (true);

-- Política para permitir que usuarios autenticados puedan actualizar aplicaciones
CREATE POLICY "Allow authenticated update to job_applications"
ON job_applications
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- Política para permitir que usuarios autenticados puedan eliminar aplicaciones
CREATE POLICY "Allow authenticated delete from job_applications"
ON job_applications
FOR DELETE
TO authenticated
USING (true);

-- Verificar que RLS está habilitado
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

