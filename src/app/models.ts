// Modelos para usuarios
export type User = {
  id: string;
  email: string;
  full_name?: string;
  phone_number?: string;
  address?: string;
  document_id?: string;
  avatar_url?: string;
  role?: 'user' | 'admin' | 'foundation';
  created_at?: Date;
  updated_at?: Date;
};

// Modelos para el módulo de adopciones
export type Foundation = {
  id: string;
  name: string;
  description?: string;
  address: string;
  phone_number: string;
  email: string;
  website?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
};

export type Pet = {
  id: string;
  foundation_id: string;
  foundation?: Foundation;
  name: string;
  species: 'dog' | 'cat' | 'other';
  breed?: string;
  age?: number;
  gender: 'M' | 'F';
  size: 'small' | 'medium' | 'large';
  color?: string;
  weight?: number; // Peso en kilogramos
  description?: string;
  health_status?: string;
  location_type?: string; // Tipo de ubicación: Tienda, Sede, Hogar temporal, etc.
  location_detail?: string; // Detalle de ubicación: "ME ENCUENTRO EN LA SEDE DE LAS VILLAS"
  is_vaccinated: boolean;
  is_sterilized: boolean;
  is_available: boolean;
  is_archived?: boolean; // Si la mascota está archivada
  personality?: string[];
  photos?: string[];
  created_at?: Date;
  updated_at?: Date;
};

export type AdoptionApplication = {
  id: string;
  pet_id: string;
  pet?: Pet;
  applicant_name: string;
  applicant_email: string;
  applicant_phone: string;
  applicant_address: string;
  applicant_document_id?: string;
  reason_for_adoption?: string;
  has_other_pets: boolean;
  other_pets_info?: string;
  has_children: boolean;
  children_info?: string;
  living_situation?: string;
  personality?: string[];
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
};

export type AdoptionRequirement = {
  id: string;
  title: string;
  description: string;
  order: number; // Orden de visualización
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
};

export type FAQItem = {
  id: string;
  question: string;
  answer: string;
  category?: string; // Categoría opcional (ej: "Adopción", "Cuidados", "Proceso")
  order: number; // Orden de visualización
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
};

export type Event = {
  id: string;
  title: string;
  description?: string;
  event_date: Date | string;
  event_time?: string; // Hora del evento (formato HH:mm)
  location?: string;
  event_type: 'adoption_fair' | 'workshop' | 'campaign' | 'fundraiser' | 'other';
  foundation_id?: string;
  foundation?: Foundation;
  image_url?: string;
  registration_url?: string;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
};

export type AdoptiveFamily = {
  id: string;
  family_name: string; // Nombre de la familia
  contact_name: string; // Nombre del contacto principal
  contact_email: string;
  contact_phone: string;
  address?: string;
  story?: string; // Historia de la familia y su mascota adoptada
  pet_name?: string; // Nombre de la mascota adoptada
  pet_id?: string; // ID de la mascota adoptada (opcional, para referencia)
  pet?: Pet; // Relación con la mascota
  photo_url?: string; // URL de la foto de la familia
  is_featured: boolean; // Si aparece destacada en la página pública
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
};

export type Partner = {
  id: string;
  name: string; // Nombre del aliado
  description?: string; // Descripción del aliado
  contact_name?: string; // Nombre del contacto
  contact_email?: string;
  contact_phone?: string;
  website?: string; // URL del sitio web
  logo_url?: string; // URL del logo
  partner_type: 'sponsor' | 'veterinary' | 'supplier' | 'media' | 'other'; // Tipo de aliado
  address?: string;
  social_media?: {
    facebook?: string;
    instagram?: string;
    twitter?: string;
    linkedin?: string;
  }; // Redes sociales (JSON)
  is_featured: boolean; // Si aparece destacado
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
};

export type PetInterest = {
  id: string;
  pet_id: string;
  pet?: Pet; // Relación con la mascota
  user_email: string; // Email del usuario interesado
  user_name?: string; // Nombre del usuario (opcional)
  user_phone?: string; // Teléfono del usuario (opcional)
  notes?: string; // Notas adicionales del usuario
  status: 'active' | 'contacted' | 'converted' | 'archived'; // Estado del interés
  contacted_at?: Date; // Fecha en que se contactó al usuario
  converted_to_application?: boolean; // Si se convirtió en solicitud de adopción
  application_id?: string; // ID de la solicitud de adopción relacionada (si existe)
  created_at?: Date;
  updated_at?: Date;
};

export type AuditLog = {
  id: string;
  entity_type: string; // Tipo de entidad: 'pet', 'application', 'foundation', etc.
  entity_id: string; // ID de la entidad afectada
  action: 'create' | 'update' | 'delete' | 'status_change' | 'other'; // Acción realizada
  user_id?: string; // ID del usuario que realizó la acción
  user_email?: string; // Email del usuario
  changes?: Record<string, { old?: any; new?: any }>; // Cambios realizados (JSON)
  metadata?: Record<string, any>; // Metadatos adicionales (JSON)
  ip_address?: string; // Dirección IP del usuario
  user_agent?: string; // User agent del navegador
  created_at?: Date;
};

export type AdminUser = {
  id: string;
  user_id: string; // ID del usuario de Auth0
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'admin' | 'editor' | 'viewer'; // Rol del usuario
  permissions?: Record<string, boolean>; // Permisos específicos por sección (JSON)
  is_active: boolean;
  last_login_at?: Date;
  created_at?: Date;
  updated_at?: Date;
};

export type SystemSetting = {
  id: string;
  key: string; // Clave única de la configuración
  value?: string; // Valor de la configuración (puede ser JSON)
  value_type: 'string' | 'number' | 'boolean' | 'json'; // Tipo del valor
  category: string; // Categoría: general, email, limits, social, etc.
  description?: string; // Descripción de la configuración
  is_public: boolean; // Si es accesible públicamente
  created_at?: Date;
  updated_at?: Date;
};

export type PersonalityTrait = {
  id: string;
  label: string; // Etiqueta mostrada (ej: "Juguetón")
  value: string; // Valor interno (ej: "jugueton")
  description?: string; // Descripción del rasgo
  icon?: string; // Emoji o icono asociado
  category?: string; // Categoría: social, actividad, temperamento, etc.
  display_order: number; // Orden de visualización
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
};