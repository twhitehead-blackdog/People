-- ============================================
-- AGREGAR CAMPO company_id A timeoffs
-- ============================================
-- Este script agrega el campo company_id a la tabla timeoffs
-- y crea un trigger para mantenerlo sincronizado automáticamente
-- con el company_id del empleado correspondiente.
-- Esto permite filtrar los timeoffs por company_id directamente
-- sin necesidad de hacer joins en las queries.
-- ============================================

-- 1. Agregar campo company_id si no existe
ALTER TABLE timeoffs 
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id) ON DELETE RESTRICT;

-- Comentario en el campo
COMMENT ON COLUMN timeoffs.company_id IS 
'Company ID del empleado asociado a este timeoff. Se sincroniza automáticamente con employees.company_id.';

-- 2. Crear índice para mejorar el rendimiento de las queries filtradas por company_id
CREATE INDEX IF NOT EXISTS idx_timeoffs_company_id 
ON timeoffs(company_id);

-- 3. Actualizar registros existentes con el company_id del empleado correspondiente
UPDATE timeoffs t
SET company_id = e.company_id
FROM employees e
WHERE t.employee_id = e.id
  AND t.company_id IS NULL
  AND e.company_id IS NOT NULL;

-- 4. Crear función para sincronizar company_id automáticamente
CREATE OR REPLACE FUNCTION sync_timeoff_company_id()
RETURNS TRIGGER AS $$
BEGIN
    -- Si no hay company_id en el nuevo registro, obtenerlo del empleado
    IF NEW.company_id IS NULL THEN
        SELECT company_id INTO NEW.company_id
        FROM employees
        WHERE id = NEW.employee_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_timeoff_company_id() IS 
'Sincroniza automáticamente el company_id de timeoffs con el company_id del empleado asociado.';

-- 5. Crear trigger para ejecutar la función antes de INSERT o UPDATE
DROP TRIGGER IF EXISTS sync_timeoff_company_id_trigger ON timeoffs;

CREATE TRIGGER sync_timeoff_company_id_trigger
    BEFORE INSERT OR UPDATE OF employee_id ON timeoffs
    FOR EACH ROW
    EXECUTE FUNCTION sync_timeoff_company_id();

-- 6. Crear función para sincronizar company_id cuando cambia el company_id del empleado
CREATE OR REPLACE FUNCTION sync_timeoffs_company_id_on_employee_update()
RETURNS TRIGGER AS $$
BEGIN
    -- Si el company_id del empleado cambió, actualizar todos sus timeoffs
    IF OLD.company_id IS DISTINCT FROM NEW.company_id THEN
        UPDATE timeoffs
        SET company_id = NEW.company_id
        WHERE employee_id = NEW.id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION sync_timeoffs_company_id_on_employee_update() IS 
'Sincroniza el company_id de todos los timeoffs cuando cambia el company_id del empleado.';

-- 7. Crear trigger en employees para sincronizar cuando cambia company_id
DROP TRIGGER IF EXISTS sync_timeoffs_on_employee_company_id_change ON employees;

CREATE TRIGGER sync_timeoffs_on_employee_company_id_change
    AFTER UPDATE OF company_id ON employees
    FOR EACH ROW
    WHEN (OLD.company_id IS DISTINCT FROM NEW.company_id)
    EXECUTE FUNCTION sync_timeoffs_company_id_on_employee_update();

-- ============================================
-- ¡LISTO! El campo company_id ha sido agregado y sincronizado
-- ============================================
-- Ahora puedes filtrar directamente por company_id en las queries:
-- 
-- SELECT * FROM timeoffs WHERE company_id = 'xxx';
-- 
-- O en Supabase/PostgREST:
-- GET /rest/v1/timeoffs?company_id=eq.xxx
-- ============================================

