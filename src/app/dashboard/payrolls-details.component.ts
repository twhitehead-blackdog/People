import { httpResource } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Skeleton } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { Payroll } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { PayrollDebtsComponent } from './payroll-debts.component';
import { PayrollDeductionsComponent } from './payroll-deductions.component';
import { PayrollEmployeesComponent } from './payroll-employees.component';
import { PayrollPaymentsComponent } from './payroll-payments.component';
import { PayrollSettingsComponent } from './payroll-settings.component';

@Component({
  selector: 'pt-payrolls-details',
  imports: [
    TabsModule,
    Skeleton,
    PayrollDeductionsComponent,
    PayrollEmployeesComponent,
    PayrollPaymentsComponent,
    PayrollDebtsComponent,
    PayrollSettingsComponent,
  ],
  template: `@if(payroll.isLoading()) {
    <div class="flex flex-col md:grid grid-cols-4 md:gap-4 ">
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
    </div>
    } @else {
    <div>
      <div class="flex items-center gap-3 mb-6">
        <i class="pi pi-calculator text-3xl text-amber-400"></i>
        <div>
          <h1 class="text-2xl font-bold text-white m-0">
            <span class="font-medium text-gray-400">Planilla: </span>
            {{ payroll.value()?.[0]?.name }}
          </h1>
        </div>
      </div>
      <p-tabs value="0" styleClass="custom-tabs">
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-calendar mr-2"></i> Periodos
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-users mr-2"></i> Empleados
          </p-tab>
          <p-tab value="2">
            <i class="pi pi-percentage mr-2"></i> Deducciones
          </p-tab>
          <p-tab value="3">
            <i class="pi pi-credit-card mr-2"></i> Deudas
          </p-tab>
          <p-tab value="4">
            <i class="pi pi-cog mr-2"></i> Configuracion
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            <pt-payroll-payments [payrollId]="payroll_id()" />
          </p-tabpanel>
          <p-tabpanel value="1">
            <pt-payroll-employees [payrollId]="payroll_id()" />
          </p-tabpanel>
          <p-tabpanel value="2">
            <pt-payroll-deductions [payrollId]="payroll_id()" />
          </p-tabpanel>
          <p-tabpanel value="3">
            <pt-payroll-debts [payrollId]="payroll_id()" />
          </p-tabpanel>
          <p-tabpanel value="4">
            <pt-payroll-settings [payrollId]="payroll_id()" />
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </div>
    }`,
  styles: `
    ::ng-deep .custom-tabs {
      .p-tablist {
        background: #18181b;
        border-bottom: 1px solid rgba(251, 191, 36, 0.2);
        padding: 0.5rem;
      }

      .p-tab {
        color: #9ca3af !important;
        padding: 0.75rem 1.5rem !important;
        border-radius: 0.5rem 0.5rem 0 0 !important;
        transition: all 0.2s ease !important;
      }

      .p-tab:hover {
        color: #ffffff !important;
        background: rgba(251, 191, 36, 0.1) !important;
      }

      .p-tab[aria-selected="true"] {
        color: #fbbf24 !important;
        background: rgba(251, 191, 36, 0.15) !important;
        border-bottom: 2px solid #fbbf24 !important;
      }

      .p-tabpanels {
        background: #18181b;
        padding: 1.5rem 0;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollsDetailsComponent {
  public payroll_id = input.required<string>();
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);

  public payroll = httpResource<Payroll[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const params: any = {
      select: `*, company:companies(*), employees:employee_payrolls(*), deductions:payroll_deductions(*)`,
      id: `eq.${this.payroll_id()}`,
    };

    // Agregar filtro por company_id
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    const url = this.apiUrl.build('rest/v1/payrolls', params);
    return {
      url,
      method: 'GET',
    };
  });
}
