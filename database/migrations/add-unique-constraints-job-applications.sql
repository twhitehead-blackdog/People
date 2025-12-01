-- ============================================
-- Migración: Añadir constraints únicos a job_applications
-- ============================================
-- Este script añade constraints UNIQUE para email y phone_number
-- para evitar registros duplicados por persona
-- ============================================

-- Crear función para normalizar teléfono (remover formato y prefijo 507)
CREATE OR REPLACE FUNCTION normalize_phone(phone TEXT) 
RETURNS TEXT AS $$
BEGIN
    IF phone IS NULL THEN
        RETURN NULL;
    END IF;
    -- Remover todo excepto números y quitar prefijo 507
    RETURN REGEXP_REPLACE(REGEXP_REPLACE(phone, '\D', '', 'g'), '^507', '');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Constraint UNIQUE para email
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uk_job_applications_email'
    ) THEN
        ALTER TABLE job_applications 
        ADD CONSTRAINT uk_job_applications_email 
        UNIQUE (email);
        
        COMMENT ON CONSTRAINT uk_job_applications_email ON job_applications IS 
        'Constraint único para evitar múltiples aplicaciones con el mismo email';
    END IF;
END $$;

-- Índice único para teléfono normalizado (previene duplicados con diferentes formatos)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'job_applications_phone_unique'
    ) THEN
        CREATE UNIQUE INDEX job_applications_phone_unique 
        ON job_applications(normalize_phone(phone_number)) 
        WHERE phone_number IS NOT NULL;
        
        COMMENT ON INDEX job_applications_phone_unique IS 
        'Índice único para evitar múltiples aplicaciones con el mismo teléfono (normalizado)';
    END IF;
END $$;

-- Nota: Para phone_number, el índice único con expresión ya funciona como constraint
-- Pero si queremos un constraint explícito, necesitaríamos una columna calculada
-- Por ahora, el índice único es suficiente para prevenir duplicados

-- ============================================
-- Verificación
-- ============================================
-- Para verificar los constraints creados, ejecuta:
-- SELECT conname, contype 
-- FROM pg_constraint 
-- WHERE conrelid = 'job_applications'::regclass 
-- AND contype = 'u';
--
-- Para ver los índices únicos:
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'job_applications' 
-- AND indexdef LIKE '%UNIQUE%';

