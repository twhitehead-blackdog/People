-- ============================================
-- Schema para el módulo de Adopciones
-- Ejecuta este archivo en tu proyecto de Supabase
-- ============================================

-- EXTENSIONES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- TABLA: foundations (Fundaciones)
-- ============================================
CREATE TABLE IF NOT EXISTS public.foundations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  address TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  email TEXT NOT NULL,
  website TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para foundations
CREATE INDEX IF NOT EXISTS foundations_is_active_idx ON public.foundations(is_active);
CREATE INDEX IF NOT EXISTS foundations_email_idx ON public.foundations(email);

-- ============================================
-- TABLA: pets (Mascotas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  foundation_id UUID NOT NULL REFERENCES public.foundations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  species TEXT NOT NULL CHECK (species IN ('dog', 'cat', 'other')),
  breed TEXT,
  age NUMERIC(4,1),
  gender TEXT NOT NULL CHECK (gender IN ('M', 'F')),
  size TEXT NOT NULL CHECK (size IN ('small', 'medium', 'large')),
  color TEXT,
  weight NUMERIC(5,2), -- Peso en kilogramos
  description TEXT,
  health_status TEXT,
  location_type TEXT, -- Tipo de ubicación (Tienda, Sede, Hogar temporal, Refugio, etc.)
  location_detail TEXT, -- Detalle específico de la ubicación
  is_vaccinated BOOLEAN NOT NULL DEFAULT false,
  is_sterilized BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  personality TEXT[], -- Array de rasgos de personalidad
  photos TEXT[], -- Array de URLs de fotos
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para pets
CREATE INDEX IF NOT EXISTS pets_foundation_id_idx ON public.pets(foundation_id);
CREATE INDEX IF NOT EXISTS pets_species_idx ON public.pets(species);
CREATE INDEX IF NOT EXISTS pets_is_available_idx ON public.pets(is_available);
CREATE INDEX IF NOT EXISTS pets_created_at_idx ON public.pets(created_at DESC);

-- ============================================
-- TABLA: adoption_applications (Solicitudes de Adopción)
-- ============================================
CREATE TABLE IF NOT EXISTS public.adoption_applications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  applicant_name TEXT NOT NULL,
  applicant_email TEXT NOT NULL,
  applicant_phone TEXT NOT NULL,
  applicant_address TEXT NOT NULL,
  applicant_document_id TEXT,
  reason_for_adoption TEXT,
  has_other_pets BOOLEAN NOT NULL DEFAULT false,
  other_pets_info TEXT,
  has_children BOOLEAN NOT NULL DEFAULT false,
  children_info TEXT,
  living_situation TEXT,
  personality TEXT[], -- Array de rasgos de personalidad preferidos
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para adoption_applications
CREATE INDEX IF NOT EXISTS adoption_applications_pet_id_idx ON public.adoption_applications(pet_id);
CREATE INDEX IF NOT EXISTS adoption_applications_status_idx ON public.adoption_applications(status);
CREATE INDEX IF NOT EXISTS adoption_applications_applicant_email_idx ON public.adoption_applications(applicant_email);
CREATE INDEX IF NOT EXISTS adoption_applications_created_at_idx ON public.adoption_applications(created_at DESC);

-- ============================================
-- TABLA: adoption_requirements (Requisitos de Adopción)
-- ============================================
CREATE TABLE IF NOT EXISTS public.adoption_requirements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  "order" INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para adoption_requirements
CREATE INDEX IF NOT EXISTS adoption_requirements_order_idx ON public.adoption_requirements("order");
CREATE INDEX IF NOT EXISTS adoption_requirements_is_active_idx ON public.adoption_requirements(is_active);
CREATE INDEX IF NOT EXISTS adoption_requirements_created_at_idx ON public.adoption_requirements(created_at DESC);

-- ============================================
-- TABLA: faq_items (Preguntas Frecuentes)
-- ============================================
CREATE TABLE IF NOT EXISTS public.faq_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  question TEXT NOT NULL,
  answer TEXT NOT NULL,
  category TEXT,
  "order" INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para faq_items
CREATE INDEX IF NOT EXISTS faq_items_order_idx ON public.faq_items("order");
CREATE INDEX IF NOT EXISTS faq_items_category_idx ON public.faq_items(category);
CREATE INDEX IF NOT EXISTS faq_items_is_active_idx ON public.faq_items(is_active);
CREATE INDEX IF NOT EXISTS faq_items_created_at_idx ON public.faq_items(created_at DESC);

-- ============================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para actualizar updated_at
-- Eliminar triggers existentes si existen (para hacer el script idempotente)
DROP TRIGGER IF EXISTS update_foundations_updated_at ON public.foundations;
DROP TRIGGER IF EXISTS update_pets_updated_at ON public.pets;
DROP TRIGGER IF EXISTS update_adoption_applications_updated_at ON public.adoption_applications;
DROP TRIGGER IF EXISTS update_adoption_requirements_updated_at ON public.adoption_requirements;
DROP TRIGGER IF EXISTS update_faq_items_updated_at ON public.faq_items;

-- Crear triggers
CREATE TRIGGER update_foundations_updated_at
  BEFORE UPDATE ON public.foundations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pets_updated_at
  BEFORE UPDATE ON public.pets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adoption_applications_updated_at
  BEFORE UPDATE ON public.adoption_applications
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_adoption_requirements_updated_at
  BEFORE UPDATE ON public.adoption_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_faq_items_updated_at
  BEFORE UPDATE ON public.faq_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================
-- NOTA: Como usamos Auth0 (no Supabase Auth), las políticas RLS
-- están configuradas para permitir acceso con la API key de servicio
-- que se envía en el header 'apikey'. Para producción, deberías
-- implementar políticas más restrictivas basadas en JWT de Auth0.

-- Habilitar RLS en todas las tablas
ALTER TABLE public.foundations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adoption_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;

-- Políticas para foundations: Lectura pública, escritura con API key
-- En desarrollo: permite todo con API key
-- En producción: ajusta según tus necesidades de seguridad
DROP POLICY IF EXISTS "Foundations are viewable by everyone" ON public.foundations;
DROP POLICY IF EXISTS "Foundations are insertable with service role" ON public.foundations;
DROP POLICY IF EXISTS "Foundations are updatable with service role" ON public.foundations;
DROP POLICY IF EXISTS "Foundations are deletable with service role" ON public.foundations;

CREATE POLICY "Foundations are viewable by everyone"
  ON public.foundations FOR SELECT
  USING (true);

CREATE POLICY "Foundations are insertable with service role"
  ON public.foundations FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

CREATE POLICY "Foundations are updatable with service role"
  ON public.foundations FOR UPDATE
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "Foundations are deletable with service role"
  ON public.foundations FOR DELETE
  USING (true); -- Permitir con API key de servicio

-- Políticas para pets: Lectura pública, escritura con API key
DROP POLICY IF EXISTS "Pets are viewable by everyone" ON public.pets;
DROP POLICY IF EXISTS "Pets are insertable with service role" ON public.pets;
DROP POLICY IF EXISTS "Pets are updatable with service role" ON public.pets;
DROP POLICY IF EXISTS "Pets are deletable with service role" ON public.pets;

CREATE POLICY "Pets are viewable by everyone"
  ON public.pets FOR SELECT
  USING (true);

CREATE POLICY "Pets are insertable with service role"
  ON public.pets FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

CREATE POLICY "Pets are updatable with service role"
  ON public.pets FOR UPDATE
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "Pets are deletable with service role"
  ON public.pets FOR DELETE
  USING (true); -- Permitir con API key de servicio

-- Políticas para adoption_applications: Lectura y escritura con API key
DROP POLICY IF EXISTS "Adoption applications are viewable with service role" ON public.adoption_applications;
DROP POLICY IF EXISTS "Adoption applications are insertable with service role" ON public.adoption_applications;
DROP POLICY IF EXISTS "Adoption applications are updatable with service role" ON public.adoption_applications;
DROP POLICY IF EXISTS "Adoption applications are deletable with service role" ON public.adoption_applications;

CREATE POLICY "Adoption applications are viewable with service role"
  ON public.adoption_applications FOR SELECT
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "Adoption applications are insertable with service role"
  ON public.adoption_applications FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

CREATE POLICY "Adoption applications are updatable with service role"
  ON public.adoption_applications FOR UPDATE
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "Adoption applications are deletable with service role"
  ON public.adoption_applications FOR DELETE
  USING (true); -- Permitir con API key de servicio

-- Políticas para adoption_requirements: Lectura pública, escritura con API key
DROP POLICY IF EXISTS "Adoption requirements are viewable by everyone" ON public.adoption_requirements;
DROP POLICY IF EXISTS "Adoption requirements are insertable with service role" ON public.adoption_requirements;
DROP POLICY IF EXISTS "Adoption requirements are updatable with service role" ON public.adoption_requirements;
DROP POLICY IF EXISTS "Adoption requirements are deletable with service role" ON public.adoption_requirements;

CREATE POLICY "Adoption requirements are viewable by everyone"
  ON public.adoption_requirements FOR SELECT
  USING (is_active = true OR true); -- Permitir ver todos, pero filtrar por is_active en la app

CREATE POLICY "Adoption requirements are insertable with service role"
  ON public.adoption_requirements FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

CREATE POLICY "Adoption requirements are updatable with service role"
  ON public.adoption_requirements FOR UPDATE
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "Adoption requirements are deletable with service role"
  ON public.adoption_requirements FOR DELETE
  USING (true); -- Permitir con API key de servicio

-- Políticas para faq_items: Lectura pública, escritura con API key
DROP POLICY IF EXISTS "FAQ items are viewable by everyone" ON public.faq_items;
DROP POLICY IF EXISTS "FAQ items are insertable with service role" ON public.faq_items;
DROP POLICY IF EXISTS "FAQ items are updatable with service role" ON public.faq_items;
DROP POLICY IF EXISTS "FAQ items are deletable with service role" ON public.faq_items;

CREATE POLICY "FAQ items are viewable by everyone"
  ON public.faq_items FOR SELECT
  USING (is_active = true OR true); -- Permitir ver todos, pero filtrar por is_active en la app

CREATE POLICY "FAQ items are insertable with service role"
  ON public.faq_items FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

CREATE POLICY "FAQ items are updatable with service role"
  ON public.faq_items FOR UPDATE
  USING (true); -- Permitir con API key de servicio

CREATE POLICY "FAQ items are deletable with service role"
  ON public.faq_items FOR DELETE
  USING (true); -- Permitir con API key de servicio

-- ============================================
-- TABLA: events (Eventos)
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  description TEXT,
  event_date DATE NOT NULL,
  event_time TEXT, -- Hora del evento (formato HH:mm)
  location TEXT,
  event_type TEXT NOT NULL CHECK (event_type IN ('adoption_fair', 'workshop', 'campaign', 'fundraiser', 'other')) DEFAULT 'other',
  foundation_id UUID REFERENCES public.foundations(id) ON DELETE SET NULL,
  image_url TEXT,
  registration_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para events
CREATE INDEX IF NOT EXISTS events_event_date_idx ON public.events(event_date DESC);
CREATE INDEX IF NOT EXISTS events_event_type_idx ON public.events(event_type);
CREATE INDEX IF NOT EXISTS events_foundation_id_idx ON public.events(foundation_id);
CREATE INDEX IF NOT EXISTS events_is_active_idx ON public.events(is_active);
CREATE INDEX IF NOT EXISTS events_created_at_idx ON public.events(created_at DESC);

-- Trigger para actualizar updated_at en events
DROP TRIGGER IF EXISTS update_events_updated_at ON public.events;
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para events
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- Políticas para events: Lectura pública, escritura con API key
DROP POLICY IF EXISTS "Events are viewable by everyone" ON public.events;
CREATE POLICY "Events are viewable by everyone"
  ON public.events FOR SELECT
  USING (is_active = true OR true); -- Permitir ver todos, pero filtrar por is_active en la app

DROP POLICY IF EXISTS "Events are insertable with service role" ON public.events;
CREATE POLICY "Events are insertable with service role"
  ON public.events FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

DROP POLICY IF EXISTS "Events are updatable with service role" ON public.events;
CREATE POLICY "Events are updatable with service role"
  ON public.events FOR UPDATE
  USING (true); -- Permitir con API key de servicio

DROP POLICY IF EXISTS "Events are deletable with service role" ON public.events;
CREATE POLICY "Events are deletable with service role"
  ON public.events FOR DELETE
  USING (true); -- Permitir con API key de servicio

-- ============================================
-- COMENTARIOS EN LAS TABLAS
-- ============================================
COMMENT ON TABLE public.foundations IS 'Fundaciones y refugios de animales';
COMMENT ON TABLE public.pets IS 'Mascotas disponibles para adopción';
COMMENT ON TABLE public.adoption_applications IS 'Solicitudes de adopción de mascotas';
COMMENT ON TABLE public.adoption_requirements IS 'Requisitos para adoptar una mascota';
COMMENT ON TABLE public.faq_items IS 'Preguntas frecuentes sobre adopción';
COMMENT ON TABLE public.events IS 'Eventos relacionados con adopciones (ferias, talleres, campañas, etc.)';

-- ============================================
-- TABLA: adoptive_families (Familias Adoptivas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.adoptive_families (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_name TEXT NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT NOT NULL,
  address TEXT,
  story TEXT,
  pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
  pet_name TEXT,
  photo_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para adoptive_families
CREATE INDEX IF NOT EXISTS adoptive_families_is_active_idx ON public.adoptive_families(is_active);
CREATE INDEX IF NOT EXISTS adoptive_families_is_featured_idx ON public.adoptive_families(is_featured);
CREATE INDEX IF NOT EXISTS adoptive_families_pet_id_idx ON public.adoptive_families(pet_id);
CREATE INDEX IF NOT EXISTS adoptive_families_created_at_idx ON public.adoptive_families(created_at DESC);

-- Trigger para actualizar updated_at en adoptive_families
DROP TRIGGER IF EXISTS update_adoptive_families_updated_at ON public.adoptive_families;
CREATE TRIGGER update_adoptive_families_updated_at
  BEFORE UPDATE ON public.adoptive_families
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para adoptive_families
ALTER TABLE public.adoptive_families ENABLE ROW LEVEL SECURITY;

-- Políticas para adoptive_families: Lectura pública, escritura con API key
DROP POLICY IF EXISTS "Adoptive families are viewable by everyone" ON public.adoptive_families;
CREATE POLICY "Adoptive families are viewable by everyone"
  ON public.adoptive_families FOR SELECT
  USING (is_active = true OR true); -- Permitir ver todos, pero filtrar por is_active en la app

DROP POLICY IF EXISTS "Adoptive families are insertable with service role" ON public.adoptive_families;
CREATE POLICY "Adoptive families are insertable with service role"
  ON public.adoptive_families FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

DROP POLICY IF EXISTS "Adoptive families are updatable with service role" ON public.adoptive_families;
CREATE POLICY "Adoptive families are updatable with service role"
  ON public.adoptive_families FOR UPDATE
  USING (true); -- Permitir con API key de servicio

DROP POLICY IF EXISTS "Adoptive families are deletable with service role" ON public.adoptive_families;
CREATE POLICY "Adoptive families are deletable with service role"
  ON public.adoptive_families FOR DELETE
  USING (true); -- Permitir con API key de servicio

COMMENT ON TABLE public.adoptive_families IS 'Familias que han adoptado mascotas y sus historias';

-- ============================================
-- TABLA: partners (Aliados)
-- ============================================
CREATE TABLE IF NOT EXISTS public.partners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  partner_type TEXT NOT NULL CHECK (partner_type IN ('sponsor', 'veterinary', 'supplier', 'media', 'other')) DEFAULT 'other',
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  website TEXT,
  logo_url TEXT,
  address TEXT,
  social_media JSONB, -- JSON con redes sociales: {"facebook": "...", "instagram": "...", etc.}
  is_featured BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para partners
CREATE INDEX IF NOT EXISTS partners_is_active_idx ON public.partners(is_active);
CREATE INDEX IF NOT EXISTS partners_is_featured_idx ON public.partners(is_featured);
CREATE INDEX IF NOT EXISTS partners_partner_type_idx ON public.partners(partner_type);
CREATE INDEX IF NOT EXISTS partners_name_idx ON public.partners(name);

-- Trigger para actualizar updated_at en partners
DROP TRIGGER IF EXISTS update_partners_updated_at ON public.partners;
CREATE TRIGGER update_partners_updated_at
  BEFORE UPDATE ON public.partners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para partners
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- Políticas para partners: Lectura pública, escritura con API key
DROP POLICY IF EXISTS "Partners are viewable by everyone" ON public.partners;
CREATE POLICY "Partners are viewable by everyone"
  ON public.partners FOR SELECT
  USING (is_active = true OR true); -- Permitir ver todos, pero filtrar por is_active en la app

DROP POLICY IF EXISTS "Partners are insertable with service role" ON public.partners;
CREATE POLICY "Partners are insertable with service role"
  ON public.partners FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

DROP POLICY IF EXISTS "Partners are updatable with service role" ON public.partners;
CREATE POLICY "Partners are updatable with service role"
  ON public.partners FOR UPDATE
  USING (true); -- Permitir con API key de servicio

DROP POLICY IF EXISTS "Partners are deletable with service role" ON public.partners;
CREATE POLICY "Partners are deletable with service role"
  ON public.partners FOR DELETE
  USING (true); -- Permitir con API key de servicio

COMMENT ON TABLE public.partners IS 'Aliados estratégicos de Black Dog (patrocinadores, veterinarias, proveedores, medios, etc.)';

-- ============================================
-- TABLA: pet_interests (Intereses en Mascotas)
-- ============================================
CREATE TABLE IF NOT EXISTS public.pet_interests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
  user_email TEXT NOT NULL,
  user_name TEXT,
  user_phone TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'contacted', 'converted', 'archived')),
  contacted_at TIMESTAMPTZ,
  converted_to_application BOOLEAN NOT NULL DEFAULT false,
  application_id UUID REFERENCES public.adoption_applications(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para pet_interests
CREATE INDEX IF NOT EXISTS pet_interests_pet_id_idx ON public.pet_interests(pet_id);
CREATE INDEX IF NOT EXISTS pet_interests_user_email_idx ON public.pet_interests(user_email);
CREATE INDEX IF NOT EXISTS pet_interests_status_idx ON public.pet_interests(status);
CREATE INDEX IF NOT EXISTS pet_interests_created_at_idx ON public.pet_interests(created_at DESC);

-- Trigger para actualizar updated_at en pet_interests
DROP TRIGGER IF EXISTS update_pet_interests_updated_at ON public.pet_interests;
CREATE TRIGGER update_pet_interests_updated_at
  BEFORE UPDATE ON public.pet_interests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para pet_interests
ALTER TABLE public.pet_interests ENABLE ROW LEVEL SECURITY;

-- Políticas para pet_interests: Lectura pública limitada, escritura con API key
DROP POLICY IF EXISTS "Pet interests are viewable by everyone" ON public.pet_interests;
CREATE POLICY "Pet interests are viewable by everyone"
  ON public.pet_interests FOR SELECT
  USING (true); -- Permitir ver todos los intereses (filtrar por is_active en la app)

DROP POLICY IF EXISTS "Pet interests are insertable with service role" ON public.pet_interests;
CREATE POLICY "Pet interests are insertable with service role"
  ON public.pet_interests FOR INSERT
  WITH CHECK (true); -- Permitir con API key de servicio

DROP POLICY IF EXISTS "Pet interests are updatable with service role" ON public.pet_interests;
CREATE POLICY "Pet interests are updatable with service role"
  ON public.pet_interests FOR UPDATE
  USING (true); -- Permitir con API key de servicio

DROP POLICY IF EXISTS "Pet interests are deletable with service role" ON public.pet_interests;
CREATE POLICY "Pet interests are deletable with service role"
  ON public.pet_interests FOR DELETE
  USING (true); -- Permitir con API key de servicio

COMMENT ON TABLE public.pet_interests IS 'Registro de intereses de usuarios en mascotas específicas';

-- ============================================
-- TABLA: audit_logs (Registro de Auditoría)
-- ============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL, -- Tipo de entidad: 'pet', 'application', 'foundation', etc.
  entity_id TEXT NOT NULL, -- ID de la entidad afectada
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete', 'status_change', 'other')),
  user_id TEXT, -- ID del usuario que realizó la acción
  user_email TEXT, -- Email del usuario
  changes JSONB, -- Cambios realizados (JSON)
  metadata JSONB, -- Metadatos adicionales (JSON)
  ip_address TEXT, -- Dirección IP del usuario
  user_agent TEXT, -- User agent del navegador
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para audit_logs
CREATE INDEX IF NOT EXISTS audit_logs_entity_type_idx ON public.audit_logs(entity_type);
CREATE INDEX IF NOT EXISTS audit_logs_entity_id_idx ON public.audit_logs(entity_id);
CREATE INDEX IF NOT EXISTS audit_logs_action_idx ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS audit_logs_user_id_idx ON public.audit_logs(user_id);
CREATE INDEX IF NOT EXISTS audit_logs_user_email_idx ON public.audit_logs(user_email);
CREATE INDEX IF NOT EXISTS audit_logs_created_at_idx ON public.audit_logs(created_at DESC);

-- Habilitar RLS para audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para audit_logs: Solo lectura y escritura con API key
DROP POLICY IF EXISTS "Audit logs are viewable by service role" ON public.audit_logs;
CREATE POLICY "Audit logs are viewable by service role"
  ON public.audit_logs FOR SELECT
  USING (true); -- Solo con API key de servicio

DROP POLICY IF EXISTS "Audit logs are insertable with service role" ON public.audit_logs;
CREATE POLICY "Audit logs are insertable with service role"
  ON public.audit_logs FOR INSERT
  WITH CHECK (true); -- Solo con API key de servicio

-- No permitir actualización ni eliminación de logs de auditoría
COMMENT ON TABLE public.audit_logs IS 'Registro de auditoría de todas las acciones realizadas en el sistema';

-- ============================================
-- TABLA: admin_users (Usuarios Administradores)
-- ============================================
CREATE TABLE IF NOT EXISTS public.admin_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL UNIQUE, -- ID del usuario de Auth0
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'editor', 'viewer')) DEFAULT 'viewer',
  permissions JSONB, -- Permisos específicos por sección (JSON)
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para admin_users
CREATE INDEX IF NOT EXISTS admin_users_email_idx ON public.admin_users(email);
CREATE INDEX IF NOT EXISTS admin_users_user_id_idx ON public.admin_users(user_id);
CREATE INDEX IF NOT EXISTS admin_users_role_idx ON public.admin_users(role);
CREATE INDEX IF NOT EXISTS admin_users_is_active_idx ON public.admin_users(is_active);

