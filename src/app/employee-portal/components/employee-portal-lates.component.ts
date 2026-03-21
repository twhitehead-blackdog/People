import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { PanamaDatePipe } from '../../pipes/panama-date.pipe';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'pt-employee-portal-lates',
  standalone: true,
  imports: [CommonModule, TableModule, PanamaDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (device.isDesktop()) {
    <div class="portal-form-panel rounded-2xl">
      <div class="overflow-x-auto">
        <p-table
          [value]="lates"
          [rows]="10"
          [rowsPerPageOptions]="[10, 20, 50]"
          paginator
          paginatorDropdownAppendTo="body"
          styleClass="p-datatable-sm md:p-datatable-lg"
          [scrollable]="true"
          scrollHeight="400px"
          [responsiveLayout]="'scroll'"
        >
          <ng-template #header>
            <tr>
              <th>Fecha</th>
              <th>Horario Programado</th>
              <th>Hora de Entrada</th>
              <th>Minutos de Retraso</th>
            </tr>
          </ng-template>
          <ng-template #body let-late>
            <tr>
              <td>{{ late.date | panamaDate : 'fullDate' }}</td>
              <td>{{ late.scheduled_time || '-' }}</td>
              <td>{{ late.actual_time || '-' }}</td>
              <td>
                <span
                  class="font-semibold"
                  [class.text-yellow-400]="late.minutes <= 10"
                  [class.text-red-400]="late.minutes > 10"
                >
                  {{ late.minutes }} min
                </span>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="4">
                <div class="flex flex-col items-center justify-center gap-4 py-8">
                  <i class="pi pi-check-circle text-green-400 text-4xl"></i>
                  <p class="text-gray-400">¡Excelente! No tienes tardanzas este mes</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
    } @else {
    <div class="px-4 py-4">
      @if (lates.length === 0) {
      <div class="flex flex-col items-center justify-center gap-3 py-8">
        <i class="pi pi-check-circle text-green-400 text-3xl"></i>
        <p class="text-gray-400 text-sm">No tienes tardanzas este mes</p>
      </div>
      } @else {
      <div class="flex flex-col gap-2.5">
        @for (late of lates; track late.date) {
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-xs font-semibold text-white">{{ late.date | panamaDate : 'fullDate' }}</span>
            <span
              class="text-xs font-bold px-2 py-0.5 rounded-full"
              [class.text-yellow-300]="late.minutes <= 10"
              [class.bg-yellow-500/20]="late.minutes <= 10"
              [class.text-red-300]="late.minutes > 10"
              [class.bg-red-500/20]="late.minutes > 10"
            >
              {{ late.minutes }} min
            </span>
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div>
              <span class="text-[10px] text-gray-500 uppercase">Programado</span>
              <p class="text-xs text-gray-300 m-0">{{ late.scheduled_time || '-' }}</p>
            </div>
            <div>
              <span class="text-[10px] text-gray-500 uppercase">Entrada</span>
              <p class="text-xs text-gray-300 m-0">{{ late.actual_time || '-' }}</p>
            </div>
          </div>
        </div>
        }
      </div>
      }
    </div>
    }
  `,
})
export class EmployeePortalLatesComponent {
  protected device = inject(DeviceService);
  @Input() lates: Array<{
    date: Date;
    scheduled_time?: string;
    actual_time?: string;
    minutes: number;
  }> = [];
}
