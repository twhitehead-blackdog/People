import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
} from '@angular/core';
import { Dialog } from 'primeng/dialog';
import { ScheduleAuditLog } from '../../../../services/schedule-audit.service';
import { AuditLogEntryComponent } from '../audit-log-entry/audit-log-entry.component';

@Component({
  selector: 'pt-specific-audit-dialog',
  imports: [Dialog, AuditLogEntryComponent],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '800px' }"
      [header]="header()"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [closable]="true"
      (onHide)="visible.set(false)"
    >
      <div class="space-y-4 pt-4">
        @if (isLoading()) {
        <div class="flex items-center justify-center gap-2 text-gray-400 py-8">
          <i class="pi pi-spin pi-spinner"></i>
          <span>Cargando historial de auditoría...</span>
        </div>
        } @else if (history().length === 0) {
        <div class="text-center py-8 text-gray-400">
          <i class="pi pi-info-circle text-4xl mb-4"></i>
          <p>No hay registros de auditoría para este día</p>
        </div>
        } @else {
        <div class="space-y-3 max-h-[60vh] overflow-y-auto">
          @for (log of history(); track log.id) {
          <pt-audit-log-entry
            [log]="log"
            [showEmployee]="false"
            [showScheduleId]="false"
          />
          }
        </div>
        }
      </div>
    </p-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SpecificAuditDialogComponent {
  public visible = model.required<boolean>();
  public header = input<string>('');
  public history = input.required<ScheduleAuditLog[]>();
  public isLoading = input<boolean>(false);
}
