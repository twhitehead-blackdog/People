import { Component, Input } from '@angular/core';

/**
 * Shared component for HR module statistics grid.
 * Displays 4 stat cards: Total, Pending, Approved, Rejected.
 *
 * @example
 * ```html
 * <pt-hr-stats-grid
 *   [totalCount]="totalCount()"
 *   [pendingCount]="pendingCount()"
 *   [approvedCount]="approvedCount()"
 *   [rejectedCount]="rejectedCount()"
 *   icon="pi-calendar"
 *   accentColor="purple"
 * />
 * ```
 */
@Component({
  selector: 'pt-hr-stats-grid',
  standalone: true,
  template: `
    <div class="grid grid-cols-4 gap-2">
      <!-- Total -->
      <div
        class="group relative bg-gradient-to-br from-neutral-800 to-neutral-800/80 rounded-lg p-3 border border-neutral-700/50 hover:border-cyan-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-cyan-500/10 cursor-pointer"
      >
        <div class="flex items-center justify-between">
          <div
            class="w-8 h-8 rounded-md bg-gradient-to-br from-gray-500/20 to-gray-600/20 flex items-center justify-center group-hover:scale-105 transition-transform"
          >
            <i [class]="'pi ' + icon + ' text-lg text-gray-400'"></i>
          </div>
          <div class="text-right flex-1">
            <p
              class="text-[10px] font-medium text-gray-400 uppercase tracking-wider m-0"
            >
              Total
            </p>
            <p class="text-xl font-bold text-white m-0">{{ totalCount }}</p>
          </div>
        </div>
        <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
          <div
            class="h-full bg-gradient-to-r from-gray-500 to-gray-400 rounded-full"
            [style.width.%]="100"
          ></div>
        </div>
      </div>

      <!-- Pendientes -->
      <div
        class="group relative bg-gradient-to-br from-yellow-500/10 via-yellow-500/5 to-neutral-800 rounded-lg p-3 border border-yellow-500/30 hover:border-yellow-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-yellow-500/20 cursor-pointer"
      >
        <div class="flex items-center justify-between">
          <div
            class="w-8 h-8 rounded-md bg-gradient-to-br from-yellow-500/30 to-yellow-600/20 flex items-center justify-center group-hover:scale-105 transition-transform"
          >
            <i class="pi pi-clock text-lg text-yellow-400"></i>
          </div>
          <div class="text-right flex-1">
            <p
              class="text-[10px] font-medium text-yellow-400/80 uppercase tracking-wider m-0"
            >
              Pendientes
            </p>
            <p class="text-xl font-bold text-yellow-300 m-0">
              {{ pendingCount }}
            </p>
          </div>
        </div>
        <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
          <div
            class="h-full bg-gradient-to-r from-yellow-500 to-yellow-400 rounded-full"
            [style.width.%]="
              totalCount > 0 ? (pendingCount / totalCount) * 100 : 0
            "
          ></div>
        </div>
      </div>

      <!-- Aprobadas -->
      <div
        class="group relative bg-gradient-to-br from-green-500/10 via-green-500/5 to-neutral-800 rounded-lg p-3 border border-green-500/30 hover:border-green-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-green-500/20 cursor-pointer"
      >
        <div class="flex items-center justify-between">
          <div
            class="w-8 h-8 rounded-md bg-gradient-to-br from-green-500/30 to-green-600/20 flex items-center justify-center group-hover:scale-105 transition-transform"
          >
            <i class="pi pi-check-circle text-lg text-green-400"></i>
          </div>
          <div class="text-right flex-1">
            <p
              class="text-[10px] font-medium text-green-400/80 uppercase tracking-wider m-0"
            >
              Aprobadas
            </p>
            <p class="text-xl font-bold text-green-300 m-0">
              {{ approvedCount }}
            </p>
          </div>
        </div>
        <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
          <div
            class="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
            [style.width.%]="
              totalCount > 0 ? (approvedCount / totalCount) * 100 : 0
            "
          ></div>
        </div>
      </div>

      <!-- Rechazadas -->
      <div
        class="group relative bg-gradient-to-br from-red-500/10 via-red-500/5 to-neutral-800 rounded-lg p-3 border border-red-500/30 hover:border-red-400/50 transition-all duration-200 hover:shadow-lg hover:shadow-red-500/20 cursor-pointer"
      >
        <div class="flex items-center justify-between">
          <div
            class="w-8 h-8 rounded-md bg-gradient-to-br from-red-500/30 to-red-600/20 flex items-center justify-center group-hover:scale-105 transition-transform"
          >
            <i class="pi pi-times-circle text-lg text-red-400"></i>
          </div>
          <div class="text-right flex-1">
            <p
              class="text-[10px] font-medium text-red-400/80 uppercase tracking-wider m-0"
            >
              Rechazadas
            </p>
            <p class="text-xl font-bold text-red-300 m-0">
              {{ rejectedCount }}
            </p>
          </div>
        </div>
        <div class="h-0.5 bg-neutral-700 rounded-full overflow-hidden mt-2">
          <div
            class="h-full bg-gradient-to-r from-red-500 to-red-400 rounded-full"
            [style.width.%]="
              totalCount > 0 ? (rejectedCount / totalCount) * 100 : 0
            "
          ></div>
        </div>
      </div>
    </div>
  `,
})
export class HrStatsGridComponent {
  @Input() totalCount = 0;
  @Input() pendingCount = 0;
  @Input() approvedCount = 0;
  @Input() rejectedCount = 0;
  @Input() icon = 'pi-file';
}
