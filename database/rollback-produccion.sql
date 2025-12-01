-- ============================================
-- Script de Rollback - Revertir cambios de producción
-- ============================================
-- Este script revierte los cambios realizados por 00-setup-completo-produccion.sql
-- 
-- ⚠️ ADVERTENCIA: Este script eliminará:
-- - Tabla job_applications
-- - Tabla notifications
-- - Campos adicionales en positions (dashboard_access, default_view, available_for_job_fair)
-- - Buckets de Storage (disabilities, timeoffs, job-applications)
-- - Funciones y triggers relacionados
-- 
-- ⚠️ NO elimina las tablas principales (employees, companies, etc.)
-- ============================================

-- ============================================
-- SECCIÓN 1: Eliminar tabla job_applications
-- ============================================

DROP TABLE IF EXISTS job_applications CASCADE;

-- ============================================
-- SECCIÓN 2: Eliminar tabla notifications
-- ============================================

DROP TRIGGER IF EXISTS trigger_create_timelog_notification ON timelogs;
DROP TRIGGER IF EXISTS trigger_create_document_request_notification ON document_requests;
DROP TRIGGER IF EXISTS trigger_create_complaint_notification ON complaints;
DROP TRIGGER IF EXISTS trigger_create_complaint_message_notification ON complaint_messages;

DROP FUNCTION IF EXISTS create_timelog_notification();
DROP FUNCTION IF EXISTS get_hr_employee_ids();
DROP FUNCTION IF EXISTS notify_hr_employees(VARCHAR, VARCHAR, TEXT, VARCHAR, UUID, UUID, VARCHAR);
DROP FUNCTION IF EXISTS create_document_request_notification();
DROP FUNCTION IF EXISTS create_complaint_notification();
DROP FUNCTION IF EXISTS create_complaint_message_notification();

DROP TABLE IF EXISTS notifications CASCADE;

-- ============================================
-- SECCIÓN 3: Eliminar campos adicionales en positions
-- ============================================

ALTER TABLE positions DROP COLUMN IF EXISTS dashboard_access;
ALTER TABLE positions DROP COLUMN IF EXISTS default_view;
ALTER TABLE positions DROP COLUMN IF EXISTS available_for_job_fair;

-- ============================================
-- SECCIÓN 4: Eliminar buckets de Storage
-- ============================================
-- Nota: Las políticas se eliminan automáticamente al eliminar los buckets

-- Eliminar políticas de Storage primero
DROP POLICY IF EXISTS "Permitir subida de archivos de incapacidades" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura de archivos de incapacidades" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de archivos de incapacidades" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de archivos de incapacidades" ON storage.objects;

DROP POLICY IF EXISTS "Permitir subida de archivos de timeoffs" ON storage.objects;
DROP POLICY IF EXISTS "Permitir lectura de archivos de timeoffs" ON storage.objects;
DROP POLICY IF EXISTS "Permitir actualización de archivos de timeoffs" ON storage.objects;
DROP POLICY IF EXISTS "Permitir eliminación de archivos de timeoffs" ON storage.objects;

DROP POLICY IF EXISTS "Allow public uploads to job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated read from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated update from job-applications" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated delete from job-applications" ON storage.objects;

-- Eliminar buckets (esto eliminará todos los archivos almacenados)
DELETE FROM storage.buckets WHERE id IN ('disabilities', 'timeoffs', 'job-applications');

-- ============================================
-- SECCIÓN 5: Revertir políticas RLS a solo authenticated
-- ============================================
-- Si cambiaste las políticas para permitir anon, esto las revierte

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON companies;
CREATE POLICY "Enable all access for authenticated users" ON companies
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON branches;
CREATE POLICY "Enable all access for authenticated users" ON branches
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON departments;
CREATE POLICY "Enable all access for authenticated users" ON departments
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON positions;
CREATE POLICY "Enable all access for authenticated users" ON positions
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON organization_chart;
CREATE POLICY "Enable all access for authenticated users" ON organization_chart
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON banks;
CREATE POLICY "Enable all access for authenticated users" ON banks
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON creditors;
CREATE POLICY "Enable all access for authenticated users" ON creditors
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON timeoff_types;
CREATE POLICY "Enable all access for authenticated users" ON timeoff_types
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employees;
CREATE POLICY "Enable all access for authenticated users" ON employees
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON timeoffs;
CREATE POLICY "Enable all access for authenticated users" ON timeoffs
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON terminations;
CREATE POLICY "Enable all access for authenticated users" ON terminations
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON schedules;
CREATE POLICY "Enable all access for authenticated users" ON schedules
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_schedules;
CREATE POLICY "Enable all access for authenticated users" ON employee_schedules
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON timelogs;
CREATE POLICY "Enable all access for authenticated users" ON timelogs
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON attendance_sheets;
CREATE POLICY "Enable all access for authenticated users" ON attendance_sheets
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payrolls;
CREATE POLICY "Enable all access for authenticated users" ON payrolls
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_deductions;
CREATE POLICY "Enable all access for authenticated users" ON payroll_deductions
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_payrolls;
CREATE POLICY "Enable all access for authenticated users" ON employee_payrolls
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_payments;
CREATE POLICY "Enable all access for authenticated users" ON payroll_payments
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_debts;
CREATE POLICY "Enable all access for authenticated users" ON payroll_debts
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_payment_employees;
CREATE POLICY "Enable all access for authenticated users" ON payroll_payment_employees
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON payroll_payment_employee_items;
CREATE POLICY "Enable all access for authenticated users" ON payroll_payment_employee_items
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON emergency_contacts;
CREATE POLICY "Enable all access for authenticated users" ON emergency_contacts
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_documents;
CREATE POLICY "Enable all access for authenticated users" ON employee_documents
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_notes;
CREATE POLICY "Enable all access for authenticated users" ON employee_notes
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_skills;
CREATE POLICY "Enable all access for authenticated users" ON employee_skills
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_languages;
CREATE POLICY "Enable all access for authenticated users" ON employee_languages
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON employee_disabilities;
CREATE POLICY "Enable all access for authenticated users" ON employee_disabilities
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON document_requests;
CREATE POLICY "Enable all access for authenticated users" ON document_requests
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON complaints;
CREATE POLICY "Enable all access for authenticated users" ON complaints
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON complaint_messages;
CREATE POLICY "Enable all access for authenticated users" ON complaint_messages
    FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Enable all access for authenticated users" ON settings;
CREATE POLICY "Enable all access for authenticated users" ON settings
    FOR ALL USING (auth.role() = 'authenticated');

-- ============================================
-- FIN DEL ROLLBACK
-- ============================================
-- 
-- NOTA: Este script NO elimina:
-- - Las tablas principales (employees, companies, branches, etc.)
-- - Los datos existentes en esas tablas
-- - Las funciones base (update_updated_at_column)
-- - Los triggers base de updated_at
-- - Los índices principales
-- 
-- Solo revierte los cambios específicos del script de producción:
-- - Tabla job_applications
-- - Tabla notifications y sus funciones/triggers
-- - Campos adicionales en positions
-- - Buckets de Storage
-- ============================================

