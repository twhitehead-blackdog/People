-- ============================================
-- Fix: Permitir a empleados crear sus propios timeoffs
-- ============================================
-- Esta migración corrige las políticas RLS para que los empleados
-- puedan crear sus propias solicitudes de tiempo libre (timeoffs)
-- mientras que solo los admins pueden actualizarlas/eliminarlas

-- Eliminar políticas genéricas existentes para timeoffs
DROP POLICY IF EXISTS "timeoffs: Read for authenticated" ON timeoffs;
DROP POLICY IF EXISTS "timeoffs: Write for admins" ON timeoffs;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON timeoffs;

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
-- Notas:
-- - Los empleados solo pueden crear timeoffs para sí mismos
-- - Los empleados solo pueden ver sus propios timeoffs
-- - Solo los admins pueden actualizar/eliminar timeoffs
-- ============================================

