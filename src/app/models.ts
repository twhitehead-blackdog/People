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
  description?: string;
  health_status?: string;
  is_vaccinated: boolean;
  is_sterilized: boolean;
  is_available: boolean;
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
  status: 'pending' | 'approved' | 'rejected' | 'completed';
  notes?: string;
  created_at?: Date;
  updated_at?: Date;
};
