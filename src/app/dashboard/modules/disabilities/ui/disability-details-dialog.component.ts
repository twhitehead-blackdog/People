import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { differenceInCalendarDays } from 'date-fns';
import { FormsModule } from '@angular/forms';
import { DomSanitizer } from '@angular/platform-browser';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';
import { Disability } from '../models/disability.model';

@Component({
  selector: 'pt-disability-details-dialog',
  standalone: true,
  imports: [
    DatePipe,
    FormsModule,
    ButtonModule,
    DialogModule,
    InputTextModule,
    TagModule,
    TextareaModule,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: '90vw', maxWidth: '900px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span class="text-lg font-semibold text-white"
            >Detalles de Incapacidad</span
          >
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-history"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              (onClick)="toggleAuditSidebar.emit()"
              [styleClass]="
                showAuditSidebar() ? 'bg-blue-500/20 text-blue-400' : ''
              "
              pTooltip="Ver historial de cambios"
              tooltipPosition="left"
              size="small"
            />
          </div>
        </div>
      </ng-template>
      @if (disability()) {
      <div class="space-y-4 pt-4">
        <!-- Información del Empleado y Resumen (lado a lado) -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Información del Empleado -->
          <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-user text-blue-400"></i>
              Información del Empleado
            </h3>
            <div class="space-y-2">
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Nombre</label
                >
                <p class="text-white">
                  {{ disability()!.employee?.first_name }}
                  {{ disability()!.employee?.father_name }}
                  {{ disability()!.employee?.mother_name }}
                </p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Email</label
                >
                <p class="text-white">
                  {{ disability()!.employee?.work_email }}
                </p>
              </div>
              @if (disability()!.employee?.position?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Cargo</label
                >
                <p class="text-white">
                  {{ disability()!.employee?.position?.name }}
                </p>
              </div>
              } @if (disability()!.employee?.branch?.name) {
              <div>
                <label class="block text-sm font-medium text-gray-400 mb-1"
                  >Sucursal</label
                >
                <p class="text-white">
                  {{ disability()!.employee?.branch?.name }}
                </p>
              </div>
              }
            </div>
          </div>

          <!-- Resumen de Incapacidad -->
          <div
            class="p-4 bg-gradient-to-r from-blue-500/20 to-blue-600/10 border border-blue-400/30 rounded-lg"
          >
            <h3
              class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
            >
              <i class="pi pi-calendar-check text-blue-400"></i>
              Resumen de Incapacidad
            </h3>
            <div class="flex items-center justify-between mb-3">
              <div>
                <p class="text-sm text-gray-400 mb-1">Duración total</p>
                <p class="text-3xl font-bold text-blue-300">
                  {{ calculateDays(disability()!.start_date, disability()!.end_date) }}
                  días
                </p>
              </div>
              <div
                class="w-20 h-20 rounded-full bg-blue-500/20 flex items-center justify-center"
              >
                <i class="pi pi-calendar-check text-blue-400 text-3xl"></i>
              </div>
            </div>
            <div class="mt-3 space-y-2">
              <div
                class="bg-blue-500/10 border border-blue-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-blue-300">
                    Fecha Inicio
                  </span>
                  <span class="text-xs font-bold text-blue-400">
                    {{ disability()!.start_date | date : 'dd/MM/yyyy' : 'UTC' }}
                  </span>
                </div>
              </div>
              <div
                class="bg-blue-500/10 border border-blue-400/30 rounded-lg p-2"
              >
                <div class="flex items-center justify-between">
                  <span class="text-xs font-semibold text-blue-300">
                    Fecha Fin
                  </span>
                  <span class="text-xs font-bold text-blue-400">
                    {{ disability()!.end_date | date : 'dd/MM/yyyy' : 'UTC' }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Información de la Incapacidad -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-blue-400"></i>
            Información de la Incapacidad
          </h3>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Inicio</label
              >
              <p class="text-white">
                {{ disability()!.start_date | date : 'dd/MM/yyyy' : 'UTC' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Fin</label
              >
              <p class="text-white">
                {{ disability()!.end_date | date : 'dd/MM/yyyy' : 'UTC' }}
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Duración</label
              >
              <p class="text-white">
                {{ calculateDays(disability()!.start_date, disability()!.end_date) }}
                día(s)
              </p>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Estado</label
              >
              <p-tag
                [value]="getStatusLabel(disability()!.status)"
                [severity]="getStatusSeverity(disability()!.status)"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-400 mb-1"
                >Fecha de Solicitud</label
              >
              <p class="text-white">
                {{ disability()!.created_at | date : 'dd/MM/yyyy HH:mm' }}
              </p>
            </div>
          </div>
        </div>

        @if (disability()!.description) {
        <!-- Descripción -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-comment text-blue-400"></i>
            Descripción
          </h3>
          <p class="text-white whitespace-pre-wrap">
            {{ disability()!.description }}
          </p>
        </div>
        } @if (disability()!.document_url) {
        <!-- Documento de Incapacidad -->
        <div class="p-4 bg-neutral-800 rounded-lg border border-neutral-700">
          <div class="flex items-center justify-between mb-3">
            <h3
              class="text-lg font-semibold text-white flex items-center gap-2"
            >
              <i class="pi pi-file text-blue-400"></i>
              Documento de Incapacidad
            </h3>
            <p-button
              icon="pi pi-download"
              label="Descargar"
              (onClick)="downloadDocument.emit(disability()!.document_url!)"
              severity="info"
              [text]="true"
              size="small"
            />
          </div>
          <div class="flex items-center justify-between mb-3">
            <p class="text-gray-300 mb-0 text-sm">
              <i class="pi pi-file mr-2"></i>
              Documento adjunto
            </p>
            <div class="flex items-center gap-2">
              <p-button
                icon="pi pi-search-minus"
                (onClick)="zoomOut()"
                [text]="true"
                [rounded]="true"
                severity="secondary"
                size="small"
                [disabled]="zoomLevel() <= 0.5"
                pTooltip="Alejar"
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
                pTooltip="Acercar"
              />
              <p-button
                label="Reset"
                (onClick)="resetZoom()"
                [text]="true"
                severity="secondary"
                size="small"
                pTooltip="Restablecer zoom"
              />
            </div>
          </div>
          <div
            class="border border-gray-700 rounded-lg overflow-hidden bg-gray-900"
          >
            <div
              class="overflow-auto max-h-[600px] bg-gray-800"
              style="padding: 20px;"
            >
              <div
                class="pdf-container"
                [style.transform]="'scale(' + zoomLevel() + ')'"
                [style.transform-origin]="'top left'"
                style="width: 100%; min-height: 800px;"
              >
                <object
                  [data]="pdfUrl()"
                  type="application/pdf"
                  class="w-full"
                  style="min-height: 800px; border: none;"
                >
                  <p class="text-gray-400 p-4">
                    No se puede mostrar el PDF.
                    <a
                      [href]="pdfUrlForLink()"
                      target="_blank"
                      class="text-blue-400 underline"
                    >
                      Abrir en nueva pestaña
                    </a>
                  </p>
                </object>
              </div>
            </div>
          </div>
        </div>
        } @if (disability()!.status === 'rejected') {
        <!-- Motivo de Rechazo -->
        <div class="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3
            class="text-lg font-semibold text-white mb-3 flex items-center gap-2"
          >
            <i class="pi pi-exclamation-triangle text-red-400"></i>
            Motivo de Rechazo
          </h3>
          <textarea
            pInputTextarea
            [(ngModel)]="rejectionComment"
            placeholder="Agregar o editar el motivo del rechazo..."
            rows="3"
            class="w-full"
          ></textarea>
          <div class="flex justify-end mt-2">
            <p-button
              label="Guardar Comentario"
              icon="pi pi-save"
              size="small"
              [loading]="savingComment()"
              (onClick)="saveComment.emit(rejectionComment())"
            />
          </div>
        </div>
        }

      </div>
      }
      <ng-template pTemplate="footer">
        @if (disability()) {
        <div class="flex items-center gap-3">
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            [class]="disability()!.status === 'pending'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.12)] cursor-default'
              : 'bg-neutral-800 text-amber-400/70 border border-neutral-600 hover:bg-amber-500/10 hover:border-amber-500/30 hover:text-amber-300 cursor-pointer'"
            [disabled]="disability()!.status === 'pending' || updatingStatus()"
            (click)="changeStatus.emit('pending')"
          >
            <i class="pi pi-clock text-xs"></i>
            Pendiente
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            [class]="disability()!.status === 'approved'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-[0_0_12px_rgba(16,185,129,0.12)] cursor-default'
              : 'bg-neutral-800 text-emerald-400/70 border border-neutral-600 hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-300 cursor-pointer'"
            [disabled]="disability()!.status === 'approved' || updatingStatus()"
            (click)="changeStatus.emit('approved')"
          >
            @if (updatingStatus() && disability()!.status !== 'approved') {
              <i class="pi pi-spin pi-spinner text-xs"></i>
            } @else {
              <i class="pi pi-check-circle text-xs"></i>
            }
            Aprobada
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 active:scale-[0.98]"
            [class]="disability()!.status === 'rejected'
              ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-[0_0_12px_rgba(239,68,68,0.12)] cursor-default'
              : 'bg-neutral-800 text-red-400/70 border border-neutral-600 hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-300 cursor-pointer'"
            [disabled]="disability()!.status === 'rejected' || updatingStatus()"
            (click)="changeStatus.emit('rejected')"
          >
            <i class="pi pi-times-circle text-xs"></i>
            Rechazada
          </button>
        </div>
        }
      </ng-template>
    </p-dialog>
  `,
})
export class DisabilityDetailsDialogComponent {
  private sanitizer = inject(DomSanitizer);

  visible = model.required<boolean>();
  disability = input.required<Disability | null>();
  updatingStatus = input<boolean>(false);
  savingComment = input<boolean>(false);
  showAuditSidebar = input<boolean>(false);
  rejectionComment = model<string>('');

  downloadDocument = output<string>();
  changeStatus = output<string>();
  saveComment = output<string>();
  toggleAuditSidebar = output<void>();

  public statusOptions = [
    { label: 'Pendiente', value: 'pending' },
    { label: 'Aprobada', value: 'approved' },
    { label: 'Rechazada', value: 'rejected' },
  ];

  public zoomLevel = signal(1);

  public pdfUrl = computed(() => {
    const d = this.disability();
    if (!d?.document_url) return this.sanitizer.bypassSecurityTrustResourceUrl('');
    return this.sanitizer.bypassSecurityTrustResourceUrl(
      `${d.document_url}#toolbar=1&navpanes=1&scrollbar=1`
    );
  });

  public pdfUrlForLink = computed(() => {
    const d = this.disability();
    if (!d?.document_url) return this.sanitizer.bypassSecurityTrustUrl('');
    return this.sanitizer.bypassSecurityTrustUrl(d.document_url);
  });

  public zoomIn(): void {
    this.zoomLevel.update((z) => Math.min(z + 0.25, 2));
  }

  public zoomOut(): void {
    this.zoomLevel.update((z) => Math.max(z - 0.25, 0.5));
  }

  public resetZoom(): void {
    this.zoomLevel.set(1);
  }

  public calculateDays(start: string | Date, end: string | Date): number {
    const s = typeof start === 'string' ? new Date(start) : start;
    const e = typeof end === 'string' ? new Date(end) : end;
    return differenceInCalendarDays(e, s) + 1;
  }

  public getStatusLabel(status: string): string {
    const labels: Record<string, string> = { pending: 'Pendiente', approved: 'Aprobado', rejected: 'Rechazado' };
    return labels[status] || status;
  }

  public getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      pending: 'warn', approved: 'success', rejected: 'danger',
    };
    return map[status] || 'info';
  }
}
