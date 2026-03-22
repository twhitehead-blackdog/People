import { HttpClient, HttpParams, httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../../../../services/api-url.service';
import { OrganizationService } from '../../../../services/organization.service';
import { getEnv } from '../../../../utils/env.utils';

export type UniformTypeScope = 'all' | 'office' | 'branch';

export const SCOPE_LABELS: Record<UniformTypeScope, string> = {
  all: 'Todos',
  office: 'Solo Oficina Central',
  branch: 'Solo Sucursales',
};

export interface UniformType {
  id: string;
  name: string;
  company_id: string;
  is_active: boolean;
  scope: UniformTypeScope;
  created_at: string;
}

@Injectable({
  providedIn: 'root',
})
export class UniformTypesService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);

  public uniformTypesResource = httpResource<UniformType[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    const httpParams = new HttpParams()
      .set('select', 'id,name,company_id,is_active,scope,created_at')
      .set('company_id', `eq.${companyId}`)
      .set('order', 'name.asc');

    return {
      url: `${getEnv('ENV_SUPABASE_URL')}/rest/v1/uniform_types`,
      params: httpParams,
    };
  });

  public isLoading = computed(() => this.uniformTypesResource.isLoading());
  public all = computed(() => this.uniformTypesResource.value() ?? []);
  public active = computed(() => this.all().filter((t) => t.is_active));

  /** Opciones para el formulario, filtradas por si el empleado es de Oficina Central o sucursal */
  public getOptionsForBranch(branchName: string | undefined): { label: string; value: string }[] {
    const isOffice = branchName?.toLowerCase().includes('oficina central') ?? false;
    return this.active()
      .filter((t) => t.scope === 'all' || (isOffice ? t.scope === 'office' : t.scope === 'branch'))
      .map((t) => ({ label: t.name, value: t.name }));
  }

  /** Todas las opciones activas (sin filtrar por scope) — para catálogo */
  public activeOptions = computed(() =>
    this.active().map((t) => ({ label: t.name, value: t.name }))
  );

  public reload(): void {
    this.uniformTypesResource.reload();
  }

  public async create(name: string, scope: UniformTypeScope = 'all'): Promise<void> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return;
    await firstValueFrom(
      this.http.post(this.apiUrl.build('rest/v1/uniform_types'), {
        name: name.trim(),
        company_id: companyId,
        is_active: true,
        scope,
      })
    );
    this.reload();
  }

  public async update(id: string, data: { name?: string; scope?: UniformTypeScope }): Promise<void> {
    const payload: Record<string, unknown> = {};
    if (data.name !== undefined) payload['name'] = data.name.trim();
    if (data.scope !== undefined) payload['scope'] = data.scope;
    await firstValueFrom(
      this.http.patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/uniform_types?id=eq.${id}`,
        payload
      )
    );
    this.reload();
  }

  public async toggleActive(id: string, isActive: boolean): Promise<void> {
    await firstValueFrom(
      this.http.patch(
        `${getEnv('ENV_SUPABASE_URL')}/rest/v1/uniform_types?id=eq.${id}`,
        { is_active: isActive }
      )
    );
    this.reload();
  }
}
