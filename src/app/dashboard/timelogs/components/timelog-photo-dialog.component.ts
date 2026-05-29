import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, input, model, output, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { Dialog } from 'primeng/dialog';
import { Skeleton } from 'primeng/skeleton';
import { ApiUrlService } from '../../../services/api-url.service';

/**
 * Diálogo que muestra la foto guardada de una marcación facial.
 * Las fotos están en `timelog_photos` con retención de 45 días.
 */
@Component({
  selector: 'pt-timelog-photo-dialog',
  imports: [CommonModule, Dialog, Skeleton],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      modal
      [closable]="true"
      [draggable]="false"
      [dismissableMask]="true"
      [style]="{ width: 'min(540px, 92vw)' }"
      [header]="title()"
      (onHide)="closed.emit()"
    >
      <div class="tpd-wrap">
        @if (loading()) {
          <p-skeleton height="320px" />
        } @else if (errorMsg(); as err) {
          <div class="tpd-empty">
            <i class="pi pi-image text-4xl text-gray-600 mb-3"></i>
            <p class="text-sm text-gray-400">{{ err }}</p>
          </div>
        } @else if (photo(); as p) {
          <img [src]="p.photo_base64" [alt]="title()" class="tpd-img" />
          <div class="tpd-meta">
            <div class="tpd-meta__row">
              <i class="pi pi-calendar text-amber-400"></i>
              <span>{{ p.created_at | date: 'medium' }}</span>
            </div>
            @if (p.similarity != null) {
              <div class="tpd-meta__row">
                <i class="pi pi-percentage text-green-400"></i>
                <span>Similitud: {{ (p.similarity * 100).toFixed(1) }}%</span>
              </div>
            }
            <div class="tpd-meta__row tpd-meta__hint">
              <i class="pi pi-info-circle"></i>
              <span>Foto disponible por 45 días</span>
            </div>
          </div>
        }
      </div>
    </p-dialog>
  `,
  styles: [`
    .tpd-wrap { display: flex; flex-direction: column; gap: 1rem; }
    .tpd-img { width: 100%; max-height: 60vh; object-fit: contain; border-radius: 12px; background: #0a0a0a; transform: scaleX(-1); }
    .tpd-empty { text-align: center; padding: 3rem 1rem; display: flex; flex-direction: column; align-items: center; }
    .tpd-meta { display: flex; flex-direction: column; gap: 0.5rem; padding: 0.75rem 1rem; background: rgba(255,255,255,0.03); border-radius: 12px; }
    .tpd-meta__row { display: flex; align-items: center; gap: 0.6rem; font-size: 0.85rem; color: #d1d5db; }
    .tpd-meta__hint { color: #6b7280; font-size: 0.75rem; }
    .tpd-meta__row i { font-size: 0.85rem; }
  `],
})
export class TimelogPhotoDialogComponent {
  public visible = model<boolean>(false);
  public timelogId = input<string | null>(null);
  public title = input<string>('Foto de marcación');
  public closed = output<void>();

  public loading = signal(false);
  public errorMsg = signal<string | null>(null);
  public photo = signal<{ photo_base64: string; created_at: string; similarity: number | null } | null>(null);

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  constructor() {
    effect(() => {
      const id = this.timelogId();
      const isVisible = this.visible();
      if (isVisible && id) this.loadPhoto(id);
      else if (!isVisible) {
        this.photo.set(null);
        this.errorMsg.set(null);
      }
    });
  }

  private async loadPhoto(timelogId: string): Promise<void> {
    this.loading.set(true);
    this.errorMsg.set(null);
    this.photo.set(null);
    try {
      const url = this.apiUrl.build('rest/v1/timelog_photos', {
        select: 'photo_base64,created_at,similarity',
        timelog_id: `eq.${timelogId}`,
        limit: '1',
      });
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      if (Array.isArray(rows) && rows.length > 0) {
        this.photo.set(rows[0]);
      } else {
        this.errorMsg.set('No hay foto guardada para esta marcación. Puede haber expirado (>45 días) o no haberse capturado.');
      }
    } catch {
      this.errorMsg.set('Error al cargar la foto');
    } finally {
      this.loading.set(false);
    }
  }
}
