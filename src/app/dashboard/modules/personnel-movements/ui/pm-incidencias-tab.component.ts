import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TableModule } from 'primeng/table';
import { Incidencia } from '../models/personnel-movements.model';

const LABELS: Record<Incidencia['type'], string> = {
  tardanza: 'Tardanza',
  salida_temprana: 'Salida Temprana',
  certificado_medico: 'Cert. Médico',
  ausencia_injustificada: 'Ausencia Injust.',
};

const BADGE: Record<Incidencia['type'], string> = {
  tardanza: 'bg-amber-500/20 text-amber-300',
  salida_temprana: 'bg-orange-500/20 text-orange-300',
  certificado_medico: 'bg-cyan-500/20 text-cyan-300',
  ausencia_injustificada: 'bg-red-500/20 text-red-300',
};

@Component({
  selector: 'pt-pm-incidencias-tab',
  standalone: true,
  imports: [TableModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-table
      [value]="incidencias"
      [paginator]="true"
      [rows]="20"
      [rowsPerPageOptions]="[10, 20, 50, 100]"
      [scrollable]="true"
      scrollHeight="500px"
      styleClass="p-datatable-sm"
    >
      <ng-template pTemplate="header">
        <tr>
          <th pSortableColumn="employeeName">Colaborador</th>
          <th pSortableColumn="date">Fecha</th>
          <th>Fecha Fin</th>
          <th>Sucursal</th>
          <th>Tipo</th>
          <th>Detalle</th>
        </tr>
      </ng-template>
      <ng-template pTemplate="body" let-row>
        <tr>
          <td>{{ row.employeeName }}</td>
          <td>{{ row.date }}</td>
          <td>{{ row.endDate || '—' }}</td>
          <td>{{ row.branchName || '—' }}</td>
          <td>
            <span class="px-2 py-0.5 rounded text-xs" [class]="badgeClass(row.type)">
              {{ label(row.type) }}
            </span>
          </td>
          <td class="text-sm text-gray-300">{{ row.detail }}</td>
        </tr>
      </ng-template>
      <ng-template pTemplate="emptymessage">
        <tr>
          <td colspan="6" class="text-center text-gray-400 py-4">
            Sin incidencias para los filtros actuales.
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
})
export class PmIncidenciasTabComponent {
  @Input({ required: true }) incidencias: Incidencia[] = [];

  public label(t: Incidencia['type']): string {
    return LABELS[t];
  }
  public badgeClass(t: Incidencia['type']): string {
    return BADGE[t];
  }
}
