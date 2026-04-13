import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { PersonnelMovement } from '../models/personnel-movements.model';

@Component({
  selector: 'pt-pm-movimientos-tab',
  standalone: true,
  imports: [TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-table
      [value]="movements"
      [paginator]="true"
      [rows]="20"
      [rowsPerPageOptions]="[10, 20, 50, 100]"
      [scrollable]="true"
      scrollHeight="500px"
      styleClass="p-datatable-sm"
      [globalFilterFields]="['employeeName', 'originBranchName', 'destinationBranchName']"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="employeeName">Colaborador</th>
          <th pSortableColumn="originBranchName">Sucursal Origen</th>
          <th pSortableColumn="destinationBranchName">Sucursal Destino</th>
          <th pSortableColumn="startDate">Fecha Inicio</th>
          <th pSortableColumn="endDate">Fecha Fin</th>
          <th pSortableColumn="durationDays" class="text-right">Días</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.employeeName }}</td>
          <td>{{ row.originBranchName || '—' }}</td>
          <td>{{ row.destinationBranchName }}</td>
          <td>{{ row.startDate }}</td>
          <td>{{ row.endDate }}</td>
          <td class="text-right font-semibold">{{ row.durationDays }}</td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6" class="text-center text-gray-400 py-4">
            No se detectaron movimientos con los filtros actuales.
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class PmMovimientosTabComponent {
  @Input({ required: true }) movements!: PersonnelMovement[];
}
