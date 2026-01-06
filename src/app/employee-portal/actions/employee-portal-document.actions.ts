import { HttpClient } from '@angular/common/http';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { EmployeePortalStore } from '../../stores/employee-portal.store';
import { getBooleanSetting } from '../../utils/settings-http.utils';

type DocumentFormState = {
  type: string;
  customType: string;
  reason: string;
  requiredDate: Date | null;
};

type DocumentActionsDependencies = {
  http: HttpClient;
  apiUrl: ApiUrlService;
  messageService: MessageService;
  store: InstanceType<typeof EmployeePortalStore>;
  currentEmployee: () => Employee | null | undefined;
  formState: DocumentFormState;
  resetForm: () => void;
  reloadRequests: () => void;
  setSubmitting: (value: boolean) => void;
};

/**
 * Envía una solicitud de documento
 */
export function submitDocumentRequest(
  deps: DocumentActionsDependencies
): void {
  const {
    http,
    apiUrl,
    messageService,
    store,
    currentEmployee,
    formState,
    resetForm,
    reloadRequests,
    setSubmitting,
  } = deps;

  const reason = formState.reason;
  if (!reason.trim()) {
    messageService.add({
      severity: 'warn',
      summary: 'Campo Requerido',
      detail: 'Por favor describe el motivo de la solicitud',
    });
    return;
  }

  setSubmitting(true);

  const documentType =
    formState.type === 'other' ? formState.customType : formState.type;

  const requestData = {
    employee_id: currentEmployee()!.id,
    document_type: documentType,
    custom_document_type:
      formState.type === 'other' ? formState.customType : null,
    reason: formState.reason,
    required_date: formState.requiredDate
      ? format(formState.requiredDate, 'yyyy-MM-dd')
      : null,
    status: 'pending',
  };

  const url = apiUrl.build('rest/v1/document_requests');
  http
    .post(url, requestData)
    .subscribe({
      next: (created: any) => {
        messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail:
            'Solicitud enviada correctamente. Recibirás una notificación cuando esté lista.',
        });

        // Notificación por correo a RRHH (configurable en settings)
        void (async () => {
          const shouldNotify = await getBooleanSetting(
            http,
            'hr_email_notify_documents',
            true
          );
          if (!shouldNotify) return;

          const employee = currentEmployee();
          const employeeName =
            [employee?.first_name, employee?.father_name]
              .filter(Boolean)
              .join(' ') || 'Un empleado';

          const createdRow = Array.isArray(created) ? created[0] : created;
          const requestId = createdRow?.id ?? undefined;

          const requiredDateText = requestData.required_date
            ? String(requestData.required_date)
            : 'N/A';

          const subject = `Nueva solicitud de documento - ${employeeName}`;
          const safeReason = String(requestData.reason || '')
            .split('\n')
            .join('<br/>');

          const html = `
            <div style="font-family: Arial, sans-serif; line-height: 1.4;">
              <h2 style="margin: 0 0 12px;">Nueva solicitud de documento</h2>
              <p style="margin: 0 0 12px;">
                Se ha enviado una nueva solicitud de documento desde Gestiones.
              </p>
              <ul>
                <li><strong>Empleado:</strong> ${employeeName}</li>
                <li><strong>Tipo:</strong> ${requestData.document_type}</li>
                <li><strong>Motivo:</strong> ${safeReason}</li>
                <li><strong>Fecha requerida:</strong> ${requiredDateText}</li>
                ${requestId ? `<li><strong>ID:</strong> ${requestId}</li>` : ''}
              </ul>
              <p style="color:#666; font-size: 12px; margin-top: 16px;">
                Este mensaje fue generado automáticamente por People.
              </p>
            </div>
          `;

          http.post('/api/email/send', {
            to: 'Verley@blackdogpanama.com',
            subject,
            html,
            fromName: 'People - RRHH',
          }).subscribe({
            next: () => undefined,
            error: (e) => console.warn('[DocumentRequest] No se pudo enviar email a RRHH', e),
          });
        })();

        resetForm();
        reloadRequests();
        setSubmitting(false);
      },
      error: (error) => {
        console.error('Error submitting document request:', error);
        messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            error.error?.message ||
            'No se pudo enviar la solicitud. Por favor intenta de nuevo.',
        });
        setSubmitting(false);
      },
    });
}
