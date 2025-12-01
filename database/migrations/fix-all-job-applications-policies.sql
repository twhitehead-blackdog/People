-- ============================================
-- Script COMPLETO para corregir TODAS las políticas
-- ============================================
-- Este script corrige:
-- 1. Políticas RLS de la tabla job_applications
-- 2. Políticas RLS del bucket job-applications en Storage
-- ============================================
-- Ejecuta este script si obtienes errores de RLS o 400 al subir archivos
-- ============================================

-- ============================================
-- PARTE 1: CORREGIR POLÍTICAS DE LA TABLA
-- ============================================

-- Eliminar todas las políticas existentes de la tabla
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

-- Verificar que RLS está habilitado en la tabla
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- ============================================
-- PARTE 2: CORREGIR POLÍTICAS DE STORAGE
-- ============================================

-- Eliminar todas las políticas existentes del bucket
DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;

-- Política para permitir que cualquiera pueda subir archivos (INSERT público)
-- IMPORTANTE: Esta política permite que usuarios públicos suban archivos
CREATE POLICY "Allow public uploads to job-applications"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'job-applications');

-- Política para permitir lectura de archivos (solo para usuarios autenticados)
CREATE POLICY "Allow authenticated read from job-applications"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'job-applications');

-- Política para permitir actualización de archivos (solo para usuarios autenticados)
CREATE POLICY "Allow authenticated update from job-applications"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'job-applications')
WITH CHECK (bucket_id = 'job-applications');

-- Política para permitir eliminación de archivos (solo para usuarios autenticados)
CREATE POLICY "Allow authenticated delete from job-applications"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'job-applications');

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Después de ejecutar este script, verifica:
-- 1. En Table Editor > job_applications > Policies: Debe haber 4 políticas
-- 2. En Storage > job-applications > Policies: Debe haber 4 políticas
-- ============================================

