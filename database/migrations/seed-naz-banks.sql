-- ============================================
-- MIGRACIÓN: INSERTAR BANCOS PARA NAZ
-- ============================================
-- Este script inserta los mismos bancos que tiene Black Dog
-- en la tabla naz_banks
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Insertar bancos en naz_banks (los mismos que tiene Black Dog)
-- Usar DO $$ para verificar si ya existen antes de insertar
DO $$
BEGIN
    -- Insertar Banco Nacional si no existe
    IF NOT EXISTS (SELECT 1 FROM naz_banks WHERE name = 'Banco Nacional') THEN
        INSERT INTO naz_banks (name) VALUES ('Banco Nacional');
    END IF;

    -- Insertar Banco Popular si no existe
    IF NOT EXISTS (SELECT 1 FROM naz_banks WHERE name = 'Banco Popular') THEN
        INSERT INTO naz_banks (name) VALUES ('Banco Popular');
    END IF;

    -- Insertar Banco Comercial si no existe
    IF NOT EXISTS (SELECT 1 FROM naz_banks WHERE name = 'Banco Comercial') THEN
        INSERT INTO naz_banks (name) VALUES ('Banco Comercial');
    END IF;
END $$;

-- ============================================
-- FIN DE LA MIGRACIÓN
-- ============================================

