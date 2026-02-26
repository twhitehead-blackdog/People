-- Optimización de índices para tablas de horarios y auditoría
-- Ejecutar después de verificar que las consultas existentes funcionan correctamente

-- =============================================================================
-- SCHEDULE_AUDIT_LOG - Índices para consultas de auditoría
-- =============================================================================

-- Índice compuesto para consultas por empleado y fecha (orden descendente por changed_at)
-- Útil para: getAuditHistoryByEmployee(employeeId) y getAuditHistoryByEmployeeAndDate
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_audit_log_employee_date_desc
ON schedule_audit_log (employee_schedule_id, changed_at DESC);

-- Índice para filtrado por action (tipo de auditoría)
-- Útil para: filtros por tipo de acción en la UI
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_audit_log_action
ON schedule_audit_log (action);

-- Índice compuesto para consultas por fecha y acción
-- Útil para: filtros combinados de fecha + acción
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_audit_log_date_action
ON schedule_audit_log (changed_at DESC, action);

-- Índice para búsqueda por comentario (si se usa búsqueda de texto)
-- Útil para: búsqueda libre en comentarios de auditoría
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_audit_log_comment_gin
ON schedule_audit_log USING gin (to_tsvector('spanish', comment));

-- =============================================================================
-- EMPLOYEE_SCHEDULES - Índices para consultas de horarios
-- =============================================================================

-- Índice compuesto para consultas de solapamiento (rangos de fecha)
-- Útil para: consultas de horarios que se solapan con un período
-- Nota: PostgreSQL puede usar este índice para start_date <= endDate AND end_date >= startDate
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_schedules_date_range
ON employee_schedules (start_date, end_date);

-- Índice para filtrado por employee_id
-- Útil para: consultas por empleado específico
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_schedules_employee_id
ON employee_schedules (employee_id);

-- Índice compuesto para consultas que filtran por empleado y fechas
-- Útil para: horarios de un empleado en un período específico
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employee_schedules_employee_dates
ON employee_schedules (employee_id, start_date, end_date);

-- =============================================================================
-- Índices adicionales recomendados para relaciones
-- =============================================================================

-- Si las consultas por company_id a través de employees son frecuentes,
-- considerar este índice en la tabla employees
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_employees_company_id_active
-- ON employees (company_id) WHERE is_active = true;

-- =============================================================================
-- Verificación de índices existentes
-- =============================================================================

-- Ejecutar estas consultas para ver los índices actuales antes de crear nuevos:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename IN ('schedule_audit_log', 'employee_schedules')
-- ORDER BY tablename, indexname;

-- =============================================================================
-- Monitoreo de uso de índices después de crearlos
-- =============================================================================

-- Después de crear los índices, monitorear su uso con:
-- SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
-- FROM pg_stat_user_indexes
-- WHERE tablename IN ('schedule_audit_log', 'employee_schedules')
-- ORDER BY idx_scan DESC;

-- =============================================================================
-- Notas importantes
-- =============================================================================

-- 1. Usar CONCURRENTLY para crear índices sin bloquear las tablas en producción
-- 2. Los índices agregan overhead en INSERT/UPDATE/DELETE, crear solo los necesarios
-- 3. Monitorear el rendimiento después de crear índices
-- 4. Considerar particionado si las tablas crecen mucho (especialmente schedule_audit_log)

-- =============================================================================
-- Queries de ejemplo que se benefician de estos índices
-- =============================================================================

-- Consulta de auditoría por empleado (usa idx_schedule_audit_log_employee_date_desc)
-- SELECT * FROM schedule_audit_log
-- WHERE employee_schedule_id IN (
--   SELECT id FROM employee_schedules WHERE employee_id = ?
-- )
-- ORDER BY changed_at DESC;

-- Consulta de horarios por período (usa idx_employee_schedules_date_range)
-- SELECT * FROM employee_schedules
-- WHERE start_date <= ? AND end_date >= ?
-- AND employee_id IN (
--   SELECT id FROM employees WHERE company_id = ?
-- );

-- Consulta de auditoría con filtros (usa múltiples índices)
-- SELECT * FROM schedule_audit_log
-- WHERE changed_at >= ? AND changed_at <= ?
-- AND action = ?
-- ORDER BY changed_at DESC;