import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { getEnv } from '../../../../utils/env.utils';
import { DocumentRequest } from '../models/document-request.model';

@Injectable({
  providedIn: 'root',
})
export class DocumentRequestsService {
  private http = inject(HttpClient);
  private dashboardStore = inject(DashboardStore);

  // Expose the resource directly or wrapped in a signal
  public documentRequestsResource = httpResource<DocumentRequest[]>(() => {
    const companyId = this.dashboardStore.selectedCompanyId();
    if (!companyId) return undefined;

    let httpParams = new HttpParams()
      .set(
        'select',
        'id,employee_id,created_by,document_type,reason,document_url,status,reviewed_by,reviewed_at,review_notes,rejection_comment,created_at,updated_at,company_id,employee:employees(id,first_name,father_name,work_email,company_id,position:positions(name),branch:branches(name))'
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
