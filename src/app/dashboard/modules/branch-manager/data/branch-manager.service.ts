import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  endOfDay,
  format,
  startOfDay,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ApiUrlService } from '../../../../services/api-url.service';
import { OrganizationService } from '../../../../services/organization.service';
import { EmployeesStore } from '../../../../stores/employees.store';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { CompensatoryRequest } from '../../../modules/disabilities/models/disability.model';
import { Notification, Reminder } from '../models/branch-manager.model';

@Injectable({
  providedIn: 'root',
})
export class BranchManagerService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);
  private employeesStore = inject(EmployeesStore);
  private store = inject(DashboardStore);

  private readonly TIMEZONE = 'America/Panama';

  // === Reactive inputs (set by the component) ===

  public currentBranch = signal<any>(null);
  public selectedDate = signal<Date>(new Date());

  // === httpResources ===

  public compensatoryTimeoffsApi = httpResource<CompensatoryRequest[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

    if (!companyId) return undefined;

    const params: any = {
      select: `id,employee_id,type_id,date_from,date_to,notes,is_approved,compensatory_type,compensatory_amount,review_status,reviewed_by,reviewed_at,rejection_comment,created_at,company_id,document_url,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,first_name,father_name,work_email,company_id,branch_id,position:positions(name),branch:branches(name))`,
      company_id: `eq.${companyId}`,
      type_id: `eq.${compensatoryTypeId}`,
      order: 'created_at.desc',
    };

    return {
      url: this.apiUrl.build('rest/v1/timeoffs'),
      params,
      method: 'GET',
    };
  });

  public disabilitiesApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/employee_disabilities'),
      params: {
        select: `*`,
        company_id: `eq.${companyId}`,
        order: 'created_at.desc',
      },
      method: 'GET',
    };
  });

  public vacationsApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/employee_vacations'),
      params: {
        select: `*`,
        company_id: `eq.${companyId}`,
        order: 'created_at.desc',
      },
      method: 'GET',
    };
  });

  public documentRequestsApi = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/document_requests'),
      params: {
        select: `*`,
        order: 'created_at.desc',
      },
      method: 'GET',
    };
  });

  public notificationsResource = httpResource<Notification[]>(() => {
    const branchId = this.currentBranch()?.id;
    const currentEmployeeId = this.store.auth.currentEmployeeId();
    if (!currentEmployeeId) return undefined;

    const params: any = {
      select: `*`,
      recipient_id: `eq.${currentEmployeeId}`,
      order: 'created_at.desc',
    };

    if (branchId) {
      params.branch_id = `eq.${branchId}`;
    }

    return {
      url: this.apiUrl.build('rest/v1/notifications'),
      params,
    };
  });

  public timelogsResource = httpResource<any[]>(() => {
    const branchId = this.currentBranch()?.id;
    const date = this.selectedDate();
    if (!date) return undefined;
    const companyId = this.organizationService.getCurrentCompanyId();

    const dateStr = formatInTimeZone(date, this.TIMEZONE, 'yyyy-MM-dd');
    const startOfDayISO =
      new Date(`${dateStr}T00:00:00-05:00`).toISOString().split('.')[0] + 'Z';
    const endOfDayISO =
      new Date(`${dateStr}T23:59:59-05:00`).toISOString().split('.')[0] + 'Z';

    const select = `*,employee:employees!timelogs_employee_id_fkey!inner(id,first_name,father_name,is_active),branch:branches(id, name, short_name)`;

    const url =
      this.apiUrl.build('rest/v1/timelogs', {
        select,
        'employee.is_active': 'eq.true',
        branch_id: branchId ? `eq.${branchId}` : undefined,
        company_id: companyId ? `eq.${companyId}` : undefined,
        order: 'created_at.asc',
      }) +
      `&and=(created_at.gte.${startOfDayISO},created_at.lte.${endOfDayISO})`;

    return {
      url,
      method: 'GET',
    };
  });

  public schedulesResource = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const start = this.weekStartForSchedules();
    const end = this.weekEndForSchedules();
    if (!start || !end) return undefined;

    const startDate = format(start, 'yyyy-MM-dd');
    const endDate = format(end, 'yyyy-MM-dd');
    const select = `*,schedule:schedules(*),branch:branches(id, name, short_name),employee:employees!inner(id,company_id,is_active)`;

    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      select,
      start_date: `lte.${endDate}`,
      end_date: `gte.${startDate}`,
      'employee.is_active': 'eq.true',
      'employee.company_id': companyId ? `eq.${companyId}` : undefined,
    });

    return {
      url,
      method: 'GET',
    };
  });

  // Writable signals for schedule week range (set by the component)
  public weekStartForSchedules = signal<Date | null>(null);
  public weekEndForSchedules = signal<Date | null>(null);

  public timelogSchedulesResource = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const selectedDate = this.selectedDate();

    if (!selectedDate) return undefined;

    const startDate = format(startOfDay(selectedDate), 'yyyy-MM-dd');
    const endDate = format(endOfDay(selectedDate), 'yyyy-MM-dd');

    const url = this.apiUrl.build('rest/v1/employee_schedules', {
      select:
        '*,schedule:schedules(*),branch:branches(id, name, short_name),employee:employees(id,company_id)',
      start_date: `lte.${endDate}`,
      end_date: `gte.${startDate}`,
      ...(companyId ? { 'employee.company_id': `eq.${companyId}` } : {}),
    });

    return {
      url,
      method: 'GET',
    };
  });

  public remindersResource = httpResource<Reminder[]>(() => {
    const branchId = this.currentBranch()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    const params: any = {
      select: `*,employee:employees!inner(id,first_name,father_name,is_active)`,
      order: 'due_date.asc',
      'employee.is_active': 'eq.true',
    };
    if (branchId) {
      params.branch_id = `eq.${branchId}`;
    }
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: this.apiUrl.build('rest/v1/reminders'),
      params,
    };
  });

  // TODO: Disabled - audit_tasks tables removed
  public auditTaskInstancesResource = httpResource<any[]>(() => {
    return undefined;
  });

  // === Convenience computeds ===

  public enrichedNotifications = computed(() => {
    const notifications = this.notificationsResource.value() || [];
    const employees = this.employeesStore.entities();

    return notifications.map((notification) => {
      const recipient = employees.find(
        (emp) => emp.id === notification.recipient_id
      );
      return {
        ...notification,
        recipient: recipient
          ? {
              id: recipient.id,
              first_name: recipient.first_name,
              father_name: recipient.father_name,
            }
          : undefined,
      };
    });
  });

  public allReminders = computed(() => {
    const manualReminders = this.remindersResource.value() || [];
    const auditInstances = this.auditTaskInstancesResource.value() || [];

    const auditReminders: Reminder[] = auditInstances.map((instance: any) => ({
      id: instance.id,
      employee_id: instance.assigned_to,
      message: instance.audit_task?.title || 'Tarea de auditoría',
      due_date: new Date(instance.due_date),
      is_completed:
        instance.status === 'completed' || instance.status === 'not_applicable',
      created_at: new Date(instance.created_at),
      audit_task_instance_id: instance.id,
      priority: instance.audit_task?.priority || 'medium',
      category: instance.audit_task?.category,
      status: instance.status,
    }));

    return [...manualReminders, ...auditReminders].sort(
      (a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
    );
  });

  // === HTTP methods ===

  markNotificationAsRead(id: string): Observable<any> {
    return this.http.patch(
      this.apiUrl.build('rest/v1/notifications', { id: `eq.${id}` }),
      { is_read: true, read_at: new Date().toISOString() }
    );
  }

  markAllNotificationsAsRead(ids: string[]): Observable<any> {
    return this.http.patch(
      this.apiUrl.build('rest/v1/notifications', {
        id: `in.(${ids.join(',')})`,
      }),
      { is_read: true, read_at: new Date().toISOString() }
    );
  }

  deleteSchedule(id: string, companyId: string | null): Observable<any> {
    const params: any = { id: `eq.${id}` };
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }
    return this.http.delete(
      this.apiUrl.build('rest/v1/employee_schedules'),
      { params }
    );
  }

  approveSchedule(id: string, companyId: string | null): Observable<any> {
    const params: any = { id: `eq.${id}` };
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }
    return this.http.patch(
      this.apiUrl.build('rest/v1/employee_schedules'),
      { approved: true, approved_at: new Date().toISOString() },
      { params }
    );
  }

  createReminder(data: {
    employee_id: string | null;
    branch_id: string;
    company_id: string | null;
    message: string;
    due_date: string;
  }): Observable<any> {
    return this.http.post(
      this.apiUrl.build('rest/v1/reminders'),
      { ...data, is_completed: false }
    );
  }

  completeReminder(reminder: Reminder): Observable<any> {
    if (reminder.audit_task_instance_id) {
      return this.http.patch(
        this.apiUrl.build('rest/v1/audit_task_instances', {
          id: `eq.${reminder.audit_task_instance_id}`,
        }),
        {
          status: 'completed',
          completed_at: new Date().toISOString(),
          completed_by: this.store.auth.currentEmployeeId(),
        }
      );
    }
    return this.http.patch(
      this.apiUrl.build('rest/v1/reminders', { id: `eq.${reminder.id}` }),
      { is_completed: true }
    );
  }

  markReminderNotApplicable(reminder: Reminder): Observable<any> {
    return this.http.patch(
      this.apiUrl.build('rest/v1/audit_task_instances', {
        id: `eq.${reminder.audit_task_instance_id}`,
      }),
      {
        status: 'not_applicable',
        completed_at: new Date().toISOString(),
        completed_by: this.store.auth.currentEmployeeId(),
      }
    );
  }

  deleteReminder(id: string): Observable<any> {
    return this.http.delete(
      this.apiUrl.build('rest/v1/reminders', { id: `eq.${id}` })
    );
  }

  // === Reload methods ===

  reload(): void {
    this.refreshNotifications();
    this.refreshTimelogs();
    this.refreshSchedules();
    this.refreshReminders();
    this.refreshEmployeeRequests();
  }

  refreshNotifications(): void {
    this.notificationsResource.reload();
  }

  refreshTimelogs(): void {
    this.timelogsResource.reload();
  }

  refreshSchedules(): void {
    this.schedulesResource.reload();
  }

  refreshReminders(): void {
    this.remindersResource.reload();
    this.auditTaskInstancesResource.reload();
  }

  refreshEmployeeRequests(): void {
    this.compensatoryTimeoffsApi.reload();
    this.disabilitiesApi.reload();
    this.vacationsApi.reload();
    this.documentRequestsApi.reload();
  }
}
