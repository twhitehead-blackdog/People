import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Card } from 'primeng/card';
import { TabsModule } from 'primeng/tabs';
import { PayrollSettingsComponent } from './payroll-settings.component';

@Component({
  selector: 'pt-payroll-admin',
  imports: [Card, TabsModule, PayrollSettingsComponent],
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

      <p-tabs value="0">
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-sliders-h mr-2"></i> Configuración
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-calendar mr-2"></i> Días Feriados
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            <pt-payroll-settings [payrollId]="payrollId" />
          </p-tabpanel>
          <p-tabpanel value="1">
            <pt-payroll-settings [payrollId]="payrollId" />
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </p-card>
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollAdminComponent {
  private route = inject(ActivatedRoute);
  payrollId = '';
}
