export interface EvaluationType {
  id: string;
  name: string;
  description?: string;
  rating_scale: number;
  rating_labels: string[];
  rating_colors: string[];
  is_active: boolean;
  target_position_ids?: string[];
  company_id?: string | null;
  created_at?: string;
  updated_at?: string;
  sections?: EvaluationSection[];
}

export interface EvaluationSection {
  id: string;
  evaluation_type_id: string;
  name: string;
  description?: string;
  question_type: 'rating' | 'yes_no' | 'text';
  sort_order: number;
  questions?: EvaluationQuestion[];
}

export interface EvaluationQuestion {
  id: string;
  section_id: string;
  name: string;
  description?: string;
  icon?: string;
  valor_label?: string;
  weight?: number;
  sort_order: number;
}

export interface EmployeeEvaluation {
  id: string;
  employee_id: string;
  evaluation_type_id: string;
  evaluator_id?: string | null;
  evaluator_name?: string;
  evaluator_position?: string;
  period_label?: string;
  evaluation_date: string;
  verdict?: string;
  next_review_date?: string | null;
  strengths?: string;
  areas_to_improve?: string;
  employee_comments?: string;
  evaluator_signature?: string;
  employee_signature?: string;
  status: 'draft' | 'completed' | 'archived';
  values_avg?: number;
  competencies_avg?: number;
  suitability_count?: string;
  overall_score?: number;
  company_id?: string | null;
  created_at?: string;
  updated_at?: string;
  employee?: {
    id: string;
    first_name: string;
    father_name?: string;
    branch?: { id: string; name: string };
  };
  evaluation_type?: {
    id: string;
    name: string;
    rating_scale?: number;
    rating_labels?: string[];
    rating_colors?: string[];
  };
  responses?: EvaluationResponse[];
}

export interface EvaluationResponse {
  id?: string;
  evaluation_id?: string;
  question_id: string;
  rating?: number | null;
  yes_no?: boolean | null;
  text_response?: string | null;
  comment?: string | null;
}

export const VERDICT_OPTIONS = [
  { value: 'sobresaliente', label: 'Sobresaliente — Excede expectativas en todo' },
  { value: 'cumple', label: 'Cumple — Buen desempeño general' },
  { value: 'mejorar', label: 'Debe mejorar — Necesita un plan de desarrollo' },
  { value: 'no_cumple', label: 'No cumple — Decisión de salida o reasignación' },
];
