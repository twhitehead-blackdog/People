import { Component, input, output } from '@angular/core';
import { MenuItem } from 'primeng/api';
import { Button } from 'primeng/button';
import { Menu } from 'primeng/menu';

@Component({
  selector: 'pt-timetable-header',
  standalone: true,
  imports: [Button, Menu],
  template: `
    <div class="flex w-full lg:w-auto">
      <p-menu
        #menu
        [model]="menuItems()"
        [popup]="true"
        appendTo="body"
      />
      <p-button
        (click)="menu.toggle($event)"
        [label]="currentWeekLabel()"
        icon="pi pi-calendar"
        rounded
        severity="secondary"
        outlined
        size="small"
        class="w-full lg:w-auto whitespace-nowrap text-sm"
      />
    </div>
  `,
})
export class TimetableHeaderComponent {
  // Inputs
  public currentWeekLabel = input.required<string>();
  public menuItems = input.required<MenuItem[]>();

  // Outputs (no se usan directamente, el menú maneja los comandos)
  // Los comandos del menú se ejecutan directamente desde el componente padre
}
