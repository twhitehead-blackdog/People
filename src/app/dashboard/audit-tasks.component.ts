import { DatePipe, NgClass } from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { MultiSelect } from 'primeng/multiselect';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { ToastModule } from 'primeng/toast';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import {
  AssignmentType,
  AUDIT_TASK_CATEGORIES,
  AUDIT_TASK_PRIORITIES,
  AUDIT_TASK_STATUSES,
  AuditTask,
  AuditTaskInstance,
  AuditTaskPriority,
  RecurrenceConfig,
  RecurrenceType,
} from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { BranchesStore } from '../stores/branches.store';
import { EmployeesStore } from '../stores/employees.store';

@Component({
  selector: 'pt-audit-tasks',
  standalone: true,
  imports: [
    Card,
    TableModule,
    Button,
    Tag,
    TooltipModule,
    ToastModule,
    FormsModule,
    Dialog,
    InputText,
    Textarea,
    Select,
    MultiSelect,
    DatePicker,
    InputNumber,
    Checkbox,
    ToggleSwitch,
    ConfirmDialog,
    DatePipe,
    NgClass,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold">Auditoría de Tareas</h1>
          <p class="text-gray-400 text-sm mt-1">
            Configura tareas programadas que se asignarán automáticamente a los
            gerentes
          </p>
        </div>
        <div class="flex gap-2">
          <p-button
            icon="pi pi-refresh"
            severity="secondary"
            (onClick)="refreshData()"
            [loading]="tasksResource.isLoading()"
            pTooltip="Actualizar"
          />
          <p-button
            icon="pi pi-plus"
            label="Nueva Tarea"
            (onClick)="openCreateDialog()"
          />
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div
          class="bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg p-4 text-white"
        >
          <div class="flex items-center justify-between">
            <i class="pi pi-list-check text-2xl opacity-80"></i>
            <span class="text-3xl font-bold">{{ stats().total }}</span>
          </div>
          <p class="text-blue-100 text-sm mt-2">Total de Tareas</p>
        </div>
        <div
          class="bg-gradient-to-br from-green-600 to-green-700 rounded-lg p-4 text-white"
        >
          <div class="flex items-center justify-between">
            <i class="pi pi-check-circle text-2xl opacity-80"></i>
            <span class="text-3xl font-bold">{{ stats().active }}</span>
          </div>
          <p class="text-green-100 text-sm mt-2">Activas</p>
        </div>
        <div
          class="bg-gradient-to-br from-amber-600 to-amber-700 rounded-lg p-4 text-white"
        >
          <div class="flex items-center justify-between">
            <i class="pi pi-clock text-2xl opacity-80"></i>
            <span class="text-3xl font-bold">{{
              stats().pendingInstances
            }}</span>
          </div>
          <p class="text-amber-100 text-sm mt-2">Instancias Pendientes</p>
        </div>
        <div
          class="bg-gradient-to-br from-red-600 to-red-700 rounded-lg p-4 text-white"
        >
          <div class="flex items-center justify-between">
            <i class="pi pi-exclamation-triangle text-2xl opacity-80"></i>
            <span class="text-3xl font-bold">{{
              stats().overdueInstances
            }}</span>
          </div>
          <p class="text-red-100 text-sm mt-2">Vencidas</p>
        </div>
      </div>

      <!-- Tabla de Tareas -->
      <p-card>
        <ng-template pTemplate="header">
          <div
            class="flex items-center justify-between p-4 border-b border-neutral-700"
          >
            <h2 class="text-lg font-semibold">Tareas de Auditoría</h2>
            <div class="flex gap-2">
              <p-select
                [options]="CATEGORIES"
                optionLabel="label"
                optionValue="value"
                [(ngModel)]="filterCategory"
                placeholder="Categoría"
                showClear
                styleClass="w-40"
              />
              <p-select
                [options]="[
                  { label: 'Todas', value: null },
                  { label: 'Activas', value: true },
                  { label: 'Inactivas', value: false }
                ]"
                optionLabel="label"
                optionValue="value"
                [(ngModel)]="filterActive"
                placeholder="Estado"
                styleClass="w-32"
              />
            </div>
          </div>
        </ng-template>

        <p-table
          [value]="filteredTasks()"
          [loading]="tasksResource.isLoading()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[10, 25, 50]"
          styleClass="p-datatable-sm"
        >
          <ng-template #header>
            <tr>
              <th style="width: 50px">Estado</th>
              <th>Título</th>
              <th>Categoría</th>
              <th>Prioridad</th>
              <th>Recurrencia</th>
              <th>Asignación</th>
              <th style="width: 120px">Acciones</th>
            </tr>
          </ng-template>
          <ng-template #body let-task>
            <tr>
              <td>
                <p-toggleSwitch
                  [(ngModel)]="task.is_active"
                  (onChange)="toggleTaskActive(task)"
                />
              </td>
              <td>
                <div>
                  <p class="font-semibold">{{ task.title }}</p>
                  @if (task.description) {
                  <p class="text-xs text-gray-400 truncate max-w-xs">
                    {{ task.description }}
                  </p>
                  }
                </div>
              </td>
              <td>
                @if (task.category) {
                <p-tag
                  [value]="getCategoryLabel(task.category)"
                  severity="secondary"
                  styleClass="text-xs"
                />
                }
              </td>
              <td>
                <p-tag
                  [value]="getPriorityLabel(task.priority)"
                  [severity]="getPrioritySeverity(task.priority)"
                  styleClass="text-xs"
                />
              </td>
              <td>
                <span class="text-sm">{{
                  getRecurrenceLabel(
                    task.recurrence_type,
                    task.recurrence_config
                  )
                }}</span>
              </td>
              <td>
                <span class="text-sm">{{
                  getAssignmentLabel(task.assignment_type)
                }}</span>
              </td>
              <td>
                <div class="flex gap-1">
                  <p-button
                    icon="pi pi-eye"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    (onClick)="viewInstances(task)"
                    pTooltip="Ver instancias"
                  />
                  <p-button
                    icon="pi pi-pencil"
                    severity="secondary"
                    text
                    rounded
                    size="small"
                    (onClick)="editTask(task)"
                    pTooltip="Editar"
                  />
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    rounded
                    size="small"
                    (onClick)="confirmDeleteTask(task)"
                    pTooltip="Eliminar"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td [attr.colspan]="7" class="text-center py-12">
                <div class="flex flex-col items-center gap-3">
                  <i class="pi pi-inbox text-5xl text-gray-500"></i>
                  <p class="text-gray-400">No hay tareas de auditoría</p>
                  <p-button
                    label="Crear primera tarea"
                    icon="pi pi-plus"
                    (onClick)="openCreateDialog()"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>

      <!-- Dialog de Crear/Editar Tarea -->
      <p-dialog
        [(visible)]="showTaskDialog"
        [modal]="true"
        [style]="{ width: '90vw', maxWidth: '700px' }"
        [draggable]="false"
        [dismissableMask]="true"
      >
        <ng-template pTemplate="header">
          <span class="text-lg font-semibold">
            {{ editingTask() ? 'Editar Tarea' : 'Nueva Tarea de Auditoría' }}
          </span>
        </ng-template>

        <div class="space-y-4 pt-4">
          <!-- Título -->
          <div>
            <label class="block text-sm font-medium mb-2">Título *</label>
            <input
              pInputText
              [(ngModel)]="taskForm.title"
              placeholder="Ej: Conteo de inventario mensual"
              class="w-full"
            />
          </div>

          <!-- Descripción -->
          <div>
            <label class="block text-sm font-medium mb-2">Descripción</label>
            <textarea
              pTextarea
              [(ngModel)]="taskForm.description"
              placeholder="Instrucciones detalladas para la tarea..."
              rows="3"
              class="w-full"
            ></textarea>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <!-- Categoría -->
            <div>
              <label class="block text-sm font-medium mb-2">Categoría</label>
              <p-select
                [options]="CATEGORIES"
                optionLabel="label"
                optionValue="value"
                [(ngModel)]="taskForm.category"
                placeholder="Seleccionar categoría"
                styleClass="w-full"
              />
            </div>

            <!-- Prioridad -->
            <div>
              <label class="block text-sm font-medium mb-2">Prioridad</label>
              <p-select
                [options]="PRIORITIES"
                optionLabel="label"
                optionValue="value"
                [(ngModel)]="taskForm.priority"
                placeholder="Seleccionar prioridad"
                styleClass="w-full"
              />
            </div>
          </div>

          <!-- Recurrencia -->
          <div
            class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
          >
            <label class="block text-sm font-medium mb-3">
              <i class="pi pi-calendar mr-2"></i>Recurrencia
            </label>

            <p-select
              [options]="RECURRENCE_TYPES"
              optionLabel="label"
              optionValue="value"
              [(ngModel)]="taskForm.recurrence_type"
              (onChange)="onRecurrenceTypeChange()"
              placeholder="Tipo de recurrencia"
              styleClass="w-full mb-3"
            />

            <!-- Configuración según tipo -->
            @if (taskForm.recurrence_type === 'weekly') {
            <div>
              <label class="block text-xs text-gray-400 mb-2"
                >Días de la semana</label
              >
              <div class="flex flex-wrap gap-2">
                @for (day of DAYS_OF_WEEK; track day.value) {
                <p-button
                  [label]="day.label"
                  [severity]="
                    isWeekdaySelected(day.value) ? 'primary' : 'secondary'
                  "
                  [outlined]="!isWeekdaySelected(day.value)"
                  size="small"
                  (onClick)="toggleWeekday(day.value)"
                />
                }
              </div>
            </div>
            } @else if (taskForm.recurrence_type === 'monthly') {
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="block text-xs text-gray-400 mb-2"
                  >Día del mes</label
                >
                <p-inputNumber
                  [(ngModel)]="taskForm.recurrence_config.day_of_month"
                  [min]="1"
                  [max]="31"
                  placeholder="Ej: 15"
                  styleClass="w-full"
                />
              </div>
              <div class="text-xs text-gray-400 flex items-end pb-2">
                <span
                  >La tarea se generará el día
                  {{ taskForm.recurrence_config.day_of_month || '?' }} de cada
                  mes</span
                >
              </div>
            </div>
            } @else if (taskForm.recurrence_type === 'custom') {
            <div>
              <label class="block text-xs text-gray-400 mb-2"
                >Fechas específicas</label
              >
              <p-datepicker
                [(ngModel)]="customDates"
                [selectionMode]="'multiple'"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Seleccionar fechas"
                styleClass="w-full"
                (onSelect)="onCustomDatesChange()"
              />
            </div>
            }
          </div>

          <!-- Asignación -->
          <div
            class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700"
          >
            <label class="block text-sm font-medium mb-3">
              <i class="pi pi-users mr-2"></i>Asignación
            </label>

            <p-select
              [options]="ASSIGNMENT_TYPES"
              optionLabel="label"
              optionValue="value"
              [(ngModel)]="taskForm.assignment_type"
              placeholder="Tipo de asignación"
              styleClass="w-full mb-3"
            />

            @if (taskForm.assignment_type === 'by_branch') {
            <div>
              <label class="block text-xs text-gray-400 mb-2">Sucursales</label>
              <p-multiSelect
                [options]="branches()"
                optionLabel="name"
                optionValue="id"
                [(ngModel)]="taskForm.assigned_branch_ids"
                placeholder="Seleccionar sucursales"
                styleClass="w-full"
              />
            </div>
            } @else if (taskForm.assignment_type === 'specific') {
            <div>
              <label class="block text-xs text-gray-400 mb-2">Gerentes</label>
              <p-multiSelect
                [options]="managers()"
                optionLabel="short_name"
                optionValue="id"
                [(ngModel)]="taskForm.assigned_manager_ids"
                placeholder="Seleccionar gerentes"
                styleClass="w-full"
                filter
              />
            </div>
            }
          </div>

          <!-- Configuración de tiempo -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium mb-2"
                >Días para completar</label
              >
              <p-inputNumber
                [(ngModel)]="taskForm.due_days"
                [min]="1"
                [max]="30"
                suffix=" días"
                styleClass="w-full"
              />
            </div>
            <div>
              <label class="block text-sm font-medium mb-2"
                >Recordatorio previo</label
              >
              <p-inputNumber
                [(ngModel)]="taskForm.reminder_days_before"
                [min]="0"
                [max]="7"
                suffix=" días antes"
                styleClass="w-full"
              />
            </div>
          </div>
        </div>

        <ng-template pTemplate="footer">
          <div class="flex gap-2 justify-end">
            <p-button
              label="Cancelar"
              severity="secondary"
              (onClick)="closeTaskDialog()"
            />
            <p-button
              [label]="editingTask() ? 'Guardar Cambios' : 'Crear Tarea'"
              [icon]="editingTask() ? 'pi pi-save' : 'pi pi-plus'"
              (onClick)="saveTask()"
              [disabled]="!isFormValid()"
              [loading]="isSaving()"
            />
          </div>
        </ng-template>
      </p-dialog>

      <!-- Dialog de Instancias -->
      <p-dialog
        [(visible)]="showInstancesDialog"
        [modal]="true"
        [style]="{ width: '90vw', maxWidth: '900px' }"
        [draggable]="false"
        [dismissableMask]="true"
      >
        <ng-template pTemplate="header">
          <span class="text-lg font-semibold">
            Instancias de: {{ selectedTaskForInstances()?.title }}
          </span>
        </ng-template>

        <div class="space-y-4">
          <div class="flex gap-2 items-center">
            <p-select
              [options]="STATUSES"
              optionLabel="label"
              optionValue="value"
              [(ngModel)]="instanceStatusFilter"
              placeholder="Filtrar por estado"
              showClear
              styleClass="w-48"
            />
            <p-button
              icon="pi pi-refresh"
              severity="secondary"
              (onClick)="instancesResource.reload()"
              [loading]="instancesResource.isLoading()"
            />
          </div>

          <p-table
            [value]="filteredInstances()"
            [loading]="instancesResource.isLoading()"
            [paginator]="true"
            [rows]="10"
            styleClass="p-datatable-sm"
          >
            <ng-template #header>
              <tr>
                <th>Asignado a</th>
                <th>Sucursal</th>
                <th>Fecha Programada</th>
                <th>Fecha Límite</th>
                <th>Estado</th>
                <th>Completado</th>
              </tr>
            </ng-template>
            <ng-template #body let-instance>
              <tr
                [ngClass]="{
                  'bg-red-900/20': instance.status === 'overdue',
                  'bg-green-900/20': instance.status === 'completed'
                }"
              >
                <td>
                  {{ instance.assigned_employee?.first_name }}
                  {{ instance.assigned_employee?.father_name }}
                </td>
                <td>{{ instance.branch?.name || '-' }}</td>
                <td>{{ instance.scheduled_date | date : 'dd/MM/yyyy' }}</td>
                <td>{{ instance.due_date | date : 'dd/MM/yyyy' }}</td>
                <td>
                  <p-tag
                    [value]="getStatusLabel(instance.status)"
                    [severity]="getStatusSeverity(instance.status)"
                    styleClass="text-xs"
                  />
                </td>
                <td>
                  @if (instance.completed_at) {
                  <span class="text-xs text-gray-400">
                    {{ instance.completed_at | date : 'dd/MM/yyyy HH:mm' }}
                  </span>
                  } @else {
                  <span class="text-gray-500">-</span>
                  }
                </td>
              </tr>
            </ng-template>
            <ng-template #emptymessage>
              <tr>
                <td [attr.colspan]="6" class="text-center py-8">
                  <p class="text-gray-400">No hay instancias generadas</p>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      </p-dialog>

      <p-confirmDialog />
      <p-toast />
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditTasksComponent {
  private http = inject(HttpClient);
  private message = inject(MessageService);
  private confirmation = inject(ConfirmationService);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);
  private branchesStore = inject(BranchesStore);
  private employeesStore = inject(EmployeesStore);

  // Constants (spread to create mutable arrays for PrimeNG)
  CATEGORIES = [...AUDIT_TASK_CATEGORIES];
  PRIORITIES = [...AUDIT_TASK_PRIORITIES];
  STATUSES = [...AUDIT_TASK_STATUSES];

  readonly RECURRENCE_TYPES = [
    { value: 'daily', label: 'Diaria' },
    { value: 'weekly', label: 'Semanal' },
    { value: 'monthly', label: 'Mensual' },
    { value: 'custom', label: 'Fechas específicas' },
  ];

  readonly ASSIGNMENT_TYPES = [
    { value: 'all', label: 'Todos los gerentes' },
    { value: 'by_branch', label: 'Por sucursal' },
    { value: 'specific', label: 'Gerentes específicos' },
  ];

  readonly DAYS_OF_WEEK = [
    { value: 0, label: 'Dom' },
    { value: 1, label: 'Lun' },
    { value: 2, label: 'Mar' },
    { value: 3, label: 'Mié' },
    { value: 4, label: 'Jue' },
    { value: 5, label: 'Vie' },
    { value: 6, label: 'Sáb' },
  ];

  // State
  showTaskDialog = false;
  showInstancesDialog = false;
  filterCategory = signal<string | null>(null);
  filterActive = signal<boolean | null>(true);
  instanceStatusFilter = signal<string | null>(null);
  editingTask = signal<AuditTask | null>(null);
  selectedTaskForInstances = signal<AuditTask | null>(null);
  isSaving = signal(false);
  customDates: Date[] = [];

  // Form
  taskForm: {
    title: string;
    description: string;
    category: string;
    priority: AuditTaskPriority;
    recurrence_type: RecurrenceType;
    recurrence_config: RecurrenceConfig;
    assignment_type: AssignmentType;
    assigned_branch_ids: string[];
    assigned_manager_ids: string[];
    due_days: number;
    reminder_days_before: number;
  } = this.getEmptyForm();

  // Resources
  tasksResource = httpResource<AuditTask[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/audit_tasks', {
        company_id: `eq.${companyId}`,
        order: 'created_at.desc',
      }),
    };
  });

  instancesResource = httpResource<AuditTaskInstance[]>(() => {
    const taskId = this.selectedTaskForInstances()?.id;
    if (!taskId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/audit_task_instances', {
        select: `*,assigned_employee:employees!assigned_to(id,first_name,father_name),branch:branches(id,name)`,
        audit_task_id: `eq.${taskId}`,
        order: 'scheduled_date.desc',
      }),
    };
  });

  // Computed
  branches = computed(() => this.branchesStore.entities());

  managers = computed(() => {
    return this.employeesStore
      .employeesList()
      .filter(
        (e) =>
          e.is_active && (e.position?.admin || e.position?.dashboard_access)
      )
      .map((e) => ({
        ...e,
        short_name: `${e.first_name} ${e.father_name}`,
      }));
  });

  filteredTasks = computed(() => {
    let tasks = this.tasksResource.value() || [];

    const category = this.filterCategory();
    if (category) {
      tasks = tasks.filter((t) => t.category === category);
    }

    const active = this.filterActive();
    if (active !== null) {
      tasks = tasks.filter((t) => t.is_active === active);
    }

    return tasks;
  });

  filteredInstances = computed(() => {
    let instances = this.instancesResource.value() || [];

    const status = this.instanceStatusFilter();
    if (status) {
      instances = instances.filter((i) => i.status === status);
    }

    return instances;
  });

  stats = computed(() => {
    const tasks = this.tasksResource.value() || [];
    const instances = this.instancesResource.value() || [];

    return {
      total: tasks.length,
      active: tasks.filter((t) => t.is_active).length,
      pendingInstances: instances.filter((i) => i.status === 'pending').length,
      overdueInstances: instances.filter((i) => i.status === 'overdue').length,
    };
  });

  // Methods
  private getEmptyForm() {
    return {
      title: '',
      description: '',
      category: '',
      priority: 'medium' as AuditTaskPriority,
      recurrence_type: 'monthly' as RecurrenceType,
      recurrence_config: { day_of_month: 1 } as RecurrenceConfig,
      assignment_type: 'all' as AssignmentType,
      assigned_branch_ids: [] as string[],
      assigned_manager_ids: [] as string[],
      due_days: 3,
      reminder_days_before: 1,
    };
  }

  refreshData() {
    this.tasksResource.reload();
  }

  openCreateDialog() {
    this.editingTask.set(null);
    this.taskForm = this.getEmptyForm();
    this.customDates = [];
    this.showTaskDialog = true;
  }

  editTask(task: AuditTask) {
    this.editingTask.set(task);
    this.taskForm = {
      title: task.title,
      description: task.description || '',
      category: task.category || '',
      priority: task.priority,
      recurrence_type: task.recurrence_type,
      recurrence_config: { ...task.recurrence_config },
      assignment_type: task.assignment_type,
      assigned_branch_ids: [...task.assigned_branch_ids],
      assigned_manager_ids: [...task.assigned_manager_ids],
      due_days: task.due_days,
      reminder_days_before: task.reminder_days_before,
    };

    // Cargar fechas custom si aplica
    if (task.recurrence_type === 'custom' && task.recurrence_config.dates) {
      this.customDates = task.recurrence_config.dates.map((d) => new Date(d));
    } else {
      this.customDates = [];
    }

    this.showTaskDialog = true;
  }

  closeTaskDialog() {
    this.showTaskDialog = false;
    this.editingTask.set(null);
  }

  isFormValid(): boolean {
    if (!this.taskForm.title.trim()) return false;
    if (!this.taskForm.recurrence_type) return false;

    // Validar configuración de recurrencia
    if (this.taskForm.recurrence_type === 'weekly') {
      if (
        !this.taskForm.recurrence_config.days ||
        this.taskForm.recurrence_config.days.length === 0
      ) {
        return false;
      }
    } else if (this.taskForm.recurrence_type === 'monthly') {
      if (!this.taskForm.recurrence_config.day_of_month) {
        return false;
      }
    } else if (this.taskForm.recurrence_type === 'custom') {
      if (
        !this.taskForm.recurrence_config.dates ||
        this.taskForm.recurrence_config.dates.length === 0
      ) {
        return false;
      }
    }

    // Validar asignación
    if (this.taskForm.assignment_type === 'by_branch') {
      if (this.taskForm.assigned_branch_ids.length === 0) return false;
    } else if (this.taskForm.assignment_type === 'specific') {
      if (this.taskForm.assigned_manager_ids.length === 0) return false;
    }

    return true;
  }

  async saveTask() {
    if (!this.isFormValid()) return;

    this.isSaving.set(true);

    try {
      const companyId = this.organizationService.getCurrentCompanyId();
      if (!companyId) throw new Error('No company ID');

      const payload = {
        company_id: companyId,
        title: this.taskForm.title.trim(),
        description: this.taskForm.description.trim() || null,
        category: this.taskForm.category || null,
        priority: this.taskForm.priority,
        recurrence_type: this.taskForm.recurrence_type,
        recurrence_config: this.taskForm.recurrence_config,
        assignment_type: this.taskForm.assignment_type,
        assigned_branch_ids: this.taskForm.assigned_branch_ids,
        assigned_manager_ids: this.taskForm.assigned_manager_ids,
        due_days: this.taskForm.due_days,
        reminder_days_before: this.taskForm.reminder_days_before,
        is_active: true,
      };

      if (this.editingTask()) {
        // Update
        await firstValueFrom(
          this.http.patch(
            this.apiUrl.build('rest/v1/audit_tasks', {
              id: `eq.${this.editingTask()!.id}`,
            }),
            payload
          )
        );
        this.message.add({
          severity: 'success',
          summary: 'Tarea actualizada',
          detail: 'La tarea de auditoría ha sido actualizada correctamente',
        });
      } else {
        // Create
        await firstValueFrom(
          this.http.post(this.apiUrl.build('rest/v1/audit_tasks'), payload)
        );
        this.message.add({
          severity: 'success',
          summary: 'Tarea creada',
          detail: 'La tarea de auditoría ha sido creada correctamente',
        });
      }

      this.closeTaskDialog();
      this.tasksResource.reload();
    } catch (error) {
      console.error('Error saving task:', error);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo guardar la tarea',
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  async toggleTaskActive(task: AuditTask) {
    try {
      await firstValueFrom(
        this.http.patch(
          this.apiUrl.build('rest/v1/audit_tasks', {
            id: `eq.${task.id}`,
          }),
          { is_active: task.is_active }
        )
      );
      this.message.add({
        severity: 'info',
        summary: task.is_active ? 'Tarea activada' : 'Tarea desactivada',
        detail: `La tarea "${task.title}" ha sido ${
          task.is_active ? 'activada' : 'desactivada'
        }`,
      });
    } catch (error) {
      console.error('Error toggling task:', error);
      task.is_active = !task.is_active; // Revert
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cambiar el estado de la tarea',
      });
    }
  }

  confirmDeleteTask(task: AuditTask) {
    this.confirmation.confirm({
      message: `¿Estás seguro de eliminar la tarea "${task.title}"? Esta acción no se puede deshacer.`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteTask(task),
    });
  }

  async deleteTask(task: AuditTask) {
    try {
      await firstValueFrom(
        this.http.delete(
          this.apiUrl.build('rest/v1/audit_tasks', {
            id: `eq.${task.id}`,
          })
        )
      );
      this.message.add({
        severity: 'success',
        summary: 'Tarea eliminada',
        detail: 'La tarea ha sido eliminada correctamente',
      });
      this.tasksResource.reload();
    } catch (error) {
      console.error('Error deleting task:', error);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo eliminar la tarea',
      });
    }
  }

  viewInstances(task: AuditTask) {
    this.selectedTaskForInstances.set(task);
    this.instanceStatusFilter.set(null);
    this.showInstancesDialog = true;
  }

  // Recurrence helpers
  onRecurrenceTypeChange() {
    // Reset config based on type
    if (this.taskForm.recurrence_type === 'daily') {
      this.taskForm.recurrence_config = {};
    } else if (this.taskForm.recurrence_type === 'weekly') {
      this.taskForm.recurrence_config = { days: [] };
    } else if (this.taskForm.recurrence_type === 'monthly') {
      this.taskForm.recurrence_config = { day_of_month: 1 };
    } else if (this.taskForm.recurrence_type === 'custom') {
      this.taskForm.recurrence_config = { dates: [] };
      this.customDates = [];
    }
  }

  isWeekdaySelected(day: number): boolean {
    return this.taskForm.recurrence_config.days?.includes(day) || false;
  }

  toggleWeekday(day: number) {
    if (!this.taskForm.recurrence_config.days) {
      this.taskForm.recurrence_config.days = [];
    }

    const index = this.taskForm.recurrence_config.days.indexOf(day);
    if (index >= 0) {
      this.taskForm.recurrence_config.days.splice(index, 1);
    } else {
      this.taskForm.recurrence_config.days.push(day);
      this.taskForm.recurrence_config.days.sort((a, b) => a - b);
    }
  }

  onCustomDatesChange() {
    this.taskForm.recurrence_config.dates = this.customDates.map((d) =>
      format(d, 'yyyy-MM-dd')
    );
  }

  // Label helpers
  getCategoryLabel(category: string): string {
    return this.CATEGORIES.find((c) => c.value === category)?.label || category;
  }

  getPriorityLabel(priority: string): string {
    return this.PRIORITIES.find((p) => p.value === priority)?.label || priority;
  }

  getPrioritySeverity(
    priority: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const p = this.PRIORITIES.find((p) => p.value === priority);
    return (p?.severity as any) || 'info';
  }

  getStatusLabel(status: string): string {
    return this.STATUSES.find((s) => s.value === status)?.label || status;
  }

  getStatusSeverity(
    status: string
  ): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const s = this.STATUSES.find((s) => s.value === status);
    return (s?.severity as any) || 'info';
  }

  getRecurrenceLabel(type: string, config: RecurrenceConfig): string {
    switch (type) {
      case 'daily':
        return 'Todos los días';
      case 'weekly':
        if (config.days && config.days.length > 0) {
          const dayNames = config.days.map(
            (d) => this.DAYS_OF_WEEK.find((dw) => dw.value === d)?.label
          );
          return `Semanal: ${dayNames.join(', ')}`;
        }
        return 'Semanal';
      case 'monthly':
        if (config.day_of_month) {
          return `Día ${config.day_of_month} de cada mes`;
        }
        return 'Mensual';
      case 'custom':
        if (config.dates && config.dates.length > 0) {
          return `${config.dates.length} fecha(s) específica(s)`;
        }
        return 'Fechas específicas';
      default:
        return type;
    }
  }

  getAssignmentLabel(type: string): string {
    return this.ASSIGNMENT_TYPES.find((a) => a.value === type)?.label || type;
  }
}
