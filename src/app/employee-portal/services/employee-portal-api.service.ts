import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Employee, TimeOff } from '../../models';
import { LoggerService } from '../../services/logger.service';
import { OrganizationService } from '../../services/organization.service';

type TimeoffRequestPayload = Omit<TimeOff, 'date_from' | 'date_to'> & {
  date_from: string | Date;
  date_to: string | Date;
};

@Injectable({ providedIn: 'root' })
export class EmployeePortalApiService {
  private http = inject(HttpClient);
  private logger = inject(LoggerService);
  private organizationService = inject(OrganizationService);

  private get baseUrl(): string {
    const url = process.env['ENV_SUPABASE_URL'];
    if (!url) {
      const message = 'ENV_SUPABASE_URL no está configurada';
      this.logger.error('[EmployeePortalApiService]', message);
      throw new Error(message);
    }
    return url;
  }

  private get headers() {
    return {
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    };
  }

  private get timeoffsEndpoint() {
    return `${this.baseUrl}/rest/v1/timeoffs`;
  }

  private get hrMessagesEndpoint() {
    return `${this.baseUrl}/rest/v1/hr_messages`;
  }

  private get positionsEndpoint() {
    return `${this.baseUrl}/rest/v1/positions`;
  }

  private get employeesEndpoint() {
    return `${this.baseUrl}/rest/v1/employees`;
  }

  public async createTimeoffRequest(timeoff: TimeoffRequestPayload): Promise<any> {
    return firstValueFrom(
      this.http.post<any>(this.timeoffsEndpoint, timeoff, {
        headers: this.headers,
      })
    );
  }

  public async createHrMessages(payload: Record<string, unknown>[]): Promise<void> {
    if (!payload.length) {
      return;
    }
    await firstValueFrom(
      this.http.post(this.hrMessagesEndpoint, payload, {
        headers: this.headers,
      })
    );
  }

  public async notifyHrReviewer(timeoffId: string, currentEmployee: Employee | null): Promise<void> {
    try {
      const companyId = this.organizationService.getCurrentCompanyId();
      if (!companyId) {
        return;
      }

      const positions = await firstValueFrom<any[]>(
        this.http.get<any[]>(this.positionsEndpoint, {
          params: {
            select: 'id',
            name: 'eq.Encargada de Recursos Humanos',
            company_id: `eq.${companyId}`,
          },
        })
      );

      if (!positions?.length) {
        this.logger.warn(
          '[EmployeePortalApiService] No se encontró la posición "Encargada de Recursos Humanos"'
        );
        return;
      }

      const positionIds = positions.map((position) => position.id);
      if (!positionIds.length) {
        return;
      }

      const hrEmployees = await firstValueFrom<any[]>(
        this.http.get<any[]>(this.employeesEndpoint, {
          params: {
            select: 'id,first_name,father_name',
            position_id: `in.(${positionIds.join(',')})`,
            company_id: `eq.${companyId}`,
            is_active: 'eq.true',
          },
        })
      );

      if (!hrEmployees?.length) {
        this.logger.warn('[EmployeePortalApiService] No se encontraron empleados HR (Verley) para notificar');
        return;
      }

      const actorName =
        [currentEmployee?.first_name, currentEmployee?.father_name]
          .filter(Boolean)
          .join(' ') || 'Un empleado';

      const notifications = hrEmployees.map((hr) => ({
        employee_id: hr.id,
        related_type: 'timeoff',
        related_id: timeoffId,
        message_type: 'compensatory_request',
        title: 'Nueva Solicitud de Tiempo Compensatorio',
        message: `${actorName} ha enviado una solicitud de tiempo compensatorio que requiere tu revisión.`,
        created_by: currentEmployee?.id || null,
      }));

      if (!notifications.length) {
        return;
      }

      await this.createHrMessages(notifications);
    } catch (error) {
      this.logger.error('[EmployeePortalApiService] Error notificando a HR', error);
    }
  }

  public async updateEmployeeProfile(
    employeeId: string,
    updates: Partial<Employee>,
    companyId?: string
  ): Promise<void> {
    const params: Record<string, string> = {
      id: `eq.${employeeId}`,
    };
    if (companyId) {
      params['company_id'] = `eq.${companyId}`;
    }

    await firstValueFrom(
      this.http.patch(this.employeesEndpoint, updates, {
        params,
        headers: this.headers,
      })
    );
  }
}
