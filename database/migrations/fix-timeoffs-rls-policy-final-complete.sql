-- ============================================
-- Fix FINAL COMPLETO: Permitir a empleados crear sus propios timeoffs
-- Versión que elimina TODAS las políticas y crea las nuevas correctamente
-- ============================================

-- PASO 1: Eliminar TODAS las políticas existentes para timeoffs
-- (Incluyendo cualquier variación de nombre que pueda existir)
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Eliminar todas las políticas de timeoffs
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'timeoffs') LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON timeoffs', r.policyname);
    END LOOP;
END $$;

-- PASO 2: Crear las nuevas políticas (igual que timelogs que sabemos que funciona)

-- Lectura: Admins ven todo, empleados solo sus propios registros
CREATE POLICY "Timeoffs: Read own or admin" ON timeoffs
    FOR SELECT USING (
        employee_id = current_employee_id() OR is_admin()
    );

-- Inserción: Cualquier empleado puede crear sus propios timeoffs
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
-- Verificación: Listar las políticas creadas
-- ============================================
SELECT policyname, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'timeoffs'
ORDER BY policyname;

