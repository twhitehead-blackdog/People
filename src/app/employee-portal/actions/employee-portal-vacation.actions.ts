import { format, startOfDay } from 'date-fns';
import { MessageService } from 'primeng/api';
import { v4 } from 'uuid';
import { Employee, TimeOff } from '../../models';
import { EmployeePortalApiService } from '../services/employee-portal-api.service';
import { EmployeePortalStore } from '../../stores/employee-portal.store';

type VacationFormState = {
  startDate: Date | null;
  endDate: Date | null;
  reason: string;
};

type VacationActionsDependencies = {
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
 * Envía una solicitud de vacaciones
 */
export async function submitVacationRequest(
  deps: VacationActionsDependencies
): Promise<void> {
  const { store, api, messageService, currentEmployee, formState, resetForm, reloadRequests, setSubmitting } = deps;

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
    const vacationTypeId = '00000000-0000-0000-0000-000000000001';
    const dateFrom = format(start, 'yyyy-MM-dd');
    const dateTo = format(end, 'yyyy-MM-dd');
    const notes: string[] = [];
    if (formState.reason.trim()) {
      notes.push(formState.reason.trim());
    }

    const timeoffData: TimeOff = {
      id: v4(),
      employee_id: employee.id,
      type_id: vacationTypeId,
      date_from: startDate,
      date_to: endDate,
      notes,
      is_approved: false,
    };

    const response = await api.createTimeoffRequest({
      ...timeoffData,
      date_from: dateFrom,
      date_to: dateTo,
    });

    const timeoffId = Array.isArray(response)
      ? response[0]?.id
      : response?.id;
    if (!timeoffId) {
      throw new Error('No se recibió el ID de la solicitud creada');
    }

    await api.notifyHrReviewer(
      timeoffId,
      employee ?? null
    );

    const currentEmp = currentEmployee();
    if (currentEmp && timeoffId) {
      await api.createHrMessages([
        {
          employee_id: currentEmp.id,
          related_type: 'timeoff',
          related_id: timeoffId,
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
