import { DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  model,
  output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Select } from 'primeng/select';
import { Tag } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { Employee } from '../../../../models';

@Component({
  selector: 'pt-branch-manager-requests-tab',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    FormsModule,
    Avatar,
    Button,
    Select,
    Tag,
    TooltipModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4 md:space-y-5">
      <!-- Filtros -->
      <div
        class="flex flex-col md:flex-row gap-3 md:gap-4 items-start md:items-center justify-between bg-white/5 backdrop-blur-sm border border-white/10 p-3 md:p-4 rounded-xl md:rounded-2xl"
      >
        <div class="flex gap-2 md:gap-3 items-center flex-wrap w-full md:w-auto">
          <p-select
            [options]="[
              { label: 'Todos los tipos', value: null },
              { label: 'Compensatorio', value: 'compensatorio' },
              { label: 'Incapacidades', value: 'incapacidad' },
              { label: 'Vacaciones', value: 'vacaciones' },
              { label: 'Documentos', value: 'documentos' },
              { label: 'Uniforme', value: 'uniform_request' },
              {
                label: 'Omisión de Marcación',
                value: 'timelog_correction'
              },
              { label: 'Permiso', value: 'work_permit' }
            ]"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="requestTypeFilter"
            placeholder="Tipo de solicitud"
            showClear
            appendTo="body"
            styleClass="w-full sm:w-48"
          />
          <p-select
            [options]="[
              { label: 'Todos los estados', value: null },
              { label: 'Pendiente', value: 'pending' },
              { label: 'Aprobado', value: 'approved' },
              { label: 'Rechazado', value: 'rejected' }
            ]"
            optionLabel="label"
            optionValue="value"
            [(ngModel)]="requestStatusFilter"
            placeholder="Estado"
            showClear
            appendTo="body"
            styleClass="w-full sm:w-44"
          />
          <p-button
            icon="pi pi-refresh"
            [label]="isMobile() ? undefined : 'Actualizar'"
            [outlined]="true"
            severity="secondary"
            (onClick)="refresh.emit()"
            [loading]="isLoading()"
            styleClass="rounded-xl"
          />
        </div>
        <div
          class="flex items-center gap-2 bg-white/5 rounded-full px-3 md:px-4 py-2"
        >
          <i class="pi pi-list text-indigo-400"></i>
          <span class="text-sm font-medium text-gray-300">
            {{ filteredCount()
            }}<span class="text-gray-500 hidden sm:inline"> solicitud(es)</span>
          </span>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
      <div class="flex flex-col items-center justify-center py-16">
        <div
          class="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mb-4"
        >
          <i class="pi pi-spin pi-spinner text-2xl text-indigo-400"></i>
        </div>
        <p class="text-gray-400">Cargando solicitudes...</p>
      </div>
      }

      <!-- Empty State -->
      @else if (unifiedRequests().length === 0) {
      <div
        class="flex flex-col items-center justify-center py-16 bg-white/5 rounded-2xl border border-white/10"
      >
        <div
          class="w-20 h-20 rounded-2xl bg-gray-500/10 flex items-center justify-center mb-4"
        >
          <i class="pi pi-inbox text-3xl text-gray-500"></i>
        </div>
        <p class="text-gray-300 text-lg font-medium mb-1">
          No hay solicitudes
        </p>
        <p class="text-gray-500 text-sm">
          Las solicitudes creadas en "Gestiones" aparecerán aquí
        </p>
      </div>
      }

      <!-- Requests List -->
      @else {
      <div class="grid grid-cols-1 gap-3 md:gap-4">
        @for (request of unifiedRequests(); track request.id) {
        <div
          class="group relative overflow-hidden border border-white/10 rounded-xl md:rounded-2xl p-3 md:p-5 transition-all duration-300 hover:border-white/20 hover:shadow-xl hover:scale-[1.005] cursor-pointer bg-white/5 backdrop-blur-sm"
          (click)="viewDetails.emit(request)"
        >
          <div
            class="absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            [ngClass]="request.unified.colorClassBg"
          ></div>
          <div class="relative flex items-start justify-between gap-2 md:gap-4">
            <div class="flex items-start gap-3 md:gap-4 flex-1 min-w-0">
              <!-- Icono unificado -->
              <div
                class="w-10 h-10 md:w-12 md:h-12 rounded-lg md:rounded-xl flex items-center justify-center transition-transform group-hover:scale-110 flex-shrink-0"
                [ngClass]="request.unified.colorClassBg"
              >
                <i
                  class="pi text-base md:text-lg"
                  [ngClass]="[
                    request.unified.icon,
                    request.unified.colorClassActive
                  ]"
                ></i>
              </div>

              <div class="flex-1 min-w-0">
                <!-- Header con tipo, estado y fecha -->
                <div class="flex flex-wrap items-center gap-1.5 md:gap-2 mb-1.5 md:mb-2">
                  <p-tag
                    [value]="request.unified.typeLabel"
                    [severity]="request.unified.typeSeverity"
                    styleClass="text-xs"
                  />
                  <p-tag
                    [value]="request.unified.statusLabel"
                    [severity]="request.unified.statusSeverity"
                    styleClass="text-xs"
                  />
                  <span class="text-xs text-gray-400 hidden sm:inline">
                    {{ request.created_at | date : 'dd/MM/yyyy HH:mm' }}
                  </span>
                  <span class="text-xs text-gray-400 sm:hidden">
                    {{ request.created_at | date : 'dd/MM/yy' }}
                  </span>
                </div>

                <!-- Información del empleado -->
                <div class="flex items-center gap-2 mb-1.5 md:mb-2">
                  <p-avatar
                    [label]="getEmployeeInitials(request.employee)"
                    shape="circle"
                    styleClass="text-xs"
                    size="normal"
                  />
                  <span class="text-sm font-semibold text-white truncate">
                    {{ request.employee?.first_name }}
                    {{ request.employee?.father_name }}
                  </span>
                </div>

                <!-- Detalles unificados -->
                <div class="text-xs md:text-sm text-gray-300">
                  <p class="font-medium text-white mb-1 truncate">
                    {{ request.unified.summary }}
                  </p>
                  <p class="truncate">
                    <span class="text-gray-400"
                      >{{
                        request.requestType === 'compensatorio'
                          ? 'Fecha del compensatorio'
                          : request.unified.displayDateLabel
                      }}:</span
                    >
                    {{ request.unified.displayDate }}
                  </p>
                  @let reason = request.reason || request.description ||
                  request.notes; @if (reason) {
                  <p class="truncate max-w-[200px] sm:max-w-md">
                    <span class="text-gray-400">Motivo:</span>
                    {{ reason }}
                  </p>
                  }
                </div>

                <!-- Indicador de documento adjunto -->
                @if (request.document_url ||
                request.metadata?.attachment_url) {
                <div
                  class="mt-2 flex items-center gap-1 text-xs text-gray-400"
                >
                  <i class="pi pi-paperclip"></i>
                  <span class="hidden sm:inline">Documento adjunto</span>
                  <span class="sm:hidden">Adjunto</span>
                </div>
                }
              </div>
            </div>

            <!-- Botón para ver detalles -->
            <p-button
              icon="pi pi-eye"
              severity="secondary"
              text
              rounded
              size="small"
              pTooltip="Ver detalles"
              (onClick)="
                viewDetails.emit(request); $event.stopPropagation()
              "
            />
          </div>
        </div>
        }
      </div>
      }
    </div>
  `,
})
export class BranchManagerRequestsTabComponent {
  // Inputs
  public unifiedRequests = input.required<any[]>();
  public filteredCount = input.required<number>();
  public isLoading = input<boolean>(false);
  public isMobile = input<boolean>(false);

  // Two-way bindings for filters
  public requestTypeFilter = model<string | null>(null);
  public requestStatusFilter = model<string | null>(null);

  // Outputs
  public refresh = output<void>();
  public viewDetails = output<any>();

  public getEmployeeInitials(
    employee?: Employee | { first_name?: string; father_name?: string }
  ): string {
    if (!employee) return '?';
    const first = employee.first_name?.charAt(0) || '';
    const last = employee.father_name?.charAt(0) || '';
    return (first + last).toUpperCase();
  }
}
