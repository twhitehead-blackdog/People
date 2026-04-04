import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { ApiUrlService } from './api-url.service';
import { OrganizationService } from './organization.service';

export type ScheduleChangeRequestType = 'create' | 'update' | 'delete';
export type ScheduleChangeRequestStatus = 'pending' | 'approved' | 'rejected';

export interface ScheduleChangeRequest {
  id: string;
  company_id: string;
  employee_id: string;
  branch_id: string | null;
  schedule_date: string;
  employee_schedule_id: string | null;
  current_schedule_id: string | null;
  proposed_schedule_id: string | null;
  request_type: ScheduleChangeRequestType;
  reason: string;
  requested_by: string;
  status: ScheduleChangeRequestStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  updated_at: string | null;
  // Joined relations
  employee?: { id: string; first_name: string; father_name: string };
  branch?: { id: string; name: string };
  current_schedule?: { id: string; name: string; color: string; entry_time: string | null; exit_time: string | null; day_off: boolean };
  proposed_schedule?: { id: string; name: string; color: string; entry_time: string | null; exit_time: string | null; day_off: boolean };
  requester?: { id: string; first_name: string; father_name: string };
  reviewer?: { id: string; first_name: string; father_name: string };
}

export interface CreateChangeRequestPayload {
  employee_id: string;
  branch_id: string | null;
  schedule_date: string;
  employee_schedule_id?: string | null;
  current_schedule_id?: string | null;
  proposed_schedule_id?: string | null;
  request_type: ScheduleChangeRequestType;
  reason: string;
  requested_by: string;
}

@Injectable({ providedIn: 'root' })
export class ScheduleChangeRequestService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);

  /**
   * Create a new change request.
   */
  createRequest(payload: CreateChangeRequestPayload): Observable<any> {
    const companyId = this.org.getCurrentCompanyId();
    const url = this.apiUrl.build('rest/v1/schedule_change_requests');
    return this.http.post(url, {
      ...payload,
      company_id: companyId,
      status: 'pending',
    });
  }

  /**
   * Fetch pending requests count for current company.
   */
  getPendingCount(): Observable<ScheduleChangeRequest[]> {
    const companyId = this.org.getCurrentCompanyId();
    const url = this.apiUrl.build('rest/v1/schedule_change_requests', {
      company_id: `eq.${companyId}`,
      status: 'eq.pending',
      select: 'id',
    });
    return this.http.get<ScheduleChangeRequest[]>(url);
  }

  /**
   * Fetch all requests with joins, optionally filtered by status.
   */
  getRequests(status?: ScheduleChangeRequestStatus): Observable<ScheduleChangeRequest[]> {
    const companyId = this.org.getCurrentCompanyId();
    const params: Record<string, string> = {
      company_id: `eq.${companyId}`,
      select: [
        'id,company_id,employee_id,branch_id,schedule_date,employee_schedule_id,',
        'current_schedule_id,proposed_schedule_id,request_type,reason,requested_by,',
        'status,reviewed_by,reviewed_at,review_notes,created_at,updated_at,',
        'employee:employees!schedule_change_requests_employee_id_fkey(id,first_name,father_name),',
        'branch:branches(id,name),',
        'current_schedule:schedules!schedule_change_requests_current_schedule_id_fkey(id,name,color,entry_time,exit_time,day_off),',
        'proposed_schedule:schedules!schedule_change_requests_proposed_schedule_id_fkey(id,name,color,entry_time,exit_time,day_off),',
        'requester:employees!schedule_change_requests_requested_by_fkey(id,first_name,father_name),',
        'reviewer:employees!schedule_change_requests_reviewed_by_fkey(id,first_name,father_name)',
      ].join(''),
      order: 'created_at.desc',
    };
    if (status) {
      params['status'] = `eq.${status}`;
    }
    const url = this.apiUrl.build('rest/v1/schedule_change_requests', params);
    return this.http.get<ScheduleChangeRequest[]>(url);
  }

  /**
   * Approve a request and apply the schedule change.
   */
  approveRequest(requestId: string, reviewerId: string, notes?: string): Observable<any> {
    const companyId = this.org.getCurrentCompanyId();
    const url = this.apiUrl.build('rest/v1/schedule_change_requests', {
      id: `eq.${requestId}`,
      company_id: `eq.${companyId}`,
      status: 'eq.pending',
    });
    return this.http.patch(url, {
      status: 'approved',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Reject a request.
   */
  rejectRequest(requestId: string, reviewerId: string, notes?: string): Observable<any> {
    const companyId = this.org.getCurrentCompanyId();
    const url = this.apiUrl.build('rest/v1/schedule_change_requests', {
      id: `eq.${requestId}`,
      company_id: `eq.${companyId}`,
      status: 'eq.pending',
    });
    return this.http.patch(url, {
      status: 'rejected',
      reviewed_by: reviewerId,
      reviewed_at: new Date().toISOString(),
      review_notes: notes || null,
      updated_at: new Date().toISOString(),
    });
  }

  /**
   * Apply the schedule change to employee_schedules based on request_type.
   * Called after a request is approved.
   */
  applyScheduleChange(req: ScheduleChangeRequest, reviewerId: string): Observable<any> {
    const companyId = this.org.getCurrentCompanyId();
    if (req.request_type === 'create') {
      const url = this.apiUrl.build('rest/v1/employee_schedules');
      return this.http.post(url, {
        employee_id: req.employee_id,
        branch_id: req.branch_id,
        schedule_id: req.proposed_schedule_id,
        start_date: req.schedule_date,
        end_date: req.schedule_date,
        approved: true,
        approved_by: reviewerId,
        company_id: companyId,
      });
    } else if (req.request_type === 'update' && req.employee_schedule_id) {
      if (!companyId) return of(null);
      const url = this.apiUrl.build('rest/v1/employee_schedules', {
        id: `eq.${req.employee_schedule_id}`,
        company_id: `eq.${companyId}`,
      });
      return this.http.patch(url, { schedule_id: req.proposed_schedule_id });
    } else if (req.request_type === 'delete' && req.employee_schedule_id) {
      if (!companyId) return of(null);
      const url = this.apiUrl.build('rest/v1/employee_schedules', {
        id: `eq.${req.employee_schedule_id}`,
        company_id: `eq.${companyId}`,
      });
      return this.http.delete(url);
    }
    return of(null);
  }

  /**
   * Get metrics: requests grouped by branch, requester, employee, and time period.
   */
  getRequestsForMetrics(
    dateFrom?: string,
    dateTo?: string
  ): Observable<ScheduleChangeRequest[]> {
    const companyId = this.org.getCurrentCompanyId();
    const params: Record<string, string> = {
      company_id: `eq.${companyId}`,
      select: [
        'id,employee_id,branch_id,schedule_date,request_type,reason,requested_by,',
        'status,reviewed_by,reviewed_at,created_at,',
        'employee:employees!schedule_change_requests_employee_id_fkey(id,first_name,father_name),',
        'branch:branches(id,name),',
        'requester:employees!schedule_change_requests_requested_by_fkey(id,first_name,father_name)',
      ].join(''),
      order: 'created_at.desc',
    };
    if (dateFrom && dateTo) {
      params['and'] = `(created_at.gte.${dateFrom},created_at.lte.${dateTo})`;
    } else if (dateFrom) {
      params['created_at'] = `gte.${dateFrom}`;
    } else if (dateTo) {
      params['created_at'] = `lte.${dateTo}`;
    }
    const url = this.apiUrl.build('rest/v1/schedule_change_requests', params);
    return this.http.get<ScheduleChangeRequest[]>(url);
  }
}
