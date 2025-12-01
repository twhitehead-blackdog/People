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
          placeholder="Buscar empleado (nombre, cédula o email)..."
          filter
          filterBy="first_name,father_name,mother_name,document_id,work_email"
          showClear
          [filterPlaceholder]="'Buscar por nombre, cédula o email...'"
        >
          <ng-template #selectedItem let-selected>
            <div class="flex flex-col">
              <span>{{ selected.first_name | trim }} {{ selected.father_name | trim }}</span>
              @if(selected.document_id || selected.work_email) {
                <span class="text-xs text-gray-400">
                  @if(selected.document_id) {
                    {{ selected.document_id }}
                  }
                  @if(selected.document_id && selected.work_email) {
                    • 
                  }
                  @if(selected.work_email) {
                    {{ selected.work_email }}
                  }
                </span>
              }
            </div>
          </ng-template>
          <ng-template let-item #item>
            <div class="flex flex-col">
              <span>{{ item.first_name | trim }} {{ item.father_name | trim }}</span>
              @if(item.document_id || item.work_email) {
                <span class="text-xs text-gray-400">
                  @if(item.document_id) {
                    {{ item.document_id }}
                  }
                  @if(item.document_id && item.work_email) {
                    • 
                  }
                  @if(item.work_email) {
                    {{ item.work_email }}
                  }
                </span>
              }
            </div>
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
