-- ============================================
-- Datos Iniciales para el Módulo de Adopciones
-- IMPORTANTE: Ejecuta PRIMERO el archivo adoptions-schema.sql
-- para crear las tablas antes de ejecutar este script
-- ============================================

-- ============================================
-- REQUISITOS DE ADOPCIÓN
-- ============================================
-- Eliminar requisitos existentes con los mismos títulos para evitar duplicados
DELETE FROM public.adoption_requirements 
WHERE title IN (
  'Ser mayor de 21 años',
  'Amar a las mascotas',
  'Compromiso a largo plazo',
  'Disposición para el proceso',
  'Compromiso con el cuidado'
);

INSERT INTO public.adoption_requirements (title, description, "order", is_active) VALUES
('Ser mayor de 21 años', 'Ser mayor de 21 años.', 1, true),
('Amar a las mascotas', 'Amar a las mascotas y poder dedicarle el tiempo que necesite.', 2, true),
('Compromiso a largo plazo', 'Querer sumar un integrante a tu vida por el resto de la suya, sin importar los cambios que se presenten.', 3, true),
('Disposición para el proceso', 'Estar bien predispuesto: te pedimos cargues tu solicitud, realices una entrevista con el especialista y respondas a nuestro contacto.', 4, true),
('Compromiso con el cuidado', 'Comprometerse con el cuidado, la salud y la castración de la mascota.', 5, true);

-- ============================================
-- PREGUNTAS FRECUENTES
-- ============================================
-- Eliminar preguntas existentes con las mismas preguntas para evitar duplicados
DELETE FROM public.faq_items 
WHERE question IN (
  '¿De dónde provienen las mascotas que están publicadas en ésta Web?',
  '¿Es necesario completar todo el Formulario y luego hacer una entrevista telefónica?',
  '¿Cómo me preparo para la llegada de mi mascota?',
  '¿Cuáles son los cuidados que debe recibir mi mascota?'
);

INSERT INTO public.faq_items (question, answer, category, "order", is_active) VALUES
(
  '¿De dónde provienen las mascotas que están publicadas en ésta Web?',
  'Todas las mascotas que recibimos en nuestras tiendas son rescatadas. Son animales que se encontraban en situaciones de calle, abandono o maltrato. Gracias al trabajo de nuestro equipo, fundaciones y rescatistas logramos ayudarlas a recuperarse brindándoles un hogar de tránsito y toda la atención de especialistas. Estas mascotas ya están preparadas para iniciar una adaptación y poder integrar una nueva familia.',
  'General',
  1,
  true
),
(
  '¿Es necesario completar todo el Formulario y luego hacer una entrevista telefónica?',
  'Sí, es necesario completar el formulario completo con toda la información solicitada. Una vez recibida tu solicitud, nuestro equipo se pondrá en contacto contigo para realizar una entrevista telefónica donde podremos conocer más sobre ti y tu hogar, y resolver cualquier duda que tengas sobre el proceso de adopción.',
  'Proceso',
  2,
  true
),
(
  '¿Cómo me preparo para la llegada de mi mascota?',
  'Es importante preparar tu hogar antes de la llegada de tu nueva mascota. Asegúrate de tener un espacio cómodo para ella, comida adecuada, juguetes, y todos los elementos necesarios para su bienestar. También es recomendable que todos los miembros de la familia estén de acuerdo con la adopción y conozcan las responsabilidades que implica tener una mascota.',
  'Cuidados',
  3,
  true
),
(
  '¿Cuáles son los cuidados que debe recibir mi mascota?',
  'Tu mascota necesitará cuidados básicos como alimentación adecuada, agua fresca, ejercicio diario, atención veterinaria regular, vacunación, desparasitación, esterilización, y sobre todo mucho amor y paciencia durante el proceso de adaptación. Es importante comprometerse con su bienestar a largo plazo.',
  'Cuidados',
  4,
  true
);

