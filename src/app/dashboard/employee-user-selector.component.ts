import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'pt-employee-user-selector',
  imports: [CommonModule],
  template: `<p>employee-user-selector works!</p>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeUserSelectorComponent {}
