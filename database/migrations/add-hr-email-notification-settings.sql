-- Migración: Settings para notificaciones por email a RRHH (Gestiones)
-- ============================================

-- Enviar correo cuando se cree una solicitud de documento
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_notify_documents',
  'true',
  'Si es true, al crear una solicitud de documento (Gestiones) se enviará un correo de notificación a RRHH.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Enviar correo cuando se suba una incapacidad
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_notify_disabilities',
  'true',
  'Si es true, al subir una incapacidad médica (Gestiones) se enviará un correo de notificación a RRHH.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Enviar correo cuando se crea una solicitud de tiempo compensatorio
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_notify_compensatory',
  'true',
  'Si es true, al crear una solicitud de tiempo compensatorio (Gestiones) se enviará un correo de notificación a RRHH.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;
