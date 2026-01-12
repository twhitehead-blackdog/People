import { HttpClient } from '@angular/common/http';
import { format, startOfDay } from 'date-fns';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { EmployeePortalStore } from '../../stores/employee-portal.store';
import { getEnv } from '../../utils/env.utils';
import { EmployeePortalApiService } from '../services/employee-portal-api.service';

type VacationFormState = {
  startDate: Date | null;
  endDate: Date | null;
  reason: string;
  selectedFile: File | null;
};

type VacationActionsDependencies = {
  http: HttpClient;
  apiUrl: ApiUrlService;
  store: InstanceType<typeof EmployeePortalStore>;
  api: EmployeePortalApiService;
  messageService: MessageService;
  currentEmployee: () => Employee | null | undefined;
  formState: VacationFormState;
  resetForm: () => void;
  reloadRequests: () => void;
  setSubmitting: (value: boolean) => void;
};

/**
 * Envía una solicitud de vacaciones con documento opcional
 */
export async function submitVacationRequest(
  deps: VacationActionsDependencies
): Promise<void> {
  const {
    http,
    apiUrl,
    store,
    api,
    messageService,
    currentEmployee,
    formState,
    resetForm,
    reloadRequests,
    setSubmitting,
  } = deps;

  // Validaciones
  const startDate = formState.startDate;
  const endDate = formState.endDate;

  if (!startDate || !endDate) {
    messageService.add({
      severity: 'error',
      summary: 'Error de Validación',
      detail: 'Por favor selecciona ambas fechas (inicio y fin)',
    });
    return;
  }

  // Validar que la fecha de inicio no sea pasada
  const today = startOfDay(new Date());
  const start = startOfDay(startDate);
  if (start < today) {
    messageService.add({
      severity: 'error',
      summary: 'Error de Validación',
      detail: 'La fecha de inicio no puede ser anterior a hoy',
    });
    return;
  }

  // Validar que la fecha de fin sea mayor o igual a la de inicio
  const end = startOfDay(endDate);
  if (end < start) {
    messageService.add({
      severity: 'error',
      summary: 'Error de Validación',
      detail: 'La fecha de fin debe ser mayor o igual a la fecha de inicio',
    });
    return;
  }

  const employee = currentEmployee();
  if (!employee) {
    messageService.add({
      severity: 'error',
      summary: 'Error',
      detail:
        'No se pudo identificar al empleado. Por favor recarga la página.',
    });
    return;
  }

  setSubmitting(true);

  try {
    let documentUrl = '';

    // Subir archivo si existe
    if (formState.selectedFile) {
      const file = formState.selectedFile;
      const fileExt = file.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${employee.id}_${timestamp}.${fileExt}`;
      const filePath = `vacations/${fileName}`;

      // Subir a Supabase Storage
      const uploadUrl = `${apiUrl.baseUrl}/storage/v1/object/employee-documents/${filePath}`;
      const apiKey =
        getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
        getEnv('ENV_SUPABASE_API_KEY') ||
        '';

      if (!apiKey) {
        throw new Error('No se pudo obtener la clave de API de Supabase');
      }

      const uploadResponse = await firstValueFrom(
        http.post(uploadUrl, file, {
          headers: {
            'Content-Type': file.type,
            apikey: apiKey,
            Authorization: `Bearer ${apiKey}`,
          },
        })
      );

      // Construir URL del documento
      documentUrl = `${apiUrl.baseUrl}/storage/v1/object/public/employee-documents/${filePath}`;
    }

    // Crear solicitud en la tabla employee_vacations
    const dateFrom = format(start, 'yyyy-MM-dd');
    const dateTo = format(end, 'yyyy-MM-dd');

    const vacationData = {
      employee_id: employee.id,
      start_date: dateFrom,
      end_date: dateTo,
      reason: formState.reason.trim() || null,
      document_url: documentUrl || null,
      status: 'pending',
      created_by: employee.id, // El empleado crea su propia solicitud
      // company_id se sincroniza automáticamente vía trigger desde employees
    };

    const createUrl = apiUrl.build('rest/v1/employee_vacations');
    const apiKey =
      getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
      getEnv('ENV_SUPABASE_API_KEY') ||
      '';

    if (!apiKey) {
      throw new Error('No se pudo obtener la clave de API de Supabase');
    }

    const response = await firstValueFrom(
      http.post<Array<{ id: string }>>(createUrl, vacationData, {
        headers: {
          apikey: apiKey,
          Authorization: `Bearer ${apiKey}`,
          Prefer: 'return=representation',
        },
      })
    );

    const vacationId =
      Array.isArray(response) && response.length > 0 ? response[0].id : null;
    if (!vacationId) {
      throw new Error('No se recibió el ID de la solicitud creada');
    }

    // Crear notificación para el empleado
    const currentEmp = currentEmployee();
    if (currentEmp && vacationId) {
      await api.createHrMessages([
        {
          employee_id: currentEmp.id,
          related_type: 'vacation',
          related_id: vacationId,
          message_type: 'vacation_request',
          title: 'Solicitud de vacaciones enviada',
          message: `Tu solicitud de vacaciones del ${format(
            startDate,
            'dd/MM/yyyy'
          )} al ${format(
            endDate,
            'dd/MM/yyyy'
          )} ha sido enviada y está pendiente de revisión.`,
          is_read: false,
        },
      ]);
    }

    messageService.add({
      severity: 'success',
      summary: 'Solicitud Enviada',
      detail: `Tu solicitud de vacaciones ha sido enviada para revisión. Período: ${format(
        startDate,
        'dd/MM/yyyy'
      )} - ${format(endDate, 'dd/MM/yyyy')}`,
      life: 5000,
    });

    resetForm();
    reloadRequests();
  } catch (error: any) {
    console.error('Error submitting vacation request:', error);

    let errorMessage =
      'No se pudo enviar la solicitud. Por favor intenta de nuevo.';
    if (error?.error?.message) {
      errorMessage = error.error.message;
    } else if (error?.message) {
      errorMessage = error.message;
    }

    messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: errorMessage,
      life: 5000,
    });
  } finally {
    setSubmitting(false);
  }
}
