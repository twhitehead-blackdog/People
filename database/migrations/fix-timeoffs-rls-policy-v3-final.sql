-- ============================================
-- Fix V3 FINAL: Permitir a empleados crear sus propios timeoffs
-- Versión que maneja Auth0 y funciona como timelogs
-- ============================================

-- Primero, verificar si la función current_employee_id() existe y funciona
-- Si no funciona con auth.jwt(), necesitamos usar una estrategia diferente

-- Eliminar TODAS las políticas existentes para timeoffs
DROP POLICY IF EXISTS "timeoffs: Read for authenticated" ON timeoffs;
DROP POLICY IF EXISTS "timeoffs: Write for admins" ON timeoffs;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON timeoffs;
DROP POLICY IF EXISTS "Timeoffs: Read own or admin" ON timeoffs;
DROP POLICY IF EXISTS "Timeoffs: Insert own" ON timeoffs;
DROP POLICY IF EXISTS "Timeoffs: Update for admins" ON timeoffs;
DROP POLICY IF EXISTS "Timeoffs: Delete for admins" ON timeoffs;
DROP POLICY IF EXISTS "Timeoffs: Update/Delete for admins" ON timeoffs;

-- IMPORTANTE: Usar exactamente las mismas políticas que timelogs
-- que sabemos que funcionan correctamente

-- Lectura: Admins ven todo, empleados solo sus propios registros
CREATE POLICY "Timeoffs: Read own or admin" ON timeoffs
    FOR SELECT USING (
        employee_id = current_employee_id() OR is_admin()
    );

-- Inserción: Cualquier empleado puede crear sus propios timeoffs
-- Esta es la política crítica - debe ser idéntica a timelogs
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
-- Si esto no funciona, el problema está en current_employee_id()
-- Verificar ejecutando: SELECT current_employee_id();
-- Si retorna NULL, entonces auth.jwt() no tiene el email
-- ============================================

