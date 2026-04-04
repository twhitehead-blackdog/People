import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format } from 'date-fns';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { SelectModule } from 'primeng/select';
import { TextareaModule } from 'primeng/textarea';
import { EmployeeSchedule, Schedule } from '../../../../models';
import {
  ScheduleChangeRequestService,
  ScheduleChangeRequestType,
} from '../../../../services/schedule-change-request.service';
import { MessageService } from 'primeng/api';
import { HttpClient } from '@angular/common/http';
import { ApiUrlService } from '../../../../services/api-url.service';
import { notifyBranchManagers } from '../../../../utils/manager-notification.utils';

@Component({
  selector: 'pt-change-request-dialog',
  standalone: true,
  imports: [Dialog, Button, FormsModule, SelectModule, TextareaModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      header="Solicitud de cambio de horario"
      [modal]="true"
      [(visible)]="visible"
      [dismissableMask]="true"
      [style]="{ width: '450px' }"
    >
      <div class="flex flex-col gap-4">
        <!-- Info banner -->
        <div class="flex items-start gap-2 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
          <i class="pi pi-lock text-amber-400 mt-0.5"></i>
          <div class="text-sm text-amber-200">
            El calendario de esta semana está <strong>bloqueado</strong>.
            Para realizar cambios debes enviar una solicitud que será revisada por RRHH.
          </div>
        </div>

        <!-- Employee name -->
        <div class="text-sm text-gray-300">
          <span class="text-gray-500">Empleado:</span>
          <span class="font-medium ml-1">{{ employeeName() }}</span>
        </div>

        <!-- Date -->
        @if (date()) {
          <div class="text-sm text-gray-300">
            <span class="text-gray-500">Fecha:</span>
            <span class="font-medium ml-1">{{ formatDate(date()!) }}</span>
          </div>
        }

        <!-- Request type -->
        <div class="text-sm text-gray-300">
          <span class="text-gray-500">Tipo:</span>
          <span class="font-medium ml-1">{{ requestTypeLabel() }}</span>
        </div>

        <!-- Current schedule (for update/delete) -->
        @if (currentSchedule()) {
          <div class="text-sm text-gray-300">
            <span class="text-gray-500">Horario actual:</span>
            <span class="font-medium ml-1">{{ currentSchedule()?.schedule?.name }}</span>
          </div>
        }

        <!-- Proposed schedule (for create/update) -->
        @if (requestType() !== 'delete') {
          <div class="input-container">
            <label class="text-sm text-gray-400">Horario propuesto</label>
            <p-select
              [options]="schedules()"
              optionLabel="name"
              optionValue="id"
              [(ngModel)]="proposedScheduleId"
              placeholder="Seleccionar horario"
              [style]="{ width: '100%' }"
            />
          </div>
        }

        <!-- Reason (required) -->
        <div class="input-container">
          <label class="text-sm text-gray-400">Razón del cambio <span class="text-red-400">*</span></label>
          <textarea
            pTextarea
            [(ngModel)]="reason"
            rows="3"
            placeholder="Explica por qué necesitas este cambio..."
            class="w-full"
          ></textarea>
        </div>
      </div>

      <div class="flex justify-end gap-2 mt-4">
        <p-button
          label="Cancelar"
          severity="secondary"
          [outlined]="true"
          (onClick)="visible.set(false)"
        />
        <p-button
          label="Enviar solicitud"
          icon="pi pi-send"
          severity="warn"
          [loading]="submitting()"
          [disabled]="!reason.trim() || (requestType() !== 'delete' && !proposedScheduleId)"
          (onClick)="submit()"
        />
      </div>
    </p-dialog>
  `,
})
export class ChangeRequestDialogComponent {
  private changeRequestService = inject(ScheduleChangeRequestService);
  private messageService = inject(MessageService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  // Inputs
  public visible = model<boolean>(false);
  public employeeId = input.required<string>();
  public employeeName = input<string>('');
  public date = input<Date | null>(null);
  public requestType = input.required<ScheduleChangeRequestType>();
  public currentSchedule = input<EmployeeSchedule | null>(null);
  public branchId = input<string | null>(null);
  public requestedBy = input.required<string>();
  public schedules = input<Schedule[]>([]);

  // Outputs
  public requestSent = output<void>();

  // Local state
  public proposedScheduleId: string | null = null;
  public reason = '';
  public submitting = signal(false);

  public requestTypeLabel(): string {
    switch (this.requestType()) {
      case 'create': return 'Crear nuevo horario';
      case 'update': return 'Modificar horario existente';
      case 'delete': return 'Eliminar horario';
    }
  }

  public formatDate(date: Date): string {
    return format(date, 'EEEE dd/MM/yyyy');
  }

  public submit(): void {
    if (!this.reason.trim()) return;
    if (this.requestType() !== 'delete' && !this.proposedScheduleId) return;

    this.submitting.set(true);

    const currentSch = this.currentSchedule();
    const payload = {
      employee_id: this.employeeId(),
      branch_id: this.branchId() || currentSch?.branch_id || null,
      schedule_date: this.date() ? format(this.date()!, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd'),
      employee_schedule_id: currentSch?.id || null,
      current_schedule_id: currentSch?.schedule_id || null,
      proposed_schedule_id: this.proposedScheduleId || null,
      request_type: this.requestType(),
      reason: this.reason.trim(),
      requested_by: this.requestedBy(),
    };

    this.changeRequestService.createRequest(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Solicitud enviada',
          detail: 'Tu solicitud de cambio ha sido enviada para revisión.',
        });
        // Notificar a gerentes de la sucursal
        notifyBranchManagers({
          http: this.http,
          apiUrl: this.apiUrl,
          employee: { id: this.employeeId(), branch_id: this.branchId() },
          title: 'Nueva Solicitud de Cambio de Horario',
          message: `${this.employeeName()} envió una solicitud de cambio de horario.`,
          relatedType: 'schedule_change',
          messageType: 'schedule_change_request_manager',
        });
        this.visible.set(false);
        this.reason = '';
        this.proposedScheduleId = null;
        this.submitting.set(false);
        this.requestSent.emit();
      },
      error: (err) => {
        console.error('Error creating change request:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo enviar la solicitud. Intenta de nuevo.',
        });
        this.submitting.set(false);
      },
    });
  }
}
