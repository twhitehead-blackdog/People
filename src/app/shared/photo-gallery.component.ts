import { CommonModule } from '@angular/common';
import { Component, EventEmitter, inject, input, OnInit, output, signal } from '@angular/core';
import { ImageUploadService, UploadResult } from '../services/image-upload.service';
import { Button } from 'primeng/button';
import { ProgressBarModule } from 'primeng/progressbar';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

export interface PhotoItem {
  url: string;
  file?: File;
  uploading?: boolean;
  progress?: number;
  error?: string;
}

@Component({
  selector: 'pt-photo-gallery',
  standalone: true,
  imports: [CommonModule, Button, ProgressBarModule, ToastModule],
  providers: [MessageService],
  template: `
    <p-toast />
    <div class="photo-gallery">
      <div class="gallery-header">
        <h3 class="gallery-title">Galería de Fotos</h3>
        <p class="gallery-subtitle">Arrastra y suelta imágenes o haz clic para seleccionar</p>
      </div>

      <!-- Zona de drop -->
      <div
        class="drop-zone"
        [class.drag-over]="isDragOver()"
        [class.has-photos]="photos().length > 0"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onDrop($event)"
        (click)="fileInput.click()"
      >
        <input
          #fileInput
          type="file"
          multiple
          accept="image/*"
          (change)="onFileSelected($event)"
          style="display: none"
        />
        @if (photos().length === 0) {
          <div class="drop-zone-content">
            <div class="drop-icon">📷</div>
            <p class="drop-text">Arrastra imágenes aquí</p>
            <p class="drop-hint">o haz clic para seleccionar</p>
            <p class="drop-formats">Formatos: JPG, PNG, GIF, WEBP (máx. 10MB)</p>
          </div>
        } @else {
          <div class="photos-grid">
            @for (photo of photos(); track photo.url; let i = $index) {
              <div class="photo-item" [class.uploading]="photo.uploading">
                <div class="photo-image-container">
                  @if (photo.uploading) {
                    <div class="upload-overlay">
                      <div class="upload-progress">
                        <p-progressBar [value]="photo.progress || 0" [showValue]="false" />
                        <span class="progress-text">{{ photo.progress || 0 }}%</span>
                      </div>
                    </div>
                  }
                  @if (photo.error) {
                    <div class="error-overlay">
                      <span class="error-icon">⚠️</span>
                      <p class="error-text">{{ photo.error }}</p>
                    </div>
                  }
                  <img
                    [src]="photo.url"
                    [alt]="'Foto ' + (i + 1)"
                    class="photo-image"
                    (error)="onImageError(photo)"
                    (click)="openCarousel(i)"
                    style="cursor: pointer;"
                  />
                  <div class="photo-actions">
                    <button
                      class="action-btn delete-btn"
                      (click)="removePhoto(i, $event)"
                      title="Eliminar"
                      [disabled]="photo.uploading"
                    >
                      🗑️
                    </button>
                    @if (i > 0) {
                      <button
                        class="action-btn move-btn"
                        (click)="movePhoto(i, i - 1, $event)"
                        title="Mover izquierda"
                        [disabled]="photo.uploading"
                      >
                        ←
                      </button>
                    }
                    @if (i < photos().length - 1) {
                      <button
                        class="action-btn move-btn"
                        (click)="movePhoto(i, i + 1, $event)"
                        title="Mover derecha"
                        [disabled]="photo.uploading"
                      >
                        →
                      </button>
                    }
                  </div>
                  @if (i === 0) {
                    <div class="primary-badge">Principal</div>
                  }
                </div>
              </div>
            }
            @if (photos().length < maxPhotos()) {
              <div class="photo-item add-photo" (click)="fileInput.click()">
                <div class="add-photo-content">
                  <span class="add-icon">➕</span>
                  <p class="add-text">Agregar foto</p>
                </div>
              </div>
            }
          </div>
        }
      </div>

      @if (photos().length > 0) {
        <div class="gallery-footer">
          <p class="photo-count">
            {{ photos().length }} / {{ maxPhotos() }} fotos
            @if (photos().length === maxPhotos()) {
              <span class="max-reached">(Máximo alcanzado)</span>
            }
          </p>
          <div class="footer-actions">
            <p-button
              [label]="carouselMode() ? 'Vista Grid' : 'Vista Carrusel'"
              [icon]="carouselMode() ? 'pi pi-th-large' : 'pi pi-images'"
              severity="secondary"
              [text]="true"
              (onClick)="toggleCarouselMode()"
            />
            <p-button
              label="Limpiar todo"
              severity="secondary"
              [text]="true"
              icon="pi pi-trash"
              (onClick)="clearAll()"
              [disabled]="hasUploading()"
            />
          </div>
        </div>
      }

      @if (carouselMode() && photos().length > 0) {
        <div class="carousel-container" (click)="closeCarousel()">
          <div class="carousel-content" (click)="$event.stopPropagation()">
            <button class="carousel-close" (click)="closeCarousel()">✕</button>
            <button
              class="carousel-nav carousel-prev"
              (click)="previousPhoto()"
              [disabled]="currentCarouselIndex() === 0"
            >
              ‹
            </button>
            <div class="carousel-main-image">
              <img
                [src]="photos()[currentCarouselIndex()].url"
                [alt]="'Foto ' + (currentCarouselIndex() + 1)"
                class="carousel-image"
              />
              <div class="carousel-counter">
                {{ currentCarouselIndex() + 1 }} / {{ photos().length }}
              </div>
            </div>
            <button
              class="carousel-nav carousel-next"
              (click)="nextPhoto()"
              [disabled]="currentCarouselIndex() === photos().length - 1"
            >
              ›
            </button>
            <div class="carousel-thumbnails">
              @for (photo of photos(); track photo.url; let i = $index) {
                <img
                  [src]="photo.url"
                  [alt]="'Miniatura ' + (i + 1)"
                  class="carousel-thumbnail"
                  [class.active]="i === currentCarouselIndex()"
                  (click)="goToPhoto(i)"
                />
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .photo-gallery {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      .gallery-header {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .gallery-title {
        font-size: 1.5rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      .gallery-subtitle {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .drop-zone {
        border: 2px dashed #d1d5db;
        border-radius: 0.75rem;
        padding: 2rem;
        background: #f9fafb;
        transition: all 0.3s ease;
        cursor: pointer;
        min-height: 200px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .drop-zone:hover {
        border-color: #fbbf24;
        background: #fef3c7;
      }

      .drop-zone.drag-over {
        border-color: #fbbf24;
        background: #fef3c7;
        transform: scale(1.02);
      }

      .drop-zone.has-photos {
        padding: 1rem;
        min-height: auto;
      }

      .drop-zone-content {
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .drop-icon {
        font-size: 3rem;
        margin-bottom: 0.5rem;
      }

      .drop-text {
        font-size: 1.125rem;
        font-weight: 600;
        color: #374151;
        margin: 0;
      }

      .drop-hint {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .drop-formats {
        font-size: 0.75rem;
        color: #9ca3af;
        margin: 0.5rem 0 0 0;
      }

      .photos-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
        gap: 1rem;
        width: 100%;
      }

      .photo-item {
        position: relative;
        aspect-ratio: 1;
        border-radius: 0.5rem;
        overflow: hidden;
        border: 2px solid #e5e7eb;
        transition: all 0.3s ease;
        background: #ffffff;
      }

      .photo-item:hover {
        border-color: #fbbf24;
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      }

      .photo-item.uploading {
        opacity: 0.7;
      }

      .photo-image-container {
        position: relative;
        width: 100%;
        height: 100%;
      }

      .photo-image {
        width: 100%;
        height: 100%;
        object-fit: cover;
        display: block;
      }

      .upload-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10;
      }

      .upload-progress {
        width: 80%;
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        align-items: center;
      }

      .progress-text {
        color: #ffffff;
        font-size: 0.875rem;
        font-weight: 600;
      }

      .error-overlay {
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(239, 68, 68, 0.9);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        z-index: 10;
        padding: 0.5rem;
      }

      .error-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }

      .error-text {
        color: #ffffff;
        font-size: 0.75rem;
        text-align: center;
        margin: 0;
      }

      .photo-actions {
        position: absolute;
        top: 0.5rem;
        right: 0.5rem;
        display: flex;
        gap: 0.25rem;
        opacity: 0;
        transition: opacity 0.3s ease;
      }

      .photo-item:hover .photo-actions {
        opacity: 1;
      }

      .action-btn {
        background: rgba(0, 0, 0, 0.7);
        border: none;
        border-radius: 0.25rem;
        color: #ffffff;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        font-size: 0.875rem;
        transition: all 0.2s ease;
      }

      .action-btn:hover:not(:disabled) {
        background: rgba(0, 0, 0, 0.9);
        transform: scale(1.1);
      }

      .action-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .delete-btn:hover:not(:disabled) {
        background: rgba(239, 68, 68, 0.9);
      }

      .primary-badge {
        position: absolute;
        bottom: 0.5rem;
        left: 0.5rem;
        background: #fbbf24;
        color: #000000;
        padding: 0.25rem 0.5rem;
        border-radius: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
      }

      .add-photo {
        border: 2px dashed #d1d5db;
        background: #f9fafb;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
      }

      .add-photo:hover {
        border-color: #fbbf24;
        background: #fef3c7;
      }

      .add-photo-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .add-icon {
        font-size: 2rem;
      }

      .add-text {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .gallery-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 1rem;
        border-top: 1px solid #e5e7eb;
      }

      .photo-count {
        font-size: 0.875rem;
        color: #6b7280;
        margin: 0;
      }

      .max-reached {
        color: #fbbf24;
        font-weight: 600;
      }

      .footer-actions {
        display: flex;
        gap: 0.5rem;
      }

      .carousel-container {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.9);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 2rem;
      }

      .carousel-content {
        position: relative;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .carousel-close {
        position: absolute;
        top: -2.5rem;
        right: 0;
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 2rem;
        cursor: pointer;
        width: 40px;
        height: 40px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 50%;
        transition: all 0.3s ease;
      }

      .carousel-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .carousel-main-image {
        position: relative;
        max-width: 100%;
        max-height: 70vh;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .carousel-image {
        max-width: 100%;
        max-height: 70vh;
        object-fit: contain;
        border-radius: 0.5rem;
      }

      .carousel-counter {
        position: absolute;
        bottom: -2rem;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(0, 0, 0, 0.7);
        color: #ffffff;
        padding: 0.5rem 1rem;
        border-radius: 0.5rem;
        font-weight: 600;
      }

      .carousel-nav {
        position: absolute;
        top: 50%;
        transform: translateY(-50%);
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: #ffffff;
        font-size: 3rem;
        width: 60px;
        height: 60px;
        border-radius: 50%;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.3s ease;
        z-index: 10;
      }

      .carousel-nav:hover:not(:disabled) {
        background: rgba(255, 255, 255, 0.4);
        transform: translateY(-50%) scale(1.1);
      }

      .carousel-nav:disabled {
        opacity: 0.3;
        cursor: not-allowed;
      }

      .carousel-prev {
        left: -80px;
      }

      .carousel-next {
        right: -80px;
      }

      .carousel-thumbnails {
        display: flex;
        gap: 0.5rem;
        overflow-x: auto;
        padding: 0.5rem;
        max-width: 100%;
      }

      .carousel-thumbnail {
        width: 80px;
        height: 80px;
        object-fit: cover;
        border-radius: 0.5rem;
        cursor: pointer;
        border: 3px solid transparent;
        transition: all 0.3s ease;
        opacity: 0.6;
      }

      .carousel-thumbnail:hover {
        opacity: 1;
        transform: scale(1.1);
      }

      .carousel-thumbnail.active {
        border-color: #fbbf24;
        opacity: 1;
      }

      @media (max-width: 768px) {
        .photos-grid {
          grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          gap: 0.75rem;
        }

        .drop-zone {
          padding: 1rem;
        }

        .gallery-footer {
          flex-direction: column;
          align-items: flex-start;
          gap: 0.5rem;
        }

        .footer-actions {
          flex-direction: column;
          width: 100%;
        }

        .carousel-container {
          padding: 1rem;
        }

        .carousel-prev {
          left: 0.5rem;
        }

        .carousel-next {
          right: 0.5rem;
        }

        .carousel-nav {
          width: 40px;
          height: 40px;
          font-size: 2rem;
        }

        .carousel-thumbnails {
          gap: 0.25rem;
        }

        .carousel-thumbnail {
          width: 60px;
          height: 60px;
        }
      }
    `,
  ],
})
export class PhotoGalleryComponent implements OnInit {
  private imageUploadService = inject(ImageUploadService);
  private messageService = inject(MessageService);

