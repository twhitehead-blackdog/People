export interface Disability {
  id: string;
  employee_id: string;
  created_by?: string | null;
  company_id?: string;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    mother_name: string;
    work_email: string;
    position?: { name: string };
    branch?: { name: string };
  };
  start_date: string;
  end_date: string;
  description: string | null;
  document_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_comment?: string | null;
  created_at: string;
  created_by_employee?: {
    first_name: string;
    father_name: string;
  };
}

export interface CompensatoryRequest {
  id: string;
  employee_id: string;
  created_by?: string | null;
  company_id?: string;
  employee?: {
    id: string;
    first_name: string;
    father_name: string;
    work_email: string;
    branch_id?: string;
    position?: { name: string };
    branch?: { name: string };
  };
  date_from: string;
  date_to: string;
  hours?: number;
  document_url?: string;
  reason?: string;
  compensatory_type?: 'hours' | 'days';
  compensatory_amount?: number;
  review_status?: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_comment?: string;
  is_approved: boolean;
  created_at: string;
  notes?: string[] | string;
  created_by_employee?: {
    first_name: string;
    father_name: string;
  };
}
