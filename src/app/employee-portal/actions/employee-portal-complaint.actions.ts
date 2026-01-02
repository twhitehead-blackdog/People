import { HttpClient } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../../models';
import { EmployeePortalStore } from '../../stores/employee-portal.store';

type ComplaintFormState = {
  category: string;
  text: string;
  allowContact: boolean;
  contactMethod: string;
};

type ComplaintActionsDependencies = {
  http: HttpClient;
  messageService: MessageService;
  store: InstanceType<typeof EmployeePortalStore>;
  currentEmployee: () => Employee | null | undefined;
  formState: ComplaintFormState;
  canSubmit: () => boolean;
  resetForm: () => void;
  reloadRequests: () => void;
  setSubmitting: (value: boolean) => void;
};

/**
 * Envía una queja/sugerencia
 */
export function submitComplaint(deps: ComplaintActionsDependencies): void {
  const {
    http,
    messageService,
    store,
    currentEmployee,
    formState,
    canSubmit,
    resetForm,
    reloadRequests,
    setSubmitting,
  } = deps;

  if (!canSubmit()) {
    messageService.add({
      severity: 'warn',
      summary: 'Sugerencia Muy Corta',
      detail: 'Por favor describe tu sugerencia con al menos 10 caracteres',
    });
    return;
  }

  setSubmitting(true);

  const allowContact = formState.allowContact;
  const complaintData = {
    employee_id: allowContact ? currentEmployee()!.id : null,
    creator_employee_id: currentEmployee()!.id,
    category: formState.category,
    complaint: formState.text,
    allow_contact: allowContact,
    contact_method: allowContact ? formState.contactMethod : null,
    status: 'pending',
  };

  http
    .post(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaints`,
      complaintData,
      {
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        },
      }
    )
    .subscribe({
      next: async (response: any) => {
        const complaint = Array.isArray(response) ? response[0] : response;

        if (complaint && complaint.id) {
          const messageData = {
            complaint_id: complaint.id,
            sender_id: allowContact ? currentEmployee()!.id : null,
            sender_type: 'employee',
            is_anonymous: !allowContact,
            message: formState.text.trim(),
            thread_id: complaint.thread_id || complaint.id,
          };

          try {
            await firstValueFrom(
              http.post(
                `${process.env['ENV_SUPABASE_URL']}/rest/v1/complaint_messages`,
                messageData,
                {
                  headers: {
                    'Content-Type': 'application/json',
                    Prefer: 'return=representation',
                  },
                }
              )
            );

            messageService.add({
              severity: 'success',
              summary: 'Sugerencia Enviada',
              detail: allowContact
                ? 'Tu sugerencia ha sido enviada. Recibirás respuesta de RRHH pronto.'
                : 'Tu sugerencia ha sido enviada de forma anónima. Recibirás respuesta de RRHH pronto.',
            });

            resetForm();
            reloadRequests();
            setSubmitting(false);
          } catch (messageError: any) {
            console.error('Error creating message:', messageError);
            messageService.add({
              severity: 'warn',
              summary: 'Sugerencia Enviada',
              detail:
                'La sugerencia fue creada pero hubo un problema al crear el mensaje. Contacta a RRHH si no recibes respuesta.',
            });
            reloadRequests();
            setSubmitting(false);
          }
        } else {
          messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo obtener el ID de la sugerencia creada',
          });
          setSubmitting(false);
        }
      },
      error: (error: any) => {
        console.error('Error submitting complaint:', error);
        messageService.add({
          severity: 'error',
          summary: 'Error',
          detail:
            error.error?.message ||
            'No se pudo enviar la sugerencia. Por favor intenta de nuevo.',
        });
        setSubmitting(false);
      },
    });
}