  // Inputs
  public initialPhotos = input<string[]>([]);
  public maxPhotos = input<number>(10);
  public folder = input<string>('pets');
  public autoUpload = input<boolean>(true);

  // Outputs
  public photosChange = output<string[]>();
  public uploadComplete = output<UploadResult[]>();

  // State
  public photos = signal<PhotoItem[]>([]);
  public isDragOver = signal(false);
  public carouselMode = signal(false);
  public currentCarouselIndex = signal(0);

  ngOnInit(): void {
    // Inicializar con fotos existentes
    const initial = this.initialPhotos();
    if (initial.length > 0) {
      this.photos.set(
        initial.map((url) => ({
          url,
        }))
      );
    }
  }

  public hasUploading(): boolean {
    return this.photos().some((p) => p.uploading);
  }

  public onDragOver(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(true);
  }

  public onDragLeave(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);
  }

  public onDrop(event: DragEvent): void {
    event.preventDefault();
    event.stopPropagation();
    this.isDragOver.set(false);

    const files = event.dataTransfer?.files;
    if (files && files.length > 0) {
      this.processFiles(Array.from(files));
    }
  }

  public onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.processFiles(Array.from(input.files));
    }
  }

  private processFiles(files: File[]): void {
    const remainingSlots = this.maxPhotos() - this.photos().length;
    if (remainingSlots <= 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Límite alcanzado',
        detail: `Solo puedes agregar hasta ${this.maxPhotos()} fotos`,
      });
      return;
    }

    const filesToProcess = files.slice(0, remainingSlots);
    const newPhotos: PhotoItem[] = [];

    filesToProcess.forEach((file) => {
      const validation = this.imageUploadService.validateImageFile(file);
      if (!validation.valid) {
        this.messageService.add({
          severity: 'error',
          summary: 'Archivo inválido',
          detail: validation.error || 'El archivo no es válido',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const url = e.target?.result as string;
        const photoItem: PhotoItem = {
          url,
          file,
          uploading: false,
        };

        newPhotos.push(photoItem);
        this.photos.update((current) => [...current, photoItem]);

        if (this.autoUpload()) {
          this.uploadPhoto(newPhotos.length - 1 + this.photos().length - newPhotos.length);
        }
      };
      reader.readAsDataURL(file);
    });
  }

  private uploadPhoto(index: number): void {
    const photo = this.photos()[index];
    if (!photo.file) return;

    this.photos.update((current) => {
      const updated = [...current];
      updated[index] = { ...updated[index], uploading: true, progress: 0 };
      return updated;
    });

    this.imageUploadService.uploadImage(photo.file, this.folder()).subscribe({
      next: (result) => {
        this.photos.update((current) => {
          const updated = [...current];
          updated[index] = {
            url: result.url,
            uploading: false,
            progress: 100,
          };
          return updated;
        });

        this.emitPhotosChange();
        this.messageService.add({
          severity: 'success',
          summary: 'Foto subida',
          detail: 'La foto se ha subido correctamente',
        });
      },
      error: (error) => {
        this.photos.update((current) => {
          const updated = [...current];
          updated[index] = {
            ...updated[index],
            uploading: false,
            error: error.message || 'Error al subir la foto',
          };
          return updated;
        });

        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.message || 'No se pudo subir la foto',
        });
      },
    });
  }

  public removePhoto(index: number, event: Event): void {
    event.stopPropagation();
    const photo = this.photos()[index];

    this.photos.update((current) => {
      const updated = [...current];
      updated.splice(index, 1);
      return updated;
    });

    this.emitPhotosChange();

    // Si la foto ya estaba subida, opcionalmente eliminarla del servidor
    // this.imageUploadService.deleteImage(photo.url).subscribe();
  }

  public movePhoto(fromIndex: number, toIndex: number, event: Event): void {
    event.stopPropagation();
    this.photos.update((current) => {
      const updated = [...current];
      const [moved] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, moved);
      return updated;
    });

    this.emitPhotosChange();
  }

  public clearAll(): void {
    this.photos.set([]);
    this.emitPhotosChange();
  }

  public onImageError(photo: PhotoItem): void {
    photo.url = 'assets/cat1.jpg'; // Imagen por defecto
  }

  private emitPhotosChange(): void {
    const urls = this.photos()
      .filter((p) => !p.uploading && !p.error)
      .map((p) => p.url);
    this.photosChange.emit(urls);
  }

  public getPhotoUrls(): string[] {
    return this.photos()
      .filter((p) => !p.uploading && !p.error)
      .map((p) => p.url);
  }

  public toggleCarouselMode(): void {
    this.carouselMode.set(!this.carouselMode());
    if (this.carouselMode()) {
      this.currentCarouselIndex.set(0);
    }
  }

  public openCarousel(index: number): void {
    this.currentCarouselIndex.set(index);
    this.carouselMode.set(true);
  }

  public closeCarousel(): void {
    this.carouselMode.set(false);
  }

  public nextPhoto(): void {
    if (this.currentCarouselIndex() < this.photos().length - 1) {
      this.currentCarouselIndex.update((i) => i + 1);
    }
  }

  public previousPhoto(): void {
    if (this.currentCarouselIndex() > 0) {
      this.currentCarouselIndex.update((i) => i - 1);
    }
  }

  public goToPhoto(index: number): void {
    this.currentCarouselIndex.set(index);
  }
}

