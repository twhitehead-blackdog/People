import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { OrganizationService } from '../../../../services/organization.service';
import { getEnv } from '../../../../utils/env.utils';
import { DocumentRequest } from '../models/document-request.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentRequestsService {
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);

  // Expose the resource directly or wrapped in a signal
  public documentRequestsResource = httpResource<DocumentRequest[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    const httpParams = new HttpParams()
      .set(
        'select',
        'id,employee_id,created_by,document_type,custom_document_type,reason,document_url,status,processed_by,processed_at,rejection_comment,notes,metadata,created_at,updated_at,company_id,employee:employees!document_requests_employee_id_fkey(id,first_name,father_name,work_email,company_id,position:positions(name),branch:branches(id,name)),created_by_employee:employees!document_requests_created_by_fkey(id,first_name,father_name)'
      )
      .set('company_id', `eq.${companyId}`)
      .set('order', 'created_at.desc');

    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/document_requests`,
      params: httpParams,
    };
  });

  public isLoading = computed(() => this.documentRequestsResource.isLoading());
  public value = computed(() => this.documentRequestsResource.value() ?? []);
  public error = computed(() => this.documentRequestsResource.error());

  public reload() {
    this.documentRequestsResource.reload();
  }
}
