import { DatePipe, NgClass } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Branch, Employee } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';

type Reminder = {
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
};

@Component({
  selector: 'pt-branch-reminders-tab',
  standalone: true,
  imports: [
    TableModule,
    Button,
    Tag,
    Select,
    DatePicker,
    Textarea,
    FormsModule,
    DatePipe,
    NgClass,
    TooltipModule,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3 md:space-y-4">
      <div class="flex gap-2 items-center flex-wrap">
        <p-select
          [options]="branchEmployees()"
          optionLabel="short_name"
          optionValue="id"
          [(ngModel)]="selectedEmployeeForReminder"
          placeholder="Seleccionar empleado (opcional)"
          showClear
          filter
          appendTo="body"
          styleClass="w-full sm:w-64"
        />
        <p-button
          icon="pi pi-plus"
          [label]="isMobile() ? undefined : 'Nuevo Recordatorio'"
          severity="success"
          (onClick)="showReminderDialog.set(true)"
        />
        <p-button
          icon="pi pi-refresh"
          [label]="isMobile() ? undefined : 'Actualizar'"
          severity="secondary"
          (onClick)="reload()"
          [loading]="remindersResource.isLoading()"
        />
      </div>

      <p-table
        [value]="filteredReminders()"
        [loading]="
          remindersResource.isLoading() ||
          auditTaskInstancesResource.isLoading()
        "
        [paginator]="true"
        [rows]="isMobile() ? 10 : 25"
        [rowsPerPageOptions]="[10, 25, 50]"
        styleClass="p-datatable-sm"
        responsiveLayout="scroll"
      >
        <ng-template #header>
          <tr>
            <th style="width: 40px">Tipo</th>
            <th>Mensaje</th>
            <th>Prioridad</th>
            <th>Fecha Límite</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </ng-template>
        <ng-template #body let-reminder>
          <tr
            [ngClass]="{
              'opacity-60': reminder.is_completed,
              'bg-red-900/10':
                isOverdue(reminder) && !reminder.is_completed,
              'border-l-4 border-purple-500':
                reminder.audit_task_instance_id
            }"
          >
            <td>
              @if (reminder.audit_task_instance_id) {
              <i
                class="pi pi-check-square text-purple-400"
                pTooltip="Tarea de Auditoría"
              ></i>
              } @else {
              <i
                class="pi pi-bookmark text-blue-400"
                pTooltip="Recordatorio Manual"
              ></i>
              }
            </td>
            <td>
              <div>
                <p class="font-medium">{{ reminder.message }}</p>
                @if (reminder.category) {
                <span class="text-xs text-gray-400">{{
                  getCategoryLabel(reminder.category)
                }}</span>
                }
              </div>
            </td>
            <td>
              @if (reminder.priority) {
              <p-tag
                [value]="getPriorityLabel(reminder.priority)"
                [severity]="getPrioritySeverity(reminder.priority)"
                styleClass="text-xs"
              />
              } @else {
              <span class="text-gray-500">-</span>
              }
            </td>
            <td>
              <span
                [ngClass]="{
                  'text-red-500 font-semibold': isOverdue(reminder)
                }"
              >
                {{ reminder.due_date | date : 'dd/MM/yyyy' : 'UTC' }}
              </span>
            </td>
            <td>
              @if (reminder.is_completed || reminder.status ===
              'completed') {
              <p-tag
                value="Completado"
                severity="success"
                icon="pi pi-check"
                styleClass="text-xs"
              />
              } @else if (reminder.status === 'not_applicable') {
              <p-tag
                value="No Aplica"
                severity="secondary"
                icon="pi pi-ban"
                styleClass="text-xs"
              />
              } @else if (isOverdue(reminder)) {
              <p-tag
                value="Vencido"
                severity="danger"
                icon="pi pi-exclamation-triangle"
                styleClass="text-xs"
              />
              } @else if (reminder.status === 'in_progress') {
              <p-tag
                value="En Progreso"
                severity="info"
                icon="pi pi-spinner"
                styleClass="text-xs"
              />
              } @else {
              <p-tag
                value="Pendiente"
                severity="warn"
                icon="pi pi-clock"
                styleClass="text-xs"
              />
              }
            </td>
            <td>
              <div class="flex gap-1">
                @if (!reminder.is_completed && reminder.status !==
                'completed' && reminder.status !== 'not_applicable') {
                <p-button
                  icon="pi pi-check"
                  severity="success"
                  text
                  rounded
                  size="small"
                  (onClick)="completeReminder(reminder)"
                  pTooltip="Marcar como completado"
                />
                @if (reminder.audit_task_instance_id) {
                <p-button
                  icon="pi pi-ban"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  (onClick)="markReminderNotApplicable(reminder)"
                  pTooltip="Marcar como No Aplica"
                />
                } } @if (!reminder.audit_task_instance_id) {
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  (onClick)="deleteReminder(reminder.id)"
                  pTooltip="Eliminar"
                />
                }
              </div>
            </td>
          </tr>
        </ng-template>
        <ng-template #emptymessage>
          <tr>
            <td [attr.colspan]="6" class="text-center py-8">
              <div class="flex flex-col items-center gap-2">
                <i class="pi pi-inbox text-4xl text-gray-500"></i>
                <p class="text-gray-400">No hay recordatorios</p>
              </div>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>

    <!-- Dialog para crear recordatorio -->
    @if (showReminderDialog()) {
    <div
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4"
      (click)="showReminderDialog.set(false)"
    >
      <div
        class="bg-neutral-800 rounded-lg p-4 md:p-6 max-w-md w-full shadow-2xl max-h-[90vh] overflow-y-auto"
        (click)="$event.stopPropagation()"
      >
        <h3 class="text-lg md:text-xl font-bold mb-3 md:mb-4">Nuevo Recordatorio</h3>
        <div class="space-y-3 md:space-y-4">
          <div>
            <label class="block text-sm font-medium mb-2">Empleado</label>
            <p-select
              [options]="branchEmployees()"
              optionLabel="short_name"
              optionValue="id"
              [(ngModel)]="newReminderEmployeeId"
              placeholder="Todos (opcional)"
              showClear
              filter
              appendTo="body"
              styleClass="w-full"
            />
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Mensaje</label>
            <textarea
              pTextarea
              [(ngModel)]="newReminderMessage"
              placeholder="Escribe el recordatorio..."
              rows="3"
              class="w-full"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Fecha Límite</label>
            <p-datepicker
              [(ngModel)]="newReminderDueDate"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              [showTime]="true"
              hourFormat="12"
              appendTo="body"
              styleClass="w-full"
            />
          </div>
          <div class="flex gap-2 justify-end pt-2">
            <p-button
              label="Cancelar"
              severity="secondary"
              (onClick)="showReminderDialog.set(false)"
            />
            <p-button
              label="Crear"
              severity="success"
              (onClick)="createReminder()"
              [disabled]="!newReminderMessage || !newReminderDueDate"
            />
          </div>
        </div>
      </div>
    </div>
    }
  `,
})
export class BranchRemindersTabComponent {
  private http = inject(HttpClient);
  private message = inject(MessageService);
  private apiUrl = inject(ApiUrlService);
  private store = inject(DashboardStore);
  private employeesStore = inject(EmployeesStore);
  private organizationService = inject(OrganizationService);

  // Inputs from parent
  public branchEmployees = input.required<(Employee & { short_name: string })[]>();
  public currentBranch = input<Branch | null>();
  public isMobile = input<boolean>(false);

  // Output: pending count for parent badge
  public pendingCountChange = output<number>();

  // Local signals
  public selectedEmployeeForReminder = signal<string | null>(null);
  public showReminderDialog = signal(false);
  public newReminderEmployeeId = signal<string | null>(null);
  public newReminderMessage = signal('');
  public newReminderDueDate = signal<Date | null>(null);

  // Reminders resource
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
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/reminders`,
      params,
    };
  });

  // Audit task instances - disabled
  public auditTaskInstancesResource = httpResource<any[]>(() => {
    return undefined;
  });

  // Combined reminders
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

  public filteredReminders = computed(() => {
    const reminders = this.allReminders();
    const employeeId = this.selectedEmployeeForReminder();
    if (!employeeId) return reminders;
    return reminders.filter((r) => r.employee_id === employeeId);
  });

  public pendingRemindersCount = computed(() => {
    return this.allReminders().filter(
      (r) => !r.is_completed && r.status !== 'not_applicable'
    ).length;
  });

  constructor() {
    effect(() => {
      this.pendingCountChange.emit(this.pendingRemindersCount());
    });
  }

  public overdueRemindersCount = computed(() => {
    return this.filteredReminders().filter(
      (r) => !r.is_completed && this.isOverdue(r)
    ).length;
  });

  // Public methods
  public reload(): void {
    this.remindersResource.reload();
    this.auditTaskInstancesResource.reload();
  }

  public isOverdue(reminder: Reminder): boolean {
    return new Date(reminder.due_date) < new Date() && !reminder.is_completed;
  }

  public getPriorityLabel(priority: string): string {
    const labels: Record<string, string> = {
      low: 'Baja',
      medium: 'Media',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return labels[priority] || priority;
  }

  public getPrioritySeverity(
    priority: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const severities: Record<
      string,
      'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'
    > = {
      low: 'secondary',
      medium: 'info',
      high: 'warn',
      urgent: 'danger',
    };
    return severities[priority] || 'info';
  }

  public getCategoryLabel(category: string): string {
    const labels: Record<string, string> = {
      inventario: 'Inventario',
      limpieza: 'Limpieza',
      seguridad: 'Seguridad',
      administrativo: 'Administrativo',
      capacitacion: 'Capacitación',
      mantenimiento: 'Mantenimiento',
      calidad: 'Calidad',
      otro: 'Otro',
    };
    return labels[category] || category;
  }

  public createReminder(): void {
    const message = this.newReminderMessage();
    const dueDate = this.newReminderDueDate();
    const employeeId = this.newReminderEmployeeId();
    const branchId = this.currentBranch()?.id;
    const companyId = this.organizationService.getCurrentCompanyId();

    if (!message || !dueDate) {
      this.message.add({
        severity: 'warn',
        summary: 'Completa todos los campos requeridos',
      });
      return;
    }

    let finalBranchId: string | undefined = branchId;
    if (!finalBranchId && employeeId) {
      const employee = this.employeesStore
        .entities()
        .find((e) => e.id === employeeId);
      finalBranchId = employee?.branch_id || undefined;
    }
    if (!finalBranchId) {
      this.message.add({
        severity: 'warn',
        summary: 'Selecciona una sucursal o un empleado',
      });
      return;
    }

    this.http
      .post(`${process.env['ENV_SUPABASE_URL']}/rest/v1/reminders`, {
        employee_id: employeeId,
        branch_id: finalBranchId,
        company_id: companyId,
        message,
        due_date: dueDate.toISOString(),
        is_completed: false,
      })
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Recordatorio creado',
          });
          this.showReminderDialog.set(false);
          this.newReminderMessage.set('');
          this.newReminderDueDate.set(null);
          this.newReminderEmployeeId.set(null);
          this.reload();
        },
        error: () => {
          this.message.add({
            severity: 'error',
            summary: 'Error al crear recordatorio',
          });
        },
      });
  }

  public completeReminder(reminder: Reminder): void {
    if (reminder.audit_task_instance_id) {
      this.http
        .patch(
          this.apiUrl.build('rest/v1/audit_task_instances', {
            id: `eq.${reminder.audit_task_instance_id}`,
          }),
          {
            status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: this.store.auth.currentEmployeeId(),
          }
        )
        .subscribe({
          next: () => {
            this.reload();
            this.message.add({
              severity: 'success',
              summary: 'Tarea completada',
              detail: 'La tarea de auditoría ha sido marcada como completada',
            });
          },
          error: () => {
            this.message.add({
              severity: 'error',
              summary: 'Error al completar tarea',
            });
          },
        });
    } else {
      this.http
        .patch(
          `${process.env['ENV_SUPABASE_URL']}/rest/v1/reminders`,
          { is_completed: true },
          {
            params: { id: `eq.${reminder.id}` },
          }
        )
        .subscribe({
          next: () => {
            this.reload();
            this.message.add({
              severity: 'success',
              summary: 'Recordatorio completado',
            });
          },
          error: () => {
            this.message.add({
              severity: 'error',
              summary: 'Error al completar recordatorio',
            });
          },
        });
    }
  }

  public markReminderNotApplicable(reminder: Reminder): void {
    if (!reminder.audit_task_instance_id) return;

    this.http
      .patch(
        this.apiUrl.build('rest/v1/audit_task_instances', {
          id: `eq.${reminder.audit_task_instance_id}`,
        }),
        {
          status: 'not_applicable',
          completed_at: new Date().toISOString(),
          completed_by: this.store.auth.currentEmployeeId(),
        }
      )
      .subscribe({
        next: () => {
          this.reload();
          this.message.add({
            severity: 'info',
            summary: 'Tarea marcada como No Aplica',
          });
        },
        error: () => {
          this.message.add({
            severity: 'error',
            summary: 'Error al actualizar tarea',
          });
        },
      });
  }

  public deleteReminder(id: string): void {
    this.http
      .delete(`${process.env['ENV_SUPABASE_URL']}/rest/v1/reminders`, {
        params: { id: `eq.${id}` },
      })
      .subscribe({
        next: () => {
          this.reload();
          this.message.add({
            severity: 'success',
            summary: 'Recordatorio eliminado',
          });
        },
        error: () => {
          this.message.add({
            severity: 'error',
            summary: 'Error al eliminar recordatorio',
          });
        },
      });
  }
}
