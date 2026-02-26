-- ============================================
-- Agregar company_id a document_requests (OPCIONAL)
-- ============================================
-- Este campo mejora el rendimiento de las consultas
-- y mantiene consistencia con otras tablas
-- ============================================

-- 1. Agregar columna company_id
ALTER TABLE document_requests 
ADD COLUMN IF NOT EXISTS company_id UUID;

-- 2. Agregar foreign key constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'document_requests_company_id_fkey'
    ) THEN
        ALTER TABLE document_requests 
        ADD CONSTRAINT document_requests_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE RESTRICT;
    END IF;
END $$;

-- 3. Poblar company_id con los datos existentes
UPDATE document_requests dr
SET company_id = e.company_id
FROM employees e
WHERE dr.employee_id = e.id
  AND dr.company_id IS NULL;

-- 4. Crear índice para mejorar performance
CREATE INDEX IF NOT EXISTS idx_document_requests_company_id 
  ON document_requests(company_id);

-- 5. Comentario
COMMENT ON COLUMN document_requests.company_id IS 
'Company ID. Se sincroniza automáticamente desde el empleado';

-- 6. Función para sincronizar company_id
CREATE OR REPLACE FUNCTION sync_document_request_company_id()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.company_id IS NULL THEN
        SELECT company_id INTO NEW.company_id
        FROM employees
        WHERE id = NEW.employee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Trigger para sincronizar company_id
DROP TRIGGER IF EXISTS sync_document_request_company_id_trigger ON document_requests;
CREATE TRIGGER sync_document_request_company_id_trigger
    BEFORE INSERT OR UPDATE OF employee_id ON document_requests
    FOR EACH ROW
    EXECUTE FUNCTION sync_document_request_company_id();

-- ============================================
-- ¡LISTO! Campo company_id agregado
-- ============================================
-- NOTA: Esta migración es OPCIONAL
-- El código funciona sin este campo, pero tenerlo mejora el performance
-- ============================================
