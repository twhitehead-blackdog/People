import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { OrganizationService } from '../../../../services/organization.service';
import { ApiUrlService } from '../../../../services/api-url.service';
import { getEnv } from '../../../../utils/env.utils';
import { Disability, CompensatoryRequest } from '../models/disability.model';

@Injectable({
  providedIn: 'root',
})
export class HrDisabilitiesService {
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);

  // === Disabilities httpResource ===

  public disabilitiesResource = httpResource<Disability[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    const params: any = {
      select: `id,employee_id,created_by,start_date,end_date,description,document_url,status,reviewed_by,reviewed_at,review_notes,rejection_comment,created_at,updated_at,company_id,employee:employees!employee_disabilities_employee_id_fkey(id,first_name,father_name,mother_name,work_email,company_id,position:positions(name),branch:branches(name)),created_by_employee:employees!employee_disabilities_created_by_fkey(first_name,father_name)`,
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_disabilities`,
      method: 'GET',
      params,
    };
  });

  public disabilities = computed(() => this.disabilitiesResource.value() ?? []);
  public disabilitiesLoading = computed(() => this.disabilitiesResource.isLoading());

  // === Compensatory httpResource ===

  public compensatoryResource = httpResource<CompensatoryRequest[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';
    if (!companyId) return undefined;

    const params: any = {
      select: `id,employee_id,type_id,date_from,date_to,notes,is_approved,compensatory_type,compensatory_amount,review_status,reviewed_by,reviewed_at,rejection_comment,created_at,company_id,document_url,type:timeoff_types(id,name),employee:employees!time_offs_employee_id_fkey(id,first_name,father_name,work_email,company_id,position:positions(name),branch:branches(name)),created_by_employee:employees!timeoffs_created_by_fkey(first_name,father_name)`,
      type_id: `eq.${compensatoryTypeId}`,
      company_id: `eq.${companyId}`,
      order: 'created_at.desc',
    };

    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs`,
      method: 'GET',
      params,
    };
  });

  public compensatory = computed(() => this.compensatoryResource.value() ?? []);
  public compensatoryLoading = computed(() => this.compensatoryResource.isLoading());

  // === CRUD Operations ===

  updateDisabilityStatus(id: string, data: Record<string, unknown>): Observable<any> {
    return this.http.patch(
      this.apiUrl.build('rest/v1/employee_disabilities', { id: `eq.${id}` }),
      data
    );
  }

  saveDisabilityRejectionComment(id: string, comment: string | null): Observable<any> {
    return this.http.patch(
      this.apiUrl.build('rest/v1/employee_disabilities', { id: `eq.${id}` }),
      { rejection_comment: comment }
    );
  }

  updateCompensatoryReviewStatus(id: string, data: Record<string, unknown>): Observable<any> {
    return this.http.patch(
      this.apiUrl.build('rest/v1/timeoffs', { id: `eq.${id}` }),
      data
    );
  }

  saveCompensatoryRejectionComment(id: string, comment: string | null): Observable<any> {
    return this.http.patch(
      this.apiUrl.build('rest/v1/timeoffs', { id: `eq.${id}` }),
      { rejection_comment: comment }
    );
  }

  // === Overtime Data ===

  getEmployeeTimelogs(
    employeeId: string,
    companyId: string,
    startTimestamp: string,
    endTimestamp: string
  ): Observable<any[]> {
    const params = new HttpParams()
      .set('select', 'type,created_at,employee_id,company_id')
      .set('employee_id', `eq.${employeeId}`)
      .set('company_id', `eq.${companyId}`)
      .set('created_at', `gte.${startTimestamp}`)
      .append('created_at', `lte.${endTimestamp}`)
      .set('order', 'created_at.asc');

    return this.http.get<any[]>(`${this.apiUrl.baseUrl}/rest/v1/timelogs`, { params });
  }

  getOvertimeConsumptions(
    employeeId: string,
    companyId: string,
    startDay: string,
    endDay: string
  ): Observable<any[]> {
    const params = new HttpParams()
      .set('select', 'overtime_day,hours_used')
      .set('employee_id', `eq.${employeeId}`)
      .set('company_id', `eq.${companyId}`)
      .set('overtime_day', `gte.${startDay}`)
      .append('overtime_day', `lte.${endDay}`);

    return this.http.get<any[]>(`${this.apiUrl.baseUrl}/rest/v1/overtime_consumptions`, { params });
  }

  getTimelogsForDays(employeeId: string, companyId: string, days: string[]): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl.baseUrl}/rest/v1/timelogs`, {
      params: {
        select: 'day,type,created_at,employee_id,company_id',
        employee_id: `eq.${employeeId}`,
        company_id: `eq.${companyId}`,
        day: `in.(${days.join(',')})`,
        order: 'day.asc,created_at.asc',
      },
    });
  }

  getConsumptionsForDays(employeeId: string, companyId: string, days: string[]): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl.baseUrl}/rest/v1/overtime_consumptions`, {
      params: {
        select: 'overtime_day,hours_used',
        employee_id: `eq.${employeeId}`,
        company_id: `eq.${companyId}`,
        overtime_day: `in.(${days.join(',')})`,
      },
    });
  }

  createOvertimeConsumptions(rows: Record<string, unknown>[]): Observable<any> {
    return this.http.post(`${this.apiUrl.baseUrl}/rest/v1/overtime_consumptions`, rows, {
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
    });
  }

  // === Notifications ===

  findLiaEmployees(companyId: string): Observable<{ positions: any[]; employees: any[] }> {
    // Returns a combined observable - caller chains manually
    // Kept as individual calls for flexibility
    return new Observable((subscriber) => {
      this.http
        .get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/positions`, {
          params: {
            select: 'id',
            name: 'eq.Especialista de Nómina y Gestión Administrativa',
            company_id: `eq.${companyId}`,
          },
        })
        .subscribe({
          next: (positions) => {
            if (!positions || positions.length === 0) {
              subscriber.next({ positions: [], employees: [] });
              subscriber.complete();
              return;
            }
            const positionIds = positions.map((p) => p.id);
            this.http
              .get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/employees`, {
                params: {
                  select: 'id,first_name,father_name',
                  position_id: `in.(${positionIds.join(',')})`,
                  company_id: `eq.${companyId}`,
                  is_active: 'eq.true',
                },
              })
              .subscribe({
                next: (employees) => {
                  subscriber.next({ positions, employees: employees ?? [] });
                  subscriber.complete();
                },
                error: (err) => subscriber.error(err),
              });
          },
          error: (err) => subscriber.error(err),
        });
    });
  }

  sendHrMessages(messages: Record<string, unknown> | Record<string, unknown>[]): Observable<any> {
    return this.http.post(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/hr_messages`, messages, {
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
      },
    });
  }

  // === Document Upload ===

  uploadDocument(filePath: string, file: File): Observable<any> {
    const storageKey = getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') || getEnv('ENV_SUPABASE_API_KEY') || '';
    return this.http.post(`${this.apiUrl.baseUrl}/storage/v1/object/compensatory/${filePath}`, file, {
      headers: {
        apikey: storageKey,
        Authorization: `Bearer ${storageKey}`,
        'x-upsert': 'true',
      },
    });
  }

  updateCompensatoryDocumentUrl(id: string, documentUrl: string): Observable<any> {
    return this.http.patch(
      this.apiUrl.build('rest/v1/timeoffs', { id: `eq.${id}` }),
      { document_url: documentUrl }
    );
  }

  // === Audit History ===

  getCompensatoryTimeoffIds(companyId: string): Observable<any[]> {
    const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';
    return this.http.get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs`, {
      params: {
        type_id: `eq.${compensatoryTypeId}`,
        select: 'id,employee:employees!time_offs_employee_id_fkey(company_id)',
        'employee.company_id': `eq.${companyId}`,
      },
    });
  }

  getAuditLogs(timeoffIds: string[]): Observable<any[]> {
    return this.http.get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoff_audit_log`, {
      params: {
        timeoff_id: `in.(${timeoffIds.join(',')})`,
        select: `*,changed_by_employee:changed_by(id,first_name,father_name,work_email)`,
        order: 'changed_at.desc',
        limit: '1000',
      },
    });
  }

  // === Employee Lookup ===

  getEmployeeNameById(employeeId: string): Observable<any[]> {
    return this.http.get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/employees`, {
      params: {
        id: `eq.${employeeId}`,
        select: 'first_name,father_name',
      },
    });
  }

  // === Convenience ===

  reload(): void {
    this.disabilitiesResource.reload();
    this.compensatoryResource.reload();
  }

  reloadDisabilities(): void {
    this.disabilitiesResource.reload();
  }

  reloadCompensatory(): void {
    this.compensatoryResource.reload();
  }
}
