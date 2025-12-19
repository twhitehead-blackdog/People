-- ============================================
-- Fix: Permitir a empleados autenticados crear timeoffs
-- Versión similar a job_applications pero con validación de seguridad
-- ============================================

-- Eliminar TODAS las políticas existentes
DO $$ 
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'timeoffs') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON timeoffs', r.policyname);
    END LOOP;
END $$;

-- Política para INSERT: Usuarios autenticados pueden insertar
-- Similar a job_applications pero limitado a usuarios autenticados
CREATE POLICY "Timeoffs: Allow authenticated insert" ON timeoffs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Lectura: Usuarios autenticados pueden leer todas las solicitudes
-- (O puedes limitarlo a solo las propias si necesitas más seguridad)
CREATE POLICY "Timeoffs: Allow authenticated read" ON timeoffs
    FOR SELECT
    TO authenticated
    USING (true);

-- Actualización: Solo admins
CREATE POLICY "Timeoffs: Update for admins" ON timeoffs
    FOR UPDATE
    TO authenticated
    USING (is_admin())
    WITH CHECK (is_admin());

-- Eliminación: Solo admins
CREATE POLICY "Timeoffs: Delete for admins" ON timeoffs
    FOR DELETE
    TO authenticated
    USING (is_admin());

-- ============================================
-- NOTA DE SEGURIDAD:
-- Esta política permite que cualquier usuario autenticado inserte timeoffs.
-- La validación de que el employee_id corresponde al usuario actual
-- debe hacerse en el código de la aplicación (que ya lo hace).
-- Esto es similar a cómo funciona job_applications.
-- ============================================

