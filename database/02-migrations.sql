-- ============================================
-- People Database - Migraciones Adicionales
-- ============================================
-- Este archivo contiene migraciones para bases de datos EXISTENTES
-- 
-- ⚠️ IMPORTANTE: 
-- - Si tienes una base de datos NUEVA, usa `01-setup.sql` en su lugar
-- - Solo ejecuta este archivo si ya tienes datos y necesitas actualizar
-- ============================================

-- NOTA: La mayoría de estas migraciones ya están incluidas en `01-setup.sql`
-- Este archivo es solo para referencia si necesitas aplicar cambios específicos
-- a una base de datos existente sin recrear todo.

-- ============================================
-- Migración: Permitir múltiples padres en organigrama
-- ============================================
-- Si ya tienes la tabla organization_chart con UNIQUE(position_id),
-- ejecuta esto para permitir múltiples padres:

-- ALTER TABLE organization_chart 
-- DROP CONSTRAINT IF EXISTS organization_chart_position_id_key;
-- 
-- ALTER TABLE organization_chart 
-- ADD CONSTRAINT organization_chart_position_parent_unique 
-- UNIQUE (position_id, parent_position_id);

-- ============================================
-- Migración: Agregar campos al portal de empleados
-- ============================================
-- Estos campos ya están incluidos en 01-setup.sql, pero si necesitas
-- agregarlos a una base de datos existente:

-- ALTER TABLE employees 
-- ADD COLUMN IF NOT EXISTS has_portal_access BOOLEAN DEFAULT false;
-- 
-- ALTER TABLE employees
-- ADD COLUMN IF NOT EXISTS account_approved BOOLEAN DEFAULT NULL;

-- ============================================
-- Migración: Agregar campos a complaints
-- ============================================
-- Estos campos ya están incluidos en 01-setup.sql:

-- ALTER TABLE complaints
-- ADD COLUMN IF NOT EXISTS creator_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL;
-- 
-- ALTER TABLE complaints
-- ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
-- 
-- ALTER TABLE complaints
-- ADD COLUMN IF NOT EXISTS closed BOOLEAN DEFAULT false;
-- 
-- ALTER TABLE complaints
-- ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- ============================================
-- FIN DE MIGRACIONES
-- ============================================
-- Si necesitas migraciones específicas, revisa los archivos en migrations/

