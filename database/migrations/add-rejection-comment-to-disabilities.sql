-- ============================================
-- AGREGAR CAMPO rejection_comment A employee_disabilities
-- ============================================
-- Este script agrega el campo rejection_comment que es usado
-- por el código para mostrar el motivo de rechazo de incapacidades
-- ============================================

-- Agregar campo rejection_comment si no existe
ALTER TABLE employee_disabilities 
ADD COLUMN IF NOT EXISTS rejection_comment TEXT;

-- Comentario en el campo
COMMENT ON COLUMN employee_disabilities.rejection_comment IS 
'Motivo del rechazo de la incapacidad (usado cuando status = rejected)';

-- ============================================
-- ¡LISTO! El campo ha sido agregado
-- ============================================

