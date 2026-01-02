import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Employee } from '../../models';
import { EmployeePortalApiService } from '../services/employee-portal-api.service';
import { EmployeePortalStore } from '../../stores/employee-portal.store';

type CompensatoryFormState = {
  type: 'hours' | 'days';
  startDate: Date | null;
  endDate: Date | null;
  date: Date | null;
  timeStart: Date | null;
  timeEnd: Date | null;
  reason: string;
  manualOvertimeDates: Date[];
  amount: number;
};

type CompensatoryConstants = {
  MAX_FUTURE_DAYS: number;
  MAX_PAST_DAYS: number;
  MAX_CONSECUTIVE_DAYS: number;
};

type CompensatoryActionsDependencies = {
  store: InstanceType<typeof EmployeePortalStore>;
  api: EmployeePortalApiService;
  messageService: MessageService;
  currentEmployee: () => Employee | null | undefined;
  formState: CompensatoryFormState;
  constants: CompensatoryConstants;
  canSubmit: () => boolean;
  resetForm: () => void;
  reloadRequests: () => void;
  setSubmitting: (value: boolean) => void;
};

/**
 * Envía una solicitud de tiempo compensatorio
 */
export async function submitCompensatoryRequest(
  deps: CompensatoryActionsDependencies
): Promise<void> {
  const {
    store,
    api,
    messageService,
    currentEmployee,
    formState,
    constants,
    canSubmit,
    resetForm,
    reloadRequests,
    setSubmitting,
  } = deps;

  if (!canSubmit()) {
    messageService.add({
      severity: 'warn',
      summary: 'Campos Requeridos',
      detail: 'Por favor completa todos los campos correctamente',
    });
    return;
  }

  const type = formState.type;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Validaciones de fechas
  if (type === 'hours') {
    const selectedDate = formState.date;
    if (selectedDate) {
      const selected = new Date(selectedDate);
      selected.setHours(0, 0, 0, 0);

      const daysDiff = Math.ceil(
        (selected.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > constants.MAX_FUTURE_DAYS) {
        messageService.add({
          severity: 'error',
          summary: 'Fecha inválida',
          detail: `No puedes solicitar tiempo compensatorio para más de ${constants.MAX_FUTURE_DAYS} días en el futuro`,
        });
        return;
      }

      if (daysDiff < -constants.MAX_PAST_DAYS) {
        messageService.add({
          severity: 'error',
          summary: 'Fecha inválida',
          detail: `No puedes solicitar tiempo compensatorio para más de ${constants.MAX_PAST_DAYS} días en el pasado`,
        });
        return;
      }
    }
  } else {
    // Validación para días
    const startDate = formState.startDate;
    const endDate = formState.endDate;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(0, 0, 0, 0);

      // Validar que start <= end
      if (start > end) {
        messageService.add({
          severity: 'error',
          summary: 'Fechas inválidas',
          detail:
            'La fecha de inicio debe ser anterior o igual a la fecha de fin',
        });
        return;
      }

      // Validar límite de días futuros
      const daysDiff = Math.ceil(
        (end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysDiff > constants.MAX_FUTURE_DAYS) {
        messageService.add({
          severity: 'error',
          summary: 'Fecha inválida',
          detail: `La fecha final no puede ser más de ${constants.MAX_FUTURE_DAYS} días en el futuro`,
        });
        return;
      }

      // Validar rango máximo de días consecutivos
      const rangeDays =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;

      if (rangeDays > constants.MAX_CONSECUTIVE_DAYS) {
        messageService.add({
          severity: 'error',
          summary: 'Rango inválido',
          detail: `No puedes solicitar más de ${constants.MAX_CONSECUTIVE_DAYS} días consecutivos de tiempo compensatorio`,
        });
        return;
      }
    }
  }

  setSubmitting(true);

  const amount = formState.amount;

  // ID del tipo de timeoff "Compensatorio"
  const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';

  // Determinar date_from y date_to según el tipo
  let dateFrom: string;
  let dateTo: string;

  if (type === 'hours') {
    // Si es horas, combinar fecha con hora inicio y hora fin
    const selectedDate = formState.date!;
    const timeStart = formState.timeStart!;
    const timeEnd = formState.timeEnd!;

    const startDateTime = new Date(selectedDate);
    startDateTime.setHours(timeStart.getHours());
    startDateTime.setMinutes(timeStart.getMinutes());
    startDateTime.setSeconds(0);
    startDateTime.setMilliseconds(0);

    const endDateTime = new Date(selectedDate);
    endDateTime.setHours(timeEnd.getHours());
    endDateTime.setMinutes(timeEnd.getMinutes());
    endDateTime.setSeconds(0);
    endDateTime.setMilliseconds(0);

    // Si la hora fin es menor que la hora inicio, asumir que es del día siguiente
    if (endDateTime < startDateTime) {
      endDateTime.setDate(endDateTime.getDate() + 1);
    }

    dateFrom = format(startDateTime, 'yyyy-MM-dd HH:mm:ss');
    dateTo = format(endDateTime, 'yyyy-MM-dd HH:mm:ss');
  } else {
    // Si es días, usar las fechas de inicio y fin
    dateFrom = format(formState.startDate!, 'yyyy-MM-dd');
    dateTo = format(formState.endDate!, 'yyyy-MM-dd');
  }

  // Calcular horas si es por días (asumiendo 8 horas por día)
  const hours = type === 'days' ? amount * 8 : amount;

  // Construir el array de notas con la información del tiempo compensatorio
  const notes: string[] = [];
  const reason = formState.reason;
  if (reason) {
    notes.push(`Motivo: ${reason}`);
  }

  // Agregar información sobre tipo y cantidad
  notes.push(
    `Tipo: ${type === 'days' ? 'Días' : 'Horas'}, Cantidad: ${amount}`
  );

  if (type === 'days') {
    notes.push(`Horas equivalentes: ${hours}`);
  }

  // Si es horas, agregar información del rango de horas
  if (type === 'hours') {
    const timeStart = formState.timeStart;
    const timeEnd = formState.timeEnd;
    if (timeStart && timeEnd) {
      notes.push(
        `Rango de horas: ${format(timeStart, 'HH:mm')} - ${format(
          timeEnd,
          'HH:mm'
        )}`
      );
    }
    notes.push(
      `HR verificará las horas extras trabajadas para aprobar esta solicitud`
    );
  }

  // Agregar información de fechas donde trabajó horas extra (fechas manuales)
  const manualDates = formState.manualOvertimeDates;
  if (manualDates.length > 0) {
    notes.push('');
    notes.push(
      '--- Fechas donde trabajó horas extra (ingresadas manualmente) ---'
    );
    notes.push('');
    manualDates.forEach((date) => {
      notes.push(`- ${format(date, 'dd/MM/yyyy')}`);
    });
    notes.push('');
    notes.push(
      'RRHH revisará estas fechas junto con las marcaciones del empleado para verificar las horas extra trabajadas.'
    );
  }

  const timeoffData: any = {
    employee_id: currentEmployee()!.id,
    type_id: compensatoryTypeId,
    date_from: dateFrom,
    date_to: dateTo,
    notes: notes,
    is_approved: false,
    compensatory_type: type,
    compensatory_amount: amount,
  };

  try {
    const response = await api.createTimeoffRequest(timeoffData);

    const timeoffId = response[0]?.id || response?.id;
    await api.notifyHrReviewer(
      timeoffId,
      currentEmployee() ?? null
    );

    const currentEmp = currentEmployee();
    if (currentEmp && timeoffId) {
      await api.createHrMessages([
        {
          employee_id: currentEmp.id,
          related_type: 'timeoff',
          related_id: timeoffId,
          message_type: 'compensatory_request',
          title: 'Solicitud de tiempo compensatorio enviada',
          message:
            'Tu solicitud de tiempo compensatorio ha sido enviada y está pendiente de revisión.',
          is_read: false,
        },
      ]);
    }

    messageService.add({
      severity: 'success',
      summary: 'Solicitud Enviada',
      detail:
        'Tu solicitud de tiempo compensatorio ha sido enviada para revisión',
    });

    resetForm();
    reloadRequests();
  } catch (error: any) {
    console.error('Error submitting compensatory request:', error);
    messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
    });
  } finally {
    setSubmitting(false);
  }
}
