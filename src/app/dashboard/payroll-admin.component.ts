import { ChangeDetectionStrategy, Component } from '@angular/core';
import { Card } from 'primeng/card';
import { PayrollSettingsComponent } from './payroll-settings.component';

@Component({
  selector: 'pt-payroll-admin',
  imports: [Card, PayrollSettingsComponent],
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center gap-3">
          <i class="pi pi-cog text-2xl text-amber-400"></i>
          <div>
            <h2 class="m-0">Administración de Planilla</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">Configuración general del sistema de planillas</p>
          </div>
        </div>
      </ng-template>

      <pt-payroll-settings [payrollId]="payrollId" />
    </p-card>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollAdminComponent {
  payrollId = '';
}
