import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  model,
  output,
  signal,
} from '@angular/core';
import { switchMap } from 'rxjs/operators';
import { format } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import {
  ScheduleChangeRequest,
  ScheduleChangeRequestService,
  ScheduleChangeRequestStatus,
} from '../../../../services/schedule-change-request.service';
import { colorVariants } from '../../../../models';
import { NgClass } from '@angular/common';

@Component({
  selector: 'pt-change-requests-panel',
  standalone: true,
  imports: [Dialog, Button, Tag, TextareaModule, FormsModule, NgClass],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      header="Solicitudes de cambio de horario"
      [modal]="true"
      [(visible)]="visible"
      [dismissableMask]="true"
      [style]="{ width: '700px', maxHeight: '80vh' }"
    >
      <!-- Filter tabs -->
      <div class="flex gap-2 mb-4">
        @for (tab of tabs; track tab.value) {
          <button
            class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
            [ngClass]="{
              'bg-amber-500/20 text-amber-400 border border-amber-500/40': activeTab() === tab.value,
              'bg-neutral-800 text-gray-400 border border-neutral-700 hover:border-neutral-600': activeTab() !== tab.value
            }"
            (click)="activeTab.set(tab.value); loadRequests()"
          >
            {{ tab.label }}
            @if (tab.value === 'pending' && pendingCount() > 0) {
              <span class="ml-1 px-1.5 py-0.5 bg-amber-500 text-black rounded-full text-[10px] font-bold">{{ pendingCount() }}</span>
            }
          </button>
        }
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <i class="pi pi-spin pi-spinner text-2xl text-gray-400"></i>
        </div>
      } @else if (requests().length === 0) {
        <div class="text-center py-8 text-gray-500">
          <i class="pi pi-inbox text-3xl mb-2"></i>
          <p class="text-sm">No hay solicitudes {{ activeTab() === 'pending' ? 'pendientes' : '' }}</p>
        </div>
      } @else {
        <div class="flex flex-col gap-3 max-h-[55vh] overflow-y-auto pr-1">
          @for (req of requests(); track req.id) {
            <div class="bg-neutral-800/50 border border-neutral-700/50 rounded-lg p-3">
              <!-- Header row -->
              <div class="flex items-start justify-between gap-2 mb-2">
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 flex-wrap">
                    <span class="font-medium text-sm text-white">
                      {{ req.employee?.first_name }} {{ req.employee?.father_name }}
                    </span>
                    <p-tag
                      [value]="getRequestTypeLabel(req.request_type)"
                      [severity]="getRequestTypeSeverity(req.request_type)"
                      [rounded]="true"
                    />
                    <p-tag
                      [value]="getStatusLabel(req.status)"
                      [severity]="getStatusSeverity(req.status)"
                      [rounded]="true"
                    />
                  </div>
                  <div class="text-xs text-gray-500 mt-0.5">
                    {{ formatDateTime(req.created_at) }} · Sucursal: {{ req.branch?.name || 'N/A' }}
                  </div>
                </div>
              </div>

              <!-- Details -->
              <div class="text-xs text-gray-400 mb-2">
                <span>Fecha: <strong class="text-gray-300">{{ formatDateOnly(req.schedule_date) }}</strong></span>
                @if (req.current_schedule) {
                  <span class="ml-3">Actual: <strong class="text-gray-300">{{ req.current_schedule.name }}</strong></span>
                }
                @if (req.proposed_schedule) {
                  <span class="ml-3">Propuesto: <strong class="text-gray-300">{{ req.proposed_schedule.name }}</strong></span>
                }
              </div>

              <!-- Reason -->
              <div class="text-sm text-gray-300 bg-neutral-900/50 rounded p-2 mb-2">
                <span class="text-gray-500 text-xs">Razón:</span> {{ req.reason }}
              </div>

              <!-- Requested by -->
              <div class="text-xs text-gray-500 mb-2">
                Solicitado por: {{ req.requester?.first_name }} {{ req.requester?.father_name }}
              </div>

              <!-- Review info (if reviewed) -->
              @if (req.status !== 'pending' && req.reviewer) {
                <div class="text-xs text-gray-500 mb-2 border-t border-neutral-700/50 pt-2">
                  <span>{{ req.status === 'approved' ? 'Aprobado' : 'Rechazado' }} por: {{ req.reviewer.first_name }} {{ req.reviewer.father_name }}</span>
                  @if (req.review_notes) {
                    <span class="ml-2">— {{ req.review_notes }}</span>
                  }
                </div>
              }

              <!-- Actions (only for pending + can approve) -->
              @if (req.status === 'pending' && canReview()) {
                <div class="flex items-center gap-2 mt-2 pt-2 border-t border-neutral-700/50">
                  <textarea
                    pTextarea
                    [(ngModel)]="reviewNotes[req.id]"
                    placeholder="Notas (opcional)..."
                    rows="1"
                    class="flex-1 text-xs"
                  ></textarea>
                  <p-button
                    icon="pi pi-check"
                    label="Aprobar"
                    severity="success"
                    size="small"
                    [loading]="processingId() === req.id"
                    (onClick)="approve(req)"
                  />
                  <p-button
                    icon="pi pi-times"
                    label="Rechazar"
                    severity="danger"
                    size="small"
                    [outlined]="true"
                    [loading]="processingId() === req.id"
                    (onClick)="reject(req)"
                  />
                </div>
              }
            </div>
          }
        </div>
      }
    </p-dialog>
  `,
})
export class ChangeRequestsPanelComponent {
  private changeRequestService = inject(ScheduleChangeRequestService);
  private messageService = inject(MessageService);

  public visible = model<boolean>(false);
  public canReview = input<boolean>(false);
  public reviewerId = input<string>('');

  public requestProcessed = output<void>();

  public tabs: { label: string; value: ScheduleChangeRequestStatus | 'all' }[] = [
    { label: 'Pendientes', value: 'pending' },
    { label: 'Aprobadas', value: 'approved' },
    { label: 'Rechazadas', value: 'rejected' },
    { label: 'Todas', value: 'all' },
  ];

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.loadRequests();
      }
    });
  }

  public activeTab = signal<ScheduleChangeRequestStatus | 'all'>('pending');
  public requests = signal<ScheduleChangeRequest[]>([]);
  public pendingCount = signal(0);
  public loading = signal(false);
  public processingId = signal<string | null>(null);
  public reviewNotes: Record<string, string> = {};

  public loadRequests(): void {
    this.loading.set(true);
    const status = this.activeTab() === 'all' ? undefined : this.activeTab() as ScheduleChangeRequestStatus;
    this.changeRequestService.getRequests(status).subscribe({
      next: (data) => {
        this.requests.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.requests.set([]);
        this.loading.set(false);
      },
    });

    // Always refresh pending count
    this.changeRequestService.getPendingCount().subscribe({
      next: (data) => this.pendingCount.set(data.length),
    });
  }

  public approve(req: ScheduleChangeRequest): void {
    this.processingId.set(req.id);
    const notes = this.reviewNotes[req.id] || '';

    this.changeRequestService.approveRequest(req.id, this.reviewerId(), notes).pipe(
      switchMap(() => this.changeRequestService.applyScheduleChange(req, this.reviewerId()))
    ).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Solicitud aprobada',
          detail: 'La solicitud ha sido aprobada y el cambio aplicado.',
        });
        this.processingId.set(null);
        this.loadRequests();
        this.requestProcessed.emit();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo aprobar la solicitud.',
        });
        this.processingId.set(null);
      },
    });
  }

  public reject(req: ScheduleChangeRequest): void {
    this.processingId.set(req.id);
    const notes = this.reviewNotes[req.id] || '';

    this.changeRequestService.rejectRequest(req.id, this.reviewerId(), notes).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'info',
          summary: 'Solicitud rechazada',
          detail: 'La solicitud ha sido rechazada.',
        });
        this.processingId.set(null);
        this.loadRequests();
        this.requestProcessed.emit();
      },
      error: () => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No se pudo rechazar la solicitud.',
        });
        this.processingId.set(null);
      },
    });
  }

  // Helpers
  public getRequestTypeLabel(type: string): string {
    switch (type) {
      case 'create': return 'Crear';
      case 'update': return 'Modificar';
      case 'delete': return 'Eliminar';
      default: return type;
    }
  }

  public getRequestTypeSeverity(type: string): 'success' | 'warn' | 'danger' {
    switch (type) {
      case 'create': return 'success';
      case 'update': return 'warn';
      case 'delete': return 'danger';
      default: return 'warn';
    }
  }

  public getStatusLabel(status: string): string {
    switch (status) {
      case 'pending': return 'Pendiente';
      case 'approved': return 'Aprobada';
      case 'rejected': return 'Rechazada';
      default: return status;
    }
  }

  public getStatusSeverity(status: string): 'warn' | 'success' | 'danger' | 'info' {
    switch (status) {
      case 'pending': return 'warn';
      case 'approved': return 'success';
      case 'rejected': return 'danger';
      default: return 'info';
    }
  }

  public formatDateTime(dateStr: string): string {
    try {
      const d = toDate(dateStr, { timeZone: 'America/Panama' });
      return format(d, 'dd/MM/yyyy HH:mm');
    } catch {
      return dateStr;
    }
  }

  public formatDateOnly(dateStr: string): string {
    try {
      const d = toDate(dateStr, { timeZone: 'America/Panama' });
      return format(d, 'EEEE dd/MM/yyyy');
    } catch {
      return dateStr;
    }
  }
}
