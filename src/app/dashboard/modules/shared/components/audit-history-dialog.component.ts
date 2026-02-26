import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { TimeoffAuditLog } from '../../../../services/timeoff-audit.service';

@Component({
  selector: 'pt-audit-history-dialog',
  standalone: true,
  imports: [DatePipe, ButtonModule, DialogModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '1000px' }"
      [header]="'Historial de Auditoría - Tiempo Compensatorio'"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <div class="space-y-4 pt-4">
        @if (loading()) {
        <div class="flex items-center justify-center gap-2 text-gray-400 py-8">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando historial de auditoría...</span>
        </div>
        } @else if (logs().length === 0) {
        <div class="text-center py-8 text-gray-400">
          <i class="pi pi-info-circle text-4xl mb-4"></i>
          <p>No hay registros de auditoría disponibles</p>
        </div>
        } @else {
        <div class="space-y-3 max-h-[60vh] overflow-y-auto">
          @for (log of logs(); track log.id) {
          <div
            class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-colors"
          >
            <div class="flex items-start gap-3">
              <div
                [class]="
                  'w-10 h-10 rounded-full flex items-center justify-center ' +
                  getActionColor(log.action) +
                  ' bg-opacity-20'
                "
              >
                <i [class]="'pi ' + getActionIcon(log.action) + ' text-lg'"></i>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <div class="text-white font-semibold">
                      {{
                        log.changed_by_employee
                          ? log.changed_by_employee.first_name +
                            ' ' +
                            log.changed_by_employee.father_name
                          : 'Usuario desconocido'
                      }}
                    </div>
                    <div class="text-sm text-gray-400">
                      {{ getActionLabel(log.action) }}
                    </div>
                  </div>
                  <div class="text-xs text-gray-500">
                    {{ log.changed_at | date : 'dd/MM/yyyy HH:mm' }}
                  </div>
                </div>
                @if (log.comment) {
                <div
                  class="text-sm text-gray-300 mt-2 p-2 bg-neutral-900/50 rounded border-l-2 border-cyan-400"
                >
                  {{ log.comment }}
                </div>
                } @if (log.old_status && log.new_status) {
                <div class="flex items-center gap-2 mt-2 text-xs">
                  <span class="text-gray-400">Estado:</span>
                  <span
                    class="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400"
                    >{{ log.old_status }}</span
                  >
                  <i class="pi pi-arrow-right text-gray-500"></i>
                  <span
                    class="px-2 py-1 rounded bg-green-500/20 text-green-400"
                    >{{ log.new_status }}</span
                  >
                </div>
                }
                <div class="text-xs text-gray-500 mt-2">
                  Solicitud ID:
                  <span class="font-mono text-gray-400"
                    >{{ log.timeoff_id.substring(0, 8) }}...</span
                  >
                </div>
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>
      <ng-template #footer>
        <div class="flex justify-end gap-2">
          <p-button
            label="Cerrar"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="visible.set(false)"
            [rounded]="true"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class AuditHistoryDialogComponent {
  visible = model.required<boolean>();
  loading = input<boolean>(false);
  logs = input<TimeoffAuditLog[]>([]);

  public getActionLabel(action: string): string {
    const labels: Record<string, string> = {
      created: 'creó la solicitud',
      status_changed: 'cambió el estado',
      approved: 'aprobó la solicitud',
      rejected: 'rechazó la solicitud',
      registered: 'registró la solicitud',
      updated: 'actualizó la solicitud',
    };
    return labels[action] || action;
  }

  public getActionIcon(action: string): string {
    const icons: Record<string, string> = {
      created: 'pi-plus-circle',
      status_changed: 'pi-sync',
      approved: 'pi-check-circle',
      rejected: 'pi-times-circle',
      registered: 'pi-save',
      updated: 'pi-pencil',
    };
    return icons[action] || 'pi-circle';
  }

  public getActionColor(action: string): string {
    const colors: Record<string, string> = {
      created: 'text-blue-400',
      status_changed: 'text-yellow-400',
      approved: 'text-green-400',
      rejected: 'text-red-400',
      registered: 'text-cyan-400',
      updated: 'text-gray-400',
    };
    return colors[action] || 'text-gray-400';
  }
}
