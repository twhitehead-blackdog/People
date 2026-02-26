import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  inject,
  Input,
  Output,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DatePicker } from 'primeng/datepicker';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { Textarea } from 'primeng/textarea';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'pt-employee-portal-license',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, DatePicker, Textarea, Button, TableModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar-times text-orange-400"></i>
            <span>Solicitar Licencia</span>
          </div>
          <div class="flex items-center gap-2">
            <p-button
              icon="pi pi-times"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [outlined]="true"
              (onClick)="closeSection.emit()"
              pTooltip="Volver a Gestiones"
              [style]="{ width: '2.5rem', height: '2.5rem' }"
            />
          </div>
        </div>
      </ng-template>
      <ng-template #subtitle>
        Solicita una licencia sin goce de sueldo
      </ng-template>

      <div class="flex flex-col gap-6 mt-4">
        <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
          <h3 class="text-lg font-semibold text-white mb-4">
            Nueva Solicitud de Licencia
          </h3>

          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  Fecha de Inicio <span class="text-red-400">*</span>
                </label>
                <p-datepicker
                  [ngModel]="licenseStartDate"
                  (ngModelChange)="licenseStartDateChange.emit($event)"
                  appendTo="body"
                  [minDate]="minLicenseDate"
                  [maxDate]="maxLicenseDate"
                  class="w-full"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Selecciona fecha inicio"
                />
              </div>
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  Fecha de Fin <span class="text-red-400">*</span>
                </label>
                <p-datepicker
                  [ngModel]="licenseEndDate"
                  (ngModelChange)="licenseEndDateChange.emit($event)"
                  appendTo="body"
                  [minDate]="licenseStartDate || minLicenseDate"
                  [maxDate]="maxLicenseDate"
                  class="w-full"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Selecciona fecha fin"
                />
              </div>
            </div>
            @if (licenseStartDate && licenseEndDate) {
            <div class="mt-2 flex items-center gap-2">
              <i class="pi pi-info-circle text-orange-400"></i>
              <p class="text-sm text-gray-400 m-0">
                Días solicitados:
                <span class="font-semibold text-white">{{ calculateLicenseDays() }}</span>
              </p>
            </div>
            }

            <div>
              <label class="block text-sm text-gray-400 mb-2">
                Motivo de la Licencia <span class="text-red-400">*</span>
              </label>
              <textarea
                pTextarea
                [ngModel]="licenseReason"
                (ngModelChange)="licenseReasonChange.emit($event)"
                rows="4"
                placeholder="Explica detalladamente el motivo de tu solicitud de licencia..."
                class="w-full"
                maxlength="1000"
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">
                {{ licenseReason.length }}/1000 caracteres
              </p>
            </div>

            <div class="bg-orange-500/10 border border-orange-500/30 rounded-lg p-4">
              <div class="flex items-start gap-3">
                <i class="pi pi-exclamation-triangle text-orange-400 text-xl"></i>
                <div>
                  <p class="text-orange-300 font-semibold mb-2">
                    Información Importante
                  </p>
                  <p class="text-sm text-gray-300">
                    Las licencias sin goce de sueldo requieren aprobación previa del departamento de Recursos Humanos.
                    Durante este período no recibirás remuneración.
                  </p>
                </div>
              </div>
            </div>

            <div class="flex justify-end gap-3 pt-2">
              <p-button
                label="Cancelar"
                icon="pi pi-times"
                severity="secondary"
                [outlined]="true"
                [rounded]="true"
                (onClick)="resetForm.emit()"
              />
              <p-button
                label="Solicitar Licencia"
                icon="pi pi-send"
                severity="warn"
                [rounded]="true"
                [loading]="submitting"
                [disabled]="!canSubmit || submitting"
                (onClick)="submitRequest.emit()"
              />
            </div>
          </div>
        </div>

        <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-lg font-semibold text-white m-0">Mis Solicitudes de Licencia</h3>
            <p-button
              icon="pi pi-refresh"
              [rounded]="true"
              [text]="true"
              severity="secondary"
              [loading]="requestsLoading"
              (onClick)="reloadList.emit()"
              pTooltip="Actualizar lista"
            />
          </div>

          @if (licenseRequests.length === 0 && !requestsLoading) {
          <div class="text-center py-12">
            <div class="w-20 h-20 rounded-full bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-calendar-times text-4xl text-orange-400"></i>
            </div>
            <h4 class="text-lg font-semibold text-white mb-2">No hay solicitudes</h4>
            <p class="text-gray-400 mb-4">No has realizado ninguna solicitud de licencia todavía.</p>
          </div>
          } @else if (requestsLoading) {
          <div class="flex justify-center items-center py-12">
            <div class="flex flex-col items-center gap-3">
              <i class="pi pi-spin pi-spinner text-4xl text-orange-400"></i>
              <p class="text-gray-400">Cargando solicitudes...</p>
            </div>
          </div>
          } @else {
          <div class="overflow-x-auto">
            <p-table
              [value]="licenseRequests"
              [rows]="10"
              paginator
              [loading]="requestsLoading"
              styleClass="p-datatable-sm md:p-datatable-lg"
              [scrollable]="true"
              scrollHeight="400px"
              [responsiveLayout]="'scroll'"
              [rowHover]="true"
            >
              <ng-template #header>
                <tr>
                  <th>Fecha de Solicitud</th>
                  <th>Período</th>
                  <th>Días</th>
                  <th>Estado</th>
                  <th>Motivo</th>
                </tr>
              </ng-template>
              <ng-template #body let-request>
                <tr>
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium">{{ request.created_at | date : 'mediumDate' }}</span>
                      <span class="text-xs text-gray-500">{{ request.created_at | date : 'shortTime' }}</span>
                    </div>
                  </td>
                  <td>
                    <div class="flex flex-col">
                      <span class="font-medium">{{ request.date_from | date : 'shortDate' }}</span>
                      <span class="text-xs text-gray-500">hasta</span>
                      <span class="font-medium">{{ request.date_to | date : 'shortDate' }}</span>
                    </div>
                  </td>
                  <td>
                    <span class="font-semibold text-orange-400">
                      {{ calculateDaysBetween(request.date_from, request.date_to) }} día(s)
                    </span>
                  </td>
                  <td>
                    <span
                      class="px-3 py-1 rounded-full text-xs font-semibold inline-flex items-center gap-1"
                      [class.text-yellow-300]="!request.is_approved && isDateFuture(request.date_from)"
                      [class.text-green-300]="request.is_approved"
                      [class.text-red-300]="!request.is_approved && !isDateFuture(request.date_from)"
                      [ngClass]="{
                        'bg-yellow-500/20': !request.is_approved && isDateFuture(request.date_from),
                        'bg-green-500/20': request.is_approved,
                        'bg-red-500/20': !request.is_approved && !isDateFuture(request.date_from)
                      }"
                    >
                      @if (request.is_approved) {
                      <i class="pi pi-check-circle"></i>
                      } @else if (isDateFuture(request.date_from)) {
                      <i class="pi pi-clock"></i>
                      } @else {
                      <i class="pi pi-times-circle"></i>
                      }
                      {{
                        request.is_approved
                          ? 'Aprobada'
                          : isDateFuture(request.date_from)
                          ? 'Pendiente'
                          : 'Rechazada'
                      }}
                    </span>
                  </td>
                  <td>
                    <span class="text-sm text-gray-300">
                      {{
                        request.notes && request.notes.length > 0
                          ? request.notes[0]?.length > 50
                            ? request.notes[0].substring(0, 50) + '...'
                            : request.notes[0]
                          : '-'
                      }}
                    </span>
                  </td>
                </tr>
              </ng-template>
              <ng-template #emptymessage>
                <tr>
                  <td colspan="5" class="text-center py-8">
                    <p class="text-gray-400">No hay solicitudes de licencia</p>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
          }
        </div>
      </div>
    </p-card>
    } @else {
    <!-- ========== MOBILE ========== -->
    <div class="px-4 py-4">
      <!-- Header -->
      <div class="flex items-center gap-3 mb-4">
        <button class="text-gray-400 hover:text-white" (click)="closeSection.emit()">
          <i class="pi pi-arrow-left text-lg"></i>
        </button>
        <div>
          <h2 class="text-lg font-bold text-white m-0">Solicitar Licencia</h2>
          <p class="text-xs text-gray-400 m-0">Licencia sin goce de sueldo</p>
        </div>
      </div>

      <div class="grid grid-cols-1 gap-3">
        <!-- Form -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <h3 class="text-sm font-semibold text-white mb-3">Nueva Solicitud</h3>
          <div class="grid grid-cols-1 gap-3">
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Fecha de Inicio <span class="text-red-400">*</span></label>
              <p-datepicker
                [ngModel]="licenseStartDate"
                (ngModelChange)="licenseStartDateChange.emit($event)"
                appendTo="body"
                [minDate]="minLicenseDate"
                [maxDate]="maxLicenseDate"
                styleClass="w-full"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Fecha inicio"
              />
            </div>
            <div>
              <label class="text-xs text-gray-400 mb-1 block">Fecha de Fin <span class="text-red-400">*</span></label>
              <p-datepicker
                [ngModel]="licenseEndDate"
                (ngModelChange)="licenseEndDateChange.emit($event)"
                appendTo="body"
                [minDate]="licenseStartDate || minLicenseDate"
                [maxDate]="maxLicenseDate"
                styleClass="w-full"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                placeholder="Fecha fin"
              />
            </div>
          </div>
          @if (licenseStartDate && licenseEndDate) {
          <div class="mt-2 p-2 bg-orange-500/10 border border-orange-400/30 rounded-lg">
            <p class="text-xs text-orange-300 m-0">
              <i class="pi pi-info-circle mr-1"></i>
              Días solicitados: <strong>{{ calculateLicenseDays() }}</strong>
            </p>
          </div>
          }
        </div>

        <!-- Motivo -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <label class="text-xs text-gray-400 mb-1 block">Motivo de la Licencia <span class="text-red-400">*</span></label>
          <textarea
            pTextarea
            [ngModel]="licenseReason"
            (ngModelChange)="licenseReasonChange.emit($event)"
            rows="3"
            placeholder="Explica el motivo de tu licencia..."
            class="w-full"
            maxlength="1000"
          ></textarea>
          <p class="text-xs text-gray-500 mt-1 m-0">{{ licenseReason.length }}/1000</p>
        </div>

        <!-- Warning -->
        <div class="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3">
          <p class="text-xs text-gray-300 m-0">
            <i class="pi pi-exclamation-triangle text-orange-400 mr-1"></i>
            Las licencias sin goce de sueldo requieren aprobación de RRHH. No recibirás remuneración durante este período.
          </p>
        </div>

        <!-- Submit -->
        <p-button
          label="Solicitar Licencia"
          icon="pi pi-send"
          severity="warn"
          [loading]="submitting"
          [disabled]="!canSubmit || submitting"
          (onClick)="submitRequest.emit()"
          styleClass="w-full min-h-[44px]"
        />

        <!-- Requests List -->
        <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
          <div class="flex items-center justify-between mb-3">
            <h3 class="text-sm font-semibold text-white m-0">Mis Solicitudes</h3>
            <button class="text-gray-400 hover:text-white" (click)="reloadList.emit()">
              <i class="pi pi-refresh text-sm" [class.pi-spin]="requestsLoading"></i>
            </button>
          </div>

          @if (licenseRequests.length === 0 && !requestsLoading) {
          <div class="text-center py-6">
            <i class="pi pi-calendar-times text-2xl text-orange-400 mb-2"></i>
            <p class="text-xs text-gray-400 m-0">No hay solicitudes todavía</p>
          </div>
          } @else if (requestsLoading) {
          <div class="flex justify-center py-6">
            <i class="pi pi-spin pi-spinner text-2xl text-orange-400"></i>
          </div>
          } @else {
          <div class="space-y-2">
            @for (request of licenseRequests; track request.id || $index) {
            <div class="bg-neutral-900/50 rounded-lg p-2 border border-neutral-700/30">
              <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">{{ request.created_at | date : 'dd/MM/yyyy' }}</span>
                <span
                  class="px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1"
                  [class.text-yellow-300]="!request.is_approved && isDateFuture(request.date_from)"
                  [class.text-green-300]="request.is_approved"
                  [class.text-red-300]="!request.is_approved && !isDateFuture(request.date_from)"
                  [ngClass]="{
                    'bg-yellow-500/20': !request.is_approved && isDateFuture(request.date_from),
                    'bg-green-500/20': request.is_approved,
                    'bg-red-500/20': !request.is_approved && !isDateFuture(request.date_from)
                  }"
                >
                  {{ request.is_approved ? 'Aprobada' : isDateFuture(request.date_from) ? 'Pendiente' : 'Rechazada' }}
                </span>
              </div>
              <p class="text-sm text-white font-medium m-0">
                {{ request.date_from | date : 'dd/MM' }} - {{ request.date_to | date : 'dd/MM' }}
                <span class="text-orange-400 text-xs ml-1">({{ calculateDaysBetween(request.date_from, request.date_to) }}d)</span>
              </p>
              @if (request.notes && request.notes.length > 0 && request.notes[0]) {
              <p class="text-xs text-gray-400 mt-1 m-0">
                {{ request.notes[0].length > 60 ? request.notes[0].substring(0, 60) + '...' : request.notes[0] }}
              </p>
              }
            </div>
            }
          </div>
          }
        </div>
      </div>
    </div>
    }
  `,
})
export class EmployeePortalLicenseComponent {
  protected device = inject(DeviceService);
  @Input() minLicenseDate: Date = new Date();
  @Input() maxLicenseDate: Date = new Date();
  @Input() licenseStartDate: Date | null = null;
  @Output() licenseStartDateChange = new EventEmitter<Date | null>();
  @Input() licenseEndDate: Date | null = null;
  @Output() licenseEndDateChange = new EventEmitter<Date | null>();
  @Input() licenseReason = '';
  @Output() licenseReasonChange = new EventEmitter<string>();
  @Input() submitting = false;
  @Input() canSubmit = false;
  @Output() submitRequest = new EventEmitter<void>();
  @Output() resetForm = new EventEmitter<void>();
  @Input() licenseRequests: any[] = [];
  @Input() requestsLoading = false;
  @Input() calculateLicenseDays: () => number = () => 0;
  @Input() calculateDaysBetween: (start: Date | string, end: Date | string) => number = () => 0;
  @Input() isDateFuture: (date: Date | string) => boolean = () => false;
  @Output() reloadList = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();
}