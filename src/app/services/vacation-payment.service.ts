import { Injectable, inject, computed } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from './organization.service';
import { ApiUrlService } from './api-url.service';
import type { VacationPayment } from '../models';

@Injectable({ providedIn: 'root' })
export class VacationPaymentService {
  private readonly http = inject(HttpClient);
  private readonly orgService = inject(OrganizationService);
  private readonly apiUrl = inject(ApiUrlService);

  public vacationPaymentsResource = httpResource<VacationPayment[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/vacation_payments', {
        select: '*, employee:employees(id,first_name,father_name,document_id,monthly_salary,start_date,branch:branches(id,name),position:positions(id,name),department:departments(id,name))',
        company_id: `eq.${companyId}`,
        order: 'created_at.desc',
      }),
    };
  });

  public isLoading = computed(() => this.vacationPaymentsResource.isLoading());
  public value = computed(() => this.vacationPaymentsResource.value() ?? []);
  public error = computed(() => this.vacationPaymentsResource.error());

  public reload(): void {
    this.vacationPaymentsResource.reload();
  }

  async create(payment: Partial<VacationPayment>): Promise<VacationPayment> {
    const url = this.apiUrl.build('rest/v1/vacation_payments', {
      select: '*',
    });
    const result = await firstValueFrom(
      this.http.post<VacationPayment[]>(url, payment, {
        headers: { Prefer: 'return=representation' },
      })
    );
    this.reload();
    return result[0];
  }

  async update(id: string, data: Partial<VacationPayment>): Promise<void> {
    const url = this.apiUrl.build('rest/v1/vacation_payments', {
      id: `eq.${id}`,
    });
    await firstValueFrom(this.http.patch(url, data));
    this.reload();
  }

  async delete(id: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/vacation_payments', {
      id: `eq.${id}`,
    });
    await firstValueFrom(this.http.delete(url));
    this.reload();
  }

  async getUsedVacationDays(employeeId: string): Promise<number> {
    const url = this.apiUrl.build('rest/v1/employee_vacations', {
      select: 'start_date,end_date',
      employee_id: `eq.${employeeId}`,
      status: 'eq.approved',
    });
    const vacations = await firstValueFrom(
      this.http.get<{ start_date: string; end_date: string }[]>(url)
    );
    if (!vacations) return 0;

    let totalDays = 0;
    for (const v of vacations) {
      const start = new Date(v.start_date);
      const end = new Date(v.end_date);
      const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      totalDays += diff;
    }
    return totalDays;
  }
}
