import { HttpClient, httpResource } from '@angular/common/http';
import { computed, inject, Injectable } from '@angular/core';
import { MessageService } from 'primeng/api';
import { firstValueFrom } from 'rxjs';

interface Setting {
  key: string;
  value: string;
}

@Injectable({
  providedIn: 'root',
})
export class WassengerService {
  private http = inject(HttpClient);
  private messageService = inject(MessageService, { optional: true });

  // Obtener configuración de Wassenger
  public settingsApi = httpResource<Setting[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/settings`,
    method: 'GET',
    params: {
      select: 'key,value',
      key: `in.(wassenger_api_key,wassenger_enabled)`,
    },
  }));

  // Computed para obtener valores fácilmente
  public settings = computed(() => {
    const settings = this.settingsApi.value();
    const apiKey =
      settings?.find((s) => s.key === 'wassenger_api_key')?.value || '';
    const enabled =
      settings?.find((s) => s.key === 'wassenger_enabled')?.value === 'true';
    return { api_key: apiKey, enabled };
  });

  /**
   * Envía un mensaje de invitación por Wassenger
   * @param phoneNumber Número de teléfono (formato internacional)
   * @param message Mensaje a enviar
   */
  public async sendMessage(
    phoneNumber: string,
    message: string
  ): Promise<boolean> {
    const settings = this.settings();
    if (!settings.enabled || !settings.api_key) {
      this.messageService?.add({
        severity: 'warn',
        summary: 'Wassenger no configurado',
        detail: 'Por favor configura Wassenger en Configuración primero',
      });
      return false;
    }

    try {
      // Usar el endpoint proxy del servidor para evitar problemas de CORS
      const response = await firstValueFrom(
        this.http.post<{ success: boolean; data?: any; error?: string }>(
          '/api/wassenger/send-message',
          {
            phoneNumber,
            message,
            apiKey: settings.api_key,
          }
        )
      );

      if (response?.success) {
        return true;
      } else {
        throw new Error(response?.error || 'Error desconocido');
      }
    } catch (error: any) {
      console.error('Error sending Wassenger message:', error);
      const errorMessage =
        error.error?.error ||
        error.error?.message ||
        error.message ||
        'No se pudo enviar el mensaje por Wassenger';

      this.messageService?.add({
        severity: 'error',
        summary: 'Error al enviar mensaje',
        detail: errorMessage,
      });
      return false;
    }
  }

  /**
   * Envía invitación a un empleado nuevo
   * @param employeeName Nombre del empleado
   * @param phoneNumber Número de teléfono
   * @param workEmail Email laboral
   * @param invitationLink Link de invitación (Auth0)
   */
  public async sendEmployeeInvitation(
    employeeName: string,
    phoneNumber: string,
    workEmail: string,
    invitationLink?: string
  ): Promise<boolean> {
    const message = `¡Hola ${employeeName}!

Bienvenido/a a People. Tu cuenta ha sido creada.

${
  invitationLink
    ? `Para acceder, haz clic en este enlace: ${invitationLink}`
    : 'Pronto recibirás las credenciales para acceder al sistema.'
}

Si necesitas ayuda, contacta a Recursos Humanos.

¡Bienvenido/a al equipo!`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Envía código de restablecimiento de contraseña
   * @param phoneNumber Número de teléfono
   * @param resetCode Código de restablecimiento
   */
  public async sendPasswordResetCode(
    phoneNumber: string,
    resetCode: string
  ): Promise<boolean> {
    const message = `Tu código de restablecimiento de contraseña es: ${resetCode}

Este código expira en 10 minutos.

Si no solicitaste este código, ignora este mensaje.`;

    return this.sendMessage(phoneNumber, message);
  }

  /**
   * Envía invitación al portal de empleados
   * @param employeeName Nombre del empleado
   * @param phoneNumber Número de teléfono
   * @param workEmail Email laboral
   * @param portalUrl URL del portal de empleados
   */
  public async sendPortalInvitation(
    employeeName: string,
    phoneNumber: string,
    workEmail: string,
    portalUrl: string
  ): Promise<boolean> {
    const message = `¡Hola ${employeeName}!

Has sido invitado/a al Portal de Empleados de People.

Puedes acceder a tu portal en: ${portalUrl}

Tu email de acceso es: ${workEmail}

En el portal podrás:
• Ver tus marcaciones y tardanzas
• Actualizar tus datos personales
• Solicitar documentos
• Subir incapacidades
• Enviar quejas anónimas

¡Bienvenido/a!`;

    return this.sendMessage(phoneNumber, message);
  }
}
