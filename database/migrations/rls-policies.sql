-- ============================================
-- Row Level Security Policies para People
-- ============================================
-- Políticas de seguridad más específicas basadas en roles
-- Ejecutar DESPUÉS de schema.sql
-- 
-- IMPORTANTE: Estas son políticas de ejemplo. Ajusta según tus necesidades específicas.

-- ============================================
-- FUNCIÓN HELPER: Verificar si usuario es admin
-- ============================================
-- Asume que tienes una tabla de usuarios o que el email del usuario autenticado
-- corresponde al work_email de un empleado con posición admin

CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employees e
        JOIN positions p ON e.position_id = p.id
        WHERE e.work_email = auth.jwt() ->> 'email'
        AND p.admin = true
        AND e.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN HELPER: Verificar si usuario es schedule_admin
-- ============================================

CREATE OR REPLACE FUNCTION is_schedule_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM employees e
        JOIN positions p ON e.position_id = p.id
        WHERE e.work_email = auth.jwt() ->> 'email'
        AND p.schedule_admin = true
        AND e.is_active = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- FUNCIÓN HELPER: Obtener employee_id del usuario actual
-- ============================================

CREATE OR REPLACE FUNCTION current_employee_id()
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT id FROM employees
        WHERE work_email = auth.jwt() ->> 'email'
        AND is_active = true
        LIMIT 1
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- POLÍTICAS PARA COMPANIES
-- ============================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON companies;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON companies;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON companies;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON companies;

-- Lectura: Todos los usuarios autenticados pueden leer
CREATE POLICY "Companies: Read for authenticated" ON companies
    FOR SELECT USING (auth.role() = 'authenticated');

-- Escritura: Solo admins pueden crear/modificar/eliminar
CREATE POLICY "Companies: Write for admins" ON companies
    FOR ALL USING (is_admin());

-- ============================================
-- POLÍTICAS PARA BRANCHES
-- ============================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON branches;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON branches;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON branches;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON branches;

CREATE POLICY "Branches: Read for authenticated" ON branches
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Branches: Write for admins" ON branches
    FOR ALL USING (is_admin());

-- ============================================
-- POLÍTICAS PARA EMPLOYEES
-- ============================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employees;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON employees;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON employees;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON employees;

-- Lectura: Usuarios pueden ver todos los empleados activos
CREATE POLICY "Employees: Read for authenticated" ON employees
    FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- Escritura: Solo admins pueden crear/modificar/eliminar
CREATE POLICY "Employees: Write for admins" ON employees
    FOR ALL USING (is_admin());

-- Los empleados pueden ver sus propios datos completos (incluyendo inactivos)
CREATE POLICY "Employees: Read own data" ON employees
    FOR SELECT USING (
        work_email = auth.jwt() ->> 'email'
    );

-- ============================================
-- POLÍTICAS PARA TIMELOGS
-- ============================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON timelogs;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON timelogs;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON timelogs;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON timelogs;

-- Lectura: Admins ven todo, empleados solo sus propios registros
CREATE POLICY "Timelogs: Read own or admin" ON timelogs
    FOR SELECT USING (
        employee_id = current_employee_id() OR is_admin()
    );

-- Inserción: Cualquier empleado puede crear sus propios timelogs
CREATE POLICY "Timelogs: Insert own" ON timelogs
    FOR INSERT WITH CHECK (
        employee_id = current_employee_id()
    );

-- Actualización/Eliminación: Solo admins
CREATE POLICY "Timelogs: Update/Delete for admins" ON timelogs
    FOR ALL USING (is_admin());

-- ============================================
-- POLÍTICAS PARA EMPLOYEE_SCHEDULES
-- ============================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON employee_schedules;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON employee_schedules;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON employee_schedules;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON employee_schedules;

-- Lectura: Empleados ven sus propios horarios, admins ven todo
CREATE POLICY "Employee Schedules: Read own or admin" ON employee_schedules
    FOR SELECT USING (
        employee_id = current_employee_id() OR is_admin() OR is_schedule_admin()
    );

-- Escritura: Solo schedule_admins y admins pueden crear/modificar
CREATE POLICY "Employee Schedules: Write for schedule admins" ON employee_schedules
    FOR ALL USING (is_schedule_admin() OR is_admin());

-- ============================================
-- POLÍTICAS PARA ATTENDANCE_SHEETS
-- ============================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON attendance_sheets;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON attendance_sheets;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON attendance_sheets;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON attendance_sheets;

