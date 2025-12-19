-- ============================================
-- Fix V2: Permitir a empleados crear sus propios timeoffs
-- Versión mejorada que maneja mejor Auth0 y JWT
-- ============================================

-- Primero, verificar y actualizar las funciones si es necesario
-- La función current_employee_id() necesita manejar mejor el caso de Auth0

-- Función mejorada que intenta diferentes formas de obtener el email del JWT
CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID AS $$
DECLARE
    user_email TEXT;
BEGIN
    -- Intentar obtener el email del JWT de diferentes maneras
    -- Primero intentar auth.jwt() ->> 'email' (método estándar)
    user_email := COALESCE(
        auth.jwt() ->> 'email',
        -- Si no está disponible, intentar otras formas comunes
        current_setting('request.jwt.claim.email', true),
        current_setting('request.jwt.claims.email', true),
        NULL
    );
    
    -- Si aún no tenemos email, retornar NULL
    IF user_email IS NULL THEN
        RETURN NULL;
    END IF;
    
    -- Buscar el empleado por email
    RETURN (
        SELECT id FROM employees
        WHERE (work_email = user_email OR email = user_email)
        AND is_active = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar políticas genéricas existentes para timeoffs
DROP POLICY IF EXISTS "timeoffs: Read for authenticated" ON timeoffs;
DROP POLICY IF EXISTS "timeoffs: Write for admins" ON timeoffs;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON timeoffs;
DROP POLICY IF EXISTS "Timeoffs: Read own or admin" ON timeoffs;
DROP POLICY IF EXISTS "Timeoffs: Insert own" ON timeoffs;
DROP POLICY IF EXISTS "Timeoffs: Update for admins" ON timeoffs;
DROP POLICY IF EXISTS "Timeoffs: Delete for admins" ON timeoffs;

-- Lectura: Admins ven todo, empleados solo sus propios registros
-- Usar la función current_employee_id() que ahora maneja mejor Auth0
CREATE POLICY "Timeoffs: Read own or admin" ON timeoffs
    FOR SELECT USING (
        employee_id = current_employee_id() OR is_admin()
    );

-- Inserción: Cualquier empleado puede crear sus propios timeoffs
-- IMPORTANTE: Verificar que el employee_id en la fila que se inserta sea igual al del usuario actual
CREATE POLICY "Timeoffs: Insert own" ON timeoffs
    FOR INSERT WITH CHECK (
        employee_id = current_employee_id()
    );

-- Actualización: Solo admins
CREATE POLICY "Timeoffs: Update for admins" ON timeoffs
    FOR UPDATE USING (is_admin())
    WITH CHECK (is_admin());

-- Eliminación: Solo admins
CREATE POLICY "Timeoffs: Delete for admins" ON timeoffs
    FOR DELETE USING (is_admin());

-- ============================================
-- Notas:
-- - La función current_employee_id() ahora maneja mejor Auth0
-- - Los empleados solo pueden crear timeoffs para sí mismos
-- - Los empleados solo pueden ver sus propios timeoffs
-- - Solo los admins pueden actualizar/eliminar timeoffs
-- ============================================

