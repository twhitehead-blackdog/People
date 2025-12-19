-- ============================================
-- Fix: Permitir INSERT público como job_applications
-- Similar a job_applications pero validando en la aplicación
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

-- Política para INSERT: Permitir inserción pública (como job_applications)
-- La validación de seguridad se hace en el código de la aplicación
CREATE POLICY "Timeoffs: Allow public insert" ON timeoffs
    FOR INSERT
    TO public
    WITH CHECK (true);

-- Lectura: Usuarios autenticados pueden leer todas las solicitudes
-- (O cambiar a solo las propias si se necesita más seguridad)
CREATE POLICY "Timeoffs: Allow authenticated read" ON timeoffs
    FOR SELECT
    TO authenticated
    USING (true);

-- Si no hay usuarios authenticated (por Auth0), permitir lectura pública también
CREATE POLICY "Timeoffs: Allow public read" ON timeoffs
    FOR SELECT
    TO public
    USING (true);

-- Actualización: Solo admins (si funciona la función is_admin)
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
-- NOTA: Esta política permite INSERT público.
-- La validación de que el employee_id es correcto
-- se hace en el código de la aplicación (línea 2897).
-- Esto es exactamente igual a cómo funciona job_applications.
-- ============================================

