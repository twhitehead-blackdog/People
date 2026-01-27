import { HttpClient, httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { format } from 'date-fns';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { EmployeeRequest } from '../models/employee-requests.model';
import {
  mapCompensatoryToRequest,
  mapDisabilityToRequest,
  mapVacationToRequest,
} from './employee-requests.mapper';

@Injectable({
  providedIn: 'root',
})
export class EmployeeRequestsService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);

  // Signals to drive the queries
  public startDate = signal<Date>(new Date());
  public endDate = signal<Date>(new Date());

  // --- Vacations Resource ---
  private vacationsResource = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    const start = format(this.startDate(), 'yyyy-MM-dd');
    const end = format(this.endDate(), 'yyyy-MM-dd');

    // Policy: HR sees all. Managers see branch. RLS handles visibility.
    // Filter by overlapping date range: start_date <= range_end AND end_date >= range_start
    return {
      url: this.apiUrl.build('rest/v1/employee_vacations', {
        select: 'id, start_date, end_date, employee_id, status',
        company_id: `eq.${companyId}`,
        status: 'eq.approved',
        and: `(start_date.lte.${end},end_date.gte.${start})`,
      }),
      method: 'GET',
    };
  });

  // --- Disabilities Resource ---
  private disabilitiesResource = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    const start = format(this.startDate(), 'yyyy-MM-dd');
    const end = format(this.endDate(), 'yyyy-MM-dd');

    return {
      url: this.apiUrl.build('rest/v1/employee_disabilities', {
        select: 'id, start_date, end_date, employee_id, status',
        company_id: `eq.${companyId}`, // Assuming column exists, otherwise filter by employee join if needed, but standard tables usually have company_id
        status: 'eq.approved',
        and: `(start_date.lte.${end},end_date.gte.${start})`,
      }),
      method: 'GET',
    };
  });

  // --- Compensatory Resource ---
  private compensatoryResource = httpResource<any[]>(() => {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return undefined;

    const start = format(this.startDate(), 'yyyy-MM-dd');
    const end = format(this.endDate(), 'yyyy-MM-dd');

    // Compensatory uses date_from/date_to in timeoffs table
    return {
      url: this.apiUrl.build('rest/v1/timeoffs', {
        select:
          'id, date_from, date_to, employee_id, review_status, compensatory_type',
        company_id: `eq.${companyId}`,
        review_status: 'eq.approved',
        and: `(date_from.lte.${end},date_to.gte.${start})`,
      }),
      method: 'GET',
    };
  });

  // --- Unified Requests Signal ---
  public approvedRequests = computed<EmployeeRequest[]>(() => {
    const vacations = this.vacationsResource.value() ?? [];
    const disabilities = this.disabilitiesResource.value() ?? [];
    const compensatory = this.compensatoryResource.value() ?? [];

    const requests: EmployeeRequest[] = [
      ...vacations.map(mapVacationToRequest),
      ...disabilities.map(mapDisabilityToRequest),
      ...compensatory.map(mapCompensatoryToRequest),
    ];

    return requests;
  });

  public isLoading = computed(
    () =>
      this.vacationsResource.isLoading() ||
      this.disabilitiesResource.isLoading() ||
      this.compensatoryResource.isLoading()
  );

  public refresh() {
    this.vacationsResource.reload();
    this.disabilitiesResource.reload();
    this.compensatoryResource.reload();
  }
}
