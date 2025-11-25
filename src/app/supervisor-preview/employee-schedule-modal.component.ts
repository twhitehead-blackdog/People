import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe, NgClass } from '@angular/common';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Button } from 'primeng/button';
import { Tag } from 'primeng/tag';
import { EmployeeSchedule, colorVariants } from '../models';

@Component({
  selector: 'pt-employee-schedule-modal',
  standalone: true,
  imports: [Button, Tag, DatePipe, NgClass],
  template: `
    <div class="employee-schedule-content">
      @if (schedule()) {
        <div class="space-y-4">
          <!-- Información del Horario -->
          <div class="schedule-info-card">
            <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
              <i class="pi pi-calendar text-amber-400"></i>
              Información del Horario
            </h3>
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label class="text-sm text-gray-400">Nombre del Turno</label>
                <div class="mt-1">
                  <span
                    class="inline-block px-3 py-1 rounded text-sm font-semibold"
                    [ngClass]="colorVariants[schedule()!.schedule?.color || 'slate']"
                  >
                    {{ schedule()!.schedule?.name || 'Sin nombre' }}
                  </span>
                </div>
              </div>
              <div>
                <label class="text-sm text-gray-400">Sucursal</label>
                <p class="text-white font-medium mt-1">
                  {{ schedule()!.branch?.name || 'Sin sucursal' }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Fecha de Inicio</label>
                <p class="text-white font-medium mt-1">
                  {{ schedule()!.start_date | date : 'fullDate' : '' : 'es' }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Fecha de Fin</label>
                <p class="text-white font-medium mt-1">
                  {{ schedule()!.end_date | date : 'fullDate' : '' : 'es' }}
                </p>
              </div>
            </div>
          </div>

          <!-- Horarios de Trabajo -->
          @if (schedule()!.schedule) {
            <div class="schedule-times-card">
              <h3 class="text-lg font-semibold text-white mb-3 flex items-center gap-2">
                <i class="pi pi-clock text-amber-400"></i>
                Horarios de Trabajo
              </h3>
              <div class="grid grid-cols-2 gap-4">
                <div>
                  <label class="text-sm text-gray-400">Hora de Entrada</label>
                  <p class="text-white font-bold text-xl mt-1">
                    {{ getEntryTime() }}
                  </p>
                </div>
                <div>
                  <label class="text-sm text-gray-400">Hora de Salida</label>
                  <p class="text-white font-bold text-xl mt-1">
                    {{ getExitTime() }}
                  </p>
                </div>
                @if (schedule()!.schedule!.lunch_start_time) {
                  <div>
                    <label class="text-sm text-gray-400">Inicio de Almuerzo</label>
                    <p class="text-white font-medium mt-1">
                      {{ getLunchStartTime() }}
                    </p>
                  </div>
                }
                @if (schedule()!.schedule!.lunch_end_time) {
                  <div>
                    <label class="text-sm text-gray-400">Fin de Almuerzo</label>
                    <p class="text-white font-medium mt-1">
                      {{ getLunchEndTime() }}
                    </p>
                  </div>
                }
              </div>
            </div>
          }

          <!-- Estado -->
          <div class="flex items-center gap-2">
            <p-tag
              [value]="schedule()!.approved ? 'Aprobado' : 'Pendiente'"
              [severity]="getSeverity()"
            />
          </div>
        </div>
      } @else {
        <div class="text-center py-8">
          <i class="pi pi-calendar-times text-4xl text-gray-500 mb-4"></i>
          <p class="text-gray-400">No hay horario activo para este empleado</p>
        </div>
      }

      <div class="flex justify-end mt-6">
        <p-button
          label="Cerrar"
          (onClick)="close()"
          severity="secondary"
          rounded
        />
      </div>
    </div>
  `,
  styles: `
    .employee-schedule-content {
      padding: 1rem;
    }

    .schedule-info-card,
    .schedule-times-card {
      background: #1f2937;
      border-radius: 8px;
      padding: 1.5rem;
      border: 1px solid #374151;
    }

    ::ng-deep .employee-schedule-modal .p-dialog {
      background: #111827 !important;
      border-radius: 12px !important;
    }

    ::ng-deep .employee-schedule-modal .p-dialog-header {
      background: #1f2937 !important;
      border-bottom: 1px solid #374151 !important;
    }

    ::ng-deep .employee-schedule-modal .p-dialog-content {
      background: #111827 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeScheduleModalComponent {
  public dialogRef = inject(DynamicDialogRef);
  public config = inject(DynamicDialogConfig);
  public colorVariants = colorVariants;

  public schedule = signal<EmployeeSchedule | null>(
    this.config.data?.schedule || null
  );

  public formatTime(time: string | Date | null | undefined): string {
    if (!time) return 'N/A';
    
    // Si es un Date, convertirlo a string
    let timeString: string;
    if (time instanceof Date) {
      const hours = time.getHours();
      const minutes = time.getMinutes();
      timeString = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    } else {
      timeString = time;
    }
    
    try {
      const [hours, minutes] = timeString.split(':');
      const hour = parseInt(hours, 10);
      const min = parseInt(minutes, 10);
      const period = hour >= 12 ? 'PM' : 'AM';
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      return `${displayHour}:${min.toString().padStart(2, '0')} ${period}`;
    } catch {
      return timeString;
    }
  }

  public getEntryTime(): string {
    const schedule = this.schedule();
    if (!schedule?.schedule?.entry_time) return 'N/A';
    return this.formatTime(schedule.schedule.entry_time);
  }

  public getExitTime(): string {
    const schedule = this.schedule();
    if (!schedule?.schedule?.exit_time) return 'N/A';
    return this.formatTime(schedule.schedule.exit_time);
  }

  public getLunchStartTime(): string {
    const schedule = this.schedule();
    if (!schedule?.schedule?.lunch_start_time) return 'N/A';
    return this.formatTime(schedule.schedule.lunch_start_time);
  }

  public getLunchEndTime(): string {
    const schedule = this.schedule();
    if (!schedule?.schedule?.lunch_end_time) return 'N/A';
    return this.formatTime(schedule.schedule.lunch_end_time);
  }

  public getSeverity(): 'success' | 'warn' | 'info' | 'danger' | 'secondary' | 'contrast' | undefined {
    const schedule = this.schedule();
    return schedule?.approved ? 'success' : 'warn';
  }

  public close() {
    this.dialogRef.close();
  }
}