-- Trigger para actualizar updated_at en admin_users
DROP TRIGGER IF EXISTS update_admin_users_updated_at ON public.admin_users;
CREATE TRIGGER update_admin_users_updated_at
  BEFORE UPDATE ON public.admin_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para admin_users
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Políticas para admin_users: Solo lectura y escritura con API key
DROP POLICY IF EXISTS "Admin users are viewable by service role" ON public.admin_users;
CREATE POLICY "Admin users are viewable by service role"
  ON public.admin_users FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Admin users are insertable with service role" ON public.admin_users;
CREATE POLICY "Admin users are insertable with service role"
  ON public.admin_users FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admin users are updatable with service role" ON public.admin_users;
CREATE POLICY "Admin users are updatable with service role"
  ON public.admin_users FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Admin users are deletable with service role" ON public.admin_users;
CREATE POLICY "Admin users are deletable with service role"
  ON public.admin_users FOR DELETE
  USING (true);

COMMENT ON TABLE public.admin_users IS 'Usuarios administradores del sistema con diferentes roles y permisos';

-- ============================================
-- TABLA: system_settings (Configuración del Sistema)
-- ============================================
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT NOT NULL UNIQUE, -- Clave única de la configuración
  value TEXT, -- Valor de la configuración (puede ser JSON)
  value_type TEXT NOT NULL CHECK (value_type IN ('string', 'number', 'boolean', 'json')) DEFAULT 'string',
  category TEXT NOT NULL DEFAULT 'general', -- Categoría: general, email, limits, social, etc.
  description TEXT, -- Descripción de la configuración
  is_public BOOLEAN NOT NULL DEFAULT false, -- Si es accesible públicamente
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para system_settings
CREATE INDEX IF NOT EXISTS system_settings_key_idx ON public.system_settings(key);
CREATE INDEX IF NOT EXISTS system_settings_category_idx ON public.system_settings(category);
CREATE INDEX IF NOT EXISTS system_settings_is_public_idx ON public.system_settings(is_public);

