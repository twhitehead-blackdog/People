-- ============================================
-- Índices Compuestos Críticos para Optimización
-- ============================================
-- Estos índices mejoran significativamente el rendimiento de consultas
-- frecuentes en timelogs y employee_schedules
-- ============================================

-- Índice compuesto para getLastTimelog()
-- Optimiza consultas que buscan el último timelog de un empleado en una compañía en un día específico
CREATE INDEX IF NOT EXISTS idx_timelogs_employee_company_date 
ON timelogs(employee_id, company_id, created_at DESC);

-- Índice compuesto para getLunchStartTimelog()
-- Optimiza consultas que buscan lunch_start de un empleado en una compañía en un día específico
-- El WHERE clause hace el índice más pequeño y eficiente
CREATE INDEX IF NOT EXISTS idx_timelogs_employee_type_date 
ON timelogs(employee_id, company_id, type, created_at DESC) 
WHERE type = 'lunch_start';

-- Índice compuesto para getEmployeeSchedule()
-- Optimiza consultas que buscan horarios activos de un empleado en una compañía
-- usando rangos de fechas (start_date, end_date)
CREATE INDEX IF NOT EXISTS idx_employee_schedules_employee_company_dates 
ON employee_schedules(employee_id, company_id, start_date, end_date);

-- Comentarios para documentación
COMMENT ON INDEX idx_timelogs_employee_company_date IS 
'Índice compuesto para optimizar búsqueda del último timelog de un empleado por compañía y fecha';

COMMENT ON INDEX idx_timelogs_employee_type_date IS 
'Índice compuesto para optimizar búsqueda de lunch_start de un empleado por compañía y fecha';

COMMENT ON INDEX idx_employee_schedules_employee_company_dates IS 
'Índice compuesto para optimizar búsqueda de horarios activos de un empleado por compañía y rango de fechas';
