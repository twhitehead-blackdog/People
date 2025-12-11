import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface EmailData {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

@Injectable({
  providedIn: 'root',
})
export class EmailService {
  private http = inject(HttpClient);

  /**
   * Envía un email
   * @param emailData Datos del email (destinatario, asunto, contenido)
   * @returns Observable con la respuesta del servidor
   */
  sendEmail(emailData: EmailData): Observable<{ success: boolean; data?: any }> {
    return this.http.post<{ success: boolean; data?: any }>(
      '/api/email/send',
      emailData
    );
  }
}









