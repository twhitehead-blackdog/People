// ───────────────────────────────────────────────────────────────────
// Sugerencias / ideas de mejora
// ───────────────────────────────────────────────────────────────────

import { TicketDepartment } from './ticket.model';

export type SuggestionDepartment = TicketDepartment | 'general';
export type SuggestionStatus =
  | 'new'
  | 'under_review'
  | 'planned'
  | 'in_progress'
  | 'implemented'
  | 'rejected'
  | 'duplicate';
export type SuggestionImpact = 'low' | 'medium' | 'high';

export interface Suggestion {
  id: number;
  title: string;
  description: string | null;
  department: SuggestionDepartment;
  category: string | null;
  status: SuggestionStatus;
  impact: SuggestionImpact | null;
  is_anonymous: boolean;
  author_id: string | null;
  branch_id: string | null;
  company_id: string | null;
  reviewer_id: string | null;
  admin_response: string | null;
  responded_at: string | null;
  vote_count: number;
  created_at: string;
  updated_at: string;
  author?:   { id: string; first_name: string; father_name: string } | null;
  reviewer?: { id: string; first_name: string; father_name: string } | null;
  branch?:   { id: string; name: string } | null;
  has_voted?: boolean;
}

export interface SuggestionVote {
  suggestion_id: number;
  employee_id:   string;
  created_at:    string;
}

export interface SuggestionComment {
  id: number;
  suggestion_id: number;
  author_id: string | null;
  content: string;
  is_internal: boolean;
  created_at: string;
  author?: { first_name: string; father_name: string } | null;
}

export const SUGGESTION_STATUS_META: Record<SuggestionStatus, { label: string; severity: 'info' | 'warn' | 'success' | 'danger' | 'secondary'; icon: string }> = {
  new:          { label: 'Nueva',         severity: 'info',      icon: 'pi-sparkles'       },
  under_review: { label: 'En revisión',   severity: 'warn',      icon: 'pi-search'         },
  planned:      { label: 'Planeada',      severity: 'info',      icon: 'pi-calendar-plus' },
  in_progress:  { label: 'En progreso',   severity: 'warn',      icon: 'pi-spin pi-spinner'},
  implemented:  { label: 'Implementada',  severity: 'success',   icon: 'pi-check-circle'   },
  rejected:     { label: 'Rechazada',     severity: 'danger',    icon: 'pi-times-circle'   },
  duplicate:    { label: 'Duplicada',     severity: 'secondary', icon: 'pi-copy'           },
};

export const SUGGESTION_IMPACT_META: Record<SuggestionImpact, { label: string; color: string }> = {
  low:    { label: 'Bajo',  color: 'text-gray-400'  },
  medium: { label: 'Medio', color: 'text-blue-400'  },
  high:   { label: 'Alto',  color: 'text-emerald-400' },
};
