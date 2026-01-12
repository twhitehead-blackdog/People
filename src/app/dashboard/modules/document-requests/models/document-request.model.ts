export interface DocumentRequest {
  id: string;
  employee_id: string;
  created_by?: string | null;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email: string;
    position?: { name: string };
    branch?: { name: string };
  };
  document_type: string;
  reason: string | null;
  document_url?: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  review_notes?: string;
  rejection_comment?: string | null;
  company_id?: string;
  created_at: string;
}
