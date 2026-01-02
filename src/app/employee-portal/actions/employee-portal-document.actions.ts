import { HttpClient } from '@angular/common/http';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Employee } from '../../models';
import { EmployeePortalStore } from '../../stores/employee-portal.store';

type DocumentFormState = {
  type: string;
  customType: string;
  reason: string;
  requiredDate: Date | null;
};

type DocumentActionsDependencies = {
  http: HttpClient;
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

  http
    .post(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/document_requests`,
      requestData
    )
    .subscribe({
      next: () => {
        messageService.add({
          severity: 'success',
          summary: 'Éxito',
          detail:
            'Solicitud enviada correctamente. Recibirás una notificación cuando esté lista.',
        });

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
