import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { MetaBranchView } from '../models/personnel-movements.model';

@Component({
  selector: 'pt-pm-metas-tab',
  standalone: true,
  imports: [TableModule, DecimalPipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-table
      [value]="metas"
      [paginator]="true"
      [rows]="20"
      [scrollable]="true"
      scrollHeight="500px"
      dataKey="analyticAccountId"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th style="width: 3rem"></th>
          <th pSortableColumn="branchName">Tienda</th>
          <th pSortableColumn="topPercentage" class="text-right">Cumplimiento %</th>
          <th>Nivel</th>
          <th class="text-right">Personal</th>
          <th class="text-right">Movimientos</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row let-expanded="expanded">
        <tr>
          <td>
            <button
              type="button"
              class="text-cyan-400 hover:text-cyan-300"
              [pRowToggler]="row"
              [attr.aria-label]="expanded ? 'Colapsar' : 'Expandir'"
            >
              <i class="pi" [class.pi-chevron-down]="expanded" [class.pi-chevron-right]="!expanded"></i>
            </button>
          </td>
          <td>
            {{ row.branchName }}
            @if (!row.branchId) {
              <span class="ml-2 text-xs text-gray-500">(sin mapeo)</span>
            }
          </td>
          <td class="text-right font-semibold" [class.text-green-400]="row.achievedTier !== null">
            {{ row.topPercentage }}%
          </td>
          <td>
            @if (row.achievedTier) {
              <span class="px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-xs uppercase">
                {{ row.achievedTier }}
              </span>
            } @else {
              <span class="text-xs text-gray-500">Ninguno</span>
            }
          </td>
          <td class="text-right">{{ row.personnel.length }}</td>
          <td class="text-right">{{ row.movementsCount }}</td>
        </tr>
      </ng-template>
      <ng-template pTemplate="rowexpansion" let-row>
        <tr>
          <td colspan="6">
            <div class="p-3 bg-neutral-900/40 text-sm">
              <div class="mb-2 text-gray-400">
                <strong>Estado Odoo:</strong> {{ row.estadoGeneral || '—' }} |
                <strong>Ventas actuales:</strong> {{ row.ventasActuales | number }}
              </div>
              <div>
                <strong class="text-gray-300">Personal asignado ({{ row.personnel.length }}):</strong>
                @if (row.personnel.length > 0) {
                  <ul class="list-disc pl-5 text-gray-300">
                    @for (p of row.personnel; track p.employeeId) {
                      <li>{{ p.employeeName }}</li>
                    }
                  </ul>
                } @else {
                  <span class="text-gray-500"> Sin personal asignado a esta sucursal.</span>
                }
              </div>
            </div>
          </td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6" class="text-center text-gray-400 py-4">
            Sin datos de metas. Verifica que el API <code>/api/metas</code> esté disponible.
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class PmMetasTabComponent {
  @Input({ required: true }) metas: MetaBranchView[] = [];
}
