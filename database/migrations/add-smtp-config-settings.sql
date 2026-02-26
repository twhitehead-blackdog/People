-- ============================================
-- Migration: SMTP configuration in settings table
-- ============================================
-- Stores non-secret SMTP config so it can be edited from the UI.
-- Password is ALWAYS read from ENV_SMTP_PASSWORD (never stored in DB).
-- ============================================

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'smtp_host',
  'smtp-mail.outlook.com',
  'Servidor SMTP. Ej: smtp-mail.outlook.com, smtp.gmail.com',
  'email',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'smtp_port',
  '587',
  'Puerto SMTP. 587 para STARTTLS, 465 para SSL directo.',
  'email',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'smtp_user',
  'Danibotrrhh@outlook.com',
  'Usuario de autenticación SMTP (email).',
  'email',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'smtp_noreply_email',
  'Danibotrrhh@outlook.com',
  'Dirección de correo remitente (From). Si está vacío, usa smtp_user.',
  'email',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'smtp_noreply_name',
  'People - RRHH',
  'Nombre del remitente que aparece en los correos.',
  'email',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================
-- VERIFICATION:
-- SELECT key, value, category FROM settings WHERE category = 'email' AND key LIKE 'smtp_%' ORDER BY key;
-- ============================================
