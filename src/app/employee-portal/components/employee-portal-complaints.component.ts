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
import { InputTextarea } from 'primeng/inputtextarea';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'pt-employee-portal-complaints',
  standalone: true,
  imports: [CommonModule, FormsModule, Card, Button, InputTextarea, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-card>
      <ng-template #title>Buzón de Sugerencias</ng-template>
      <ng-template #subtitle>
        Expresa tus inquietudes de forma anónima y confidencial
      </ng-template>
      <div class="flex flex-col gap-4 mt-4">
        <div class="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
          <div class="flex items-start gap-3">
            <i class="pi pi-info-circle text-yellow-400 text-xl"></i>
            <div>
              <p class="text-yellow-300 font-semibold mb-2">
                Tu privacidad está protegida
              </p>
              <p class="text-sm text-gray-300">
                Todas las sugerencias son completamente anónimas. Tu identidad no será revelada
                a menos que lo autorices explícitamente.
              </p>
            </div>
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2">Categoría</label>
          <select
            pInputText
            [ngModel]="complaintCategory"
            (ngModelChange)="complaintCategoryChange.emit($event)"
            class="w-full"
          >
            <option value="work_environment">Ambiente Laboral</option>
            <option value="harassment">Acoso o Discriminación</option>
            <option value="safety">Seguridad</option>
            <option value="management">Supervisión/Gerencia</option>
            <option value="benefits">Beneficios</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-2">Describe tu sugerencia</label>
          <textarea
            pTextarea
            [ngModel]="complaintText"
            (ngModelChange)="complaintTextChange.emit($event)"
            rows="6"
            placeholder="Describe detalladamente tu sugerencia o inquietud..."
            class="w-full"
          ></textarea>
        </div>
        <div class="flex items-center gap-2">
          <input
            type="checkbox"
            id="allowContact"
            [ngModel]="allowContact"
            (ngModelChange)="allowContactChange.emit($event)"
          />
          <label for="allowContact" class="text-sm text-gray-300">
            Permitir que RRHH me contacte para seguimiento (opcional)
          </label>
        </div>
        <div *ngIf="allowContact">
          <label class="block text-sm text-gray-400 mb-2">Forma de Contacto Preferida</label>
          <select
            pInputText
            [ngModel]="contactMethod"
            (ngModelChange)="contactMethodChange.emit($event)"
            class="w-full"
          >
            <option value="email">Email</option>
            <option value="phone">Teléfono</option>
            <option value="meeting">Reunión Presencial</option>
          </select>
        </div>
        <div class="flex justify-end">
          <p-button
            label="Enviar Sugerencia"
            icon="pi pi-send"
            severity="warn"
            [loading]="submitting"
            [disabled]="!canSubmit || submitting"
            (onClick)="submitComplaint.emit()"
          />
        </div>
      </div>

      <div class="mt-6">
        <h3 class="text-lg font-semibold text-white mb-4">Mis Sugerencias y Conversaciones</h3>
        <div *ngIf="complaintsLoading" class="flex justify-center items-center py-8">
          <div class="flex flex-col items-center gap-3">
            <i class="pi pi-spin pi-spinner text-4xl text-yellow-400"></i>
            <p class="text-gray-400">Cargando sugerencias...</p>
          </div>
        </div>
        <div *ngIf="!complaintsLoading && complaints?.length === 0" class="text-center py-8">
          <i class="pi pi-inbox text-4xl text-gray-500 mb-4"></i>
          <p class="text-gray-400">No has enviado ninguna sugerencia aún</p>
        </div>

        <div *ngIf="!complaintsLoading && complaints?.length">
          <div class="space-y-4">
            <div
              *ngFor="let complaint of complaints"
              class="bg-neutral-900/80 border rounded-xl p-5 hover:shadow-lg transition-all duration-300 cursor-pointer"
              [class.border-yellow-500/30]="complaint.status === 'pending'"
              [class.border-green-500/30]="complaint.status === 'approved'"
              [class.border-red-500/30]="complaint.status === 'rejected'"
              [class.border-cyan-500/30]="complaint.status === 'in_review'"
              (click)="openConversation.emit(complaint)"
            >
              <div class="flex flex-col md:flex-row md:items-start gap-4">
                <div class="flex-shrink-0">
                  <div
                    class="w-16 h-16 rounded-xl flex items-center justify-center text-2xl"
                    [class.bg-yellow-500/20]="complaint.status === 'pending'"
                    [class.bg-green-500/20]="complaint.status === 'approved'"
                    [class.bg-red-500/20]="complaint.status === 'rejected'"
                    [class.bg-cyan-500/20]="complaint.status === 'in_review'"
                  >
                    <i class="pi pi-comments text-yellow-400"></i>
                  </div>
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                    <div class="flex items-center gap-3">
                      <div>
                        <h3 class="text-lg font-semibold text-white mb-1">{{ complaint.title }}</h3>
                        <p class="text-sm text-gray-400">
                          Solicitado el {{ complaint.created_at | date : 'dd/MM/yyyy' }} a las
                          {{ complaint.created_at | date : 'HH:mm' }}
                        </p>
                      </div>
                    </div>
                    <div class="flex items-center gap-2">
                      <span
                        class="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2"
                        [class.bg-yellow-500/20]="complaint.status === 'pending'"
                        [class.text-yellow-300]="complaint.status === 'pending'"
                        [class.bg-green-500/20]="complaint.status === 'approved'"
                        [class.text-green-300]="complaint.status === 'approved'"
                        [class.bg-red-500/20]="complaint.status === 'rejected'"
                        [class.text-red-300]="complaint.status === 'rejected'"
                        [class.bg-cyan-500/20]="complaint.status === 'in_review'"
                        [class.text-cyan-300]="complaint.status === 'in_review'"
                      >
                        <i
                          class="pi"
                          [class.pi-check-circle]="complaint.status === 'approved'"
                          [class.pi-times-circle]="complaint.status === 'rejected'"
                          [class.pi-clock]="complaint.status === 'in_review'"
                          [class.pi-hourglass]="complaint.status !== 'approved' && complaint.status !== 'rejected' && complaint.status !== 'in_review'"
                        ></i>
                        {{ getStatusLabel(complaint.status) }}
                      </span>
                    </div>
                  </div>

                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                    <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                      <div class="flex items-center gap-2 mb-2">
                        <i class="pi pi-tag text-yellow-400"></i>
                        <span class="text-xs text-gray-400 font-medium">Categoría</span>
                      </div>
                      <p class="text-white font-semibold">
                        {{ getLabel(complaint.category) }}
                      </p>
                    </div>
                    <div class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50">
                      <div class="flex items-center gap-2 mb-2">
                        <i class="pi pi-list text-gray-400"></i>
                        <span class="text-xs text-gray-400 font-medium">Tipo</span>
                      </div>
                      <p class="text-white font-semibold">
                        {{ getRequestTypeLabel(complaint.status) }}
                      </p>
                    </div>
                    <div
                      class="bg-neutral-900/50 rounded-lg p-3 border border-neutral-700/50"
                      *ngIf="hasUnreadMessages(complaint)"
                    >
                      <div class="flex items-center gap-2 mb-2">
                        <i class="pi pi-bell text-amber-400"></i>
                        <span class="text-xs text-gray-400 font-medium">Nuevos mensajes</span>
                      </div>
                      <p class="text-white text-sm">Hay mensajes nuevos de RRHH</p>
                    </div>
                  </div>

                  <div class="bg-neutral-900/30 rounded-lg p-3 border border-neutral-700/30 mb-4">
                    <div class="flex items-center gap-2 mb-2">
                      <i class="pi pi-comment text-cyan-400"></i>
                      <span class="text-sm text-gray-400 font-medium">
                        Detalles
                      </span>
                    </div>
                    <p class="text-gray-300 text-sm">{{ complaint.description }}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </p-card>
  `,
})
export class EmployeePortalComplaintsComponent {
  @Input() complaintCategory = 'work_environment';
  @Output() complaintCategoryChange = new EventEmitter<string>();
  @Input() complaintText = '';
  @Output() complaintTextChange = new EventEmitter<string>();
  @Input() allowContact = false;
  @Output() allowContactChange = new EventEmitter<boolean>();
  @Input() contactMethod = 'email';
  @Output() contactMethodChange = new EventEmitter<string>();
  @Input() submitting = false;
  @Input() canSubmit = false;
  @Output() submitComplaint = new EventEmitter<void>();
  @Input() complaints: any[] = [];
  @Input() complaintsLoading = false;
  @Input() hasUnreadMessages: (complaint: any) => boolean = () => false;
  @Input() getStatusLabel: (status: string) => string = () => '';
  @Input() getLabel: (category: string) => string = () => '';
  @Input() getRequestTypeLabel: (type: string) => string = () => '';
  @Output() openConversation = new EventEmitter<any>();
  @Output() reloadComplaints = new EventEmitter<void>();
  @Output() closeSection = new EventEmitter<void>();
}
