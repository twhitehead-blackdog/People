import { DatePipe, NgClass } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  model,
  output,
} from '@angular/core';
import { Avatar } from 'primeng/avatar';
import { Button } from 'primeng/button';
import { Dialog } from 'primeng/dialog';
import { Tag } from 'primeng/tag';
import { Employee } from '../../../../models';
import { DocumentViewerCardComponent } from '../../../../shared/components/document-viewer-card.component';
import {
  getRequestStatusLabel,
  getRequestStatusSeverity,
  getRequestTypeLabel,
  getSeverityColor,
} from '../../../request.helpers';

@Component({
  selector: 'pt-request-details-dialog',
  standalone: true,
  imports: [
    DatePipe,
    NgClass,
    Avatar,
    Button,
    Dialog,
    Tag,
    DocumentViewerCardComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-dialog
      [(visible)]="visible"
      [modal]="true"
      [style]="{ width: isMobile() ? '98vw' : '95vw', maxWidth: '1200px' }"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [maximizable]="isMobile()"
    >
      <ng-template pTemplate="header">
        <div class="flex items-center justify-between w-full">
          <span class="text-lg font-semibold text-white">
            Detalles de Solicitud -
            {{
              request()?.unified?.typeLabel ||
                getRequestTypeLabel(request()?.requestType)
            }}
          </span>
          @if (request()?.document_url ||
          request()?.metadata?.attachment_url) {
          <!-- Document existing indicator handled in layout -->
          }
        </div>
      </ng-template>

      @if (request()) {
      <div
        class="grid transition-all duration-500 pt-2 md:pt-4"
        [ngClass]="{
          'grid-cols-1': !hasDocument(),
          'grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6': hasDocument()
        }"
      >
        <!-- Columna Información -->
        <div class="space-y-4">
          <!-- Información del Empleado -->
          <div
            class="p-3 md:p-4 rounded-lg border transition-all duration-300 w-full"
            [ngClass]="
              request().unified?.colorClassBg ||
              'bg-neutral-800 border-neutral-700'
            "
          >
            <h3
              class="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2"
            >
              <i
                class="pi pi-user"
                [style.color]="
                  getSeverityColor(request().unified?.typeSeverity)
                "
              ></i>
              Información del Empleado
            </h3>
            <div class="flex flex-col sm:flex-row gap-4 md:gap-6">
              <!-- Lado izquierdo: Avatar y Datos Principales -->
              <div class="flex items-center gap-3 md:gap-4 min-w-0 sm:min-w-[180px]">
                <p-avatar
                  [label]="getEmployeeInitials(request().employee)"
                  shape="circle"
                  [size]="isMobile() ? 'large' : 'xlarge'"
                  [style]="{
                    'background-color':
                      getSeverityColor(
                        request().unified?.typeSeverity
                      ) + '20',
                    color: getSeverityColor(
                      request().unified?.typeSeverity
                    )
                  }"
                />
                <div class="min-w-0">
                  <p class="text-lg md:text-xl font-bold text-white leading-tight truncate">
                    {{ request().employee?.first_name }}
                    {{ request().employee?.father_name }}
                  </p>
                  <p class="text-xs md:text-sm text-gray-400 truncate">
                    {{
                      request().employee?.work_email ||
                        'Sin email registrado'
                    }}
                  </p>
                </div>
              </div>

              <!-- Lado derecho: Detalles Secundarios -->
              <div
                class="flex-1 grid grid-cols-2 gap-3 md:gap-4 pt-3 sm:pt-0 sm:pl-4 md:pl-6 border-t sm:border-t-0 sm:border-l border-neutral-700/50"
              >
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                    >Cargo</label
                  >
                  <p
                    class="text-white font-medium break-words whitespace-normal"
                  >
                    {{
                      request().employee?.position?.name ||
                        'No especificado'
                    }}
                  </p>
                </div>
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                    >Sucursal</label
                  >
                  <p
                    class="text-white font-medium break-words whitespace-normal"
                  >
                    {{
                      request().employee?.branch?.name ||
                        'No especificada'
                    }}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <!-- Detalles de la Solicitud -->
          <div
            class="p-3 md:p-4 rounded-lg border transition-all duration-300"
            [ngClass]="
              request().unified?.colorClassBg ||
              'bg-neutral-800 border-neutral-700'
            "
          >
            <h3
              class="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2"
            >
              <i
                class="pi"
                [ngClass]="request().unified?.icon || 'pi-file-edit'"
                [style.color]="
                  getSeverityColor(request().unified?.typeSeverity)
                "
              ></i>
              Detalle de la Solicitud
            </h3>
            <div class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <!-- Estado -->
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                    >Estado</label
                  >
                  <p-tag
                    [value]="
                      request().unified?.statusLabel ||
                      getRequestStatusLabel(request())
                    "
                    [severity]="
                      request().unified?.statusSeverity ||
                      getRequestStatusSeverity(request())
                    "
                  />
                </div>

                <!-- Fecha de Solicitud -->
                <div>
                  <label
                    class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                    >Fecha de Solicitud</label
                  >
                  <p class="text-white font-medium">
                    {{
                      request().created_at | date : 'dd/MM/yyyy HH:mm'
                    }}
                  </p>
                </div>

                <!-- Motivo de Rechazo (si aplica) -->
                @if ((request().status === 'rejected' ||
                request().review_status === 'rejected') &&
                (request().rejection_comment ||
                request().notes)) {
                <div class="col-span-1 md:col-span-2">
                  <div
                    class="bg-red-500/10 border border-red-500/30 rounded-lg p-4"
                  >
                    <h4
                      class="text-red-300 font-semibold mb-2 flex items-center gap-2"
                    >
                      <i class="pi pi-exclamation-circle text-red-400"></i>
                      Motivo del Rechazo
                    </h4>
                    <p class="text-red-200 text-sm whitespace-pre-wrap">
                      {{
                        request().rejection_comment ||
                          request().notes
                      }}
                    </p>
                  </div>
                </div>
                }
              </div>

              <!-- Resumen y Detalles unificados -->
              <div class="pt-3 md:pt-4 border-t border-neutral-700/50">
                <div class="mb-3 md:mb-4">
                  <p class="text-base md:text-lg font-bold text-white">
                    {{ request().unified?.summary }}
                  </p>
                </div>
                <div
                  class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6"
                >
                  @for (detail of request().unified?.details; track
                  detail.label) {
                  <div
                    [class.lg:col-span-1]="
                      detail.label === 'Fecha del compensatorio' ||
                      detail.label === 'Tipo' ||
                      detail.label === 'Cantidad'
                    "
                    [class.md:col-span-2]="
                      detail.label === 'Notas' ||
                      detail.label === 'Descripción' ||
                      detail.label === 'Razón'
                    "
                  >
                    <label
                      class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                      >{{ detail.label }}</label
                    >
                    <p
                      class="text-white text-base break-words whitespace-normal"
                    >
                      {{ detail.value }}
                    </p>
                  </div>
                  }
                </div>
              </div>
            </div>
          </div>

          <!-- Información de Creación -->
          @if (request().created_by) {
          <div
            class="p-3 md:p-4 rounded-lg border transition-all duration-300"
            [ngClass]="
              request().unified?.colorClassBg ||
              'bg-neutral-800 border-neutral-700'
            "
          >
            <h3
              class="text-base md:text-lg font-semibold text-white mb-3 md:mb-4 flex items-center gap-2"
            >
              <i
                class="pi pi-info-circle"
                [style.color]="
                  getSeverityColor(request().unified?.typeSeverity)
                "
              ></i>
              Información de Creación
            </h3>
            <div>
              <label
                class="block text-xs font-medium text-gray-500 uppercase tracking-wider mb-1"
                >Origen de la Solicitud</label
              >
              <p class="text-white font-medium">
                @if (request().created_by !==
                request().employee_id) { Gerente de Tienda /
                Administrador } @else { Auto-solicitud del empleado }
              </p>
            </div>
          </div>
          }
        </div>

        <!-- Documento Adjunto (Columna Derecha) -->
        @if (hasDocument()) {
        <div class="h-full mt-4 lg:mt-0">
          <pt-document-viewer-card
            [documentUrl]="
              request()?.document_url ||
              request()?.metadata?.attachment_url
            "
            [title]="'Documento Adjunto'"
            (download)="downloadDoc.emit($event)"
          />
        </div>
        }
      </div>
      }

      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Cerrar"
            icon="pi pi-times"
            severity="secondary"
            (onClick)="visible.set(false)"
          />
        </div>
      </ng-template>
    </p-dialog>
  `,
})
export class RequestDetailsDialogComponent {
  // Two-way binding for visibility
  public visible = model.required<boolean>();

  // Inputs
  public request = input.required<any>();
  public isMobile = input<boolean>(false);

  // Outputs
  public downloadDoc = output<string>();

  // Computed
  public hasDocument = computed(() => {
    const req = this.request();
    return !!(req?.document_url || req?.metadata?.attachment_url);
  });

  // Helpers exposed to template
  public getRequestTypeLabel = getRequestTypeLabel;
  public getRequestStatusLabel = getRequestStatusLabel;
  public getRequestStatusSeverity = getRequestStatusSeverity;
  public getSeverityColor = getSeverityColor;

  public getEmployeeInitials(
    employee?: Employee | { first_name?: string; father_name?: string }
  ): string {
    if (!employee) return '?';
    const first = employee.first_name?.charAt(0) || '';
    const last = employee.father_name?.charAt(0) || '';
    return (first + last).toUpperCase();
  }
}
