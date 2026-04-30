import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Employee } from '../../../../models';
import { BranchHistoryEntry } from '../models/personnel-movements.model';

@Component({
  selector: 'pt-pm-historial-tab',
  standalone: true,
  imports: [FormsModule, TableModule, SelectModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-3">
      <div class="flex items-center gap-2">
        <label class="text-sm text-gray-300">Colaborador:</label>
        <p-select
          [options]="employeeOptions"
          optionLabel="label"
          optionValue="value"
          [ngModel]="selectedEmployeeId"
          (ngModelChange)="employeeChange.emit($event)"
          [filter]="true"
          filterBy="label"
          placeholder="Seleccionar empleado"
          [showClear]="true"
          styleClass="w-full md:w-96"
        />
      </div>

      @if (selectedEmployeeId) {
        <p-table
          [value]="history"
          [paginator]="true"
          [rows]="20"
          [scrollable]="true"
          scrollHeight="480px"
          styleClass="p-datatable-sm"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Fecha Inicio</th>
              <th>Fecha Fin</th>
              <th>Sucursal</th>
              <th>Tipo</th>
              <th class="text-right">Duración (días)</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td>{{ row.startDate }}</td>
              <td>{{ row.endDate }}</td>
              <td>{{ row.branchName }}</td>
              <td>
                @if (row.movementType === 'base') {
                  <span class="px-2 py-0.5 rounded bg-green-500/20 text-green-300 text-xs">Base</span>
                } @else {
                  <span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-xs">Movimiento</span>
                }
              </td>
              <td class="text-right">{{ row.durationDays }}</td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="5" class="text-center text-gray-400 py-4">
                Sin historial para este colaborador en el rango seleccionado.
              </td>
            </tr>
          </ng-template>
        </p-table>
      } @else {
        <p class="text-gray-400 text-sm">Seleccione un colaborador para ver su historial de sucursales.</p>
      }
    </div>
  `,
})
export class PmHistorialTabComponent {
  @Input({ required: true }) history: BranchHistoryEntry[] = [];
  @Input({ required: true }) selectedEmployeeId: string | null = null;
  @Input({ required: true }) employees: Employee[] = [];

  @Output() employeeChange = new EventEmitter<string | null>();

  public get employeeOptions() {
    return this.employees.map((e) => ({
      value: e.id,
      label: `${e.first_name} ${e.father_name}`.trim(),
    }));
  }
}
