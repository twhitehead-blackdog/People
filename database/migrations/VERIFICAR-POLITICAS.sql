-- ============================================
-- Script de VERIFICACIÓN de políticas
-- ============================================
-- Ejecuta este script para verificar que las políticas estén correctas
-- ============================================

-- Verificar políticas de la tabla job_applications
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'job_applications'
ORDER BY policyname;

-- Verificar políticas de Storage para el bucket job-applications
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage'
  AND (qual::text LIKE '%job-applications%' OR with_check::text LIKE '%job-applications%')
ORDER BY policyname;

-- Verificar que el bucket existe
SELECT 
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types,
    created_at
FROM storage.buckets 
WHERE id = 'job-applications';

-- Verificar que RLS está habilitado en la tabla
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
  AND tablename = 'job_applications';

-- Verificar que RLS está habilitado en storage.objects
SELECT 
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'storage' 
  AND tablename = 'objects';

