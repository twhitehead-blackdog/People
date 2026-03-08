import { Injectable, inject, computed } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { OrganizationService } from './organization.service';
import { ApiUrlService } from './api-url.service';
import type { EmployeeLiquidation } from '../models';

@Injectable({ providedIn: 'root' })
export class LiquidationService {
  private readonly http = inject(HttpClient);
  private readonly orgService = inject(OrganizationService);
  private readonly apiUrl = inject(ApiUrlService);

  public liquidationsResource = httpResource<EmployeeLiquidation[]>(() => {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return undefined;

    return {
      url: this.apiUrl.build('rest/v1/employee_liquidations', {
        select: '*',
        company_id: `eq.${companyId}`,
        order: 'created_at.desc',
      }),
    };
  });

  public isLoading = computed(() => this.liquidationsResource.isLoading());
  public value = computed(() => this.liquidationsResource.value() ?? []);
  public error = computed(() => this.liquidationsResource.error());

  public reload(): void {
    this.liquidationsResource.reload();
  }

  async getById(id: string): Promise<EmployeeLiquidation | null> {
    const url = this.apiUrl.build('rest/v1/employee_liquidations', {
      select: '*',
      id: `eq.${id}`,
    });
    const result = await firstValueFrom(
      this.http.get<EmployeeLiquidation[]>(url)
    );
    return result?.[0] ?? null;
  }

  async create(liquidation: Partial<EmployeeLiquidation>): Promise<EmployeeLiquidation> {
    const url = this.apiUrl.build('rest/v1/employee_liquidations', {
      select: '*',
    });
    const result = await firstValueFrom(
      this.http.post<EmployeeLiquidation[]>(url, liquidation, {
        headers: { Prefer: 'return=representation' },
      })
    );
    this.reload();
    return result[0];
  }

  async update(id: string, data: Partial<EmployeeLiquidation>): Promise<void> {
    const url = this.apiUrl.build('rest/v1/employee_liquidations', {
      id: `eq.${id}`,
    });
    await firstValueFrom(this.http.patch(url, data));
    this.reload();
  }

  async delete(id: string): Promise<void> {
    const url = this.apiUrl.build('rest/v1/employee_liquidations', {
      id: `eq.${id}`,
    });
    await firstValueFrom(this.http.delete(url));
    this.reload();
  }

  async getSalaryHistory(employeeId: string): Promise<{ monthly_salary: number; effective_date: string }[]> {
    const url = this.apiUrl.build('rest/v1/payroll_salary_history', {
      select: 'new_monthly_salary,effective_date',
      employee_id: `eq.${employeeId}`,
      order: 'effective_date.desc',
    });
    const result = await firstValueFrom(
      this.http.get<{ new_monthly_salary: number; effective_date: string }[]>(url)
    );
    return (result ?? []).map(r => ({
      monthly_salary: r.new_monthly_salary,
      effective_date: r.effective_date,
    }));
  }
}
