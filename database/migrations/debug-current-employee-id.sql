-- ============================================
-- Script de diagnóstico avanzado para current_employee_id()
-- ============================================
-- Ejecuta este script DESDE UNA SESIÓN AUTENTICADA (desde tu app)
-- para ver qué está retornando la función

-- 1. Ver el contenido completo del JWT (si está disponible)
SELECT 
    auth.jwt() as jwt_full,
    auth.jwt()::text as jwt_text;

-- 2. Intentar extraer el email de diferentes formas
SELECT 
    auth.jwt() ->> 'email' as email_method1,
    auth.jwt() -> 'email' as email_method2,
    current_setting('request.jwt.claim.email', true) as email_method3,
    current_setting('request.jwt.claims', true)::jsonb ->> 'email' as email_method4;

-- 3. Verificar si hay un empleado con el email del JWT
SELECT 
    id,
    first_name,
    father_name,
    work_email,
    email,
    is_active,
    CASE 
        WHEN work_email = COALESCE(auth.jwt() ->> 'email', 'NO_EMAIL') THEN 'match_work_email'
        WHEN email = COALESCE(auth.jwt() ->> 'email', 'NO_EMAIL') THEN 'match_email'
        ELSE 'no_match'
    END as match_status
FROM employees
WHERE (work_email = COALESCE(auth.jwt() ->> 'email', 'NO_EMAIL')
    OR email = COALESCE(auth.jwt() ->> 'email', 'NO_EMAIL'))
LIMIT 5;

-- 4. Probar current_employee_id()
SELECT current_employee_id() as result;

-- 5. Verificar qué empleado debería ser (si sabes tu email)
-- Reemplaza 'TU_EMAIL@ejemplo.com' con tu email real
SELECT 
    id as employee_id_esperado,
    first_name,
    work_email
FROM employees
WHERE work_email = 'TU_EMAIL@ejemplo.com'  -- CAMBIAR ESTO
LIMIT 1;