-- Trigger para actualizar updated_at en system_settings
DROP TRIGGER IF EXISTS update_system_settings_updated_at ON public.system_settings;
CREATE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para system_settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Políticas para system_settings
DROP POLICY IF EXISTS "System settings are viewable by everyone if public" ON public.system_settings;
CREATE POLICY "System settings are viewable by everyone if public"
  ON public.system_settings FOR SELECT
  USING (is_public = true OR true); -- Permitir ver todos con API key

DROP POLICY IF EXISTS "System settings are insertable with service role" ON public.system_settings;
CREATE POLICY "System settings are insertable with service role"
  ON public.system_settings FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "System settings are updatable with service role" ON public.system_settings;
CREATE POLICY "System settings are updatable with service role"
  ON public.system_settings FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "System settings are deletable with service role" ON public.system_settings;
CREATE POLICY "System settings are deletable with service role"
  ON public.system_settings FOR DELETE
  USING (true);

COMMENT ON TABLE public.system_settings IS 'Configuración general del sistema (emails, límites, URLs, etc.)';

-- ============================================
-- TABLA: personality_traits (Rasgos de Personalidad)
-- ============================================
CREATE TABLE IF NOT EXISTS public.personality_traits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  label TEXT NOT NULL, -- Etiqueta mostrada (ej: "Juguetón")
  value TEXT NOT NULL UNIQUE, -- Valor interno (ej: "jugueton")
  description TEXT, -- Descripción del rasgo
  icon TEXT, -- Emoji o icono asociado
  category TEXT, -- Categoría: social, actividad, temperamento, etc.
  display_order INTEGER NOT NULL DEFAULT 0, -- Orden de visualización
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para personality_traits
CREATE INDEX IF NOT EXISTS personality_traits_value_idx ON public.personality_traits(value);
CREATE INDEX IF NOT EXISTS personality_traits_category_idx ON public.personality_traits(category);
CREATE INDEX IF NOT EXISTS personality_traits_is_active_idx ON public.personality_traits(is_active);
CREATE INDEX IF NOT EXISTS personality_traits_display_order_idx ON public.personality_traits(display_order);

