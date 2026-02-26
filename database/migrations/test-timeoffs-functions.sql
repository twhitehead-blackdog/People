-- ============================================
-- Script de diagnóstico para funciones RLS de timeoffs
-- ============================================
-- Ejecuta este script para verificar si las funciones están funcionando

-- 1. Verificar si las funciones existen
SELECT 
    proname as function_name,
    pg_get_functiondef(oid) as definition
FROM pg_proc 
WHERE proname IN ('current_employee_id', 'is_admin')
ORDER BY proname;

-- 2. Verificar el contenido del JWT (esto mostrará NULL si no hay JWT activo)
-- NOTA: Esto solo funciona si estás ejecutando desde una sesión autenticada
SELECT 
    auth.jwt() as jwt_content,
    auth.jwt() ->> 'email' as email_from_jwt,
    auth.uid() as user_id_from_auth;

-- 3. Verificar si hay un empleado activo con el email del JWT
-- NOTA: Esto requiere que tengas un usuario autenticado
SELECT 
    id,
    first_name,
    father_name,
    work_email,
    is_active
FROM employees
WHERE work_email = COALESCE(auth.jwt() ->> 'email', 'NO_EMAIL_FOUND')
LIMIT 1;

-- 4. Probar la función current_employee_id()
-- NOTA: Esto retornará NULL si no encuentra el empleado o si no hay JWT
SELECT current_employee_id() as current_employee_id_result;

-- 5. Probar la función is_admin()
-- NOTA: Esto retornará false o NULL si no es admin o no hay JWT
SELECT is_admin() as is_admin_result;

-- ============================================
-- Si las funciones retornan NULL, necesitamos usar otra estrategia
-- ============================================

