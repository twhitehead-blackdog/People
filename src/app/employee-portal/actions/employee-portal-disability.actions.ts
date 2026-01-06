import { HttpClient } from '@angular/common/http';
import { format } from 'date-fns';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';
import { Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { getEnv } from '../../utils/env.utils';
import { getBooleanSetting } from '../../utils/settings-http.utils';

type DisabilityFormState = {
  startDate: Date | null;
  endDate: Date | null;
  description: string;
  selectedFile: File | null;
};

type DisabilityActionsDependencies = {
  http: HttpClient;
  apiUrl: ApiUrlService;
  messageService: MessageService;
  currentEmployee: () => Employee | null | undefined;
  formState: DisabilityFormState;
  resetForm: () => void;
  reloadRequests: () => void;
  setUploading: (value: boolean) => void;
};

/**
 * Sube una incapacidad con su documento
 */
export async function uploadDisability(
  deps: DisabilityActionsDependencies
): Promise<void> {
  const {
    http,
    apiUrl,
    messageService,
    currentEmployee,
    formState,
    resetForm,
    reloadRequests,
    setUploading,
  } = deps;

  if (
    !formState.startDate ||
    !formState.endDate ||
    !formState.selectedFile
  ) {
    messageService.add({
      severity: 'warn',
      summary: 'Campos Requeridos',
      detail: 'Por favor completa todos los campos y selecciona un archivo',
    });
    return;
  }

  setUploading(true);
  try {
    let documentUrl = '';

    // Upload file to Supabase Storage if file is selected
    if (formState.selectedFile) {
      const file = formState.selectedFile;
      const fileExt = file.name.split('.').pop();
      const fileName = `${
        currentEmployee()!.id
      }/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage using REST API
      try {
        // Usar Service Role Key si está disponible, sino usar API Key pública
        const storageKey =
          getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
          getEnv('ENV_SUPABASE_API_KEY') ||
          '';

        const uploadUrl = `${apiUrl.baseUrl}/storage/v1/object/disabilities/${fileName}`;
        await firstValueFrom(
          http.post(uploadUrl,
            file, // Enviar el archivo directamente como binario
            {
              headers: {
                apikey: storageKey,
                Authorization: `Bearer ${storageKey}`,
                'Content-Type': file.type || 'application/octet-stream',
                'x-upsert': 'true', // Permite sobrescribir si el archivo ya existe
              },
            }
          )
        );

        // Get public URL for the uploaded file
        documentUrl = `${process.env['ENV_SUPABASE_URL']}/storage/v1/object/public/disabilities/${fileName}`;
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
        setUploading(false);
        return;
      }
    }

    // Create disability record
    const disabilityData = {
      employee_id: currentEmployee()!.id,
      start_date: format(formState.startDate!, 'yyyy-MM-dd'),
      end_date: format(formState.endDate!, 'yyyy-MM-dd'),
      description: formState.description || null,
      document_url: documentUrl || null,
      status: 'pending',
    };

    http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_disabilities`,
        disabilityData
      )
      .subscribe({
        next: (created: any) => {
          messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail:
              'Incapacidad subida correctamente. Está pendiente de revisión.',
          });

          // Notificación por correo a RRHH (configurable en settings)
          void (async () => {
            const shouldNotify = await getBooleanSetting(
              http,
              'hr_email_notify_disabilities',
              true
            );
            if (!shouldNotify) return;

            const employee = currentEmployee();
            const employeeName =
              [employee?.first_name, employee?.father_name]
                .filter(Boolean)
                .join(' ') || 'Un empleado';

            const createdRow = Array.isArray(created) ? created[0] : created;
            const disabilityId = createdRow?.id ?? undefined;

            const subject = `Nueva incapacidad subida - ${employeeName}`;
            const html = `
              <div style="font-family: Arial, sans-serif; line-height: 1.4;">
                <h2 style="margin: 0 0 12px;">Nueva incapacidad (Gestiones)</h2>
                <p style="margin: 0 0 12px;">
                  Un empleado ha subido una incapacidad médica que requiere revisión.
                </p>
                <ul>
                  <li><strong>Empleado:</strong> ${employeeName}</li>
                  <li><strong>Inicio:</strong> ${disabilityData.start_date}</li>
                  <li><strong>Fin:</strong> ${disabilityData.end_date}</li>
                  <li><strong>Descripción:</strong> ${String(disabilityData.description || 'N/A')
                    .split('\n')
                    .join('<br/>')}</li>
                  <li><strong>Documento:</strong> ${
                    disabilityData.document_url
                      ? `<a href="${disabilityData.document_url}">Abrir documento</a>`
                      : 'N/A'
                  }</li>
                  ${disabilityId ? `<li><strong>ID:</strong> ${disabilityId}</li>` : ''}
                </ul>
                <p style="color:#666; font-size: 12px; margin-top: 16px;">
                  Este mensaje fue generado automáticamente por People.
                </p>
              </div>
            `;

            http
              .post('/api/email/send', {
                to: 'Verley@blackdogpanama.com',
                subject,
                html,
                fromName: 'People - RRHH',
              })
              .subscribe({
                next: () => undefined,
                error: (e) =>
                  console.warn(
                    '[DisabilityUpload] No se pudo enviar email a RRHH',
                    e
                  ),
              });
          })();

          resetForm();
          reloadRequests();
          setUploading(false);
        },
        error: (error) => {
          console.error('Error uploading disability:', error);
          messageService.add({
            severity: 'error',
            summary: 'Error',
            detail:
              error.error?.message ||
              'No se pudo subir la incapacidad. Por favor intenta de nuevo.',
          });
          setUploading(false);
        },
      });
  } catch (error) {
    messageService.add({
      severity: 'error',
      summary: 'Error',
      detail: 'No se pudo subir la incapacidad. Por favor intenta de nuevo.',
    });
    setUploading(false);
  }
}
