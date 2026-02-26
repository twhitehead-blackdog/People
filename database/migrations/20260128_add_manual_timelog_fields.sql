-- Migración: Agregar campos para marcaciones manuales
-- Fecha: 2026-01-28
-- Descripción: Permite a administradores registrar marcaciones manuales para empleados

-- Agregar columnas a timelogs para soporte de marcaciones manuales
ALTER TABLE timelogs
  ADD COLUMN IF NOT EXISTS source VARCHAR(20) DEFAULT 'KIOSK',
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES employees(id),
  ADD COLUMN IF NOT EXISTS punched_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reason TEXT;

-- Índice para consultas por source
CREATE INDEX IF NOT EXISTS idx_timelogs_source ON timelogs(source);

-- Índice para consultas por created_by (quién creó la marcación manual)
CREATE INDEX IF NOT EXISTS idx_timelogs_created_by ON timelogs(created_by);

-- Comentarios descriptivos
COMMENT ON COLUMN timelogs.source IS 'Origen de la marcación: KIOSK (reloj físico), MANUAL (admin), RPC (legacy)';
COMMENT ON COLUMN timelogs.created_by IS 'ID del administrador que creó la marcación manual';
COMMENT ON COLUMN timelogs.punched_at IS 'Fecha/hora de la marcación. Para manuales, puede diferir de created_at';
COMMENT ON COLUMN timelogs.reason IS 'Razón o justificación de la marcación manual';

-- Función para validar si un usuario puede crear marcaciones manuales
CREATE OR REPLACE FUNCTION can_create_manual_timelog(creator_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  creator_position RECORD;
BEGIN
  SELECT p.admin, p.schedule_admin, p.schedule_approver
  INTO creator_position
  FROM employees e
  JOIN positions p ON e.position_id = p.id
  WHERE e.id = creator_id;

  -- Permitir si es admin, schedule_admin, o schedule_approver
  RETURN COALESCE(creator_position.admin, false) = true
      OR COALESCE(creator_position.schedule_admin, false) = true
      OR COALESCE(creator_position.schedule_approver, false) = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_create_manual_timelog IS 'Verifica si un usuario tiene permisos para crear marcaciones manuales';
