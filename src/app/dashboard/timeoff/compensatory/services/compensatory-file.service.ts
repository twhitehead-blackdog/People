import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom, Observable } from 'rxjs';
import { ApiUrlService } from '../../../../services/api-url.service';

export interface UploadResult {
  success: boolean;
  path: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class CompensatoryFileService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  /**
   * Sube un documento físico a través de Edge Function segura
   */
  async uploadPhysicalDocument(
    requestId: string,
    file: File
  ): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('requestId', requestId);
    formData.append('file', file);
    formData.append('fileName', file.name);

    const response = await firstValueFrom(
      this.http.post<UploadResult>(
        `${this.apiUrl.baseUrl}/functions/v1/upload-compensatory-physical`,
        formData
      )
    );

    return response;
  }

  /**
   * Obtiene una signed URL para visualizar/descargar un documento privado
   */
  getPhysicalDocumentUrl(path: string): Observable<string> {
    return this.http.post<string>(
      `${this.apiUrl.baseUrl}/functions/v1/get-signed-url`,
      { path },
      { responseType: 'text' as 'json' }
    );
  }

  /**
   * Descarga un documento físico
   */
  async downloadPhysicalDocument(path: string, fileName: string): Promise<void> {
    try {
      const url = await firstValueFrom(this.getPhysicalDocumentUrl(path));

      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'documento-fisico.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error descargando documento:', error);
      throw error;
    }
  }

  /**
   * Abre un documento físico en una nueva pestaña
   */
  async viewPhysicalDocument(path: string): Promise<void> {
    try {
      const url = await firstValueFrom(this.getPhysicalDocumentUrl(path));
      window.open(url, '_blank');
    } catch (error) {
      console.error('Error visualizando documento:', error);
      throw error;
    }
  }
}