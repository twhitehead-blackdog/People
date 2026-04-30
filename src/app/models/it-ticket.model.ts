export type ItTicketStatus = 'open' | 'in_process' | 'resolved' | 'cancelled';
export type ItTicketPriority = 'low' | 'medium' | 'high' | 'urgent';
export type ItTicketCategory = 'hardware' | 'software' | 'network' | 'other';

export interface ItTicket {
  id: number;
  title: string;
  description: string | null;
  category: ItTicketCategory | null;
  priority: ItTicketPriority;
  status: ItTicketStatus;
  branch_id: string | null;
  company_id: string | null;
  requester_id: string | null;
  assignee_id: string | null;
  created_at: string;
  updated_at: string;
  requester?: { first_name: string; father_name: string } | null;
}