-- ============================================
-- EVENTOS DE EJEMPLO
-- ============================================
-- IMPORTANTE: Asegúrate de haber ejecutado adoptions-schema.sql primero
-- para crear la tabla events antes de ejecutar este INSERT
-- Nota: Estos eventos se crearán sin foundation_id por defecto
-- Puedes asociarlos a una fundación después de crearla
INSERT INTO public.events (title, description, event_date, event_time, location, event_type, is_active) VALUES
(
  'Feria de Adopción Primavera 2024',
  'Gran feria de adopción donde podrás conocer a cientos de mascotas buscando un hogar. Habrá actividades para toda la familia, charlas sobre cuidado responsable y stands de fundaciones. ¡Ven y encuentra a tu compañero perfecto!',
  CURRENT_DATE + INTERVAL '30 days',
  '10:00',
  'Parque Central, Ciudad de Panamá',
  'adoption_fair',
  true
),
(
  'Taller: Cuidado Responsable de Mascotas',
  'Taller educativo sobre los cuidados básicos que necesita tu mascota: alimentación, salud, ejercicio y bienestar emocional. Ideal para nuevos adoptantes y dueños experimentados.',
  CURRENT_DATE + INTERVAL '15 days',
  '14:00',
  'Centro Comunitario, Sede Principal',
  'workshop',
  true
),
(
  'Campaña: Adopta, No Compres',
  'Campaña de concientización sobre la importancia de adoptar mascotas en lugar de comprarlas. Incluye testimonios de familias adoptivas y información sobre el proceso de adopción.',
  CURRENT_DATE + INTERVAL '7 days',
  '09:00',
  'Plazas comerciales y redes sociales',
  'campaign',
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- FAMILIAS ADOPTIVAS DE EJEMPLO
-- ============================================
INSERT INTO public.adoptive_families (family_name, contact_name, contact_email, contact_phone, address, story, pet_name, is_featured, is_active) VALUES
(
  'Familia García',
  'María García',
  'maria.garcia@example.com',
  '+507 6123-4567',
  'San Francisco, Ciudad de Panamá',
  'Hace un año adoptamos a Luna, una gata persa que había sido rescatada. Desde entonces, nuestra casa se llenó de alegría y amor. Luna es parte de nuestra familia y no podemos imaginar la vida sin ella. Gracias a Black Dog por darnos esta oportunidad.',
  'Luna',
  true,
  true
),
(
  'Familia Rodríguez',
  'Carlos Rodríguez',
  'carlos.rodriguez@example.com',
  '+507 6789-0123',
  'Bella Vista, Ciudad de Panamá',
  'Max llegó a nuestras vidas hace 6 meses. Es un perro labrador muy juguetón que se ha convertido en el mejor amigo de nuestros hijos. La adopción fue la mejor decisión que pudimos tomar.',
  'Max',
  true,
  true
),
(
  'Familia Martínez',
  'Ana Martínez',
  'ana.martinez@example.com',
  '+507 6456-7890',
  'Paitilla, Ciudad de Panamá',
  'Misu es una gata siamesa que adoptamos hace 3 meses. Es muy cariñosa y sociable. Nuestra experiencia con Black Dog fue excelente, el proceso fue claro y nos ayudaron en cada paso.',
  'Misu',
  false,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- ALIADOS DE EJEMPLO
-- ============================================
INSERT INTO public.partners (name, description, partner_type, contact_name, contact_email, contact_phone, website, address, is_featured, is_active) VALUES
(
  'Clínica Veterinaria Panamá',
  'Clínica veterinaria que ofrece servicios de salud y cuidado para las mascotas adoptadas. Proporciona consultas, vacunaciones y esterilizaciones a precios especiales para familias adoptivas.',
  'veterinary',
  'Dr. Juan Pérez',
  'contacto@veterinariapanama.com',
  '+507 2234-5678',
  'https://www.veterinariapanama.com',
  'Vía España, Ciudad de Panamá',
  true,
  true
),
(
  'Pet Food Express',
  'Proveedor de alimentos y accesorios para mascotas. Ofrece descuentos especiales para familias que adoptan a través de Black Dog.',
  'supplier',
  'Roberto Sánchez',
  'ventas@petfoodexpress.com',
  '+507 2345-6789',
  'https://www.petfoodexpress.com',
  'Albrook Mall, Ciudad de Panamá',
  true,
  true
),
(
  'Fundación Milagrinos',
  'Organización aliada que colabora en rescates y adopciones. Trabajamos juntos para encontrar hogares para mascotas necesitadas.',
  'sponsor',
  'Laura González',
  'info@fundacionmilagrinos.org',
  '+507 6123-4567',
  'https://www.facebook.com/fundacionmilagrinos',
  'Vía Suba Cota Km 7, Vereda Chorrillos',
  true,
  true
),
(
  'Radio Panamá',
  'Medio de comunicación que ayuda a difundir nuestras campañas de adopción y eventos. Su apoyo ha sido fundamental para llegar a más familias.',
  'media',
  'Patricia López',
  'patricia@radiopanama.com',
  '+507 2456-7890',
  'https://www.radiopanama.com',
  'Ciudad de Panamá',
  false,
  true
),
(
  'DogPack',
  'Organización aliada especializada en rescate y rehabilitación de perros. Colaboramos en eventos y campañas de concientización.',
  'sponsor',
  'Miguel Torres',
  'info@dogpack.org',
  '+507 6789-0123',
  NULL,
  'Ciudad de Panamá',
  false,
  true
)
ON CONFLICT DO NOTHING;

-- ============================================
-- INTERESES EN MASCOTAS DE EJEMPLO
-- ============================================
-- Nota: Estos intereses se crearán para las primeras mascotas disponibles
-- Si no hay mascotas en la base de datos, estos INSERTs fallarán silenciosamente
-- Asegúrate de tener al menos algunas mascotas creadas antes de ejecutar esto

-- Intereses activos (usuarios que han mostrado interés recientemente)
INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, created_at)
SELECT 
  p.id,
  'maria.lopez@example.com',
  'María López',
  '+507 6123-4567',
  'Me encantaría conocer más sobre esta mascota. Tengo experiencia con perros y un hogar con patio.',
  'active',
  CURRENT_TIMESTAMP - INTERVAL '2 days'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, created_at)
