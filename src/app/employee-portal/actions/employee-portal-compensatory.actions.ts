import { HttpClient } from '@angular/common/http';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../../models';
import { EmployeePortalStore } from '../../stores/employee-portal.store';
import { getBooleanSetting } from '../../utils/settings-http.utils';
import { EmployeePortalApiService } from '../services/employee-portal-api.service';

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
  http: HttpClient;
  formState: CompensatoryFormState;
  constants: CompensatoryConstants;
  canSubmit: () => boolean;
  resetForm: () => void;
  reloadRequests: () => void;
  setSubmitting: (value: boolean) => void;
  compensatoryRecipients: () => Promise<string[]>;
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
    http,
    formState,
    constants,
    canSubmit,
    resetForm,
    reloadRequests,
    setSubmitting,
    compensatoryRecipients,
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
  let displayRange = '';

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
    displayRange = `${format(startDateTime, 'dd/MM/yyyy')} ${format(
      startDateTime,
      'HH:mm'
    )} - ${format(endDateTime, 'HH:mm')}`;
  } else {
    // Si es días, usar las fechas de inicio y fin
    dateFrom = format(formState.startDate!, 'yyyy-MM-dd');
    dateTo = format(formState.endDate!, 'yyyy-MM-dd');
    displayRange = `${format(formState.startDate!, 'dd/MM/yyyy')} - ${format(
      formState.endDate!,
      'dd/MM/yyyy'
    )}`;
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
  console.log('[DEBUG Compensatory] Fechas manuales recibidas:', manualDates);
  console.log('[DEBUG Compensatory] Tipo de manualDates:', typeof manualDates, Array.isArray(manualDates));
  console.log('[DEBUG Compensatory] Longitud de manualDates:', manualDates?.length);

  if (manualDates && manualDates.length > 0) {
    console.log('[DEBUG Compensatory] Agregando fechas manuales a las notas');
    notes.push('');
    notes.push(
      '--- Fechas donde trabajó horas extra (ingresadas manualmente) ---'
    );
    notes.push('');
    manualDates.forEach((date, index) => {
      const formattedDate = `- ${format(date, 'dd/MM/yyyy')}`;
      console.log(`[DEBUG Compensatory] Agregando fecha ${index + 1}:`, formattedDate, 'Fecha original:', date);
      notes.push(formattedDate);
    });
    notes.push('');
    notes.push(
      'RRHH revisará estas fechas junto con las marcaciones del empleado para verificar las horas extra trabajadas.'
    );
  } else {
    console.log('[DEBUG Compensatory] No hay fechas manuales para agregar');
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

  console.log('[DEBUG Compensatory] Payload completo a enviar:', JSON.stringify(timeoffData, null, 2));
  console.log('[DEBUG Compensatory] Array de notas:', notes);
  console.log('[DEBUG Compensatory] Tipo de notes:', Array.isArray(notes));
  console.log('[DEBUG Compensatory] Longitud de notes:', notes.length);

  try {
    const response = await api.createTimeoffRequest(timeoffData);
    console.log('[DEBUG Compensatory] Respuesta del servidor:', response);

    const timeoffId = response[0]?.id || response?.id;
    await api.notifyHrReviewer(timeoffId, currentEmployee() ?? null);

    const shouldNotifyCompensatory = await getBooleanSetting(
      http,
      'hr_email_notify_compensatory',
      true
    );

    console.log('[DEBUG Compensatory] 📧 Verificando notificación por email:');
    console.log('[DEBUG Compensatory] 📧 hr_email_notify_compensatory:', shouldNotifyCompensatory);
    console.log('[DEBUG Compensatory] 📧 timeoffId:', timeoffId);

    if (shouldNotifyCompensatory && timeoffId) {
      console.log('[DEBUG Compensatory] ✅ Enviando notificación por email de compensatorio');
      const employeeName =
        [currentEmployee()?.first_name, currentEmployee()?.father_name]
          .filter(Boolean)
          .join(' ') || 'Un empleado';

      const safeReason = String(reason || 'N/A')
        .split('\n')
        .join('<br/>');

      const manualDatesHtml =
        manualDates.length > 0
          ? `<p style="margin: 16px 0 8px;"><strong>Fechas extra ingresadas:</strong></p>
            <ul style="margin:0 0 12px; padding-left: 20px; color: #444;">
              ${manualDates
                .map((date) => `<li>${format(date, 'dd/MM/yyyy')}</li>`)
                .join('')}
            </ul>`
          : '';

      // Obtener destinatarios configurables
      console.log('[DEBUG Compensatory] 🔍 Llamando compensatoryRecipients()...');
      const recipients = await compensatoryRecipients();
      console.log('[DEBUG Compensatory] 📧 Destinatarios obtenidos:', recipients);

      const subject = `Nueva solicitud de tiempo compensatorio - ${employeeName}`;
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.4;">
          <h2 style="margin: 0 0 12px;">Nueva solicitud de tiempo compensatorio</h2>
          <p style="margin: 0 0 12px;">
            Esta solicitud fue registrada desde Gestiones y requiere revisión por parte de RRHH.
          </p>
          <ul style="margin:0 0 12px; padding-left: 20px;">
            <li><strong>Empleado:</strong> ${employeeName}</li>
            <li><strong>Tipo:</strong> ${
              type === 'days' ? 'Días' : 'Horas'
            }</li>
            <li><strong>Cantidad:</strong> ${amount}</li>
            <li><strong>Rango solicitado:</strong> ${displayRange}</li>
            <li><strong>Motivo:</strong> ${safeReason}</li>
          </ul>
          ${manualDatesHtml}
          <p style="color:#666; font-size: 12px; margin-top: 16px;">
            Este mensaje fue generado automáticamente por People.
          </p>
        </div>
      `;

      console.log('[DEBUG Compensatory] 📝 Preparando email:');
      console.log('[DEBUG Compensatory] 📧 Para:', recipients);
      console.log('[DEBUG Compensatory] 📧 Asunto:', subject);
      console.log('[DEBUG Compensatory] 📧 Contenido HTML length:', html.length);

      try {
        console.log('[DEBUG Compensatory] 🚀 Enviando petición POST a /api/email/send...');

        const emailPayload = {
          to: recipients,
          subject,
          html,
          fromName: 'People - RRHH',
        };
        console.log('[DEBUG Compensatory] 📦 Payload:', emailPayload);

        const emailResponse = await firstValueFrom(
          http.post('/api/email/send', emailPayload)
        );

        console.log('[DEBUG Compensatory] ✅ Email enviado correctamente');
        console.log('[DEBUG Compensatory] 📥 Respuesta del servidor:', emailResponse);

      } catch (emailError: any) {
        console.error('[DEBUG Compensatory] ❌ ERROR: No se pudo enviar email a RRHH');
        console.error('[DEBUG Compensatory] 🔍 Detalles del error:', emailError);
        console.error('[DEBUG Compensatory] 📦 Payload que se intentó enviar:', {
          to: recipients,
          subject,
          html: html.substring(0, 200) + '...', // Solo primeros 200 chars para no saturar logs
          fromName: 'People - RRHH',
        });

        // Mostrar más detalles del error si está disponible
        if (emailError?.error) {
          console.error('[DEBUG Compensatory] 🚨 Error del servidor:', emailError.error);
        }
        if (emailError?.message) {
          console.error('[DEBUG Compensatory] 💬 Mensaje de error:', emailError.message);
        }
        if (emailError?.status) {
          console.error('[DEBUG Compensatory] 📊 Status code:', emailError.status);
        }
      }
    }

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
