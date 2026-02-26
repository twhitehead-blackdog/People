-- ============================================
-- Agregar campo created_by a las tablas de gestiones
-- ============================================
-- Este campo registra quién creó la solicitud (útil cuando un gerente
-- crea solicitudes en nombre de empleados)
-- ============================================

-- 1. Agregar created_by a employee_disabilities
ALTER TABLE employee_disabilities 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

COMMENT ON COLUMN employee_disabilities.created_by IS 
'ID del empleado que creó esta solicitud (puede ser el empleado mismo o un gerente en su nombre)';

CREATE INDEX IF NOT EXISTS idx_employee_disabilities_created_by 
  ON employee_disabilities(created_by);

-- 2. Agregar created_by a employee_vacations
ALTER TABLE employee_vacations 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

COMMENT ON COLUMN employee_vacations.created_by IS 
'ID del empleado que creó esta solicitud (puede ser el empleado mismo o un gerente en su nombre)';

CREATE INDEX IF NOT EXISTS idx_employee_vacations_created_by 
  ON employee_vacations(created_by);

-- 3. Agregar created_by a document_requests
ALTER TABLE document_requests 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id);

COMMENT ON COLUMN document_requests.created_by IS 
'ID del empleado que creó esta solicitud (puede ser el empleado mismo o un gerente en su nombre)';

CREATE INDEX IF NOT EXISTS idx_document_requests_created_by 
  ON document_requests(created_by);

-- ============================================
-- ¡LISTO! Campo created_by agregado a todas las tablas
-- ============================================