SELECT 
  p.id,
  'juan.perez@example.com',
  'Juan Pérez',
  '+507 6789-0123',
  'Estoy buscando un compañero para mi familia. Tenemos una casa grande y mucho amor para dar.',
  'active',
  CURRENT_TIMESTAMP - INTERVAL '1 day'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1 OFFSET 1
ON CONFLICT DO NOTHING;

INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, created_at)
SELECT 
  p.id,
  'ana.martinez@example.com',
  'Ana Martínez',
  '+507 6456-7890',
  'Me interesa esta mascota. ¿Podrían contactarme para más información?',
  'active',
  CURRENT_TIMESTAMP - INTERVAL '5 hours'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1 OFFSET 2
ON CONFLICT DO NOTHING;

-- Intereses contactados (usuarios que ya fueron contactados)
INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, contacted_at, created_at)
SELECT 
  p.id,
  'carlos.rodriguez@example.com',
  'Carlos Rodríguez',
  '+507 6234-5678',
  'Ya hablamos por teléfono. Está muy interesado y cumple con todos los requisitos.',
  'contacted',
  CURRENT_TIMESTAMP - INTERVAL '1 day',
  CURRENT_TIMESTAMP - INTERVAL '3 days'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1 OFFSET 3
ON CONFLICT DO NOTHING;

INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, contacted_at, created_at)
SELECT 
  p.id,
  'laura.gonzalez@example.com',
  'Laura González',
  '+507 6345-6789',
  'Contactada. Pendiente de entrevista presencial.',
  'contacted',
  CURRENT_TIMESTAMP - INTERVAL '12 hours',
  CURRENT_TIMESTAMP - INTERVAL '4 days'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1 OFFSET 4
ON CONFLICT DO NOTHING;

-- Intereses convertidos (usuarios que completaron el proceso y adoptaron)
INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, converted_to_application, created_at)
SELECT 
  p.id,
  'roberto.sanchez@example.com',
  'Roberto Sánchez',
  '+507 6456-7890',
  'Interés convertido en solicitud de adopción. Proceso completado exitosamente.',
  'converted',
  true,
  CURRENT_TIMESTAMP - INTERVAL '15 days'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1 OFFSET 5
ON CONFLICT DO NOTHING;

-- Intereses archivados (usuarios que ya no están interesados o no respondieron)
INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, created_at)
SELECT 
  p.id,
  'patricia.lopez@example.com',
  'Patricia López',
  '+507 6567-8901',
  'Usuario no respondió después de múltiples intentos de contacto.',
  'archived',
  CURRENT_TIMESTAMP - INTERVAL '20 days'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1 OFFSET 6
ON CONFLICT DO NOTHING;

INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, created_at)
SELECT 
  p.id,
  'miguel.torres@example.com',
  'Miguel Torres',
  '+507 6678-9012',
  'Ya adoptó otra mascota. Archivar interés.',
  'archived',
  CURRENT_TIMESTAMP - INTERVAL '10 days'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1 OFFSET 7
ON CONFLICT DO NOTHING;

-- Más intereses activos para tener datos variados
INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, created_at)
SELECT 
  p.id,
  'sofia.ramirez@example.com',
  'Sofía Ramírez',
  '+507 6789-0123',
  'Primera vez que adopto. Necesito orientación sobre el proceso.',
  'active',
  CURRENT_TIMESTAMP - INTERVAL '3 hours'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1 OFFSET 8
