-- =====================================================
-- ROLLBACK: Integración de Solicitudes HR con Horarios
-- =====================================================
-- Este script revierte TODOS los cambios de la migración:
-- 20260127_add_hr_request_tracking_to_schedules.sql
--
-- ADVERTENCIA: Este script eliminará columnas y datos.
-- Ejecutar solo si desea revertir completamente la migración.
-- =====================================================

-- =====================================================
-- PASO 1: ELIMINAR VISTA
-- =====================================================
DROP VIEW IF EXISTS v_employee_schedules_with_hr;

-- =====================================================
-- PASO 2: ELIMINAR FUNCIONES
-- =====================================================
DROP FUNCTION IF EXISTS apply_timeoff_to_schedules(UUID, DATE, DATE, TEXT, UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS apply_compensatory_to_schedules(UUID, DATE, DATE, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS revert_hr_schedule_changes(UUID, UUID, TEXT);

-- =====================================================
-- PASO 3: ELIMINAR ÍNDICES
-- =====================================================
DROP INDEX IF EXISTS idx_employee_schedules_is_compensatory;
DROP INDEX IF EXISTS idx_employee_schedules_is_timeoff;
DROP INDEX IF EXISTS idx_employee_schedules_timeoff_type;
DROP INDEX IF EXISTS idx_employee_schedules_vacation_request_id;
DROP INDEX IF EXISTS idx_employee_schedules_disability_request_id;
DROP INDEX IF EXISTS idx_employee_schedules_compensatory_request_id;
DROP INDEX IF EXISTS idx_employee_schedules_employee_date_timeoff;

-- =====================================================
-- PASO 4: ELIMINAR CONSTRAINTS (Foreign Keys)
-- =====================================================
ALTER TABLE public.employee_schedules
DROP CONSTRAINT IF EXISTS employee_schedules_compensatory_request_id_fkey;

ALTER TABLE public.employee_schedules
DROP CONSTRAINT IF EXISTS employee_schedules_vacation_request_id_fkey;

ALTER TABLE public.employee_schedules
DROP CONSTRAINT IF EXISTS employee_schedules_disability_request_id_fkey;

ALTER TABLE public.employee_schedules
DROP CONSTRAINT IF EXISTS employee_schedules_original_schedule_id_fkey;

ALTER TABLE public.employee_schedules
DROP CONSTRAINT IF EXISTS employee_schedules_timeoff_type_check;

-- =====================================================
-- PASO 5: ELIMINAR COLUMNAS DE employee_schedules
-- =====================================================

-- Campos de Compensatorio
ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS is_compensatory;

ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS compensatory_request_id;

-- Campos de Timeoff
ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS is_timeoff;

ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS timeoff_type;

ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS vacation_request_id;

ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS disability_request_id;

-- Campos de Snapshot/Auditoría
ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS original_schedule_id;

ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS hr_request_notes;

ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS modified_by;

ALTER TABLE public.employee_schedules
DROP COLUMN IF EXISTS hr_modified_at;

-- =====================================================
-- PASO 6: ELIMINAR TIPO ENUM (si existe)
-- =====================================================
DROP TYPE IF EXISTS timeoff_category;

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
DO $$
DECLARE
  v_columns TEXT[];
BEGIN
  -- Verificar que las columnas fueron eliminadas
  SELECT array_agg(column_name::TEXT) INTO v_columns
  FROM information_schema.columns
  WHERE table_name = 'employee_schedules'
    AND column_name IN (
      'is_compensatory', 'compensatory_request_id',
      'is_timeoff', 'timeoff_type',
      'vacation_request_id', 'disability_request_id',
      'original_schedule_id', 'hr_request_notes',
      'modified_by', 'hr_modified_at'
    );

  IF v_columns IS NULL OR array_length(v_columns, 1) IS NULL THEN
    RAISE NOTICE 'ROLLBACK EXITOSO: Todas las columnas HR fueron eliminadas.';
  ELSE
    RAISE WARNING 'ROLLBACK INCOMPLETO: Aún existen columnas: %', v_columns;
  END IF;
END $$;
