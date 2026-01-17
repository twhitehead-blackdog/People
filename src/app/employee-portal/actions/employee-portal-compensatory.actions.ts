import { HttpClient } from '@angular/common/http';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { getEnv } from '../../utils/env.utils';

type CompensatoryFormState = {
  startDate: Date | null;
  endDate: Date | null;
  reason: string;
  type: 'hours' | 'days';
  compensatoryDate: Date | null;
  compensatoryTimeStart: Date | null;
  compensatoryTimeEnd: Date | null;
  selectedOvertimeDays: string[];
  manualOvertimeDates: Date[];
  compensatoryFile: File | null;
  // Nota: Los campos compensatoryDate, compensatoryTimeStart, compensatoryTimeEnd,
  // selectedOvertimeDays y manualOvertimeDates no se guardan en la base de datos,
  // solo se usan para validación y se incluyen en las notes
};

type CompensatoryActionsDependencies = {
  http: HttpClient;
  apiUrl: ApiUrlService;
  messageService: MessageService;
  currentEmployee: () => Employee | null | undefined;
  formState: CompensatoryFormState;
  resetForm: () => void;
  reloadRequests: () => void;
  setSubmitting: (value: boolean) => void;
  company_id?: string | null;
};

/**
 * Sube una solicitud de tiempo compensatorio con su documento PDF opcional
 */
export async function uploadCompensatory(
  deps: CompensatoryActionsDependencies
): Promise<void> {
  const {
    http,
    apiUrl,
    messageService,
    currentEmployee,
    formState,
    resetForm,
    reloadRequests,
    setSubmitting,
    company_id,
  } = deps;

  if (
    !formState.startDate ||
    !formState.endDate ||
    !formState.compensatoryDate
  ) {
    messageService.add({
      severity: 'warn',
      summary: 'Campos Requeridos',
      detail: 'Por favor completa todos los campos requeridos',
    });
    return;
  }

  setSubmitting(true);
  try {
    let documentUrl = '';

    // Upload file to Supabase Storage if file is selected
    if (formState.compensatoryFile) {
      const file = formState.compensatoryFile;
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentEmployee()!.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage using REST API
      try {
        // Usar Service Role Key si está disponible, sino usar API Key pública
        const storageKey =
          getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
          getEnv('ENV_SUPABASE_API_KEY') ||
          '';

        const uploadUrl = `${apiUrl.baseUrl}/storage/v1/object/compensatory/${fileName}`;
        await firstValueFrom(
          http.post(
            uploadUrl,
            file, // Enviar el archivo directamente como binario
            {
              headers: {
                apikey: storageKey,
                Authorization: `Bearer ${storageKey}`,
                'x-upsert': 'true', // Permite sobrescribir si el archivo ya existe
              },
            }
          )
        );

        // Get public URL for the uploaded file
        documentUrl = apiUrl.build(
          `storage/v1/object/public/compensatory/${fileName}`
        );
      } catch (uploadError: any) {
        console.error('Error uploading file to storage:', uploadError);
        const errorDetail =
          uploadError?.error?.message ||
          uploadError?.error?.error ||
          uploadError?.message ||
          'No se pudo subir el archivo. Verifica que el bucket existe y tiene las políticas correctas.';
        messageService.add({
          severity: 'error',
          summary: 'Error al Subir Archivo',
          detail: errorDetail,
        });
        setSubmitting(false);
        return;
      }
    }

    // Calcular la cantidad correcta según el tipo
    let requestedAmount = 0;
    if (
      formState.type === 'hours' &&
      formState.compensatoryTimeStart &&
      formState.compensatoryTimeEnd
    ) {
      // Para horas: calcular la diferencia en horas
      const diffMs =
        formState.compensatoryTimeEnd.getTime() -
        formState.compensatoryTimeStart.getTime();
      requestedAmount = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10; // Redondear a 1 decimal
    } else if (
      formState.type === 'days' &&
      formState.startDate &&
      formState.endDate
    ) {
      // Para días: calcular la diferencia en días
      const diffMs =
        formState.endDate.getTime() - formState.startDate.getTime();
      requestedAmount = Math.round(diffMs / (1000 * 60 * 60 * 24)) + 1; // +1 porque incluye el día final
    } else {
      // Fallback: usar la cantidad de fechas de horas extra
      requestedAmount = formState.selectedOvertimeDays.length;
    }

    // Create compensatory request
    // Los campos compensatory_date, compensatory_time_start, compensatory_time_end y manual_overtime_dates
    // no existen en la base de datos. Solo se guardan: compensatory_type, compensatory_amount, document_url
    const compensatoryData = {
      type_id: 'f2d92995-96a0-414f-b64a-9823db776745', // ID del tipo compensatorio
      employee_id: currentEmployee()!.id,
      date_from: format(formState.startDate!, 'yyyy-MM-dd'),
      date_to: format(formState.endDate!, 'yyyy-MM-dd'),
      notes: [
        formState.reason || '',
        // Guardar información adicional en las notes
        `Tipo: ${formState.type}`,
        `Cantidad solicitada: ${requestedAmount}`,
        formState.compensatoryDate
          ? `Fecha compensatorio: ${format(
              formState.compensatoryDate,
              'yyyy-MM-dd'
            )}`
          : '',
        formState.compensatoryTimeStart
          ? `Hora inicio: ${format(formState.compensatoryTimeStart, 'HH:mm')}`
          : '',
        formState.compensatoryTimeEnd
          ? `Hora fin: ${format(formState.compensatoryTimeEnd, 'HH:mm')}`
          : '',
        `Fechas horas extra: ${formState.manualOvertimeDates
          .map((date) => format(date, 'yyyy-MM-dd'))
          .join(', ')}`,
      ].filter((note) => note.length > 0), // Filtrar notas vacías
      compensatory_type: formState.type,
      compensatory_amount: requestedAmount,
      document_url: documentUrl || null,
      company_id: company_id,
    };

    http.post(apiUrl.build('rest/v1/timeoffs'), compensatoryData).subscribe({
      next: (created: any) => {
        messageService.add({
          severity: 'success',
          summary: 'Solicitud Enviada',
          detail:
            'Tu solicitud de tiempo compensatorio ha sido enviada exitosamente.',
        });
        resetForm();
        reloadRequests();
      },
      error: (error: any) => {
        console.error('Error creating compensatory request:', error);
        const errorDetail =
          error?.error?.message ||
          error?.message ||
          'No se pudo crear la solicitud. Inténtalo nuevamente.';
        messageService.add({
          severity: 'error',
          summary: 'Error al Crear Solicitud',
          detail: errorDetail,
        });
        setSubmitting(false);
      },
      complete: () => {
        setSubmitting(false);
      },
    });
  } catch (error: any) {
    console.error('Error uploading compensatory:', error);
    messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'Ocurrió un error inesperado. Inténtalo nuevamente.',
    });
    setSubmitting(false);
  }
}
