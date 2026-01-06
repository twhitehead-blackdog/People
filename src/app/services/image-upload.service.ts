import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  private http = inject(HttpClient);
  private readonly supabaseUrl = process.env['ENV_SUPABASE_URL'] ?? '';
  private readonly supabaseKey = process.env['ENV_SUPABASE_API_KEY'] ?? '';
  private readonly bucketName = 'pet-photos'; // Bucket para fotos de mascotas

  /**
   * Sube una imagen al bucket de Supabase Storage
   * @param file Archivo a subir
   * @param folder Carpeta dentro del bucket (opcional, por defecto 'pets')
   * @param fileName Nombre del archivo (opcional, se genera automáticamente si no se proporciona)
   * @returns Observable con la URL pública de la imagen subida
   */
  uploadImage(
    file: File,
    folder = 'pets',
    fileName?: string
  ): Observable<UploadResult> {
    // Validar que sea una imagen
    if (!file.type.startsWith('image/')) {
      return throwError(() => new Error('El archivo debe ser una imagen'));
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return throwError(() => new Error('El archivo no puede ser mayor a 10MB'));
    }

    // Generar nombre único si no se proporciona
    const finalFileName = fileName || this.generateFileName(file.name);

    // Construir el path completo
    const filePath = `${folder}/${finalFileName}`;

    // Codificar el path para la URL
    const encodedPath = encodeURIComponent(filePath);

    // URL del endpoint de Storage (usar PUT para subir archivos)
    const uploadUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${encodedPath}`;

    // Leer el archivo como ArrayBuffer para enviarlo correctamente
    return new Observable<UploadResult>((observer) => {
      const reader = new FileReader();
      
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        
        // Realizar la petición PUT (método correcto para Supabase Storage)
        this.http
          .put<{ Key: string; message?: string }>(
            uploadUrl,
            arrayBuffer,
            {
              headers: {
                'Content-Type': file.type,
                'x-upsert': 'true', // Permite sobrescribir si el archivo ya existe
                'apikey': this.supabaseKey,
                'Authorization': `Bearer ${this.supabaseKey}`,
              },
              responseType: 'json',
            }
          )
          .pipe(
            map((response) => {
              // Construir la URL pública de la imagen
              const publicUrl = `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${encodedPath}`;
              
              return {
                url: publicUrl,
                path: filePath,
              };
            }),
            catchError((error: HttpErrorResponse) => {
              // No loguear el error aquí, el interceptor lo manejará
              // Solo extraer el mensaje de error
              let errorMessage = 'Error desconocido al subir la imagen';
              
              if (error.error) {
                if (typeof error.error === 'string') {
                  errorMessage = error.error;
                } else if (error.error.message) {
                  errorMessage = error.error.message;
                } else if (error.error.error) {
                  errorMessage = error.error.error;
                }
              } else if (error.message) {
                errorMessage = error.message;
              }
              
              // Mejorar mensajes de error según el código de estado
              if (error.status === 400) {
                errorMessage = 'No se pudo subir la imagen. Verifica que el bucket "pet-photos" exista y tenga las políticas de acceso configuradas correctamente.';
              } else if (error.status === 401 || error.status === 403) {
                errorMessage = 'No tienes permisos para subir imágenes. Verifica tu autenticación.';
              } else if (error.status === 404) {
                errorMessage = 'El bucket "pet-photos" no existe. Por favor, créalo en Supabase Storage.';
              } else if (error.status === 413) {
                errorMessage = 'El archivo es demasiado grande. El tamaño máximo es 10MB.';
              } else if (error.status === 0) {
                errorMessage = 'No se pudo conectar con el servidor. Verifica tu conexión a internet.';
              }
              
              return throwError(() => new Error(errorMessage));
            })
          )
          .subscribe({
            next: (result) => observer.next(result),
            error: (error: any) => observer.error(error),
            complete: () => observer.complete(),
          });
      };

      reader.onerror = () => {
        observer.error(new Error('Error al leer el archivo'));
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Sube múltiples imágenes
   * @param files Array de archivos a subir
   * @param folder Carpeta dentro del bucket
   * @returns Observable con array de resultados
   */
  uploadMultipleImages(
    files: File[],
    folder = 'pets'
  ): Observable<UploadResult[]> {
    const uploadObservables = files.map((file) => this.uploadImage(file, folder));
    
    // Combinar todos los observables y esperar a que todos completen
    return new Observable<UploadResult[]>((observer) => {
      const results: UploadResult[] = [];
      let completed = 0;
      let hasError = false;

      uploadObservables.forEach((obs, index) => {
        obs.subscribe({
          next: (result) => {
            results[index] = result;
            completed++;
            if (completed === files.length && !hasError) {
              observer.next(results);
              observer.complete();
            }
          },
          error: (error: any) => {
            if (!hasError) {
              hasError = true;
              observer.error(error);
            }
          },
        });
      });
    });
  }

  /**
   * Elimina una imagen del bucket
   * @param path Path de la imagen a eliminar (ej: 'pets/image.jpg')
   * @returns Observable que se completa cuando la imagen se elimina
   */
  deleteImage(path: string): Observable<void> {
    const encodedPath = encodeURIComponent(path);
    const deleteUrl = `${this.supabaseUrl}/storage/v1/object/${this.bucketName}/${encodedPath}`;

    return this.http
      .delete(deleteUrl, {
        headers: {
          'apikey': this.supabaseKey,
          'Authorization': `Bearer ${this.supabaseKey}`,
        },
      })
      .pipe(
        map(() => void 0),
        catchError((error: HttpErrorResponse) => {
          console.error('Error al eliminar imagen:', error);
          const errorMessage = error.error?.message || error.message || 'Error al eliminar la imagen';
          return throwError(() => new Error(errorMessage));
        })
      );
  }

  /**
   * Genera un nombre de archivo único basado en timestamp y nombre original
   */
  private generateFileName(originalName: string): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    const extension = originalName.split('.').pop() || 'jpg';
    const nameWithoutExt = originalName.replace(/\.[^/.]+$/, '');
    const sanitizedName = nameWithoutExt
      .replace(/[^a-zA-Z0-9]/g, '_')
      .substring(0, 50); // Limitar longitud
    
    return `${sanitizedName}_${timestamp}_${random}.${extension}`;
  }

  /**
   * Valida que un archivo sea una imagen válida
   */
  validateImageFile(file: File): { valid: boolean; error?: string } {
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      return { valid: false, error: 'El archivo debe ser una imagen' };
    }

    // Validar tamaño (máximo 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return { valid: false, error: 'El archivo no puede ser mayor a 10MB' };
    }

    // Validar extensiones permitidas
    const allowedExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp'];
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (!extension || !allowedExtensions.includes(extension)) {
      return {
        valid: false,
        error: `Formato no permitido. Use: ${allowedExtensions.join(', ')}`,
      };
    }

    return { valid: true };
  }

  /**
   * Obtiene la URL pública de una imagen sin subirla
   * Útil para construir URLs de imágenes ya existentes
   */
  getPublicUrl(path: string): string {
    const encodedPath = encodeURIComponent(path);
    return `${this.supabaseUrl}/storage/v1/object/public/${this.bucketName}/${encodedPath}`;
  }
}

