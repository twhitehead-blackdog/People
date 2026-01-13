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
    position?: { name: string };
    branch?: { name: string };
  };
  document_type: string;
  custom_document_type?: string;
  reason: string | null;
  document_url?: string | null;
  status: 'pending' | 'completed';
  processed_by?: string;
  processed_at?: string;
  notes?: string;
  company_id: string;
  created_at: string;
  updated_at: string;
}
