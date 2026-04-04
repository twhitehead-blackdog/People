import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../services/api-url.service';
import { getEnv } from './env.utils';

type EmployeeRef = { id: string; branch_id?: string | null };

type ManagerNotificationPayload = {
  http: HttpClient;
  apiUrl: ApiUrlService;
  employee: EmployeeRef;
  title: string;
  message: string;
  relatedType: string;
  relatedId?: string | null;
  messageType: string;
};

/**
 * Finds active managers (Gerente de Tienda / Sub Gerente) assigned to the
 * employee's branch and creates an hr_messages record for each one.
 *
 * Fire-and-forget: errors are logged but never bubble up to the caller.
 */
export async function notifyBranchManagers(
  deps: ManagerNotificationPayload
): Promise<void> {
  const { http, apiUrl, employee, title, message, relatedType, relatedId, messageType } = deps;

  const branchId = employee?.branch_id ?? null;
  if (!branchId) return;

  try {
    const apiKey =
      getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
      getEnv('ENV_SUPABASE_TOKEN') ||
      getEnv('ENV_SUPABASE_API_KEY') ||
      getEnv('ENV_SUPABASE_ANON_KEY') ||
      '';

    // Fetch active employees of this branch with their position name
    const managersUrl = apiUrl.build('rest/v1/employees', {
      branch_id: `eq.${branchId}`,
      is_active: 'eq.true',
      select: 'id,position:positions!employees_position_id_fkey(name)',
    });

    const employees = await firstValueFrom(
      http.get<Array<{ id: string; position: { name: string } | null }>>(managersUrl, {
        headers: { apikey: apiKey, Authorization: `Bearer ${apiKey}` },
      })
    );

    if (!Array.isArray(employees) || employees.length === 0) return;

    const MANAGER_KEYWORDS = ['gerente de tienda', 'sub gerente', 'subgerente', 'gerente'];

    const managerIds = employees
      .filter((e) => {
        const posName = (e.position?.name ?? '').toLowerCase();
        return MANAGER_KEYWORDS.some((kw) => posName.includes(kw));
      })
      // Exclude the employee who submitted the request (they may be a manager themselves)
      .filter((e) => e.id !== employee.id)
      .map((e) => e.id);

    if (managerIds.length === 0) return;

    const now = new Date().toISOString();
    const messages = managerIds.map((managerId) => ({
      employee_id: managerId,
      title,
      message,
      message_type: messageType,
      related_type: relatedType,
      related_id: relatedId ?? null,
      is_read: false,
      created_at: now,
    }));

    await firstValueFrom(
      http.post(apiUrl.build('rest/v1/hr_messages'), messages, {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
      })
    );
  } catch (err) {
    console.error('[notifyBranchManagers] Error sending manager notifications:', err);
  }
}
