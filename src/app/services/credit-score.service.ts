import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { OrganizationService } from './organization.service';

export interface CreditScoreFactor {
  score: number;
  max: number;
  label: string;
  [key: string]: unknown;
}

export interface CreditScoreResult {
  employee_id: string;
  employee_name: string;
  score: number;
  max_score: number;
  category: 'excelente' | 'bueno' | 'regular' | 'bajo' | 'critico' | 'inactivo';
  eligible: boolean;
  monthly_salary: number;
  calculated_at: string;
  analysis_period_days: number;
  factors: {
    tenure: CreditScoreFactor & { months: number };
    punctuality: CreditScoreFactor & { late_count: number; total_minutes_late: number; avg_minutes_late: number };
    attendance: CreditScoreFactor & { absence_days: number; unjustified_absences: number };
    debt_level: CreditScoreFactor & {
      active_loans: number;
      total_debt_balance: number;
      installment_per_period: number;
    };
    credit_history: CreditScoreFactor & { completed_loans: number; paused_loans: number };
  };
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class CreditScoreService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);

  async calculate(employeeId: string): Promise<CreditScoreResult> {
    const companyId = this.org.getCurrentCompanyId();
    const url = this.apiUrl.build('rest/v1/rpc/calculate_employee_credit_score');
    const body: Record<string, string> = { p_employee_id: employeeId };
    if (companyId) body['p_company_id'] = companyId;

    return firstValueFrom(
      this.http.post<CreditScoreResult>(url, body)
    );
  }
}
