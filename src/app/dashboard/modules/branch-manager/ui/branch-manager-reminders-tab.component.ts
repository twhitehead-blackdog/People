import { DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Textarea } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Reminder } from '../models/branch-manager.model';
import {
  isOverdue,
  getPriorityLabel,
  getPrioritySeverity,
  getCategoryLabel,
} from '../utils/reminder.utils';

@Component({
  selector: 'pt-branch-manager-reminders-tab',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    FormsModule,
    Button,
    DatePicker,
    Select,
    TableModule,
    Tag,
    Textarea,
    TooltipModule,
  ],
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
          (onClick)="showDialog.set(true)"
        />
        <p-button
          icon="pi pi-refresh"
          [label]="isMobile() ? undefined : 'Actualizar'"
          severity="secondary"
          (onClick)="refresh.emit()"
          [loading]="isLoading()"
        />
      </div>

      <!-- Mobile card view -->
      @if (isMobile()) {
        @if (isLoading()) {
          <div class="mobile-card-list">
            @for (i of [1, 2, 3]; track i) {
              <div class="mobile-card-item" style="pointer-events: none">
                <div class="mobile-card-item__avatar" style="background: rgba(255,255,255,0.05); animation: pulse 1.5s infinite"></div>
                <div class="mobile-card-item__body">
                  <div style="height: 0.875rem; width: 70%; background: rgba(255,255,255,0.05); border-radius: 0.25rem; animation: pulse 1.5s infinite"></div>
                  <div style="height: 0.75rem; width: 45%; background: rgba(255,255,255,0.05); border-radius: 0.25rem; margin-top: 0.375rem; animation: pulse 1.5s infinite"></div>
                </div>
              </div>
            }
          </div>
        } @else if (filteredReminders().length === 0) {
          <div class="mobile-empty-state">
            <i class="pi pi-inbox mobile-empty-state__icon"></i>
            <p class="mobile-empty-state__title">No hay recordatorios</p>
            <p class="mobile-empty-state__desc">Los recordatorios creados aparecerán aquí</p>
          </div>
        } @else {
          <div class="mobile-section-header">
            <span class="mobile-section-header__title">Recordatorios</span>
            <span class="mobile-section-header__count">{{ filteredReminders().length }}</span>
          </div>
          <div class="mobile-card-list">
            @for (reminder of filteredReminders(); track reminder.id || $index) {
              <div
                class="mobile-card-item"
                style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
                [ngClass]="{
                  'opacity-60': reminder.is_completed,
                  'border-l-3 border-l-red-500': isOverdue(reminder) && !reminder.is_completed,
                  'border-l-3 border-l-purple-500': reminder.audit_task_instance_id && !isOverdue(reminder) && !reminder.is_completed
                }"
              >
                <!-- Type icon as avatar -->
                <div class="mobile-card-item__avatar" [ngClass]="{
                  'bg-purple-500/10 border-purple-500/20': reminder.audit_task_instance_id,
                  'bg-blue-500/10 border-blue-500/20': !reminder.audit_task_instance_id
                }">
                  @if (reminder.audit_task_instance_id) {
                    <i class="pi pi-check-square text-purple-400"></i>
                  } @else {
                    <i class="pi pi-bookmark text-blue-400"></i>
                  }
                </div>

                <!-- Body -->
                <div class="mobile-card-item__body">
                  <div class="mobile-card-item__title">{{ reminder.message }}</div>
                  @if (reminder.category) {
                    <div class="mobile-card-item__subtitle">{{ getCategoryLabel(reminder.category) }}</div>
                  }
                  <div class="mobile-card-item__subtitle">
                    <span [ngClass]="{'text-red-500 font-semibold': isOverdue(reminder)}">
                      {{ reminder.due_date | date : 'dd/MM/yyyy' : 'UTC' }}
                    </span>
                  </div>
                  <div class="mobile-card-item__meta">
                    <!-- Priority -->
                    @if (reminder.priority) {
                      <span class="mobile-card-item__tag" [ngClass]="{
                        'mobile-card-item__tag--danger': reminder.priority === 'high' || reminder.priority === 'urgent',
                        'mobile-card-item__tag--warning': reminder.priority === 'medium',
                        'mobile-card-item__tag--info': reminder.priority === 'low'
                      }">{{ getPriorityLabel(reminder.priority) }}</span>
                    }
                    <!-- Status -->
                    @if (reminder.is_completed || reminder.status === 'completed') {
                      <span class="mobile-card-item__tag mobile-card-item__tag--success">Completado</span>
                    } @else if (reminder.status === 'not_applicable') {
                      <span class="mobile-card-item__tag" style="background: rgba(107,114,128,0.12); color: #9ca3af">No Aplica</span>
                    } @else if (isOverdue(reminder)) {
                      <span class="mobile-card-item__tag mobile-card-item__tag--danger">Vencido</span>
                    } @else if (reminder.status === 'in_progress') {
                      <span class="mobile-card-item__tag mobile-card-item__tag--info">En Progreso</span>
                    } @else {
                      <span class="mobile-card-item__tag mobile-card-item__tag--warning">Pendiente</span>
                    }
                  </div>
                </div>

                <!-- Actions -->
                <div class="flex flex-col gap-1 flex-shrink-0">
                  @if (!reminder.is_completed && reminder.status !== 'completed' && reminder.status !== 'not_applicable') {
                    <button
                      class="w-11 h-11 rounded-lg flex items-center justify-center text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                      style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
                      (click)="complete.emit(reminder)"
                    >
                      <i class="pi pi-check"></i>
                    </button>
                    @if (reminder.audit_task_instance_id) {
                      <button
                        class="w-11 h-11 rounded-lg flex items-center justify-center text-gray-400 hover:bg-gray-500/10 transition-colors"
                        style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
                        (click)="markNotApplicable.emit(reminder)"
                      >
                        <i class="pi pi-ban"></i>
                      </button>
                    }
                  }
                  @if (!reminder.audit_task_instance_id) {
                    <button
                      class="w-11 h-11 rounded-lg flex items-center justify-center text-red-400 hover:bg-red-500/10 transition-colors"
                      style="touch-action: manipulation; -webkit-tap-highlight-color: transparent"
                      (click)="deleteReminder.emit(reminder.id)"
                    >
                      <i class="pi pi-trash"></i>
                    </button>
                  }
                </div>
              </div>
            }
          </div>
        }
      } @else {
      <!-- Desktop table view -->
      <p-table
        [value]="filteredReminders()"
        [loading]="isLoading()"
        [paginator]="true"
        [rows]="25"
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
                  (onClick)="complete.emit(reminder)"
                  pTooltip="Marcar como completado"
                />
                @if (reminder.audit_task_instance_id) {
                <p-button
                  icon="pi pi-ban"
                  severity="secondary"
                  text
                  rounded
                  size="small"
                  (onClick)="markNotApplicable.emit(reminder)"
                  pTooltip="Marcar como No Aplica"
                />
                } } @if (!reminder.audit_task_instance_id) {
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  size="small"
                  (onClick)="deleteReminder.emit(reminder.id)"
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
      }
    </div>

    <!-- Dialog para crear recordatorio -->
    @if (showDialog()) {
    <div
      class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 md:p-4"
      (click)="showDialog.set(false)"
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
              [(ngModel)]="newEmployeeId"
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
              [(ngModel)]="newMessage"
              placeholder="Escribe el recordatorio..."
              rows="3"
              class="w-full"
            ></textarea>
          </div>
          <div>
            <label class="block text-sm font-medium mb-2">Fecha Límite</label>
            <p-datepicker
              [(ngModel)]="newDueDate"
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
              (onClick)="showDialog.set(false)"
            />
            <p-button
              label="Crear"
              severity="success"
              (onClick)="onCreateReminder()"
              [disabled]="!newMessage() || !newDueDate()"
            />
          </div>
        </div>
      </div>
    </div>
    }
  `,
})
export class BranchManagerRemindersTabComponent {
  // Inputs
  public filteredReminders = input.required<Reminder[]>();
  public branchEmployees = input.required<any[]>();
  public isLoading = input<boolean>(false);
  public isMobile = input<boolean>(false);

  // Two-way binding
  public selectedEmployeeForReminder = model<string | null>(null);

  // Outputs
  public refresh = output<void>();
  public complete = output<Reminder>();
  public markNotApplicable = output<Reminder>();
  public deleteReminder = output<string>();
  public create = output<{
    employeeId: string | null;
    message: string;
    dueDate: Date;
  }>();

  // Local state for new reminder dialog
  public showDialog = model<boolean>(false);
  public newEmployeeId = model<string | null>(null);
  public newMessage = model<string>('');
  public newDueDate = model<Date | null>(null);

  // Utils
  public isOverdue = isOverdue;
  public getPriorityLabel = getPriorityLabel;
  public getPrioritySeverity = getPrioritySeverity;
  public getCategoryLabel = getCategoryLabel;

  public onCreateReminder(): void {
    const message = this.newMessage();
    const dueDate = this.newDueDate();
    if (!message || !dueDate) return;

    this.create.emit({
      employeeId: this.newEmployeeId(),
      message,
      dueDate,
    });

    // Reset form
    this.showDialog.set(false);
    this.newMessage.set('');
    this.newDueDate.set(null);
    this.newEmployeeId.set(null);
  }
}
