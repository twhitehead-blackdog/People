export type TimelogType = 'entry' | 'lunch_start' | 'lunch_end' | 'exit';

export interface DocumentRequestMetadata {
  // For timelog_correction
  timelog_date?: string;
  timelog_type?: TimelogType;
  branch_id?: string;
  attachment_url?: string;
  // For uniform_request
  item_type?: string;
  size?: string;
  quantity?: number;
  current_quantity?: number;
  // For supply_request
  area?: string;
  supply_description?: string;
  supply_reason?: string;
}

export interface DocumentRequest {
  id: string;
  employee_id: string;
  created_by?: string | null;
  created_by_employee?: {
    id: string;
    first_name: string;
    father_name: string;
  };
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email: string;
    company_id: string;
    start_date?: string;
    position?: { name: string };
    branch?: { name: string; id: string };
  };
  document_type: string;
  custom_document_type?: string;
  reason: string | null;
  document_url?: string | null;
  status: 'pending' | 'completed' | 'rejected';
  processed_by?: string;
  processed_at?: string;
  rejection_comment?: string;
  notes?: string;
  metadata?: DocumentRequestMetadata;
  required_date?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}
