import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { OrganizationService } from '../../../../services/organization.service';
import { getEnv } from '../../../../utils/env.utils';
import { WorkPermitRequest } from '../models/work-permit-request.model';

@Injectable({
  providedIn: 'root',
})
export class WorkPermitsService {
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);

  public workPermitsResource = httpResource<WorkPermitRequest[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    const httpParams = new HttpParams()
      .set(
        'select',
        'id,employee_id,created_by,permit_type,start_date,end_date,start_time,end_time,equivalent_value,equivalent_unit,observations,document_url,status,reviewed_by,reviewed_at,rejection_comment,created_at,updated_at,company_id,employee:employees!work_permits_employee_id_fkey(id,first_name,father_name,work_email,company_id,position:positions(name),branch:branches(name)),created_by_employee:employees!work_permits_created_by_fkey(id,first_name,father_name)'
      )
      .set('company_id', `eq.${companyId}`)
      .set('order', 'created_at.desc');

    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/work_permits`,
      params: httpParams,
    };
  });

  public isLoading = computed(() => this.workPermitsResource.isLoading());
  public value = computed(() => this.workPermitsResource.value() ?? []);
  public error = computed(() => this.workPermitsResource.error());

  public reload() {
    this.workPermitsResource.reload();
  }
}
