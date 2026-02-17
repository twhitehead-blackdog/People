import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { InputText } from 'primeng/inputtext';
import { Employee } from '../../models';
import { DeviceService } from '../../services/device.service';

@Component({
  selector: 'pt-employee-portal-profile',
  standalone: true,
  imports: [Card, Button, InputText, FormsModule, DatePipe],
  template: `
    @if (device.isDesktop()) {
    <!-- ========== DESKTOP ========== -->
    <div class="space-y-4">
      <!-- Header Card -->
      <p-card class="shadow-lg border border-neutral-700/50">
        <ng-template #title>
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-3">
              <div
                class="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center"
              >
                <i class="pi pi-user text-white text-xl"></i>
              </div>
              <div>
                <h3 class="text-xl font-bold text-white m-0">
                  {{ employee()?.first_name }}
                  {{ employee()?.father_name }}
                </h3>
                <p class="text-sm text-gray-400 m-0 mt-1">
                  {{ employee()?.position?.name }}
                </p>
              </div>
            </div>
            @if (!editMode()) {
            <p-button
              label="Editar"
              icon="pi pi-pencil"
              (onClick)="onToggleEdit()"
              rounded
              severity="secondary"
              outlined
            />
            } @else {
            <div class="flex gap-2">
              <p-button
                label="Cancelar"
                severity="secondary"
                outlined
                rounded
                (onClick)="onCancelEdit()"
              />
              <p-button
                label="Guardar cambios"
                icon="pi pi-save"
                rounded
                [loading]="savingPersonalData()"
                (onClick)="onSavePersonalData()"
              />
            </div>
            }
          </div>
        </ng-template>
      </p-card>

      <!-- Información Básica Card -->
      <p-card class="shadow-lg border border-neutral-700/50">
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-id-card text-lg text-amber-400"></i>
            <h4 class="text-base font-bold text-white m-0">
              Información Básica
            </h4>
          </div>
        </ng-template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Código de Empleado
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              {{ employee()?.employee_number || '-' }}
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Fecha de Ingreso
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              {{ employee()?.start_date | date : 'mediumDate' }}
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Sucursal
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              {{ employee()?.branch?.name || '-' }}
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Departamento
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              {{ employee()?.department?.name || '-' }}
            </dd>
          </div>
        </div>
      </p-card>

      <!-- Información de Contacto Card -->
      <p-card class="shadow-lg border border-neutral-700/50">
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-phone text-lg text-amber-400"></i>
            <h4 class="text-base font-bold text-white m-0">
              Información de Contacto
            </h4>
          </div>
        </ng-template>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Email Personal
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              @if (!editMode()) {
                {{ employee()?.email || '-' }}
              } @else {
                <input
                  pInputText
                  type="email"
                  [ngModel]="editEmailValue()"
                  (ngModelChange)="onEditEmailChange($event)"
                  placeholder="Correo personal"
                  class="w-full"
                />
              }
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Email Laboral
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              @if (!editMode()) {
                {{ employee()?.work_email || '-' }}
              } @else {
                <input
                  pInputText
                  type="email"
                  [ngModel]="editWorkEmailValue()"
                  (ngModelChange)="onEditWorkEmailChange($event)"
                  placeholder="Correo corporativo"
                  class="w-full"
                />
              }
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Teléfono
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              @if (!editMode()) {
                {{ employee()?.phone_number || '-' }}
              } @else {
                <input
                  pInputText
                  type="text"
                  [ngModel]="editPhoneValue()"
                  (ngModelChange)="onEditPhoneChange($event)"
                  placeholder="Número de teléfono"
                  class="w-full"
                />
              }
            </dd>
          </div>
          <div
            class="flex flex-col p-3 rounded-lg bg-neutral-800/50 border border-neutral-700/50 md:col-span-2"
          >
            <dt
              class="text-xs font-semibold text-amber-400 mb-1 uppercase tracking-wide"
            >
              Dirección
            </dt>
            <dd class="text-sm text-gray-200 font-medium">
              @if (!editMode()) {
                {{ employee()?.address || '-' }}
              } @else {
                <textarea
                  pInputTextarea
                  [ngModel]="editAddressValue()"
                  (ngModelChange)="onEditAddressChange($event)"
                  rows="3"
                  placeholder="Dirección"
                  class="w-full"
                ></textarea>
              }
            </dd>
          </div>
        </div>
      </p-card>
    </div>

    } @else {
    <!-- ========== MOBILE ========== -->
    <div class="px-4 py-4 flex flex-col gap-3">
      <!-- Header -->
      <div class="bg-neutral-800/60 rounded-xl p-4 border border-neutral-700/30">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-11 h-11 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center flex-shrink-0">
            <i class="pi pi-user text-white text-lg"></i>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="text-base font-bold text-white m-0 truncate">{{ employee()?.first_name }} {{ employee()?.father_name }}</h3>
            <p class="text-xs text-gray-400 m-0 mt-0.5 truncate">{{ employee()?.position?.name }}</p>
          </div>
        </div>
        @if (!editMode()) {
        <button
          class="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg bg-neutral-700/50 border border-neutral-600/40 text-sm text-gray-200 font-medium"
          style="-webkit-tap-highlight-color: transparent;"
          (click)="onToggleEdit()"
        >
          <i class="pi pi-pencil text-amber-400 text-xs"></i> Editar Perfil
        </button>
        } @else {
        <div class="flex gap-2">
          <button
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-neutral-700/50 border border-neutral-600/40 text-sm text-gray-300"
            style="-webkit-tap-highlight-color: transparent;"
            (click)="onCancelEdit()"
          >
            Cancelar
          </button>
          <button
            class="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg bg-amber-500 text-sm text-black font-semibold"
            style="-webkit-tap-highlight-color: transparent;"
            [disabled]="savingPersonalData()"
            (click)="onSavePersonalData()"
          >
            @if (savingPersonalData()) {
              <i class="pi pi-spin pi-spinner text-xs"></i>
            } @else {
              <i class="pi pi-save text-xs"></i>
            }
            Guardar
          </button>
        </div>
        }
      </div>

      <!-- Información Básica -->
      <div class="bg-neutral-800/60 rounded-xl border border-neutral-700/30 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-700/30">
          <i class="pi pi-id-card text-amber-400 text-sm"></i>
          <span class="text-sm font-semibold text-white">Información Básica</span>
        </div>
        <div class="grid grid-cols-2 gap-px bg-neutral-700/20">
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Código</dt>
            <dd class="text-sm text-gray-200">{{ employee()?.employee_number || '-' }}</dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Ingreso</dt>
            <dd class="text-sm text-gray-200">{{ employee()?.start_date | date : 'mediumDate' }}</dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Sucursal</dt>
            <dd class="text-sm text-gray-200">{{ employee()?.branch?.name || '-' }}</dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Departamento</dt>
            <dd class="text-sm text-gray-200">{{ employee()?.department?.name || '-' }}</dd>
          </div>
        </div>
      </div>

      <!-- Información de Contacto -->
      <div class="bg-neutral-800/60 rounded-xl border border-neutral-700/30 overflow-hidden">
        <div class="flex items-center gap-2 px-4 py-2.5 border-b border-neutral-700/30">
          <i class="pi pi-phone text-amber-400 text-sm"></i>
          <span class="text-sm font-semibold text-white">Contacto</span>
        </div>
        <div class="flex flex-col gap-px bg-neutral-700/20">
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Email Personal</dt>
            <dd class="text-sm text-gray-200">
              @if (!editMode()) { {{ employee()?.email || '-' }} }
              @else { <input pInputText type="email" [ngModel]="editEmailValue()" (ngModelChange)="onEditEmailChange($event)" placeholder="Correo personal" class="w-full mt-1" /> }
            </dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Email Laboral</dt>
            <dd class="text-sm text-gray-200">
              @if (!editMode()) { {{ employee()?.work_email || '-' }} }
              @else { <input pInputText type="email" [ngModel]="editWorkEmailValue()" (ngModelChange)="onEditWorkEmailChange($event)" placeholder="Correo corporativo" class="w-full mt-1" /> }
            </dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Teléfono</dt>
            <dd class="text-sm text-gray-200">
              @if (!editMode()) { {{ employee()?.phone_number || '-' }} }
              @else { <input pInputText type="text" [ngModel]="editPhoneValue()" (ngModelChange)="onEditPhoneChange($event)" placeholder="Teléfono" class="w-full mt-1" /> }
            </dd>
          </div>
          <div class="bg-neutral-800/80 p-3">
            <dt class="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide mb-0.5">Dirección</dt>
            <dd class="text-sm text-gray-200">
              @if (!editMode()) { {{ employee()?.address || '-' }} }
              @else { <textarea pInputTextarea [ngModel]="editAddressValue()" (ngModelChange)="onEditAddressChange($event)" rows="2" placeholder="Dirección" class="w-full mt-1"></textarea> }
            </dd>
          </div>
        </div>
      </div>
    </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeePortalProfileComponent {
  protected device = inject(DeviceService);
  // Inputs
  public employee = input<Employee | null | undefined>();
  public editMode = input.required<boolean>();
  public editEmailValue = input.required<string>();
  public editWorkEmailValue = input.required<string>();
  public editPhoneValue = input.required<string>();
  public editAddressValue = input.required<string>();
  public savingPersonalData = input.required<boolean>();

  // Outputs
  public toggleEdit = output<void>();
  public cancelEdit = output<void>();
  public savePersonalData = output<void>();
  public editEmailChange = output<string>();
  public editWorkEmailChange = output<string>();
  public editPhoneChange = output<string>();
  public editAddressChange = output<string>();

  public onToggleEdit(): void {
    this.toggleEdit.emit();
  }

  public onCancelEdit(): void {
    this.cancelEdit.emit();
  }

  public onSavePersonalData(): void {
    this.savePersonalData.emit();
  }

  public onEditEmailChange(value: string): void {
    this.editEmailChange.emit(value);
  }

  public onEditWorkEmailChange(value: string): void {
    this.editWorkEmailChange.emit(value);
  }

  public onEditPhoneChange(value: string): void {
    this.editPhoneChange.emit(value);
  }

  public onEditAddressChange(value: string): void {
    this.editAddressChange.emit(value);
  }
}