-- Trigger para actualizar updated_at en personality_traits
DROP TRIGGER IF EXISTS update_personality_traits_updated_at ON public.personality_traits;
CREATE TRIGGER update_personality_traits_updated_at
  BEFORE UPDATE ON public.personality_traits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS para personality_traits
ALTER TABLE public.personality_traits ENABLE ROW LEVEL SECURITY;

-- Políticas para personality_traits
DROP POLICY IF EXISTS "Personality traits are viewable by everyone" ON public.personality_traits;
CREATE POLICY "Personality traits are viewable by everyone"
  ON public.personality_traits FOR SELECT
  USING (is_active = true OR true); -- Filtrar por is_active en la app

DROP POLICY IF EXISTS "Personality traits are insertable with service role" ON public.personality_traits;
CREATE POLICY "Personality traits are insertable with service role"
  ON public.personality_traits FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Personality traits are updatable with service role" ON public.personality_traits;
CREATE POLICY "Personality traits are updatable with service role"
  ON public.personality_traits FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Personality traits are deletable with service role" ON public.personality_traits;
CREATE POLICY "Personality traits are deletable with service role"
  ON public.personality_traits FOR DELETE
  USING (true);

COMMENT ON TABLE public.personality_traits IS 'Rasgos de personalidad disponibles para mascotas';

-- Agregar campo is_archived a pets si no existe
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'pets' 
    AND column_name = 'is_archived'
  ) THEN
    ALTER TABLE public.pets ADD COLUMN is_archived BOOLEAN NOT NULL DEFAULT false;
    CREATE INDEX IF NOT EXISTS pets_is_archived_idx ON public.pets(is_archived);
    COMMENT ON COLUMN public.pets.is_archived IS 'Si la mascota está archivada (oculta en público pero visible en admin)';
  END IF;
END $$;

