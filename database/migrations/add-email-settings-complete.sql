-- ============================================
-- Migración: Configuración completa de correo
-- ============================================
-- Agrega:
-- 1. Master switch global para habilitar/deshabilitar correos
-- 2. Nuevos tipos de eventos: vacaciones, uniforme, marcación errónea
-- 3. Notificaciones a empleados: aprobaciones y rechazos
-- ============================================

-- ============================================
-- 1. MASTER SWITCH GLOBAL
-- ============================================

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'email_enabled',
  'true',
  'Master switch: si es false, NO se enviará ningún correo del sistema.',
  'email',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================
-- 2. NUEVOS TIPOS DE EVENTOS (Solicitudes)
-- ============================================

-- Vacaciones
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_notify_vacations',
  'true',
  'Si es true, al crear una solicitud de vacaciones se enviará un correo de notificación a RRHH.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_recipients_vacations',
  'Verley@blackdogpanama.com',
  'Destinatarios para notificaciones de solicitudes de vacaciones.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Solicitud de Uniforme
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_notify_uniform',
  'true',
  'Si es true, al crear una solicitud de uniforme se enviará un correo de notificación a RRHH.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_recipients_uniform',
  'Verley@blackdogpanama.com',
  'Destinatarios para notificaciones de solicitudes de uniforme.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Marcación Errónea
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_notify_timelog_correction',
  'true',
  'Si es true, al crear una solicitud de corrección de marcación se enviará un correo de notificación a RRHH.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'hr_email_recipients_timelog_correction',
  'Verley@blackdogpanama.com',
  'Destinatarios para notificaciones de corrección de marcación.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================
-- 3. NOTIFICACIONES A EMPLEADOS (Respuestas)
-- ============================================

-- Notificar al empleado cuando se APRUEBA su solicitud
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'employee_email_notify_approvals',
  'true',
  'Si es true, se enviará un correo al empleado cuando RRHH apruebe su solicitud.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- Notificar al empleado cuando se RECHAZA su solicitud
INSERT INTO settings (key, value, description, category, is_encrypted)
VALUES (
  'employee_email_notify_rejections',
  'true',
  'Si es true, se enviará un correo al empleado cuando RRHH rechace su solicitud.',
  'notifications',
  false
)
ON CONFLICT (key)
DO UPDATE SET
  description = EXCLUDED.description,
  category = EXCLUDED.category;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Ejecutar después de la migración:
-- SELECT key, value, category FROM settings WHERE category IN ('email', 'notifications') ORDER BY category, key;
