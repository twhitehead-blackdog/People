import { Employee } from '../../../../models';

export type NotificationType =
  | 'delay'
  | 'on_time'
  | 'missing'
  | 'early_exit'
  | 'lunch_exceeded'
  | 'timelog_entry'
  | 'timelog_exit'
  | 'timelog_lunch_start'
  | 'timelog_lunch_end'
  | 'complaint'
  | 'other';

export interface Notification {
  id: string;
  type: NotificationType;
  recipient_id: string;
  branch_id: string;
  title: string;
  message: string;
  created_at: Date;
  is_read: boolean;
  read_at?: Date;
  related_entity_id?: string;
  related_entity_type?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface Reminder {
  id: string;
  employee_id?: string;
  employee?: Employee;
  message: string;
  due_date: Date;
  is_completed: boolean;
  created_at: Date;
  audit_task_instance_id?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  category?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'not_applicable';
}
