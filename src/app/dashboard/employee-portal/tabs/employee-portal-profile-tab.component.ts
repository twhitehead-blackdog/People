import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { firstValueFrom } from 'rxjs';
import { ApiUrlService } from '../../../services/api-url.service';
import { OrganizationService } from '../../../services/organization.service';
import { DashboardStore } from '../../../stores/dashboard.store';
import { EmployeePortalDataService } from '../services/employee-portal-data.service';
import { EmployeeCreditScoreComponent } from '../../employee-credit-score.component';

@Component({
  selector: 'pt-employee-portal-profile-tab',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    ButtonModule,
    InputTextModule,
    EmployeeCreditScoreComponent,
  ],
  providers: [MessageService],
  template: `
    <div class="tab-content" *ngIf="currentEmployee()">
      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between w-full">
            <span>Mi Información Personal</span>
            <p-button
              label="Editar Datos"
              icon="pi pi-pencil"
              size="small"
              outlined
              (click)="toggleEditMode()"
              [label]="editMode() ? 'Cancelar' : 'Editar Datos'"
            />
          </div>
        </ng-template>

        <div class="flex flex-col gap-6">
          <!-- Información no editable -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="text-sm text-gray-400">Nombre Completo</label>
              <p class="text-white font-semibold">
                {{ currentEmployee()?.first_name }}
                {{ currentEmployee()?.middle_name }}
                {{ currentEmployee()?.father_name }}
                {{ currentEmployee()?.mother_name }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-400">Cargo</label>
              <p class="text-white font-semibold">
                {{ currentEmployee()?.position?.name || 'Sin cargo' }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-400">Sucursal</label>
              <p class="text-white font-semibold">
                {{ currentEmployee()?.branch?.name || 'Sin sucursal' }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-400">Departamento</label>
              <p class="text-white font-semibold">
                {{ currentEmployee()?.department?.name || 'Sin departamento' }}
              </p>
            </div>
            <div>
              <label class="text-sm text-gray-400">Fecha de Ingreso</label>
              <p class="text-white font-semibold">
                {{ currentEmployee()?.start_date | date : 'fullDate' }}
              </p>
            </div>
          </div>

          <!-- Puntaje de Crédito -->
          <div class="border-t border-neutral-700 pt-6">
            <h3 class="text-lg font-semibold text-white mb-4">
              Puntaje de Crédito
            </h3>
            @if (currentEmployee()?.id) {
              <pt-employee-credit-score [employeeId]="currentEmployee()!.id" />
            }
          </div>

          <!-- Información editable -->
          <div class="border-t border-neutral-700 pt-6">
            <h3 class="text-lg font-semibold text-white mb-4">
              Datos de Contacto
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              @if (!editMode()) {
              <div>
                <label class="text-sm text-gray-400">Email Personal</label>
                <p class="text-white font-semibold">
                  {{ currentEmployee()?.email || 'Sin email' }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Email Laboral</label>
                <p class="text-white font-semibold">
                  {{ currentEmployee()?.work_email || 'Sin email' }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Teléfono</label>
                <p class="text-white font-semibold">
                  {{ currentEmployee()?.phone_number || 'Sin teléfono' }}
                </p>
              </div>
              <div>
                <label class="text-sm text-gray-400">Dirección</label>
                <p class="text-white font-semibold">
                  {{ currentEmployee()?.address || 'Sin dirección' }}
                </p>
              </div>
              } @else {
              <!-- Edit Forms -->
              <div>
                <label class="text-sm text-gray-400 mb-2 block"
                  >Email Personal</label
                >
                <input
                  pInputText
                  [ngModel]="editEmail()"
                  (ngModelChange)="editEmail.set($event)"
                  placeholder="correo@ejemplo.com"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm text-gray-400 mb-2 block"
                  >Email Laboral</label
                >
                <input
                  pInputText
                  [ngModel]="editWorkEmail()"
                  (ngModelChange)="editWorkEmail.set($event)"
                  placeholder="correo@empresa.com"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm text-gray-400 mb-2 block">Teléfono</label>
                <input
                  pInputText
                  [ngModel]="editPhone()"
                  (ngModelChange)="editPhone.set($event)"
                  placeholder="+507 1234-5678"
                  class="w-full"
                />
              </div>
              <div>
                <label class="text-sm text-gray-400 mb-2 block"
                  >Dirección</label
                >
                <input
                  pInputText
                  [ngModel]="editAddress()"
                  (ngModelChange)="editAddress.set($event)"
                  placeholder="Calle, Ciudad, Provincia"
                  class="w-full"
                />
              </div>
              <div class="md:col-span-2 flex justify-end gap-2 mt-4">
                <p-button
                  label="Cancelar"
                  severity="secondary"
                  outlined
                  (click)="cancelEdit()"
                />
                <p-button
                  label="Guardar Cambios"
                  icon="pi pi-save"
                  (click)="savePersonalData()"
                  [loading]="savingPersonalData()"
                />
              </div>
              }
            </div>
          </div>
        </div>
      </p-card>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
      }
    `,
  ],
})
export class EmployeePortalProfileTabComponent {
  private dataService = inject(EmployeePortalDataService);
  private organizationService = inject(OrganizationService);
  private messageService = inject(MessageService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private store = inject(DashboardStore);

  public currentEmployee = this.dataService.currentEmployee;

  public editMode = signal(false);
  public editEmail = signal('');
  public editWorkEmail = signal('');
  public editPhone = signal('');
  public editAddress = signal('');
  public savingPersonalData = signal(false);

  public toggleEditMode() {
    if (!this.editMode()) {
      const emp = this.currentEmployee();
      this.editEmail.set(emp?.email || '');
      this.editWorkEmail.set(emp?.work_email || '');
      this.editPhone.set(emp?.phone_number || '');
      this.editAddress.set(emp?.address || '');
    }
    this.editMode.update((v) => !v);
  }

  public cancelEdit() {
    this.editMode.set(false);
    this.editEmail.set('');
    this.editWorkEmail.set('');
    this.editPhone.set('');
    this.editAddress.set('');
  }

  private isValidEmail(email: string): boolean {
    if (!email || !email.trim()) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  public async savePersonalData() {
    if (!this.currentEmployee()?.id) return;

    if (this.editEmail() && !this.isValidEmail(this.editEmail())) {
      this.messageService.add({
        severity: 'error',
        summary: 'Email Inválido',
        detail: 'El formato del email personal no es válido',
      });
      return;
    }

    if (this.editWorkEmail() && !this.isValidEmail(this.editWorkEmail())) {
      this.messageService.add({
        severity: 'error',
        summary: 'Email Inválido',
        detail: 'El formato del email laboral no es válido',
      });
      return;
    }

    this.savingPersonalData.set(true);
    try {
      const updateData: any = {};
      if (this.editEmail()) updateData.email = this.editEmail().trim();
      if (this.editWorkEmail())
        updateData.work_email = this.editWorkEmail().trim();
      if (this.editPhone()) updateData.phone_number = this.editPhone().trim();
      if (this.editAddress()) updateData.address = this.editAddress().trim();

      const companyId = this.organizationService.getCurrentCompanyId();
      const params: any = { id: `eq.${this.currentEmployee()!.id}` };

      if (companyId) {
        params.company_id = `eq.${companyId}`;
      }

      await firstValueFrom(
        this.http.patch(this.apiUrl.build('rest/v1/employees'), updateData, {
          params,
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'return=representation',
          },
        })
      );

      this.messageService.add({
        severity: 'success',
        summary: 'Datos actualizados',
        detail: 'Tus datos personales han sido actualizados correctamente',
      });

      this.store.employees.fetchItems();
      this.editMode.set(false);
    } catch (error: any) {
      console.error('Error updating personal data:', error);
      const errorMessage =
        error?.error?.message ||
        error?.message ||
        'No se pudieron actualizar los datos. Por favor intenta de nuevo.';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: errorMessage,
      });
    } finally {
      this.savingPersonalData.set(false);
    }
  }
}
