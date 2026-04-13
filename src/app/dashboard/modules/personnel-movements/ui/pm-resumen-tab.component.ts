import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { MovementsSummary } from '../models/personnel-movements.model';

@Component({
  selector: 'pt-pm-resumen-tab',
  standalone: true,
  imports: [TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">
      <div class="bg-neutral-800/60 border border-neutral-700/50 rounded-lg p-4">
        <h3 class="text-sm font-semibold text-white mb-3">Totales por Sucursal</h3>
        <p-table [value]="summary.perBranch" [scrollable]="true" scrollHeight="420px" styleClass="p-datatable-sm">
          <ng-template pTemplate="header">
            <tr>
              <th>Sucursal</th>
              <th class="text-right">Personal</th>
              <th class="text-right">Mov. Salida</th>
              <th class="text-right">Mov. Entrada</th>
              <th class="text-right">Incidencias</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.branchName }}</td>
              <td class="text-right">{{ row.personnelCount }}</td>
              <td class="text-right">{{ row.movementsOut }}</td>
              <td class="text-right">{{ row.movementsIn }}</td>
              <td class="text-right">{{ row.incidencias }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5" class="text-center text-gray-400 py-4">Sin datos para el período seleccionado.</td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
})
export class PmResumenTabComponent {
  @Input({ required: true }) summary!: MovementsSummary;
}
