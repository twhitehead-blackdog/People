export type SurveyStatus = 'draft' | 'active' | 'closed' | 'archived';
export type SurveyQuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'rating' | 'yes_no' | 'scale';
export type SurveyAssignmentStatus = 'pending' | 'in_progress' | 'completed';

export interface ScaleConfig {
  min: number;
  max: number;
  min_label?: string;
  max_label?: string;
}

export interface Survey {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  category?: string;
  status: SurveyStatus;
  is_anonymous: boolean;
  allow_multiple_submissions: boolean;
  due_date?: string;
  is_template: boolean;
  created_by?: string;
  creator?: { first_name?: string; father_name?: string };
  activated_at?: string;
  closed_at?: string;
  created_at?: string;
  updated_at?: string;
  questions?: SurveyQuestion[];
  assignments_count?: number;
  completed_count?: number;
}

export interface SurveyQuestion {
  id: string;
  survey_id: string;
  question_text: string;
  question_type: SurveyQuestionType;
  is_required: boolean;
  order_index: number;
  scale_config?: ScaleConfig;
  created_at?: string;
  updated_at?: string;
  options?: SurveyQuestionOption[];
}

export interface SurveyQuestionOption {
  id: string;
  question_id: string;
  option_text: string;
  order_index: number;
  created_at?: string;
}

export interface SurveyAssignment {
  id: string;
  survey_id: string;
  employee_id: string;
  company_id: string;
  status: SurveyAssignmentStatus;
  assigned_at?: string;
  completed_at?: string;
  notified: boolean;
  survey?: Survey;
  employee?: { first_name?: string; father_name?: string };
}

export interface SurveyResponse {
  id: string;
  survey_id: string;
  employee_id: string;
  company_id: string;
  submitted_at?: string;
  answers?: SurveyResponseAnswer[];
  employee?: { first_name?: string; father_name?: string };
}

export interface SurveyResponseAnswer {
  id: string;
  response_id: string;
  question_id: string;
  answer_text?: string;
  answer_numeric?: number;
  selected_option_ids?: string[];
  created_at?: string;
}

export const SURVEY_STATUS_OPTIONS = [
  { value: 'draft' as SurveyStatus, label: 'Borrador', severity: 'secondary', icon: 'pi pi-pencil' },
  { value: 'active' as SurveyStatus, label: 'Activa', severity: 'success', icon: 'pi pi-check-circle' },
  { value: 'closed' as SurveyStatus, label: 'Cerrada', severity: 'warn', icon: 'pi pi-lock' },
  { value: 'archived' as SurveyStatus, label: 'Archivada', severity: 'info', icon: 'pi pi-inbox' },
];

export const SURVEY_CATEGORY_OPTIONS = [
  { value: 'clima_laboral', label: 'Clima Laboral', icon: 'pi pi-sun' },
  { value: 'satisfaccion', label: 'Satisfacción', icon: 'pi pi-heart' },
  { value: 'onboarding', label: 'Onboarding', icon: 'pi pi-user-plus' },
  { value: 'evaluacion', label: 'Evaluación', icon: 'pi pi-chart-bar' },
  { value: 'otro', label: 'Otro', icon: 'pi pi-ellipsis-h' },
];

export const QUESTION_TYPE_OPTIONS = [
  { value: 'single_choice' as SurveyQuestionType, label: 'Opción Única', icon: 'pi pi-circle' },
  { value: 'multiple_choice' as SurveyQuestionType, label: 'Opción Múltiple', icon: 'pi pi-check-square' },
  { value: 'text' as SurveyQuestionType, label: 'Texto Libre', icon: 'pi pi-align-left' },
  { value: 'rating' as SurveyQuestionType, label: 'Calificación (1-5)', icon: 'pi pi-star' },
  { value: 'yes_no' as SurveyQuestionType, label: 'Sí / No', icon: 'pi pi-thumbs-up' },
  { value: 'scale' as SurveyQuestionType, label: 'Escala Numérica', icon: 'pi pi-sliders-h' },
];
