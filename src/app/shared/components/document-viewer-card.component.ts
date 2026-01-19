import { CommonModule } from '@angular/common';
import { Component, computed, input, output, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { SafeUrlPipe } from '../../dashboard/modules/shared/pipes/safe-url.pipe';

@Component({
  selector: 'pt-document-viewer-card',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule, SafeUrlPipe],
  template: `
    <div
      class="p-4 bg-neutral-800 rounded-lg border border-neutral-700 animate-fadeIn transition-all duration-300 h-full flex flex-col"
    >
      <!-- Header -->
      <div class="flex items-center justify-between mb-3 shrink-0">
        <h3 class="text-lg font-semibold text-white flex items-center gap-2">
          <i class="pi pi-file" [class]="iconColorClass()"></i>
          {{ title() }}
        </h3>
        <div class="flex items-center gap-2">
          <p-button
            icon="pi pi-external-link"
            [text]="true"
            [rounded]="true"
            size="small"
            (onClick)="openInNewTab()"
            pTooltip="Abrir en nueva pestaña"
            tooltipPosition="bottom"
          />
          <p-button
            icon="pi pi-download"
            label="Descargar"
            severity="info"
            [text]="true"
            size="small"
            (onClick)="onDownload()"
          />
        </div>
      </div>

      <!-- Zoom Controls -->
      <div class="flex items-center justify-end gap-2 mb-3 shrink-0">
        <p-button
          icon="pi pi-search-minus"
          (onClick)="zoomOut()"
          [text]="true"
          [rounded]="true"
          severity="secondary"
          size="small"
          [disabled]="zoomLevel() <= 0.5"
        />
        <span class="text-sm text-gray-400 min-w-[60px] text-center">
          {{ (zoomLevel() * 100).toFixed(0) }}%
        </span>
        <p-button
          icon="pi pi-search-plus"
          (onClick)="zoomIn()"
          [text]="true"
          [rounded]="true"
          severity="secondary"
          size="small"
          [disabled]="zoomLevel() >= 2"
        />
        <p-button
          label="Reset"
          (onClick)="resetZoom()"
          [text]="true"
          severity="secondary"
          size="small"
        />
      </div>

      <!-- Document Viewer -->
      <div
        class="border border-gray-700 rounded-lg overflow-hidden bg-gray-900 flex-1 relative min-h-[500px]"
      >
        <div class="absolute inset-0 overflow-auto bg-gray-900 p-4">
          <div
            class="transition-transform duration-200 origin-top-left min-h-full"
            [style.transform]="'scale(' + zoomLevel() + ')'"
            [style.width.%]="100 / zoomLevel()"
          >
            <!-- Image Viewer -->
            @if (isImage()) {
            <div class="flex justify-center min-h-full">
              <img
                [src]="documentUrl()"
                class="max-w-full rounded object-contain"
                alt="Documento adjunto"
              />
            </div>
            }
            <!-- PDF/Other Viewer -->
            @else {
            <object
              [data]="documentUrl() | safeUrl"
              type="application/pdf"
              class="w-full h-full min-h-[600px] border-0"
              style="display: block;"
            >
              <div class="flex flex-col items-center justify-center p-8 h-full">
                <i class="pi pi-file-pdf text-4xl text-gray-500 mb-4"></i>
                <p class="text-gray-400 text-center mb-4">
                  No se pudo previsualizar el documento directamente.
                </p>
                <div class="flex gap-4">
                  <a
                    [href]="documentUrl() | safeUrl"
                    target="_blank"
                    class="text-blue-400 hover:text-blue-300 underline"
                  >
                    Abrir en nueva pestaña
                  </a>
                  <button
                    (click)="onDownload()"
                    class="text-blue-400 hover:text-blue-300 underline"
                  >
                    Descargar archivo
                  </button>
                </div>
              </div>
            </object>
            }
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .animate-fadeIn {
        animation: fadeIn 0.3s ease-out;
      }
      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: translateY(10px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
    `,
  ],
})
export class DocumentViewerCardComponent {
  documentUrl = input.required<string>();
  title = input<string>('Documento Adjunto');
  iconColorClass = input<string>('text-blue-400');

  download = output<string>();

  zoomLevel = signal(1);

  isImage = computed(() => {
    const url = this.documentUrl().toLowerCase();
    return (
      url.match(/\.(jpeg|jpg|gif|png|webp|bmp)$/) != null ||
      url.includes('image/')
    );
  });

  zoomIn(): void {
    this.zoomLevel.update((v) => Math.min(v + 0.25, 2));
  }

  zoomOut(): void {
    this.zoomLevel.update((v) => Math.max(v - 0.25, 0.5));
  }

  resetZoom(): void {
    this.zoomLevel.set(1);
  }

  openInNewTab(): void {
    window.open(this.documentUrl(), '_blank');
  }

  onDownload(): void {
    this.download.emit(this.documentUrl());
  }
}
