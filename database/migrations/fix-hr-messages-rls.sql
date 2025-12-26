-- ============================================
-- CORREGIR POLÍTICAS RLS PARA TABLA hr_messages
-- ============================================
-- Este script crea las políticas RLS necesarias para la tabla hr_messages
-- para permitir que el sistema HR pueda crear notificaciones y que los
-- empleados puedan leer sus propias notificaciones
-- 
-- Problema: RLS está habilitado pero no hay políticas, bloqueando todas las operaciones
-- Solución: Crear políticas para INSERT (HR puede crear) y SELECT (empleados ven sus mensajes)
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR TODAS LAS POLÍTICAS EXISTENTES (si existen)
-- ============================================
DROP POLICY IF EXISTS "Allow authenticated insert to hr_messages" ON hr_messages;
DROP POLICY IF EXISTS "Allow authenticated select from hr_messages" ON hr_messages;
DROP POLICY IF EXISTS "Allow authenticated update to hr_messages" ON hr_messages;
DROP POLICY IF EXISTS "Allow employees to read own messages" ON hr_messages;
DROP POLICY IF EXISTS "Allow employees to update own messages" ON hr_messages;

-- ============================================
-- PASO 2: CREAR POLÍTICAS PARA ROL 'authenticated'
-- ============================================
-- Usamos políticas simples que permiten operaciones a usuarios autenticados
-- La validación de permisos específicos (quién puede leer qué) se hace en la aplicación

-- INSERT: Permitir que cualquier usuario autenticado pueda crear mensajes
-- (Esto permite que HR cree notificaciones para empleados)
CREATE POLICY "Allow authenticated insert to hr_messages"
ON hr_messages
FOR INSERT
TO authenticated
WITH CHECK (true);

-- SELECT: Permitir que cualquier usuario autenticado pueda leer mensajes
-- (La validación de que solo lea sus propios mensajes se hace en la aplicación
-- mediante el filtro employee_id en las consultas)
CREATE POLICY "Allow authenticated select from hr_messages"
ON hr_messages
FOR SELECT
TO authenticated
USING (true);

-- UPDATE: Permitir que cualquier usuario autenticado pueda actualizar mensajes
-- (La validación de que solo actualice sus propios mensajes se hace en la aplicación)
CREATE POLICY "Allow authenticated update to hr_messages"
ON hr_messages
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Para verificar que las políticas están correctas, ejecuta:
-- SELECT * FROM pg_policies WHERE tablename = 'hr_messages';

