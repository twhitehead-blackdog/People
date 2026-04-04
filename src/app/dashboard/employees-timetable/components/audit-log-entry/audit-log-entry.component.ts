import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { ScheduleAuditLog } from '../../../../services/schedule-audit.service';

interface AuditScheduleValue {
  schedule_name?: string;
  start_date_formatted?: string;
  end_date_formatted?: string;
  branch_name?: string;
  date_removed_formatted?: string;
  locked_override?: boolean;
}
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
      class="rounded-xl border transition-colors"
      [class]="isLocked()
        ? 'bg-amber-950/20 border-amber-500/30 hover:bg-amber-950/30'
        : 'bg-neutral-800/40 border-neutral-700/60 hover:bg-neutral-800/70'"
    >
      <!-- Header -->
      <div class="flex items-center justify-between px-4 pt-3 pb-2 border-b"
        [class]="isLocked() ? 'border-amber-500/20' : 'border-neutral-700/40'"
      >
        <div class="flex items-center gap-2.5">
          <!-- Action icon -->
          <div class="w-8 h-8 rounded-lg flex items-center justify-center"
            [class]="actionBgColor()"
          >
            <i [class]="'pi ' + getAuditActionIcon(log().action) + ' text-sm ' + getAuditActionColor(log().action)"></i>
          </div>

          <div>
            <!-- Who changed -->
            <div class="flex items-center gap-2">
              <span class="text-white font-semibold text-sm">
                {{ log().changed_by_employee
                  ? log().changed_by_employee!.first_name + ' ' + log().changed_by_employee!.father_name
                  : 'Usuario desconocido' }}
              </span>
              <!-- Lock badge -->
              @if (isLocked()) {
                <span class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/25 border border-amber-500/50 text-[10px] font-semibold text-amber-300 uppercase tracking-wide">
                  <i class="pi pi-lock text-[9px]"></i>
                  Cal. Bloqueado
                </span>
              }
            </div>
            <!-- Action + affected employee -->
            <div class="flex items-center gap-1 text-xs text-gray-400 mt-0.5">
              <span [class]="getAuditActionColor(log().action) + ' font-medium'">
                {{ getAuditActionLabel(log().action) }}
              </span>
              @if (showEmployee() && affectedEmployee()) {
                <span class="text-gray-600">·</span>
                <span class="text-gray-400">{{ affectedEmployee() }}</span>
              }
            </div>
          </div>
        </div>

        <!-- Timestamp -->
        <div class="text-right">
          <div class="text-xs text-gray-400">{{ log().changed_at | date : 'dd/MM/yyyy' }}</div>
          <div class="text-xs text-gray-500">{{ log().changed_at | date : 'HH:mm' }}</div>
        </div>
      </div>

      <!-- Body: schedule cards -->
      <div class="px-4 py-3">

        <!-- UPDATE / SPLIT: old → new schedule -->
        @if ((log().action === 'updated' || log().action === 'split') && oldVal() && newVal()) {
          <div class="flex items-center gap-2">
            <!-- Old schedule chip -->
            <div class="flex-1 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <i class="pi pi-calendar text-red-400 text-xs flex-shrink-0"></i>
              <div class="min-w-0">
                <div class="text-xs font-semibold text-red-300 truncate">{{ oldVal()?.schedule_name || '—' }}</div>
                <div class="text-[11px] text-red-400/70">{{ oldVal()?.start_date_formatted }}@if (oldVal()?.start_date_formatted !== oldVal()?.end_date_formatted) { – {{ oldVal()?.end_date_formatted }}}</div>
              </div>
            </div>

            <i class="pi pi-arrow-right text-gray-500 text-xs flex-shrink-0"></i>

            <!-- New schedule chip -->
            <div class="flex-1 flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
              <i class="pi pi-calendar text-green-400 text-xs flex-shrink-0"></i>
              <div class="min-w-0">
                <div class="text-xs font-semibold text-green-300 truncate">{{ newVal()?.schedule_name || '—' }}</div>
                <div class="text-[11px] text-green-400/70">{{ newVal()?.start_date_formatted }}@if (newVal()?.start_date_formatted !== newVal()?.end_date_formatted) { – {{ newVal()?.end_date_formatted }}}</div>
              </div>
            </div>
          </div>

          <!-- Branch change (if different) -->
          @if (oldVal()?.branch_name && oldVal()?.branch_name !== newVal()?.branch_name) {
            <div class="flex items-center gap-1.5 mt-2 text-xs text-gray-400">
              <i class="pi pi-building text-gray-500 text-[10px]"></i>
              <span class="text-gray-500">Sucursal:</span>
              <span class="text-red-400/80 line-through">{{ oldVal()?.branch_name }}</span>
              <i class="pi pi-arrow-right text-gray-600 text-[10px]"></i>
              <span class="text-green-400/80">{{ newVal()?.branch_name }}</span>
            </div>
          }
        }

        <!-- CREATE: new schedule -->
        @if (log().action === 'created' && newVal()) {
          <div class="flex items-center gap-2 bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
            <i class="pi pi-plus-circle text-green-400 text-xs flex-shrink-0"></i>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-semibold text-green-300 truncate">{{ newVal()?.schedule_name || '—' }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[11px] text-green-400/70">
                  {{ newVal()?.start_date_formatted }}
                  @if (newVal()?.start_date_formatted !== newVal()?.end_date_formatted) {
                    – {{ newVal()?.end_date_formatted }}
                  }
                </span>
                @if (newVal()?.branch_name) {
                  <span class="text-gray-600">·</span>
                  <span class="text-[11px] text-gray-400">{{ newVal()?.branch_name }}</span>
                }
              </div>
            </div>
          </div>
        }

        <!-- DELETE: old schedule -->
        @if ((log().action === 'deleted' || log().action === 'split_range') && oldVal()) {
          <div class="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
            <i class="pi pi-trash text-red-400 text-xs flex-shrink-0"></i>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-semibold text-red-300 truncate">{{ oldVal()?.schedule_name || '—' }}</div>
              <div class="flex items-center gap-2 mt-0.5">
                <span class="text-[11px] text-red-400/70">
                  {{ oldVal()?.start_date_formatted }}
                  @if (oldVal()?.start_date_formatted !== oldVal()?.end_date_formatted) {
                    – {{ oldVal()?.end_date_formatted }}
                  }
                </span>
                @if (oldVal()?.branch_name) {
                  <span class="text-gray-600">·</span>
                  <span class="text-[11px] text-gray-400">{{ oldVal()?.branch_name }}</span>
                }
              </div>
            </div>
          </div>
          @if (log().action === 'split_range' && newVal()?.date_removed_formatted) {
            <div class="flex items-center gap-1.5 mt-2 text-xs">
              <i class="pi pi-calendar-minus text-yellow-400 text-[10px]"></i>
              <span class="text-gray-500">Día eliminado:</span>
              <span class="text-yellow-300 font-medium">{{ newVal()?.date_removed_formatted }}</span>
            </div>
          }
        }

        <!-- APPROVED: schedule chip -->
        @if (log().action === 'approved' && (newVal() || oldVal())) {
          <div class="flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-lg px-3 py-2">
            <i class="pi pi-check-circle text-cyan-400 text-xs flex-shrink-0"></i>
            <div class="min-w-0 flex-1">
              <div class="text-xs font-semibold text-cyan-300 truncate">
                {{ (newVal() || oldVal())?.schedule_name || '—' }}
              </div>
              <div class="text-[11px] text-cyan-400/70">
                {{ (newVal() || oldVal())?.start_date_formatted }}
                @if ((newVal() || oldVal())?.start_date_formatted !== (newVal() || oldVal())?.end_date_formatted) {
                  – {{ (newVal() || oldVal())?.end_date_formatted }}
                }
              </div>
            </div>
          </div>
        }

        <!-- Approval status change -->
        @if (log().old_status !== null && log().new_status !== null && log().old_status !== log().new_status) {
          <div class="flex items-center gap-2 mt-2 text-xs">
            <span class="px-2 py-0.5 rounded-full"
              [class]="log().old_status ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'"
            >{{ log().old_status ? 'Aprobado' : 'Pendiente' }}</span>
            <i class="pi pi-arrow-right text-gray-600"></i>
            <span class="px-2 py-0.5 rounded-full"
              [class]="log().new_status ? 'bg-green-500/15 text-green-400 border border-green-500/30' : 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/30'"
            >{{ log().new_status ? 'Aprobado' : 'Pendiente' }}</span>
          </div>
        }

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

  private parseVal(v: unknown): AuditScheduleValue | null {
    if (!v) return null;
    if (typeof v === 'string') { try { return JSON.parse(v) as AuditScheduleValue; } catch { return null; } }
    return v as AuditScheduleValue;
  }

  public oldVal = computed<AuditScheduleValue | null>(() => this.parseVal(this.log().old_value));
  public newVal = computed<AuditScheduleValue | null>(() => this.parseVal(this.log().new_value));

  public isLocked = computed(() =>
    !!(this.newVal()?.locked_override || this.oldVal()?.locked_override)
  );

  public affectedEmployee = computed(() => {
    const emp = this.log().employee_schedule?.employee;
    if (!emp) return null;
    return `${emp.first_name} ${emp.father_name}`;
  });

  public actionBgColor = computed(() => {
    const map: Record<string, string> = {
      created: 'bg-green-500/15',
      updated: 'bg-blue-500/15',
      deleted: 'bg-red-500/15',
      approved: 'bg-cyan-500/15',
      rejected: 'bg-red-500/15',
      split: 'bg-orange-500/15',
      split_range: 'bg-yellow-500/15',
    };
    return map[this.log().action] || 'bg-neutral-700/50';
  });
}
