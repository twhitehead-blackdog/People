-- Agregar campo para acumular tiempo excedido de almuerzo por empleado
ALTER TABLE employees 
ADD COLUMN IF NOT EXISTS total_lunch_exceeded_minutes INTEGER DEFAULT 0;

-- Crear índice para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_employees_total_lunch_exceeded 
ON employees(total_lunch_exceeded_minutes) 
WHERE total_lunch_exceeded_minutes > 0;

-- Crear función para incrementar el tiempo excedido de almuerzo
CREATE OR REPLACE FUNCTION increment_lunch_exceeded_minutes(
  p_employee_id UUID,
  p_minutes INTEGER
)
RETURNS VOID AS $$
BEGIN
  UPDATE employees
  SET total_lunch_exceeded_minutes = COALESCE(total_lunch_exceeded_minutes, 0) + p_minutes
  WHERE id = p_employee_id;
END;
$$ LANGUAGE plpgsql;

-- Comentario
COMMENT ON COLUMN employees.total_lunch_exceeded_minutes IS 'Tiempo total excedido de almuerzo acumulado en minutos (solo se acumula si excede 60 minutos)';
COMMENT ON FUNCTION increment_lunch_exceeded_minutes IS 'Incrementa el tiempo excedido de almuerzo de un empleado de forma segura';

