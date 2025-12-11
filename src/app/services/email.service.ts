import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export interface EmailOptions {
  to: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private http = inject(HttpClient);
  private readonly emailApiUrl = process.env['ENV_EMAIL_API_URL'] || ''; // URL de tu API de email
  private readonly emailApiKey = process.env['ENV_EMAIL_API_KEY'] || ''; // API key para el servicio de email

  /**
   * Envía un email usando una plantilla
   */
  public sendEmail(
    template: EmailTemplate,
    options: EmailOptions
  ): Observable<{ success: boolean; messageId?: string; error?: string }> {
    // Si no hay configuración de email, solo loguear (modo desarrollo)
    if (!this.emailApiUrl) {
      console.log('📧 [EmailService] Email simulado:', {
        to: options.to,
        subject: template.subject,
        html: template.html,
      });
      return of({ success: true, messageId: 'simulated_' + Date.now() });
    }

    const payload = {
      to: Array.isArray(options.to) ? options.to : [options.to],
      cc: options.cc ? (Array.isArray(options.cc) ? options.cc : [options.cc]) : undefined,
      bcc: options.bcc ? (Array.isArray(options.bcc) ? options.bcc : [options.bcc]) : undefined,
      replyTo: options.replyTo,
      subject: template.subject,
      html: template.html,
      text: template.text || this.htmlToText(template.html),
      attachments: options.attachments,
    };

    return this.http
      .post<{ success: boolean; messageId?: string; error?: string }>(
        `${this.emailApiUrl}/send`,
        payload,
        {
          headers: {
            'Authorization': `Bearer ${this.emailApiKey}`,
            'Content-Type': 'application/json',
          },
        }
      )
      .pipe(
        catchError((error) => {
          console.error('Error al enviar email:', error);
          return of({
            success: false,
            error: error.message || 'Error desconocido al enviar email',
          });
        })
      );
  }

  /**
   * Envía notificación de nueva solicitud de adopción
   */
  public sendApplicationReceivedEmail(
    applicantEmail: string,
    applicantName: string,
    petName: string
  ): Observable<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getApplicationReceivedTemplate(applicantName, petName);
    return this.sendEmail(template, { to: applicantEmail });
  }

  /**
   * Envía notificación de cambio de estado de solicitud
   */
  public sendApplicationStatusChangeEmail(
    applicantEmail: string,
    applicantName: string,
    petName: string,
    status: 'approved' | 'rejected' | 'completed',
    notes?: string
  ): Observable<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getApplicationStatusChangeTemplate(
      applicantName,
      petName,
      status,
      notes
    );
    return this.sendEmail(template, { to: applicantEmail });
  }

  /**
   * Envía notificación de nuevo interés en mascota (a administradores)
   */
  public sendNewInterestNotificationEmail(
    adminEmails: string[],
    petName: string,
    userEmail: string,
    userName?: string
  ): Observable<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getNewInterestTemplate(petName, userEmail, userName);
    return this.sendEmail(template, { to: adminEmails });
  }

  /**
   * Envía notificación de nueva mascota agregada (a administradores)
   */
  public sendNewPetNotificationEmail(
    adminEmails: string[],
    petName: string,
    petId: string
  ): Observable<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getNewPetTemplate(petName, petId);
    return this.sendEmail(template, { to: adminEmails });
  }

  /**
   * Plantilla: Solicitud recibida
   */
  private getApplicationReceivedTemplate(
    applicantName: string,
    petName: string
  ): EmailTemplate {
    return {
      subject: `Solicitud de Adopción Recibida - ${petName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fbbf24; color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
            .button { display: inline-block; padding: 12px 24px; background: #fbbf24; color: #000; text-decoration: none; border-radius: 6px; font-weight: bold; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🐾 Black Dog Panamá</h1>
            </div>
            <div class="content">
              <h2>¡Hola ${applicantName}!</h2>
              <p>Hemos recibido tu solicitud de adopción para <strong>${petName}</strong>.</p>
              <p>Nuestro equipo revisará tu solicitud y se pondrá en contacto contigo en los próximos días.</p>
              <p>Mientras tanto, puedes revisar el estado de tu solicitud en nuestro sitio web.</p>
              <a href="${process.env['ENV_APP_URL'] || 'https://blackdogpanama.com'}/adoptions" class="button">Ver Estado de Solicitud</a>
              <p>Gracias por elegir adoptar y darle un hogar a ${petName}.</p>
            </div>
            <div class="footer">
              <p>Black Dog Panamá - Adopción Responsable</p>
              <p>Este es un email automático, por favor no respondas a este mensaje.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  /**
   * Plantilla: Cambio de estado de solicitud
   */
  private getApplicationStatusChangeTemplate(
    applicantName: string,
    petName: string,
    status: 'approved' | 'rejected' | 'completed',
    notes?: string
  ): EmailTemplate {
    const statusLabels: Record<string, { title: string; message: string; color: string }> = {
      approved: {
        title: '¡Felicidades! Tu solicitud ha sido Aprobada',
        message: `Tu solicitud para adoptar a ${petName} ha sido aprobada. Nuestro equipo se pondrá en contacto contigo para coordinar los siguientes pasos.`,
        color: '#10b981',
      },
      rejected: {
        title: 'Actualización sobre tu Solicitud de Adopción',
        message: `Lamentamos informarte que tu solicitud para adoptar a ${petName} no ha sido aprobada en esta ocasión.`,
        color: '#ef4444',
      },
      completed: {
        title: '¡Adopción Completada!',
        message: `¡Felicitaciones! La adopción de ${petName} se ha completado exitosamente. Esperamos que disfruten juntos muchos años de felicidad.`,
        color: '#10b981',
      },
    };

    const statusInfo = statusLabels[status] || statusLabels.rejected;

    return {
      subject: statusInfo.title,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: ${statusInfo.color}; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
            .notes { background: #f9fafb; padding: 15px; border-left: 4px solid ${statusInfo.color}; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>${statusInfo.title}</h1>
            </div>
            <div class="content">
              <h2>Hola ${applicantName},</h2>
              <p>${statusInfo.message}</p>
              ${notes ? `<div class="notes"><strong>Notas adicionales:</strong><br>${notes}</div>` : ''}
              <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
            </div>
            <div class="footer">
              <p>Black Dog Panamá - Adopción Responsable</p>
              <p>Este es un email automático, por favor no respondas a este mensaje.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  /**
   * Plantilla: Nuevo interés en mascota
   */
  private getNewInterestTemplate(
    petName: string,
    userEmail: string,
    userName?: string
  ): EmailTemplate {
    return {
      subject: `Nuevo Interés en ${petName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #fbbf24; color: #000; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
            .info-box { background: #f9fafb; padding: 15px; border-radius: 6px; margin: 15px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Nueva Notificación</h1>
            </div>
            <div class="content">
              <h2>Nuevo Interés en Mascota</h2>
              <div class="info-box">
                <p><strong>Mascota:</strong> ${petName}</p>
                <p><strong>Usuario:</strong> ${userName || userEmail}</p>
                <p><strong>Email:</strong> ${userEmail}</p>
              </div>
              <p>Un usuario ha mostrado interés en adoptar a ${petName}. Revisa el panel de administración para más detalles.</p>
            </div>
            <div class="footer">
              <p>Black Dog Panamá - Panel de Administración</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  /**
   * Plantilla: Nueva mascota agregada
   */
  private getNewPetTemplate(petName: string, petId: string): EmailTemplate {
    return {
      subject: `Nueva Mascota Agregada: ${petName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10b981; color: #fff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; }
            .footer { background: #f9fafb; padding: 20px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🐾 Nueva Mascota</h1>
            </div>
            <div class="content">
              <h2>Se ha agregado una nueva mascota</h2>
              <p><strong>Nombre:</strong> ${petName}</p>
              <p>La mascota ha sido agregada al sistema y está disponible para adopción.</p>
            </div>
            <div class="footer">
              <p>Black Dog Panamá - Panel de Administración</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };
  }

  /**
   * Convierte HTML a texto plano (básico)
   */
  private htmlToText(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();
  }
}

