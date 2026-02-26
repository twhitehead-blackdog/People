import {
  ChangeDetectionStrategy,
  Component,
  inject,
  model,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Card } from 'primeng/card';
import { FluidModule } from 'primeng/fluid';
import { Select } from 'primeng/select';
import { TrimPipe } from '../pipes/trim.pipe';
import { EmployeesStore } from '../stores/employees.store';
import { EmployeeSchedulesComponent } from './employee-schedules.component';

@Component({
  selector: 'pt-shifts',
  imports: [
    Card,
    Select,
    TrimPipe,
    FluidModule,
    EmployeeSchedulesComponent,
    FormsModule,
  ],
  template: `<p-card>
    <ng-template #title>Turnos</ng-template>
    <ng-template #subtitle
      >Visualización de turnos por empleado</ng-template
    >
    <div class="flex">
      <div class="w-1/2">
        <p-select
          fluid
          [(ngModel)]="employeeId"
          [options]="store.employeesList()"
          appendTo="body"
          optionValue="id"
          placeholder="Seleccionar empleado"
          filter
          filterBy="first_name,father_name"
          showClear
        >
          <ng-template #selectedItem let-selected>
            {{ selected.first_name | trim }}
            {{ selected.father_name | trim }}
          </ng-template>
          <ng-template let-item #item>
            {{ item.first_name | trim }} {{ item.father_name | trim }}
          </ng-template>
        </p-select>
      </div>
    </div>
    @if(employeeId()) {
    <pt-employee-schedules [employeeId]="employeeId()!" />
    } @else {
    <div class="flex items-center justify-center h-40">
      <p>No hay empleado seleccionado</p>
    </div>
    }
  </p-card>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftsComponent {
  public store = inject(EmployeesStore);
  employeeId = model<string>();
}
