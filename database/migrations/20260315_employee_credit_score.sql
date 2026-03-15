-- ============================================
-- MIGRACIÓN: Employee Credit Score Function
-- ============================================
-- Fecha: 2026-03-15
-- Descripción: Función RPC que calcula un score crediticio (0-1000)
-- para determinar elegibilidad de préstamos empresariales.
-- Factores: antigüedad, puntualidad, asistencia, endeudamiento, historial crediticio
-- v2: Ventana de análisis 6 meses. Puntualidad y asistencia con scoring agresivo.
--     Puntualidad penaliza tanto cantidad como severidad (minutos acumulados).
-- ============================================

CREATE OR REPLACE FUNCTION calculate_employee_credit_score(
  p_employee_id UUID,
  p_company_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_employee RECORD;
  v_tenure_months INTEGER;
  v_late_count INTEGER;
  v_late_total_minutes INTEGER;
  v_late_avg_minutes NUMERIC;
  v_absence_days INTEGER;
  v_unjustified_absences INTEGER;
  v_active_debt_total NUMERIC;
  v_active_debt_installment NUMERIC;
  v_completed_loans INTEGER;
  v_paused_loans INTEGER;
  v_active_loans INTEGER;
  v_biweekly_salary NUMERIC;
  -- Score components
  v_tenure_score INTEGER := 0;
  v_punctuality_score INTEGER := 0;
  v_attendance_score INTEGER := 0;
  v_debt_score INTEGER := 0;
  v_history_score INTEGER := 0;
  v_total_score INTEGER := 0;
  -- Breakdown details
  v_tenure_label TEXT;
  v_punctuality_label TEXT;
  v_attendance_label TEXT;
  v_debt_label TEXT;
  v_history_label TEXT;
  v_category TEXT;
  v_eligible BOOLEAN;
  v_analysis_period DATE;
  v_minute_penalty TEXT;
BEGIN
  -- Period: last 6 months (180 days)
  v_analysis_period := CURRENT_DATE - INTERVAL '6 months';

  -- 1. Get employee info
  SELECT e.id, e.first_name, e.father_name, e.start_date, e.monthly_salary,
         e.is_active, e.hourly_salary
  INTO v_employee
  FROM employees e
  WHERE e.id = p_employee_id
    AND (p_company_id IS NULL OR e.company_id = p_company_id);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Employee not found');
  END IF;

  IF NOT v_employee.is_active THEN
    RETURN jsonb_build_object(
      'error', 'Employee is inactive',
      'employee_id', p_employee_id,
      'score', 0,
      'category', 'inactivo',
      'eligible', false
    );
  END IF;

  v_biweekly_salary := COALESCE(v_employee.monthly_salary, 0) / 2;

  -- ============================================
  -- FACTOR 1: ANTIGÜEDAD (0-200 pts)
  -- ============================================
  v_tenure_months := EXTRACT(YEAR FROM age(CURRENT_DATE, v_employee.start_date)) * 12
                   + EXTRACT(MONTH FROM age(CURRENT_DATE, v_employee.start_date));

  IF v_tenure_months < 3 THEN
    v_tenure_score := 0;
    v_tenure_label := 'Período de prueba (< 3 meses)';
  ELSIF v_tenure_months < 6 THEN
    v_tenure_score := 40;
    v_tenure_label := '3-6 meses';
  ELSIF v_tenure_months < 12 THEN
    v_tenure_score := 80;
    v_tenure_label := '6 meses - 1 año';
  ELSIF v_tenure_months < 24 THEN
    v_tenure_score := 120;
    v_tenure_label := '1-2 años';
  ELSIF v_tenure_months < 36 THEN
    v_tenure_score := 160;
    v_tenure_label := '2-3 años';
  ELSE
    v_tenure_score := 200;
    v_tenure_label := '3+ años';
  END IF;

  -- ============================================
  -- FACTOR 2: PUNTUALIDAD - últimos 6 meses (0-250 pts)
  -- AGRESIVO: cada tardanza pesa más, y los minutos acumulados
  -- aplican un multiplicador de penalidad adicional.
  -- ============================================
  SELECT COUNT(*), COALESCE(SUM(minutes_late), 0)
  INTO v_late_count, v_late_total_minutes
  FROM employee_late_records
  WHERE employee_id = p_employee_id
    AND timelog_date >= v_analysis_period
    AND status = 'active';

  -- Base score by count (aggressive thresholds)
  IF v_late_count = 0 THEN
    v_punctuality_score := 250;
    v_punctuality_label := 'Puntualidad perfecta';
  ELSIF v_late_count = 1 THEN
    v_punctuality_score := 210;
    v_punctuality_label := '1 tardanza';
  ELSIF v_late_count = 2 THEN
    v_punctuality_score := 170;
    v_punctuality_label := '2 tardanzas';
  ELSIF v_late_count <= 4 THEN
    v_punctuality_score := 120;
    v_punctuality_label := v_late_count || ' tardanzas';
  ELSIF v_late_count <= 7 THEN
    v_punctuality_score := 70;
    v_punctuality_label := v_late_count || ' tardanzas - Preocupante';
  ELSIF v_late_count <= 12 THEN
    v_punctuality_score := 30;
    v_punctuality_label := v_late_count || ' tardanzas - Crítico';
  ELSE
    v_punctuality_score := 0;
    v_punctuality_label := v_late_count || ' tardanzas - Inaceptable';
  END IF;

  -- Severity multiplier: penalize heavy lateness (avg minutes)
  v_minute_penalty := '';
  IF v_late_count > 0 THEN
    v_late_avg_minutes := v_late_total_minutes::NUMERIC / v_late_count;
    IF v_late_avg_minutes > 45 THEN
      -- Very severe: cut score in half
      v_punctuality_score := GREATEST(v_punctuality_score * 0.5, 0)::INTEGER;
      v_minute_penalty := ' (penalidad severa: prom. ' || ROUND(v_late_avg_minutes) || ' min)';
    ELSIF v_late_avg_minutes > 30 THEN
      -- Severe: reduce 35%
      v_punctuality_score := GREATEST(v_punctuality_score * 0.65, 0)::INTEGER;
      v_minute_penalty := ' (penalidad alta: prom. ' || ROUND(v_late_avg_minutes) || ' min)';
    ELSIF v_late_avg_minutes > 15 THEN
      -- Moderate: reduce 20%
      v_punctuality_score := GREATEST(v_punctuality_score * 0.80, 0)::INTEGER;
      v_minute_penalty := ' (penalidad moderada: prom. ' || ROUND(v_late_avg_minutes) || ' min)';
    END IF;
    v_punctuality_label := v_punctuality_label || v_minute_penalty;
  END IF;

  -- ============================================
  -- FACTOR 3: ASISTENCIA - últimos 6 meses (0-150 pts)
  -- AGRESIVO: cada día de ausencia impacta fuerte.
  -- Ausencias no justificadas pesan doble.
  -- ============================================
  SELECT COALESCE(SUM(
    CASE
      WHEN date_to IS NOT NULL AND date_from IS NOT NULL
      THEN GREATEST((date_to::date - date_from::date) + 1, 1)
      ELSE 1
    END
  ), 0)
  INTO v_absence_days
  FROM timeoffs
  WHERE employee_id = p_employee_id
    AND date_from >= v_analysis_period
    AND is_approved = true;

  -- Count unjustified absences (not approved or rejected)
  SELECT COALESCE(SUM(
    CASE
      WHEN date_to IS NOT NULL AND date_from IS NOT NULL
      THEN GREATEST((date_to::date - date_from::date) + 1, 1)
      ELSE 1
    END
  ), 0)
  INTO v_unjustified_absences
  FROM timeoffs
  WHERE employee_id = p_employee_id
    AND date_from >= v_analysis_period
    AND is_approved = false;

  -- Unjustified count double
  v_absence_days := v_absence_days + (v_unjustified_absences * 2);

  IF v_absence_days = 0 THEN
    v_attendance_score := 150;
    v_attendance_label := 'Asistencia perfecta';
  ELSIF v_absence_days = 1 THEN
    v_attendance_score := 120;
    v_attendance_label := '1 día de ausencia';
  ELSIF v_absence_days <= 3 THEN
    v_attendance_score := 85;
    v_attendance_label := v_absence_days || ' días - Aceptable';
  ELSIF v_absence_days <= 5 THEN
    v_attendance_score := 50;
    v_attendance_label := v_absence_days || ' días - Por debajo del estándar';
  ELSIF v_absence_days <= 8 THEN
    v_attendance_score := 20;
    v_attendance_label := v_absence_days || ' días - Preocupante';
  ELSE
    v_attendance_score := 0;
    v_attendance_label := v_absence_days || ' días - Crítico';
  END IF;

  IF v_unjustified_absences > 0 THEN
    v_attendance_label := v_attendance_label || ' (' || v_unjustified_absences || ' no justificada(s))';
  END IF;

  -- ============================================
  -- FACTOR 4: NIVEL DE ENDEUDAMIENTO (0-250 pts)
  -- ============================================
  SELECT
    COALESCE(SUM(balance), 0),
    COALESCE(SUM(installment_amount), 0),
    COUNT(*) FILTER (WHERE status = 'active')
  INTO v_active_debt_total, v_active_debt_installment, v_active_loans
  FROM payroll_debts
  WHERE employee_id = p_employee_id
    AND status = 'active';

  IF v_biweekly_salary > 0 AND v_active_debt_installment > 0 THEN
    DECLARE
      v_debt_ratio NUMERIC;
    BEGIN
      v_debt_ratio := (v_active_debt_installment / v_biweekly_salary) * 100;

      IF v_debt_ratio < 10 THEN
        v_debt_score := 200;
        v_debt_label := ROUND(v_debt_ratio, 1) || '% del salario quincenal';
      ELSIF v_debt_ratio < 20 THEN
        v_debt_score := 150;
        v_debt_label := ROUND(v_debt_ratio, 1) || '% del salario quincenal';
      ELSIF v_debt_ratio < 30 THEN
        v_debt_score := 100;
        v_debt_label := ROUND(v_debt_ratio, 1) || '% del salario quincenal';
      ELSIF v_debt_ratio < 40 THEN
        v_debt_score := 50;
        v_debt_label := ROUND(v_debt_ratio, 1) || '% - Nivel alto';
      ELSE
        v_debt_score := 0;
        v_debt_label := ROUND(v_debt_ratio, 1) || '% - Sobreendeudado';
      END IF;
    END;
  ELSE
    v_debt_score := 250;
    v_debt_label := 'Sin deudas activas';
  END IF;

  -- ============================================
  -- FACTOR 5: HISTORIAL CREDITICIO (0-150 pts)
  -- ============================================
  SELECT
    COUNT(*) FILTER (WHERE status = 'completed'),
    COUNT(*) FILTER (WHERE status = 'paused')
  INTO v_completed_loans, v_paused_loans
  FROM payroll_debts
  WHERE employee_id = p_employee_id;

  IF v_completed_loans >= 3 AND v_paused_loans = 0 THEN
    v_history_score := 150;
    v_history_label := v_completed_loans || ' préstamos completados - Historial excelente';
  ELSIF v_completed_loans >= 1 AND v_paused_loans = 0 THEN
    v_history_score := 120;
    v_history_label := v_completed_loans || ' préstamo(s) completado(s) - Buen historial';
  ELSIF v_completed_loans = 0 AND v_active_loans = 0 AND v_paused_loans = 0 THEN
    v_history_score := 75;
    v_history_label := 'Sin historial crediticio';
  ELSIF v_paused_loans >= 1 THEN
    v_history_score := 20;
    v_history_label := v_paused_loans || ' préstamo(s) pausado(s) - Historial irregular';
  ELSE
    v_history_score := 50;
    v_history_label := 'Historial limitado';
  END IF;

  -- ============================================
  -- CÁLCULO FINAL
  -- ============================================
  v_total_score := v_tenure_score + v_punctuality_score + v_attendance_score
                 + v_debt_score + v_history_score;

  -- Category
  IF v_total_score >= 800 THEN
    v_category := 'excelente';
    v_eligible := true;
  ELSIF v_total_score >= 600 THEN
    v_category := 'bueno';
    v_eligible := true;
  ELSIF v_total_score >= 400 THEN
    v_category := 'regular';
    v_eligible := false;
  ELSIF v_total_score >= 200 THEN
    v_category := 'bajo';
    v_eligible := false;
  ELSE
    v_category := 'critico';
    v_eligible := false;
  END IF;

  -- Minimum tenure requirement
  IF v_tenure_months < 3 THEN
    v_eligible := false;
  END IF;

  RETURN jsonb_build_object(
    'employee_id', p_employee_id,
    'employee_name', v_employee.first_name || ' ' || v_employee.father_name,
    'score', v_total_score,
    'max_score', 1000,
    'category', v_category,
    'eligible', v_eligible,
    'monthly_salary', v_employee.monthly_salary,
    'calculated_at', NOW(),
    'analysis_period_days', 180,
    'factors', jsonb_build_object(
      'tenure', jsonb_build_object(
        'score', v_tenure_score,
        'max', 200,
        'label', v_tenure_label,
        'months', v_tenure_months
      ),
      'punctuality', jsonb_build_object(
        'score', v_punctuality_score,
        'max', 250,
        'label', v_punctuality_label,
        'late_count', v_late_count,
        'total_minutes_late', v_late_total_minutes,
        'avg_minutes_late', CASE WHEN v_late_count > 0 THEN ROUND(v_late_total_minutes::NUMERIC / v_late_count, 1) ELSE 0 END
      ),
      'attendance', jsonb_build_object(
        'score', v_attendance_score,
        'max', 150,
        'label', v_attendance_label,
        'absence_days', v_absence_days,
        'unjustified_absences', v_unjustified_absences
      ),
      'debt_level', jsonb_build_object(
        'score', v_debt_score,
        'max', 250,
        'label', v_debt_label,
        'active_loans', v_active_loans,
        'total_debt_balance', v_active_debt_total,
        'installment_per_period', v_active_debt_installment
      ),
      'credit_history', jsonb_build_object(
        'score', v_history_score,
        'max', 150,
        'label', v_history_label,
        'completed_loans', v_completed_loans,
        'paused_loans', v_paused_loans
      )
    )
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION calculate_employee_credit_score(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_employee_credit_score(UUID, UUID) TO service_role;

COMMENT ON FUNCTION calculate_employee_credit_score IS
'Calcula score crediticio (0-1000) de un empleado para elegibilidad de préstamos.
Factores: Antigüedad (200), Puntualidad (250), Asistencia (150), Endeudamiento (250), Historial (150).
v2: Ventana 6 meses, scoring agresivo en puntualidad (penalidad por minutos), ausencias no justificadas pesan doble.';
