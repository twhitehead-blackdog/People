-- Migración: Agregar setting para fecha de inicio de entrevistas de la feria de empleo
-- ============================================

-- Insertar o actualizar el setting de fecha de inicio de entrevistas
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'job_fair_interview_start_date',
  '',
  'Fecha de inicio de las entrevistas de la Feria de Empleo (formato: YYYY-MM-DD). Si está vacío, no se mostrará el mensaje.',
  'job_fair',
  false
)
ON CONFLICT (key) 
DO UPDATE SET 
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Comentario
COMMENT ON TABLE settings IS 'Tabla de configuraciones del sistema. Incluye settings para feria de empleo, Wassenger, etc.';

