/**
 * Base interface for HR request models.
 * All HR request types (disabilities, vacations, documents, compensatory) should extend this.
 */
export interface HrRequestBase {
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
  status: 'pending' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_comment?: string | null;
  company_id?: string;
  created_at: string;
}

/**
 * Interface for HR requests with document attachments.
 */
export interface HrRequestWithDocument extends HrRequestBase {
  document_url?: string | null;
}

/**
 * Interface for HR requests with date ranges.
 */
export interface HrRequestWithDateRange extends HrRequestBase {
  start_date: string;
  end_date: string;
}
