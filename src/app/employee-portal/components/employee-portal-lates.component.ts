import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { Card } from 'primeng/card';
import { TableModule } from 'primeng/table';

@Component({
  selector: 'pt-employee-portal-lates',
  standalone: true,
  imports: [CommonModule, Card, TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
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
              <td>{{ late.date | date : 'fullDate' }}</td>
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
    </p-card>
  `,
})
export class EmployeePortalLatesComponent {
  @Input() lates: Array<{
    date: Date;
    scheduled_time?: string;
    actual_time?: string;
    minutes: number;
  }> = [];
}
