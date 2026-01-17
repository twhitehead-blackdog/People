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
  disabilityRecipients: () => Promise<string[]>;
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
    disabilityRecipients,
  } = deps;

  if (!formState.startDate || !formState.endDate || !formState.selectedFile) {
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
      const fileName = `${currentEmployee()!.id}/${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage using REST API
      try {
        // Usar Service Role Key si está disponible, sino usar API Key pública
        const storageKey =
          getEnv('ENV_SUPABASE_SERVICE_ROLE_KEY') ||
          getEnv('ENV_SUPABASE_API_KEY') ||
          '';

        const uploadUrl = `${apiUrl.baseUrl}/storage/v1/object/disabilities/${fileName}`;
        await firstValueFrom(
          http.post(
            uploadUrl,
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
        documentUrl = `${apiUrl.baseUrl}/storage/v1/object/public/disabilities/${fileName}`;
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
      .post(`${apiUrl.baseUrl}/rest/v1/employee_disabilities`, disabilityData)
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
            console.log(
              '[DEBUG Disability] 📧 Verificando notificación por email...'
            );

            const shouldNotify = await getBooleanSetting(
              http,
              'hr_email_notify_disabilities',
              true
            );

            console.log(
              '[DEBUG Disability] 📧 hr_email_notify_disabilities:',
              shouldNotify
            );

            if (!shouldNotify) {
              console.log(
                '[DEBUG Disability] 🚫 Notificación por email desactivada'
              );
              return;
            }

            console.log(
              '[DEBUG Disability] ✅ Enviando notificación por email de incapacidad'
            );

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
                  <li><strong>Descripción:</strong> ${String(
                    disabilityData.description || 'N/A'
                  )
                    .split('\n')
                    .join('<br/>')}</li>
                  <li><strong>Documento:</strong> ${
                    disabilityData.document_url
                      ? `<a href="${disabilityData.document_url}">Abrir documento</a>`
                      : 'N/A'
                  }</li>
                  ${
                    disabilityId
                      ? `<li><strong>ID:</strong> ${disabilityId}</li>`
                      : ''
                  }
                </ul>
                <p style="color:#666; font-size: 12px; margin-top: 16px;">
                  Este mensaje fue generado automáticamente por People.
                </p>
              </div>
            `;

            // Obtener destinatarios configurables
            console.log(
              '[DEBUG Disability] 🔍 Llamando disabilityRecipients()...'
            );
            const recipients = await disabilityRecipients();
            console.log(
              '[DEBUG Disability] 📧 Destinatarios obtenidos:',
              recipients
            );

            console.log('[DEBUG Disability] 📝 Preparando email:');
            console.log('[DEBUG Disability] 📧 Para:', recipients);
            console.log('[DEBUG Disability] 📧 Asunto:', subject);
            console.log(
              '[DEBUG Disability] 📧 Contenido HTML length:',
              html.length
            );

            const emailPayload = {
              to: recipients,
              subject,
              html,
              fromName: 'People - RRHH',
            };

            console.log(
              '[DEBUG Disability] 🚀 Enviando petición POST a /api/email/send...'
            );
            console.log('[DEBUG Disability] 📦 Payload:', emailPayload);

            http.post('/api/email/send', emailPayload).subscribe({
              next: (response) => {
                console.log(
                  '[DEBUG Disability] ✅ Email enviado correctamente'
                );
                console.log(
                  '[DEBUG Disability] 📥 Respuesta del servidor:',
                  response
                );
              },
              error: (e) => {
                console.error(
                  '[DEBUG Disability] ❌ ERROR: No se pudo enviar email a RRHH'
                );
                console.error('[DEBUG Disability] 🔍 Detalles del error:', e);
                console.error(
                  '[DEBUG Disability] 📦 Payload que se intentó enviar:',
                  {
                    to: recipients,
                    subject,
                    html: html.substring(0, 200) + '...', // Solo primeros 200 chars
                    fromName: 'People - RRHH',
                  }
                );
              },
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