ON CONFLICT DO NOTHING;

INSERT INTO public.pet_interests (pet_id, user_email, user_name, user_phone, notes, status, created_at)
SELECT 
  p.id,
  'diego.morales@example.com',
  'Diego Morales',
  '+507 6890-1234',
  'Tengo experiencia con gatos. Busco un compañero tranquilo.',
  'active',
  CURRENT_TIMESTAMP - INTERVAL '1 hour'
FROM public.pets p
WHERE p.is_available = true
LIMIT 1 OFFSET 9
ON CONFLICT DO NOTHING;

-- ============================================
-- RASGOS DE PERSONALIDAD DE EJEMPLO
-- ============================================
DELETE FROM public.personality_traits
WHERE value IN (
  'jugueton', 'tranquilo', 'carinoso', 'independiente', 'sociable',
  'activo', 'protector', 'timido', 'curioso', 'energetico', 'docil'
);

INSERT INTO public.personality_traits (label, value, description, icon, category, display_order, is_active) VALUES
('Juguetón', 'jugueton', 'Le encanta jugar y estar activo', '🎾', 'actividad', 1, true),
('Tranquilo', 'tranquilo', 'Es calmado y relajado', '😌', 'temperamento', 2, true),
('Cariñoso', 'carinoso', 'Muy afectuoso y busca atención', '💕', 'social', 3, true),
('Independiente', 'independiente', 'Prefiere hacer las cosas por su cuenta', '🦁', 'temperamento', 4, true),
('Sociable', 'sociable', 'Se lleva bien con otros animales y personas', '👥', 'social', 5, true),
('Activo', 'activo', 'Tiene mucha energía y necesita ejercicio', '⚡', 'actividad', 6, true),
('Protector', 'protector', 'Cuida y protege a su familia', '🛡️', 'comportamiento', 7, true),
('Tímido', 'timido', 'Es reservado y necesita tiempo para confiar', '🌙', 'temperamento', 8, true),
('Curioso', 'curioso', 'Le gusta explorar y descubrir cosas nuevas', '🔍', 'comportamiento', 9, true),
('Energético', 'energetico', 'Muy activo y lleno de vitalidad', '⚡', 'actividad', 10, true),
('Dócil', 'docil', 'Es obediente y fácil de entrenar', '✨', 'comportamiento', 11, true)
ON CONFLICT (value) DO UPDATE SET
  label = EXCLUDED.label,
  description = EXCLUDED.description,
  icon = EXCLUDED.icon,
  category = EXCLUDED.category,
  display_order = EXCLUDED.display_order,
  is_active = EXCLUDED.is_active;

-- ============================================
-- CONFIGURACIONES DEL SISTEMA DE EJEMPLO
-- ============================================
DELETE FROM public.system_settings
WHERE key IN (
  'contact_email', 'contact_phone', 'max_photos_per_pet', 'max_personality_traits',
  'retention_days_logs', 'facebook_url', 'instagram_url', 'twitter_url',
  'terms_url', 'privacy_url'
);

INSERT INTO public.system_settings (key, value, value_type, category, description, is_public) VALUES
('contact_email', 'contacto@blackdogpanama.com', 'string', 'general', 'Email de contacto principal', true),
('contact_phone', '+507 1234-5678', 'string', 'general', 'Teléfono de contacto', true),
('max_photos_per_pet', '10', 'number', 'limits', 'Máximo de fotos permitidas por mascota', false),
('max_personality_traits', '5', 'number', 'limits', 'Máximo de rasgos de personalidad por mascota', false),
('retention_days_logs', '365', 'number', 'limits', 'Días de retención de logs de auditoría', false),
('facebook_url', 'https://facebook.com/blackdogpanama', 'string', 'social', 'URL de Facebook', true),
('instagram_url', 'https://instagram.com/blackdogpanama', 'string', 'social', 'URL de Instagram', true),
('twitter_url', 'https://twitter.com/blackdogpanama', 'string', 'social', 'URL de Twitter', true),
('terms_url', 'https://blackdogpanama.com/terminos', 'string', 'urls', 'URL de términos y condiciones', true),
('privacy_url', 'https://blackdogpanama.com/privacidad', 'string', 'urls', 'URL de política de privacidad', true)
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  value_type = EXCLUDED.value_type,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  is_public = EXCLUDED.is_public;