-- Lectura: Empleados ven sus propias hojas, admins ven todo
CREATE POLICY "Attendance Sheets: Read own or admin" ON attendance_sheets
    FOR SELECT USING (
        employee_id = current_employee_id() OR is_admin()
    );

-- Escritura: Solo admins pueden crear/modificar
CREATE POLICY "Attendance Sheets: Write for admins" ON attendance_sheets
    FOR ALL USING (is_admin());

-- ============================================
-- POLÍTICAS PARA PAYROLLS
-- ============================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payrolls;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON payrolls;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON payrolls;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON payrolls;

-- Lectura: Solo admins
CREATE POLICY "Payrolls: Read for admins" ON payrolls
    FOR SELECT USING (is_admin());

-- Escritura: Solo admins
CREATE POLICY "Payrolls: Write for admins" ON payrolls
    FOR ALL USING (is_admin());

-- ============================================
-- POLÍTICAS PARA PAYROLL_PAYMENTS
-- ============================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payroll_payments;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON payroll_payments;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON payroll_payments;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON payroll_payments;

-- Lectura: Admins ven todo, empleados ven solo sus pagos
CREATE POLICY "Payroll Payments: Read own or admin" ON payroll_payments
    FOR SELECT USING (
        is_admin() OR EXISTS (
            SELECT 1 FROM payroll_payment_employees ppe
            WHERE ppe.payroll_payment_id = payroll_payments.id
            AND ppe.employee_id = current_employee_id()
        )
    );

-- Escritura: Solo admins
CREATE POLICY "Payroll Payments: Write for admins" ON payroll_payments
    FOR ALL USING (is_admin());

-- ============================================
-- POLÍTICAS PARA PAYROLL_PAYMENT_EMPLOYEES
-- ============================================

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON payroll_payment_employees;
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON payroll_payment_employees;
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON payroll_payment_employees;
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON payroll_payment_employees;

-- Lectura: Empleados ven sus propios pagos, admins ven todo
CREATE POLICY "Payroll Payment Employees: Read own or admin" ON payroll_payment_employees
    FOR SELECT USING (
        employee_id = current_employee_id() OR is_admin()
    );

-- Escritura: Solo admins
CREATE POLICY "Payroll Payment Employees: Write for admins" ON payroll_payment_employees
    FOR ALL USING (is_admin());

-- ============================================
-- POLÍTICAS PARA OTRAS TABLAS
-- ============================================
-- Aplicar políticas similares para el resto de las tablas
-- Siguiendo el mismo patrón: lectura para autenticados, escritura para admins

-- Departments, Positions, Banks, Creditors, etc.
-- (Políticas básicas: lectura para todos, escritura para admins)

DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY[
        'departments', 'positions', 'banks', 'creditors', 'timeoff_types',
        'schedules', 'timeoffs', 'terminations', 'payroll_deductions',
        'employee_payrolls', 'payroll_debts', 'payroll_payment_employee_items'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Drop existing policies
        EXECUTE format('DROP POLICY IF EXISTS "Enable read access for authenticated users" ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Enable update access for authenticated users" ON %I', table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON %I', table_name);
        
        -- Create read policy
        EXECUTE format('CREATE POLICY "%s: Read for authenticated" ON %I FOR SELECT USING (auth.role() = ''authenticated'')', 
            table_name, table_name);
        
        -- Create write policy
        EXECUTE format('CREATE POLICY "%s: Write for admins" ON %I FOR ALL USING (is_admin())', 
            table_name, table_name);
    END LOOP;
END $$;

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
-- 
-- 1. Estas políticas asumen que:
--    - El email del usuario autenticado está en auth.jwt() ->> 'email'
--    - El work_email de los empleados coincide con el email de Auth0
--    - Los roles se determinan por la posición del empleado (admin, schedule_admin)
--
-- 2. Ajusta las políticas según tus necesidades específicas:
--    - Puedes agregar más roles
--    - Puedes hacer políticas más granulares por sucursal/departamento
--    - Puedes agregar políticas de tiempo (solo ver registros del mes actual, etc.)
--
-- 3. Para testing, puedes temporalmente deshabilitar RLS:
--    ALTER TABLE nombre_tabla DISABLE ROW LEVEL SECURITY;
--
-- 4. Verifica las políticas con:
--    SELECT * FROM pg_policies WHERE tablename = 'nombre_tabla';

