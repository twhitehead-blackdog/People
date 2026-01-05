import { Component, input, Signal, WritableSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Branch, Position } from '../../../../models';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';

@Component({
  selector: 'pt-timetable-filters',
  standalone: true,
  imports: [FormsModule, InputText, Select],
  template: `
    <div class="flex lg:flex-row flex-col gap-2 mb-2">
      <input
        pInputText
        type="text"
        [ngModel]="employeeSearch()()"
        (ngModelChange)="employeeSearch().set($event)"
        placeholder="Buscar empleado por nombre..."
        class="w-full lg:w-auto flex-1 text-sm"
      />
      <p-select
        fluid
        [ngModel]="currentBranch()()"
        (ngModelChange)="currentBranch().set($event)"
        [options]="branches()"
        [disabled]="disableBranch()"
        appendTo="body"
        optionValue="id"
        placeholder="TODAS LAS SUCURSALES"
        filter
        showClear
        optionLabel="name"
        optionValue="id"
        class="w-full lg:w-auto flex-1 text-sm"
      />
      <p-select
        fluid
        [ngModel]="currentPosition()()"
        (ngModelChange)="currentPosition().set($event)"
        [options]="positions()"
        appendTo="body"
        placeholder="TODOS LOS PUESTOS"
        filter
        showClear
        optionLabel="name"
        optionValue="id"
        class="w-full lg:w-auto flex-1 text-sm"
      />
      <ng-content />
    </div>
  `,
})
export class TimetableFiltersComponent {
  // Inputs
  public branches = input.required<Branch[]>();
  public positions = input.required<Position[]>();
  public disableBranch = input.required<boolean>();

  // Signals para two-way binding (ahora son signals del servicio)
  public employeeSearch = input.required<WritableSignal<string>>();
  public currentBranch = input.required<WritableSignal<string | undefined>>();
  public currentPosition = input.required<WritableSignal<string | undefined>>();
}
