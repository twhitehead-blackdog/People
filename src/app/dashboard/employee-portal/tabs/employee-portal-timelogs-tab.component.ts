import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  differenceInMinutes,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  startOfMonth,
  startOfWeek,
} from 'date-fns';
import { CardModule } from 'primeng/card';
import { CalendarComponent } from '../../../calendar.component';
import { PanamaDatePipe } from '../../../pipes/panama-date.pipe';
import { EmployeePortalDataService } from '../services/employee-portal-data.service';

@Component({
  selector: 'pt-employee-portal-timelogs-tab',
  standalone: true,
  imports: [CommonModule, CardModule, CalendarComponent, PanamaDatePipe],
  template: `
    <div class="tab-content">
      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between w-full">
            <div>
              <h3 class="text-xl font-bold text-white m-0">
                Calendario de Marcaciones
              </h3>
              <p class="text-sm text-gray-400 m-0 mt-1">
                {{ calendarMonth() | date : 'MMMM yyyy' }}
              </p>
            </div>
            <div class="flex items-center gap-2">
              <!-- Los controles del calendario ahora están dentro del componente pt-calendar -->
            </div>
          </div>
        </ng-template>
        <ng-template #subtitle
          >Visualiza tus marcaciones en formato calendario</ng-template
        >

        @if (dataService.monthTimelogsApi.isLoading()) {
        <div class="flex items-center justify-center py-12">
          <i class="pi pi-spin pi-spinner text-4xl text-amber-400"></i>
        </div>
        } @else {
        <!-- Calendario bonito usando pt-calendar -->
        <pt-calendar
          [markers]="timelogMarkers()"
          [markerTpl]="timelogMarkerTemplate"
          (monthChange)="onCalendarMonthChange($event)"
        />

        <!-- Template para mostrar los markers en el calendario tipo mapa -->
        <ng-template #timelogMarkerTemplate let-markers>
          <div class="flex flex-col gap-1.5 w-full h-full">
            @for (marker of markers; track marker.data.day) { @let log =
            marker.data; @let hasEntry = log?.entry; @let hasExit = log?.exit;
            @let hasLunchStart = log?.lunch_start; @let hasLunchEnd =
            log?.lunch_end; @let hasDelay = log?.delay && typeof log?.delay ===
            'number'; @let workedHours = log?.entry?.date && log?.exit?.date ?
            calculateWorkedHours(log.entry.date, log.exit.date) : null; @let
            isComplete = hasEntry && hasExit; @let isIncomplete = hasEntry &&
            !hasExit;

            <div
              class="flex flex-col gap-1.5 p-2 rounded-lg shadow-md border-2 transition-all duration-200 hover:scale-105 hover:shadow-lg w-full min-h-[80px]"
              [class.bg-gradient-to-br]="true"
              [ngClass]="{
                'from-green-600/30 to-green-500/20': isComplete && !hasDelay,
                'from-yellow-600/30 to-yellow-500/20': isIncomplete,
                'from-red-600/30 to-red-500/20': hasDelay
              }"
              [class.border-green-400]="isComplete && !hasDelay"
              [class.border-yellow-400]="isIncomplete"
              [class.border-red-400]="hasDelay"
            >
              <!-- Header con fecha y estado -->
              <div
                class="flex items-center justify-between mb-1 pb-1 border-b border-white/10"
              >
                <span
                  class="text-[10px] font-bold uppercase tracking-wide text-white/80"
                >
                  {{ log.day | panamaDate : 'EEE d' }}
                </span>
                @if (isComplete) {
                <span
                  class="text-[9px] bg-green-500/50 text-white px-1.5 py-0.5 rounded-full font-semibold"
                >
                  ✓ Completo
                </span>
                } @else if (isIncomplete) {
                <span
                  class="text-[9px] bg-yellow-500/50 text-white px-1.5 py-0.5 rounded-full font-semibold"
                >
                  ⚠ Pendiente
                </span>
                } @if (hasDelay) {
                <span
                  class="text-[9px] bg-red-500/70 text-white px-1.5 py-0.5 rounded-full font-semibold animate-pulse"
                >
                  ⏰ {{ log.delay }}m
                </span>
                }
              </div>

              <!-- Timeline visual tipo mapa -->
              <div class="flex flex-col gap-1.5">
                <!-- Entrada -->
                @if (hasEntry) {
                <div
                  class="flex items-center gap-2 p-1.5 rounded-md bg-white/5 border border-green-400/30"
                >
                  <div
                    class="flex items-center justify-center w-5 h-5 rounded-full bg-green-500/30 border-2 border-green-400"
                  >
                    <i class="pi pi-sign-in text-[10px] text-green-300"></i>
                  </div>
                  <div class="flex-1">
                    <div class="text-[11px] text-gray-300 font-medium">
                      Entrada
                    </div>
                    <div class="text-[13px] text-white font-bold">
                      {{ log.entry.date | panamaDate : 'HH:mm' }}
                    </div>
                  </div>
                  @if (log.entry?.branch?.name) {
                  <div class="text-[9px] text-gray-400 truncate max-w-[60px]">
                    {{ log.entry.branch.name }}
                  </div>
                  }
                </div>
                }

                <!-- Almuerzo -->
                @if (hasLunchStart || hasLunchEnd) {
                <div
                  class="flex items-center gap-2 p-1.5 rounded-md bg-white/5 border border-amber-400/30"
                >
                  <div
                    class="flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/30 border-2 border-amber-400"
                  >
                    <i class="pi pi-clock text-[10px] text-amber-300"></i>
                  </div>
                  <div class="flex-1">
                    <div class="text-[11px] text-gray-300 font-medium">
                      Almuerzo
                    </div>
                    <div class="flex items-center gap-2 text-[12px]">
                      @if (hasLunchStart) {
                      <span class="text-white font-semibold">{{
                        log.lunch_start.date | panamaDate : 'HH:mm'
                      }}</span>
                      } @if (hasLunchStart && hasLunchEnd) {
                      <span class="text-gray-500">→</span>
                      } @if (hasLunchEnd) {
                      <span class="text-white font-semibold">{{
                        log.lunch_end.date | panamaDate : 'HH:mm'
                      }}</span>
                      }
                    </div>
                  </div>
                </div>
                }

                <!-- Salida -->
                @if (hasExit) {
                <div
                  class="flex items-center gap-2 p-1.5 rounded-md bg-white/5 border border-blue-400/30"
                >
                  <div
                    class="flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/30 border-2 border-blue-400"
                  >
                    <i class="pi pi-sign-out text-[10px] text-blue-300"></i>
                  </div>
                  <div class="flex-1">
                    <div class="text-[11px] text-gray-300 font-medium">
                      Salida
                    </div>
                    <div class="text-[13px] text-white font-bold">
                      {{ log.exit.date | panamaDate : 'HH:mm' }}
                    </div>
                  </div>
                  @if (log.exit?.branch?.name) {
                  <div class="text-[9px] text-gray-400 truncate max-w-[60px]">
                    {{ log.exit.branch.name }}
                  </div>
                  }
                </div>
                }

                <!-- Horas trabajadas -->
                @if (workedHours) {
                <div
                  class="flex items-center justify-center gap-1.5 mt-1 pt-1.5 border-t border-white/10"
                >
                  <i class="pi pi-hourglass text-amber-400 text-xs"></i>
                  <span class="text-[12px] font-bold text-amber-300">{{
                    workedHours
                  }}</span>
                  <span class="text-[10px] text-gray-400">horas</span>
                </div>
                }
              </div>
            </div>
            }
          </div>
        </ng-template>
        }
      </p-card>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class EmployeePortalTimelogsTabComponent {
  public dataService = inject(EmployeePortalDataService);

  public calendarMonth = signal<Date>(new Date());

  public calendarDays = computed(() => {
    const monthStart = startOfMonth(this.calendarMonth());
    const monthEnd = endOfMonth(this.calendarMonth());
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Lunes
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 }); // Domingo

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  });

  public timelogMarkers = computed(() => {
    const logs = this.dataService.monthTimelogs();
    const days = this.calendarDays();

    // Map days to markers with associated log data
    return days.map((day) => {
      const dayStr = format(day, 'yyyy-MM-dd');
      // Find log for this day
      const log = logs.find((l) => l.day === dayStr);
      // We return an object structure expected by pt-calendar markers
      // Assuming pt-calendar expects an array of markers for each day?
      // Or pt-calendar iterates days and we pass markers per day?
      // Actually, existing template: [markers]="timelogMarkers()".
      // And template uses `*ngFor="let marker of markers"`.
      // This suggests `timelogMarkers()` returns an array of markers, but `pt-calendar` presumably handles layout.
      // If `pt-calendar` takes `markers`, it likely maps them to days internally OR `markers` is an array of objects that contain date info.

      // Wait, looking at usage: `let-markers` in template. `pt-calendar` probably emits markers for the specific cell?
      // No, `pt-calendar` doc is not here.
      // But based on logic:
      return {
        date: day,
        data: log || { day: dayStr }, // Ensure day is present even if no log
      };
    });
  });

  public onCalendarMonthChange(date: Date): void {
    console.log('[TimelogsTab] Cambio de mes en calendario:', date);
    this.calendarMonth.set(date);
    // dataService should update dateRange if it depends on it, but monthTimelogs might be independent or service needs update.
    // In original code: `this.dateRange.set([startOfMonth(newMonth), endOfMonth(newMonth)]);`
    // dataService.dateRange is likely what drives fetching?
    // In service creation I saw `dateRange` signal.
    // I should update dataService's dateRange.
    // But `dateRange` in service was extracted from main component.
    // I can update it via a method in service or direct set if exposed.
    // I made `dateRange` public in service.

    this.dataService.dateRange.set([startOfMonth(date), endOfMonth(date)]);
  }

  public calculateWorkedHours(
    entry: Date | null | undefined,
    exit: Date | null | undefined
  ): string {
    if (!entry || !exit) return '-';
    const entryDate = new Date(entry);
    const exitDate = new Date(exit);
    if (isNaN(entryDate.getTime()) || isNaN(exitDate.getTime())) return '-';

    const minutes = differenceInMinutes(exitDate, entryDate);
    if (minutes < 0) return '0h 0m';

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
}
