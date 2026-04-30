import type { Position } from './company.model';

export type JobApplication = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone_number: string;
  position_id?: string; // Mantener por compatibilidad
  position_ids?: string[]; // Array de IDs de posiciones (múltiples selecciones)
  position?: Position;
  positions?: Position[]; // Array de posiciones relacionadas
  position_name?: string; // Mantener para compatibilidad, puede contener múltiples nombres separados por coma
  province?: string;
  corregimiento?: string;
  currently_working?: boolean;
  salary_expectation?: number;
  resume_url?: string;
  resume_filename?: string;
  resume_text?: string;
  resume_parsed?: ResumeParsed;
  source?: 'job_fair' | 'email';
  additional_info?: string;
  status: 'pending' | 'reviewed' | 'contacted' | 'rejected' | 'hired';
  interview_date?: Date;
  notes?: string;
  is_favorite?: boolean; // Campo para marcar como favorito
  classification?: RecruitmentClassification;
  created_at?: Date;
  updated_at?: Date;
};

export type ResumeParsed = {
  experiencia?: string[];
  educacion?: string[];
  habilidades?: string[];
  idiomas?: string[];
  keywords_found?: string[];
};

export type RecruitmentRuleMatchType =
  | 'contains_keyword'
  | 'contains_any'
  | 'regex'
  | 'equals'
  | 'min_value'
  | 'max_value'
  | 'is_true'
  | 'is_false';

export type RecruitmentRule = {
  id: string;
  company_id: string;
  name: string;
  description?: string;
  target_role: string;
  field_to_check: string;
  match_type: RecruitmentRuleMatchType;
  match_value: string;
  score_points: number;
  is_active: boolean;
  priority: number;
  created_at?: Date;
  updated_at?: Date;
};

export type MatchedRule = {
  rule_id: string;
  rule_name: string;
  target_role: string;
  points: number;
};

export type RecruitmentClassification = {
  id: string;
  job_application_id: string;
  company_id: string;
  recommended_role?: string;
  scores: Record<string, number>;
  matched_rules: MatchedRule[];
  extraction_status: 'pending' | 'extracted' | 'failed' | 'no_resume';
  extraction_error?: string;
  classified_at?: Date;
  classified_by?: string;
};
