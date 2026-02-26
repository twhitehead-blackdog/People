import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ScheduleAuditLog } from '../../../../services/schedule-audit.service';
import {
  getAuditActionColor,
  getAuditActionIcon,
  getAuditActionLabel,
} from '../../utils/timetable-audit.utils';

@Component({
  selector: 'pt-audit-log-entry',
  imports: [DatePipe],
  template: `
    <div
      class="p-4 rounded-lg bg-neutral-800/50 border border-neutral-700 hover:bg-neutral-800 transition-colors"
    >
      <div class="flex items-start gap-3">
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center bg-neutral-700/50"
        >
          <i
            [class]="
              'pi ' +
              getAuditActionIcon(log().action) +
              ' text-lg ' +
              getAuditActionColor(log().action)
            "
          ></i>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between mb-2">
            <div>
              <div class="text-white font-semibold">
                {{
                  log().changed_by_employee
                    ? log().changed_by_employee!.first_name +
                      ' ' +
                      log().changed_by_employee!.father_name
                    : 'Usuario desconocido'
                }}
              </div>
              <div class="text-sm text-gray-400">
                {{ getAuditActionLabel(log().action) }}
                @if (showEmployee() && log().employee_schedule?.employee) {
                <span class="text-gray-500">
                  - {{ log().employee_schedule?.employee?.first_name }}
                  {{ log().employee_schedule?.employee?.father_name }}
                </span>
                }
              </div>
            </div>
            <div class="text-xs text-gray-500">
              {{ log().changed_at | date : 'dd/MM/yyyy HH:mm' }}
            </div>
          </div>
          @if (log().comment) {
          <div
            class="text-sm text-gray-300 mt-2 p-2 bg-neutral-900/50 rounded border-l-2 border-cyan-400"
          >
            {{ log().comment }}
          </div>
          } @if (log().old_status !== null && log().new_status !== null &&
          log().old_status !== log().new_status) {
          <div class="flex items-center gap-2 mt-2 text-xs">
            <span class="text-gray-400">Estado:</span>
            <span class="px-2 py-1 rounded bg-yellow-500/20 text-yellow-400">{{
              log().old_status ? 'Aprobado' : 'Pendiente'
            }}</span>
            <i class="pi pi-arrow-right text-gray-500"></i>
            <span class="px-2 py-1 rounded bg-green-500/20 text-green-400">{{
              log().new_status ? 'Aprobado' : 'Pendiente'
            }}</span>
          </div>
          } @if (showScheduleId()) {
          <div class="text-xs text-gray-500 mt-2">
            ID del horario:
            <span class="font-mono text-gray-400">
              {{
                log().employee_schedule_id
                  ? log().employee_schedule_id.substring(0, 8) + '...'
                  : '—'
              }}
            </span>
          </div>
          }
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditLogEntryComponent {
  public log = input.required<ScheduleAuditLog>();
  public showEmployee = input<boolean>(true);
  public showScheduleId = input<boolean>(true);

  public getAuditActionLabel = getAuditActionLabel;
  public getAuditActionIcon = getAuditActionIcon;
  public getAuditActionColor = getAuditActionColor;
}
