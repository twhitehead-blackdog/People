import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
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

@Component({
  selector: 'pt-employee-portal-vacations',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, DatePicker, Textarea, Button, TableModule, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-2">
            <i class="pi pi-calendar-plus text-purple-400"></i>
            <span>Solicitar Vacaciones</span>
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
        Solicita tus días de vacaciones
      </ng-template>

      <div class="flex flex-col gap-6 mt-4">
        <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
          <h3 class="text-lg font-semibold text-white mb-4">
            Nueva Solicitud de Vacaciones
          </h3>

          <div class="flex flex-col gap-4">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label class="block text-sm text-gray-400 mb-2">
                  Fecha de Inicio <span class="text-red-400">*</span>
                </label>
                <p-datepicker
                  [ngModel]="vacationStartDate"
                  (ngModelChange)="vacationStartDateChange.emit($event)"
                  appendTo="body"
                  [minDate]="minVacationDate"
                  [maxDate]="maxVacationDate"
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
                  [ngModel]="vacationEndDate"
                  (ngModelChange)="vacationEndDateChange.emit($event)"
                  appendTo="body"
                  [minDate]="vacationStartDate || minVacationDate"
                  [maxDate]="maxVacationDate"
                  class="w-full"
                  [showIcon]="true"
                  dateFormat="dd/mm/yy"
                  placeholder="Selecciona fecha fin"
                />
              </div>
            </div>
            @if (vacationStartDate && vacationEndDate) {
            <div class="mt-2 flex items-center gap-2">
              <i class="pi pi-info-circle text-purple-400"></i>
              <p class="text-sm text-gray-400 m-0">
                Días solicitados:
                <span class="font-semibold text-white">{{ calculateVacationDays() }}</span>
              </p>
            </div>
            }

            <div>
              <label class="block text-sm text-gray-400 mb-2">
                Motivo o Comentarios (opcional)
              </label>
              <textarea
                pTextarea
                [ngModel]="vacationReason"
                (ngModelChange)="vacationReasonChange.emit($event)"
                rows="4"
                placeholder="Describe el motivo de tu solicitud de vacaciones..."
                class="w-full"
                maxlength="500"
              ></textarea>
              <p class="text-xs text-gray-500 mt-1">
                {{ vacationReason.length }}/500 caracteres
              </p>
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
                label="Solicitar Vacaciones"
                icon="pi pi-send"
                severity="success"
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
            <h3 class="text-lg font-semibold text-white m-0">Mis Solicitudes de Vacaciones</h3>
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

          @if (vacationRequests.length === 0 && !requestsLoading) {
          <div class="text-center py-12">
            <div class="w-20 h-20 rounded-full bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
              <i class="pi pi-calendar-times text-4xl text-purple-400"></i>
            </div>
            <h4 class="text-lg font-semibold text-white mb-2">No hay solicitudes</h4>
            <p class="text-gray-400 mb-4">No has realizado ninguna solicitud de vacaciones todavía.</p>
          </div>
          } @else if (requestsLoading) {
          <div class="flex justify-center items-center py-12">
            <div class="flex flex-col items-center gap-3">
              <i class="pi pi-spin pi-spinner text-4xl text-purple-400"></i>
              <p class="text-gray-400">Cargando solicitudes...</p>
            </div>
          </div>
          } @else {
          <div class="overflow-x-auto">
            <p-table
              [value]="vacationRequests"
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
                  <th>Comentarios</th>
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
                    <span class="font-semibold text-purple-400">
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
                    <p class="text-gray-400">No hay solicitudes de vacaciones</p>
                  </td>
                </tr>
              </ng-template>
            </p-table>
          </div>
          }
        </div>
      </div>
    </p-card>
  `,
})
export class EmployeePortalVacationsComponent {
  @Input() minVacationDate: Date = new Date();
  @Input() maxVacationDate: Date = new Date();
  @Input() vacationStartDate: Date | null = null;
  @Output() vacationStartDateChange = new EventEmitter<Date | null>();
  @Input() vacationEndDate: Date | null = null;
  @Output() vacationEndDateChange = new EventEmitter<Date | null>();
  @Input() vacationReason = '';
  @Output() vacationReasonChange = new EventEmitter<string>();
  @Input() submitting = false;
  @Input() canSubmit = false;
  @Output() submitRequest = new EventEmitter<void>();
  @Output() resetForm = new EventEmitter<void>();
  @Input() vacationRequests: any[] = [];
  @Input() requestsLoading = false;
  @Input() calculateVacationDays: () => number = () => 0;
  @Input() calculateDaysBetween: (start: Date | string, end: Date | string) => number = () => 0;
  @Input() isDateFuture: (date: Date | string) => boolean = () => false;
  @Output() reloadList = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();
}
