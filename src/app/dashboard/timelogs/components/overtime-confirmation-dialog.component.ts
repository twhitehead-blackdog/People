import { CommonModule, DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextarea } from 'primeng/inputtextarea';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';

import {
  DayLog,
  EmployeeOvertimeRecord,
  OvertimeStatus,
} from '../../../models';

export interface OvertimeDialogResult {
  action: 'confirm' | 'reject' | 'save' | 'cancel';
  hours?: number;
  reason?: string;
}

@Component({
  selector: 'pt-overtime-confirmation-dialog',
  standalone: true,
  imports: [
    CommonModule,
    DialogModule,
    Button,
    FormsModule,
    DatePipe,
    InputNumberModule,
    InputTextarea,
    Tag,
    TooltipModule,
  ],
  template: `
    <p-dialog
      header="Confirmación de Horas Extras"
      [modal]="true"
      [closable]="true"
      [visible]="visible()"
      (visibleChange)="onVisibleChange($event)"
      [style]="{ width: '450px' }"
      [contentStyle]="{ 'padding-bottom': '0' }"
    >
      <div class="flex flex-col gap-4">
        <!-- Employee Info -->
        <div class="flex items-center gap-3 p-3 bg-neutral-800/50 rounded-lg">
          <div class="flex-shrink-0">
            <div
              class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center"
            >
              <i class="pi pi-user text-amber-400"></i>
            </div>
          </div>
          <div class="flex-1">
            <div class="font-semibold text-white">
              {{ employeeName() }}
            </div>
            <div class="text-sm text-gray-400">
              {{ log()?.day | date : 'EEEE, d MMMM yyyy' : '' : 'es' }}
            </div>
          </div>
          <p-tag
            [value]="statusLabel()"
            [severity]="statusSeverity()"
            [icon]="statusIcon()"
          />
        </div>

        <!-- Overtime Hours -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-300">
            Horas Extras Detectadas
          </label>
          <div class="flex items-center gap-3">
            <p-inputNumber
              [(ngModel)]="editableHours"
              [showButtons]="true"
              [min]="0"
              [max]="24"
              [step]="0.5"
              mode="decimal"
              [minFractionDigits]="1"
              [maxFractionDigits]="2"
              suffix=" horas"
              inputStyleClass="w-full"
              [disabled]="isConfirmed()"
            />
            @if (originalHours() !== editableHours) {
            <span class="text-xs text-amber-400">
              (Original: {{ formatHours(originalHours()) }})
            </span>
            }
          </div>
        </div>

        <!-- Reason/Comment -->
        <div class="flex flex-col gap-2">
          <label class="text-sm font-medium text-gray-300">
            Comentario / Motivo
            <span class="text-gray-500">(opcional)</span>
          </label>
          <textarea
            pInputTextarea
            [(ngModel)]="reason"
            rows="3"
            placeholder="Agregar comentario..."
            [disabled]="isConfirmed()"
            class="w-full"
          ></textarea>
        </div>

        <!-- Status Info (if already processed) -->
        @if (existingRecord()) {
        <div
          class="p-3 rounded-lg border"
          [ngClass]="{
            'bg-green-900/20 border-green-700/50': status() === 'confirmed',
            'bg-red-900/20 border-red-700/50': status() === 'rejected',
            'bg-amber-900/20 border-amber-700/50': status() === 'pending'
          }"
        >
          <div class="flex items-center gap-2 text-sm">
            <i
              class="pi"
              [ngClass]="{
                'pi-check-circle text-green-400': status() === 'confirmed',
                'pi-times-circle text-red-400': status() === 'rejected',
                'pi-clock text-amber-400': status() === 'pending'
              }"
            ></i>
            <span class="text-gray-300">
              @switch (status()) { @case ('confirmed') { Confirmado por
              {{ confirmedByName() }} } @case ('rejected') { Rechazado por
              {{ confirmedByName() }}
              } @case ('pending') { Pendiente de revisión } }
            </span>
          </div>
          @if (existingRecord()?.confirmed_at) {
          <div class="text-xs text-gray-500 mt-1 ml-6">
            {{ existingRecord()?.confirmed_at | date : 'dd/MM/yyyy HH:mm' }}
          </div>
          } @if (existingRecord()?.reason) {
          <div class="text-sm text-gray-400 mt-2 ml-6 italic">
            "{{ existingRecord()?.reason }}"
          </div>
          }
        </div>
        }
      </div>

      <!-- Footer Actions -->
      <ng-template pTemplate="footer">
        <div class="flex justify-between w-full gap-2">
          <div>
            @if (!isConfirmed()) {
            <p-button
              label="Rechazar"
              severity="danger"
              [outlined]="true"
              icon="pi pi-times"
              (onClick)="onReject()"
              [disabled]="isLoading()"
            />
            }
          </div>
          <div class="flex gap-2">
            <p-button
              label="Cancelar"
              severity="secondary"
              [text]="true"
              (onClick)="onCancel()"
              [disabled]="isLoading()"
            />
            @if (!isConfirmed()) {
            <p-button
              label="Confirmar"
              severity="success"
              icon="pi pi-check"
              (onClick)="onConfirm()"
              [loading]="isLoading()"
            />
            }
          </div>
        </div>
      </ng-template>
    </p-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OvertimeConfirmationDialogComponent {
  // Inputs
  visible = input<boolean>(false);
  log = input<DayLog | null>(null);
  existingRecord = input<EmployeeOvertimeRecord | null>(null);
  isLoading = input<boolean>(false);

  // Outputs
  visibleChange = output<boolean>();
  result = output<OvertimeDialogResult>();

  // Editable state
  editableHours = 0;
  reason = '';

  // Computed properties
  employeeName = computed(() => {
    const employee = this.log()?.employee;
    if (!employee) return 'Empleado';
    return `${employee.first_name ?? ''} ${employee.father_name ?? ''}`.trim();
  });

  originalHours = computed(() => {
    return this.existingRecord()?.hours ?? this.log()?.overtimeHours ?? 0;
  });

  status = computed((): OvertimeStatus => {
    return this.existingRecord()?.status ?? 'pending';
  });

  isConfirmed = computed(() => {
    return this.status() === 'confirmed';
  });

  statusLabel = computed(() => {
    switch (this.status()) {
      case 'confirmed':
        return 'Confirmado';
      case 'rejected':
        return 'Rechazado';
      default:
        return 'Pendiente';
    }
  });

  statusSeverity = computed((): 'success' | 'danger' | 'warn' => {
    switch (this.status()) {
      case 'confirmed':
        return 'success';
      case 'rejected':
        return 'danger';
      default:
        return 'warn';
    }
  });

  statusIcon = computed(() => {
    switch (this.status()) {
      case 'confirmed':
        return 'pi pi-check-circle';
      case 'rejected':
        return 'pi pi-times-circle';
      default:
        return 'pi pi-clock';
    }
  });

  confirmedByName = computed(() => {
    const confirmer = this.existingRecord()?.confirmedByEmployee;
    if (!confirmer) return 'desconocido';
    return `${confirmer.first_name ?? ''} ${
      confirmer.father_name ?? ''
    }`.trim();
  });

  // Initialize editable values when dialog opens
  ngOnChanges(): void {
    if (this.visible()) {
      this.editableHours = this.originalHours();
      this.reason = this.existingRecord()?.reason ?? '';
    }
  }

  formatHours(hours: number): string {
    if (!hours) return '0h';
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  onVisibleChange(visible: boolean): void {
    this.visibleChange.emit(visible);
    if (!visible) {
      this.onCancel();
    }
  }

  onConfirm(): void {
    this.result.emit({
      action: 'confirm',
      hours: this.editableHours,
      reason: this.reason || undefined,
    });
  }

  onReject(): void {
    // Require reason for rejection
    if (!this.reason.trim()) {
      this.reason = 'Rechazado sin comentario';
    }
    this.result.emit({
      action: 'reject',
      hours: this.editableHours,
      reason: this.reason,
    });
  }

  onCancel(): void {
    this.result.emit({ action: 'cancel' });
  }
}
