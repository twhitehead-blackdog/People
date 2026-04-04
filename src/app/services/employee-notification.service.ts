import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from './api-url.service';

@Injectable({ providedIn: 'root' })
export class EmployeeNotificationService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = inject(ApiUrlService);

  async notifyNewRequest(
    requestType: 'vacation' | 'disability' | 'document' | 'work_permit' | 'schedule_change' | 'compensatory' | 'uniform' | 'timelog_correction',
    employeeName: string,
    details: Record<string, string>
  ): Promise<void> {
    try {
      await firstValueFrom(
        this.http.post('/api/notifications/employee-request', {
          requestType,
          employeeName,
          details,
        })
      );
    } catch {
      // Silencioso — no interrumpir el flujo del usuario si la notificación falla
    }
  }
}
