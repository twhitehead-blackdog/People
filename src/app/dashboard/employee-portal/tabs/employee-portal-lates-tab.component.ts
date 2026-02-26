import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { PanamaDatePipe } from '../../../pipes/panama-date.pipe';
import { EmployeePortalDataService } from '../services/employee-portal-data.service';

@Component({
  selector: 'pt-employee-portal-lates-tab',
  standalone: true,
  imports: [CommonModule, CardModule, TableModule, PanamaDatePipe],
  template: `
    <div class="tab-content">
      <p-card>
        <div class="overflow-x-auto">
          <p-table
            [value]="myLates()"
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
                  <div
                    class="flex flex-col items-center justify-center gap-4 py-8"
                  >
                    <i class="pi pi-check-circle text-green-400 text-4xl"></i>
                    <p class="text-gray-400">
                      ¡Excelente! No tienes tardanzas este mes
                    </p>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
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
export class EmployeePortalLatesTabComponent {
  private dataService = inject(EmployeePortalDataService);
  public myLates = this.dataService.myLates;
}
