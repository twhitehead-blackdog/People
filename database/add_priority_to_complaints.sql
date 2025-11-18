-- Agregar campo de prioridad a la tabla complaints
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));

-- Agregar campo closed para marcar como cerrado
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS closed BOOLEAN DEFAULT false;

-- Agregar campo closed_at para fecha de cierre
ALTER TABLE complaints
ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP WITH TIME ZONE;

-- Actualizar el CHECK de status para incluir 'closed'
ALTER TABLE complaints
DROP CONSTRAINT IF EXISTS complaints_status_check;

ALTER TABLE complaints
ADD CONSTRAINT complaints_status_check 
CHECK (status IN ('pending', 'in_review', 'resolved', 'closed'));

-- Crear índice para prioridad
CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);

-- Crear índice para closed
CREATE INDEX IF NOT EXISTS idx_complaints_closed ON complaints(closed);

