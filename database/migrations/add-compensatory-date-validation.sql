-- ============================================
-- Migración: Agregar validación de fechas para tiempo compensatorio
-- ============================================

-- Función de validación de fechas para tiempo compensatorio
CREATE OR REPLACE FUNCTION validate_compensatory_date_range()
RETURNS TRIGGER AS $$
DECLARE
  v_max_future_days INTEGER := 90;
  v_max_consecutive_days INTEGER := 7;
  v_date_from DATE;
  v_date_to DATE;
  v_days_diff INTEGER;
  v_range_days INTEGER;
  v_timeoff_type_name VARCHAR(255);
BEGIN
  -- Obtener el nombre del tipo de timeoff
  SELECT name INTO v_timeoff_type_name
  FROM timeoff_types
  WHERE id = NEW.type_id;
  
  -- Solo validar para tipo compensatorio
  IF v_timeoff_type_name = 'Compensatorio' THEN
    v_date_from := NEW.date_from::DATE;
    v_date_to := NEW.date_to::DATE;
    
    -- Validar que date_from y date_to sean válidas
    IF v_date_from IS NULL OR v_date_to IS NULL THEN
      RAISE EXCEPTION 'Las fechas de inicio y fin son requeridas para tiempo compensatorio';
    END IF;
    
    -- Validar que date_from <= date_to
    IF v_date_from > v_date_to THEN
      RAISE EXCEPTION 'La fecha de inicio debe ser anterior o igual a la fecha de fin';
    END IF;
    
    -- Validar que date_to no sea más de 90 días en el futuro
    v_days_diff := v_date_to - CURRENT_DATE;
    
    IF v_days_diff > v_max_future_days THEN
      RAISE EXCEPTION 'La fecha final no puede ser más de % días en el futuro', v_max_future_days;
    END IF;
    
    -- Validar rango máximo de días consecutivos (máximo 7 días)
    v_range_days := (v_date_to - v_date_from) + 1;
    
    IF v_range_days > v_max_consecutive_days THEN
      RAISE EXCEPTION 'No puedes solicitar más de % días consecutivos de tiempo compensatorio', v_max_consecutive_days;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para validar fechas antes de insertar o actualizar
DROP TRIGGER IF EXISTS trigger_validate_compensatory_dates ON timeoffs;
CREATE TRIGGER trigger_validate_compensatory_dates
  BEFORE INSERT OR UPDATE ON timeoffs
  FOR EACH ROW
  EXECUTE FUNCTION validate_compensatory_date_range();

-- Comentarios
COMMENT ON FUNCTION validate_compensatory_date_range() IS 'Valida que las fechas de tiempo compensatorio cumplan con los límites establecidos (90 días futuro, 7 días consecutivos máximo)';

