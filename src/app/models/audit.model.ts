import type { Branch } from './company.model';
import type { Employee } from './employee.model';

// ============================================
// AUDIT TASKS SYSTEM
// ============================================

export type AuditTaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type AuditTaskStatus =
  | 'pending'
  | 'in_progress'
  | 'completed'
  | 'not_applicable'
  | 'overdue';
export type RecurrenceType = 'daily' | 'weekly' | 'monthly' | 'custom';
export type AssignmentType = 'all' | 'specific' | 'by_branch';

export interface RecurrenceConfig {
  // Monthly - día específico del mes (ej: día 15)
  day_of_month?: number;
  // Monthly - semana y día del mes (ej: segundo lunes)
  week_of_month?: number;
  day_of_week?: number;
  // Weekly - días de la semana (0=domingo, 1=lunes, ..., 6=sábado)
  days?: number[];
  // Custom - fechas específicas
  dates?: string[];
}

export interface AuditTask {
  id: string;
  company_id: string;
  title: string;
  description?: string;
  category?: string;
  priority: AuditTaskPriority;
  recurrence_type: RecurrenceType;
  recurrence_config: RecurrenceConfig;
  assignment_type: AssignmentType;
  assigned_branch_ids: string[];
  assigned_manager_ids: string[];
  due_days: number;
  reminder_days_before: number;
  is_active: boolean;
  created_by?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

export interface AuditTaskInstance {
  id: string;
  audit_task_id: string;
  audit_task?: AuditTask;
  company_id: string;
  assigned_to: string;
  assigned_employee?: Partial<Employee>;
  branch_id?: string;
  branch?: Branch;
  status: AuditTaskStatus;
  scheduled_date: Date | string;
  due_date: Date | string;
  completed_at?: Date | string;
  completed_by?: string;
  completion_notes?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
}

// Categorías predefinidas para tareas de auditoría
export const AUDIT_TASK_CATEGORIES = [
  { value: 'inventario', label: 'Inventario', icon: 'pi pi-box' },
  { value: 'limpieza', label: 'Limpieza', icon: 'pi pi-sparkles' },
  { value: 'seguridad', label: 'Seguridad', icon: 'pi pi-shield' },
  { value: 'administrativo', label: 'Administrativo', icon: 'pi pi-file' },
  {
    value: 'capacitacion',
    label: 'Capacitación',
    icon: 'pi pi-graduation-cap',
  },
  { value: 'mantenimiento', label: 'Mantenimiento', icon: 'pi pi-wrench' },
  { value: 'calidad', label: 'Calidad', icon: 'pi pi-check-circle' },
  { value: 'otro', label: 'Otro', icon: 'pi pi-ellipsis-h' },
] as const;

export const AUDIT_TASK_PRIORITIES = [
  { value: 'low', label: 'Baja', severity: 'secondary', icon: 'pi pi-minus' },
  { value: 'medium', label: 'Media', severity: 'info', icon: 'pi pi-equals' },
  { value: 'high', label: 'Alta', severity: 'warn', icon: 'pi pi-arrow-up' },
  {
    value: 'urgent',
    label: 'Urgente',
    severity: 'danger',
    icon: 'pi pi-exclamation-triangle',
  },
] as const;

export const AUDIT_TASK_STATUSES = [
  {
    value: 'pending',
    label: 'Pendiente',
    severity: 'warn',
    icon: 'pi pi-clock',
  },
  {
    value: 'in_progress',
    label: 'En Progreso',
    severity: 'info',
    icon: 'pi pi-spin pi-spinner',
  },
  {
    value: 'completed',
    label: 'Completado',
    severity: 'success',
    icon: 'pi pi-check',
  },
  {
    value: 'not_applicable',
    label: 'No Aplica',
    severity: 'secondary',
    icon: 'pi pi-ban',
  },
  {
    value: 'overdue',
    label: 'Vencido',
    severity: 'danger',
    icon: 'pi pi-times-circle',
  },
] as const;

// ============================================
// PERFORMANCE 360 - AUDIT SYSTEM
// ============================================

export interface PerformanceRule {
  id: string;
  name: string; // 'Critico', 'Moderado', 'Aceptable'
  min_score: number;
  max_score: number;
  multiplier: number;
  severity: 'danger' | 'warn' | 'success';
}

export interface AuditForm {
  id: string;
  company_id: string;
  title: string;
  business_unit: 'Petshop' | 'Grooming' | 'Clinica' | string;
  version: number;
  is_active: boolean;
  description?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
  // Joins
  sections?: AuditSection[];
}

export interface AuditSection {
  id: string;
  audit_form_id: string;
  code: string; // 'OP', 'AC'
  title: string;
  weight_percentage: number; // 30.00
  order_index: number;
  // Joins
  questions?: AuditQuestion[];
}

export interface AuditQuestion {
  id: string;
  audit_section_id: string;
  code: string; // 'OP.1'
  question_text: string;
  weight_relative: number; // 0.40
  is_critical?: boolean;
  order_index: number;
}

export type AuditEvaluationStatus = 'draft' | 'completed' | 'archived';

export interface AuditEvaluation {
  id: string;
  company_id: string;
  branch_id: string;
  branch?: Branch; // Join
  audit_form_id: string;
  audit_form?: AuditForm; // Join
  form_version: number;

  audited_by: string;
  auditor?: Partial<Employee>; // Join
  evaluated_employee_id?: string;
  evaluated_employee?: Partial<Employee>; // Join

  status: AuditEvaluationStatus;

  total_score?: number;
  performance_level?: string;

  observations?: string;
  started_at?: Date | string;
  completed_at?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;

  // Joins
  answers?: AuditAnswer[];
}

export interface AuditAnswer {
  id: string;
  audit_evaluation_id: string;
  audit_question_id: string;
  question?: AuditQuestion; // Join

  answer_value: 'yes' | 'no' | 'na';
  notes?: string;

  // Snapshots
  question_text_snapshot?: string;
  weight_relative_snapshot?: number;
}
