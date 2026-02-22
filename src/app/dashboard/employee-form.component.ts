import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  OnInit,
  untracked,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toDate } from 'date-fns-tz';
import * as OTPAuth from 'otpauth';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Skeleton } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import QRCode from 'qrcode';
import { debounceTime, firstValueFrom } from 'rxjs';
import { markGroupDirty } from 'src/app/services/util.service';
import { v4 } from 'uuid';
import { Bank, Employee, UniformSize } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import {
  generateNextEmployeeNumber,
  getEmployeeNumberPrefix,
} from '../utils/employee-number.utils';

@Component({
  selector: 'pt-employee-form',
  imports: [
    ReactiveFormsModule,
    InputText,
    InputNumber,
    DatePicker,
    Select,
    Checkbox,
    Button,
    TabsModule,
    Skeleton,
  ],
  template: `
    <div class="employee-form-header flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-neutral-700/50">
      <div class="flex flex-col gap-1">
        <a href="#" role="button" class="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-amber-400 transition-colors no-underline w-fit mb-1" (click)="onBackClick($event)">
          <i class="pi pi-arrow-left"></i>
          Volver al listado
        </a>
        <h1 class="m-0 text-xl font-bold text-white">{{ employee_id() ? 'Editar empleado' : 'Nuevo empleado' }}</h1>
        <p class="text-sm text-gray-400 m-0">Complete la información del colaborador</p>
      </div>
      <div class="flex flex-wrap gap-2 sm:flex-nowrap">
        <p-button
          label="Cancelar"
          severity="secondary"
          outlined
          rounded
          icon="pi pi-times"
          (click)="cancelChanges()"
          class="min-h-[44px]"
        />
        <p-button
          form="employee-form"
          label="Guardar cambios"
          (click)="saveChanges()"
          icon="pi pi-save"
          rounded
          [loading]="store.employees.isLoading()"
          class="min-h-[44px]"
        />
      </div>
    </div>
    @if(employee_id() && currentEmployee.isLoading()) {
    <div class="flex flex-col md:grid grid-cols-4 md:gap-4 ">
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
      <p-skeleton shape="rectangle" height="2rem" />
    </div>
    } @else {
    <form
      class="mt-4"
      [formGroup]="form"
      (ngSubmit)="saveChanges()"
      id="employee-form"
    >
      <p-tabs value="0" scrollable>
        <p-tablist class="employee-form-tablist">
          <p-tab value="0">
            <i class="pi pi-user mr-2"></i>
            <span class="tab-label">Información Personal</span>
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-phone mr-2"></i>
            <span class="tab-label">Contacto</span>
          </p-tab>
          <p-tab value="2">
            <i class="pi pi-money-bill mr-2"></i>
            <span class="tab-label">Información Bancaria</span>
          </p-tab>
          <p-tab value="3">
            <i class="pi pi-briefcase mr-2"></i>
            <span class="tab-label">Datos Laborales</span>
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            <div class="space-y-6">
              <!-- Información Básica -->
              <div class="border-b border-neutral-700 pb-4">
                <h3
                  class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
                >
                  <i class="pi pi-id-card text-amber-400"></i>
                  Información Básica
                </h3>
                <div class="flex flex-col md:grid grid-cols-4 md:gap-4">
                  <div class="input-container">
                    <label for="first_name">* Nombre</label>
                    <input
                      type="text"
                      id="first_name"
                      pInputText
                      formControlName="first_name"
                      placeholder="Nombre"
                    />
                  </div>
                  <div class="input-container">
                    <label for="middle_name">Segundo Nombre</label>
                    <input
                      type="text"
                      id="middle_name"
                      pInputText
                      formControlName="middle_name"
                      placeholder="Segundo Nombre"
                    />
                  </div>
                  <div class="input-container">
                    <label for="father_name">* Apellido Paterno</label>
                    <input
                      type="text"
                      id="father_name"
                      pInputText
                      formControlName="father_name"
                      placeholder="Apellido Paterno"
                    />
                  </div>
                  <div class="input-container">
                    <label for="mother_name">Apellido Materno</label>
                    <input
                      type="text"
                      id="mother_name"
                      pInputText
                      formControlName="mother_name"
                      placeholder="Apellido Materno"
                    />
                  </div>
                  <div class="input-container">
                    <label for="document_id">* Cédula de Identidad</label>
                    <input
                      type="text"
                      id="document_id"
                      pInputText
                      formControlName="document_id"
                      placeholder="Cédula de identidad"
                    />
                  </div>
                  <div class="input-container">
                    <label for="birth_date">Fecha de Nacimiento</label>
                    <p-datepicker
                      inputId="birth_date"
                      formControlName="birth_date"
                      iconDisplay="input"
                      [showIcon]="true"
                      appendTo="body"
                      placeholder="dd/mm/yyyy"
                      [touchUI]="false"
                      dateFormat="dd/mm/yy"
                      [autoZIndex]="true"
                      [hideOnDateTimeSelect]="true"
                      [showOnFocus]="false"
                    />
                  </div>
                  <div class="input-container">
                    <label for="gender">* Sexo</label>
                    <p-select
                      inputId="gender"
                      [options]="genderOptions"
                      formControlName="gender"
                      appendTo="body"
                      optionLabel="label"
                      optionValue="value"
                      placeholder="Seleccione un sexo"
                    />
                  </div>
                  <div class="input-container">
                    <label for="size">Talla de Uniforme</label>
                    <p-select
                      inputId="size"
                      [options]="sizes"
                      formControlName="uniform_size"
                      appendTo="body"
                      placeholder="Seleccione una talla"
                    />
                  </div>
                </div>
              </div>

              <!-- Estado del Empleado -->
              <div class="border-b border-neutral-700 pb-4">
                <h3
                  class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
                >
                  <i class="pi pi-check-circle text-amber-400"></i>
                  Estado
                </h3>
                <div class="flex gap-2 items-center">
                  <p-checkbox
                    formControlName="is_active"
                    [binary]="true"
                    inputId="is_active"
                  />
                  <label for="is_active" class="text-gray-300"
                    >Empleado Activo</label
                  >
                </div>
              </div>
            </div>
          </p-tabpanel>

          <p-tabpanel value="1">
            <div class="space-y-6">
              <!-- Información de Contacto -->
              <div class="border-b border-neutral-700 pb-4">
                <h3
                  class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
                >
                  <i class="pi pi-envelope text-amber-400"></i>
                  Correos Electrónicos
                </h3>
                <div class="flex flex-col md:grid grid-cols-2 md:gap-4">
                  <div class="input-container">
                    <label for="email">Email Personal</label>
                    <input
                      type="email"
                      id="email"
                      pInputText
                      formControlName="email"
                      placeholder="correo@ejemplo.com"
                    />
                  </div>
                  <div class="input-container">
                    <label for="work_email">Email Laboral</label>
                    <input
                      type="email"
                      id="work_email"
                      pInputText
                      formControlName="work_email"
                      placeholder="correo@empresa.com"
                    />
                  </div>
                </div>
              </div>

              <!-- Teléfono -->
              <div class="border-b border-neutral-700 pb-4">
                <h3
                  class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
                >
                  <i class="pi pi-phone text-amber-400"></i>
                  Teléfono
                </h3>
                <div class="flex flex-col md:grid grid-cols-2 md:gap-4">
                  <div class="input-container">
                    <label for="phone_number"
                      >Número de Teléfono Personal</label
                    >
                    <div class="flex gap-2">
                      <p-select
                        [options]="countryCodes"
                        optionLabel="label"
                        optionValue="value"
                        formControlName="phone_country_code"
                        [style]="{ width: '140px', flexShrink: 0 }"
                        appendTo="body"
                      />
                      <input
                        type="text"
                        id="phone_number"
                        pInputText
                        formControlName="phone_number"
                        placeholder="1234-5678"
                        [style]="{ maxWidth: '200px' }"
                        (blur)="formatPhoneNumber('phone_number')"
                      />
                    </div>
                  </div>
                  <div class="input-container">
                    <label for="work_phone_number"
                      >Número de Teléfono Laboral</label
                    >
                    <div class="flex gap-2">
                      <p-select
                        [options]="countryCodes"
                        optionLabel="label"
                        optionValue="value"
                        formControlName="work_phone_country_code"
                        [style]="{ width: '140px', flexShrink: 0 }"
                        appendTo="body"
                      />
                      <input
                        type="text"
                        id="work_phone_number"
                        pInputText
                        formControlName="work_phone_number"
                        placeholder="1234-5678"
                        [style]="{ maxWidth: '200px' }"
                        (blur)="formatPhoneNumber('work_phone_number')"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <!-- Contacto de Emergencia -->
              <div class="border-b border-neutral-700 pb-4">
                <h3
                  class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
                >
                  <i class="pi pi-exclamation-triangle text-amber-400"></i>
                  Contacto de Emergencia
                </h3>
                <div class="flex flex-col md:grid grid-cols-3 md:gap-4">
                  <div class="input-container">
                    <label for="emergency_contact_name"
                      >Nombre del Contacto</label
                    >
                    <input
                      type="text"
                      id="emergency_contact_name"
                      pInputText
                      formControlName="emergency_contact_name"
                      placeholder="Nombre completo"
                    />
                  </div>
                  <div class="input-container">
                    <label for="emergency_contact_phone"
                      >Número de Teléfono</label
                    >
                    <div class="flex gap-2">
                      <p-select
                        [options]="countryCodes"
                        optionLabel="label"
                        optionValue="value"
                        formControlName="emergency_contact_phone_country_code"
                        [style]="{ width: '140px', flexShrink: 0 }"
                        appendTo="body"
                      />
                      <input
                        type="text"
                        id="emergency_contact_phone"
                        pInputText
                        formControlName="emergency_contact_phone"
                        placeholder="1234-5678"
                        [style]="{ maxWidth: '200px' }"
                        (blur)="formatEmergencyContactPhone()"
                      />
                    </div>
                  </div>
                  <div class="input-container">
                    <label for="emergency_contact_relationship">Relación</label>
                    <p-select
                      inputId="emergency_contact_relationship"
                      [options]="emergencyContactRelationships"
                      formControlName="emergency_contact_relationship"
                      appendTo="body"
                      placeholder="Seleccione la relación"
                    />
                  </div>
                </div>
              </div>

              <!-- Dirección -->
              <div>
                <h3
                  class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
                >
                  <i class="pi pi-map-marker text-amber-400"></i>
                  Dirección
                </h3>
                <div class="flex flex-col md:grid grid-cols-1 md:gap-4">
                  <div class="input-container">
                    <label for="address">Dirección Completa</label>
                    <input
                      type="text"
                      id="address"
                      pInputText
                      formControlName="address"
                      placeholder="Calle, Ciudad, Provincia"
                    />
                  </div>
                </div>
              </div>
            </div>
          </p-tabpanel>

          <p-tabpanel value="2">
            <div class="space-y-6">
              <h3
                class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
              >
                <i class="pi pi-university text-amber-400"></i>
                Información Bancaria
              </h3>
              <div class="flex flex-col md:grid grid-cols-3 md:gap-4">
                <div class="input-container">
                  <label for="bank">Banco</label>
                  <p-select
                    inputId="bank"
                    [options]="banks.value()"
                    formControlName="bank"
                    optionLabel="name"
                    optionValue="id"
                    appendTo="body"
                    filter
                    placeholder="Seleccione un banco"
                  >
                    <ng-template pTemplate="selectedItem" let-selected>
                      @if(selected && typeof selected === 'object') {
                      {{ selected.name }}
                      } @else if(selected) {
                      {{ getBankName(selected) }}
                      } @else { Seleccione un banco }
                    </ng-template>
                    <ng-template let-item pTemplate="item">
                      {{ item.name }}
                    </ng-template>
                  </p-select>
                </div>
                <div class="input-container">
                  <label for="account_number">Número de Cuenta</label>
                  <input
                    type="text"
                    id="account_number"
                    pInputText
                    formControlName="account_number"
                    placeholder="Nro. de cuenta"
                  />
                </div>
                <div class="input-container">
                  <label for="bank_account_type">Tipo de Cuenta</label>
                  <p-select
                    inputId="bank_account_type"
                    [options]="accountTypes"
                    formControlName="bank_account_type"
                    appendTo="body"
                    placeholder="Seleccione un tipo"
                  />
                </div>
              </div>
            </div>
          </p-tabpanel>
          <p-tabpanel value="3">
            <div class="space-y-6">
              <h3
                class="text-lg font-semibold text-white mb-4 flex items-center gap-2"
              >
                <i class="pi pi-building text-amber-400"></i>
                Información Laboral
              </h3>
              <div class="flex flex-col md:grid grid-cols-4 md:gap-4">
                <div class="input-container">
                  <label for="company">Empresa</label>
                  <p-select
                    [options]="availableCompanies()"
                    optionLabel="name"
                    optionValue="id"
                    inputId="company"
                    formControlName="company_id"
                    placeholder="Seleccione una empresa"
                    appendTo="body"
                    [disabled]="
                      !store.isAdmin() && availableCompanies().length === 1
                    "
                  />
                </div>
                <div class="input-container">
                  <label for="employee_number">Número de Empleado</label>
                  <input
                    type="text"
                    id="employee_number"
                    pInputText
                    formControlName="employee_number"
                    placeholder=""
                    [style]="{ fontFamily: 'monospace' }"
                    maxlength="6"
                  />
                  <small class="text-gray-400 text-xs mt-1 block"></small>
                </div>
                <div class="input-container">
                  <label for="position">Cargo</label>
                  <p-select
                    [options]="store.positions.entities()"
                    optionLabel="name"
                    optionValue="id"
                    inputId="position"
                    formControlName="position_id"
                    appendTo="body"
                    placeholder="Seleccione un cargo"
                  />
                </div>
                <div class="input-container">
                  <label for="department">Area</label>
                  <p-select
                    [options]="store.departments.entities()"
                    optionLabel="name"
                    optionValue="id"
                    inputId="department"
                    formControlName="department_id"
                    appendTo="body"
                    placeholder="Seleccione un area"
                  />
                </div>
                <div class="input-container">
                  <label for="branch">Sucursal</label>
                  <p-select
                    [options]="store.branches.entities()"
                    optionLabel="name"
                    optionValue="id"
                    inputId="branch"
                    formControlName="branch_id"
                    placeholder="Seleccione una sucursal"
                    appendTo="body"
                  />
                </div>
                <div class="input-container">
                  <label for="salary">Salario mensual</label>
                  <p-inputNumber
                    mode="currency"
                    currency="USD"
                    formControlName="monthly_salary"
                    id="salary"
                    placeholder="Salario mensual"
                  />
                </div>
                <div class="input-container">
                  <label for="hourly_salary">Salario por hora</label>
                  <p-inputNumber
                    mode="currency"
                    currency="USD"
                    formControlName="hourly_salary"
                    id="hourly_salary"
                    placeholder="Salario por hora"
                  />
                </div>
                <div class="input-container">
                  <label for="start_date">Fecha de inicio</label>
                  <p-datepicker
                    inputId="start_date"
                    formControlName="start_date"
                    iconDisplay="input"
                    [showIcon]="true"
                    appendTo="body"
                    placeholder="dd/mm/yyyy"
                    [touchUI]="false"
                    dateFormat="dd/mm/yy"
                    [autoZIndex]="true"
                    [hideOnDateTimeSelect]="true"
                    [showOnFocus]="false"
                  />
                </div>
                <div class="input-container">
                  <label for="end_date">Fecha de salida</label>
                  <p-datepicker
                    inputId="end_date"
                    formControlName="end_date"
                    iconDisplay="input"
                    [showIcon]="true"
                    appendTo="body"
                    placeholder="dd/mm/yyyy"
                    [touchUI]="false"
                    dateFormat="dd/mm/yy"
                    [autoZIndex]="true"
                    [hideOnDateTimeSelect]="true"
                    [showOnFocus]="false"
                  />
                </div>
                <div class="input-container">
                  <label for="total_lunch_exceeded_minutes"
                    >Total Excedido de Almuerzo (minutos)</label
                  >
                  <p-inputNumber
                    formControlName="total_lunch_exceeded_minutes"
                    id="total_lunch_exceeded_minutes"
                    placeholder="Minutos excedidos"
                    [min]="0"
                    [showButtons]="true"
                  />
                </div>
                @if (!organizationService.isNaz()) {
                <div class="input-container">
                  <label for="week_hours">Horas semanales</label>
                  <p-inputNumber
                    formControlName="week_hours"
                    id="week_hours"
                    placeholder="Horas semanales"
                  />
                </div>
                <div class="input-container">
                  <label for="use_timelog">Marca reloj </label>
                  <p-checkbox
                    [binary]="true"
                    formControlName="use_timelog"
                    inputId="use_timelog"
                  />
                </div>
                }
              </div>
            </div>
          </p-tabpanel>
        </p-tabpanels>
      </p-tabs>
    </form>
    }
  `,
  styles: `
    .input-container {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    
    .input-container label {
      font-size: 0.875rem;
      font-weight: 500;
      color: #e5e7eb;
    }
    
    ::ng-deep .p-inputtext,
    ::ng-deep .p-inputnumber-input,
    ::ng-deep .p-select,
    ::ng-deep .p-datepicker {
      background: #262626 !important;
      border: 1px solid #404040 !important;
      color: #e5e7eb !important;
      border-radius: 0.375rem !important;
    }
    
    ::ng-deep .p-inputtext:focus,
    ::ng-deep .p-inputnumber-input:focus,
    ::ng-deep .p-select.p-focus,
    ::ng-deep .p-datepicker.p-focus {
      border-color: #fbbf24 !important;
      box-shadow: 0 0 0 0.2rem rgba(251, 191, 36, 0.2) !important;
    }

    /* Asegurar que los botones y elementos del datepicker funcionen correctamente */
    ::ng-deep .p-datepicker {
      pointer-events: auto !important;
    }

    ::ng-deep .p-datepicker-panel {
      pointer-events: auto !important;
      z-index: 10000 !important;
    }

    ::ng-deep .p-datepicker-panel * {
      pointer-events: auto !important;
    }

    ::ng-deep .p-datepicker-header {
      pointer-events: auto !important;
    }

    ::ng-deep .p-datepicker-header button {
      pointer-events: auto !important;
      cursor: pointer !important;
      touch-action: manipulation !important;
      z-index: 10001 !important;
      position: relative;
    }

    ::ng-deep .p-datepicker-calendar {
      pointer-events: auto !important;
    }

    ::ng-deep .p-datepicker-calendar-container {
      pointer-events: auto !important;
    }

    ::ng-deep .p-datepicker-calendar td {
      pointer-events: auto !important;
      cursor: pointer !important;
      touch-action: manipulation !important;
    }

    ::ng-deep .p-datepicker-calendar td > span {
      pointer-events: auto !important;
      cursor: pointer !important;
      touch-action: manipulation !important;
      display: block;
      width: 100%;
      height: 100%;
    }

    /* Asegurar que el overlay no bloquee los eventos */
    ::ng-deep .p-datepicker-panel.p-component-overlay {
      pointer-events: auto !important;
    }

    ::ng-deep .p-datepicker-panel.p-component-overlay * {
      pointer-events: auto !important;
    }
    
    ::ng-deep .p-tabs .p-tablist {
      background: #18181b !important;
      border-bottom: 1px solid rgba(251, 191, 36, 0.2) !important;
    }

    /* Tabs scrollables en móvil: no envolver, scroll horizontal */
    ::ng-deep .p-tabs.scrollable .p-tablist-content,
    ::ng-deep .p-tabs .p-tablist-content {
      overflow-x: auto !important;
      overflow-y: hidden !important;
      -webkit-overflow-scrolling: touch;
      scrollbar-width: thin;
      flex-wrap: nowrap !important;
    }
    ::ng-deep .p-tabs .p-tablist-tab-list {
      flex-wrap: nowrap !important;
    }
    ::ng-deep .p-tabs .p-tab {
      color: #9ca3af !important;
      padding: 0.75rem 1rem !important;
      min-height: 44px;
      flex-shrink: 0 !important;
      white-space: nowrap !important;
    }

    @media (max-width: 768px) {
      ::ng-deep .p-tabs .p-tab {
        padding: 0.625rem 0.75rem !important;
        font-size: 0.8125rem;
        min-height: 40px;
      }

      ::ng-deep .p-tabs .p-tab i {
        font-size: 0.875rem;
      }

      .tab-label {
        display: inline;
      }
    }
    
    ::ng-deep .p-tabs .p-tab:hover {
      color: #fbbf24 !important;
    }
    
    ::ng-deep .p-tabs .p-tab.p-highlight {
      color: #fbbf24 !important;
      border-bottom: 2px solid #fbbf24 !important;
    }
    
    @media (max-width: 768px) {
      .input-container {
        width: 100%;
      }

      h3 {
        font-size: 1rem !important;
      }
    }

    ::ng-deep .p-tabpanel {
      padding: 1.5rem 0 !important;
    }

    .employee-form-header a.no-underline { text-decoration: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormComponent implements OnInit {
  public store = inject(DashboardStore);
  public sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
  public genderOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' },
  ];
  public accountTypes = ['Ahorros', 'Corriente'];
  public emergencyContactRelationships = [
    'Pareja',
    'Familiar',
    'Amigo',
    'Padre',
    'Madre',
    'Hermano',
    'Hermana',
    'Hijo',
    'Hija',
    'Otro',
  ];

  public countryCodes = [
    { label: '+507', value: '+507' }, // Panamá (predeterminado)
    { label: '+1', value: '+1' }, // USA/Canadá
    { label: '+52', value: '+52' }, // México
    { label: '+57', value: '+57' }, // Colombia
    { label: '+51', value: '+51' }, // Perú
    { label: '+56', value: '+56' }, // Chile
    { label: '+54', value: '+54' }, // Argentina
    { label: '+58', value: '+58' }, // Venezuela
    { label: '+593', value: '+593' }, // Ecuador
    { label: '+595', value: '+595' }, // Paraguay
    { label: '+591', value: '+591' }, // Bolivia
    { label: '+506', value: '+506' }, // Costa Rica
    { label: '+504', value: '+504' }, // Honduras
    { label: '+502', value: '+502' }, // Guatemala
    { label: '+503', value: '+503' }, // El Salvador
    { label: '+505', value: '+505' }, // Nicaragua
  ];

  public banks = httpResource<Bank[]>(() => {
    // Cargar todos los bancos (compartidos y del company_id)
    // El filtrado se hace en el store usando dos queries separadas
    const params: any = {
      select: 'id,name',
      order: 'name',
    };

    return {
      url: this.apiUrl.build('rest/v1/banks'),
      method: 'GET',
      params,
    };
  });
  public employee_id = input<string>();
  private injector = inject(Injector);
  private message = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);

  // Computed para filtrar empresas: solo mostrar la empresa actual, excepto para admins
  public availableCompanies = computed(() => {
    const allCompanies = this.store.companies.entities();
    const isAdmin = this.store.isAdmin();

    // Si es admin, mostrar todas las empresas
    if (isAdmin) {
      return allCompanies;
    }

    // Si no es admin, filtrar por company_id actual
    const currentCompanyId = this.organizationService.getCurrentCompanyId();
    if (!currentCompanyId) {
      return [];
    }

    return allCompanies.filter((company) => company.id === currentCompanyId);
  });

  public form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    first_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    middle_name: new FormControl('', { nonNullable: true }),
    father_name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    mother_name: new FormControl('', { nonNullable: true }),
    document_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl('', {
      nonNullable: true,
    }),
    phone_number: new FormControl('', {
      nonNullable: true,
    }),
    work_phone_number: new FormControl('', { nonNullable: true }),
    address: new FormControl('', { nonNullable: true }),
    emergency_contact_name: new FormControl('', { nonNullable: true }),
    emergency_contact_phone: new FormControl('', { nonNullable: true }),
    emergency_contact_relationship: new FormControl('', { nonNullable: true }),
    birth_date: new FormControl<Date | undefined>(undefined, {
      nonNullable: true,
    }),
    start_date: new FormControl<Date>(new Date(), {
      nonNullable: true,
    }),
    end_date: new FormControl<Date | undefined>(undefined, {
      nonNullable: true,
    }),
    branch_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    department_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    position_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    gender: new FormControl<'F' | 'M'>('M', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    uniform_size: new FormControl<UniformSize | undefined>(undefined, {
      nonNullable: true,
    }),
    is_active: new FormControl(true, { nonNullable: true }),
    company_id: new FormControl('', {
      nonNullable: true,
      // company_id es requerido siempre
      validators: [],
    }),
    employee_number: new FormControl('', { nonNullable: true }),
    work_email: new FormControl('', { nonNullable: true }),
    monthly_salary: new FormControl(0, { nonNullable: true }),
    hourly_salary: new FormControl(0, { nonNullable: true }),
    qr_code: new FormControl('', { nonNullable: true }),
    code_uri: new FormControl('', { nonNullable: true }),
    bank: new FormControl('', { nonNullable: true }),
    account_number: new FormControl('', { nonNullable: true }),
    bank_account_type: new FormControl<'Ahorros' | 'Corriente'>('Ahorros', {
      nonNullable: true,
    }),
    week_hours: new FormControl(0, {
      nonNullable: true,
      // Los validadores se ajustarán dinámicamente según si es Naz o no
      validators: [],
    }),
    use_timelog: new FormControl(false, { nonNullable: true }),
    total_lunch_exceeded_minutes: new FormControl<number | undefined>(
      undefined,
      {
        nonNullable: true,
      }
    ),
    phone_country_code: new FormControl('+507', { nonNullable: true }),
    work_phone_country_code: new FormControl('+507', { nonNullable: true }),
    emergency_contact_phone_country_code: new FormControl('+507', {
      nonNullable: true,
    }),
  });

  private confirmationService = inject(ConfirmationService);
  public organizationService = inject(OrganizationService);
  currentSalary = toSignal(
    this.form.get('monthly_salary')!.valueChanges.pipe(debounceTime(500)),
    {
      initialValue: 0,
    }
  );

  hourlySalary = computed(() => this.currentSalary() / (104.28 * 2));
  currentEmployee = httpResource<Employee[]>(() => {
    if (!this.employee_id()) {
      return;
    }
    const companyId = this.organizationService.getCurrentCompanyId();

    // Construir la query base - incluir todos los campos (week_hours y use_timelog son opcionales)
    const selectQuery =
      'id,first_name,father_name, middle_name, mother_name, document_id, email, phone_number, work_phone_number, address, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, birth_date, start_date, end_date, branch_id, department_id, position_id, gender, uniform_size, is_active, company_id, work_email, monthly_salary, hourly_salary, qr_code, code_uri, bank, account_number, bank_account_type, week_hours, use_timelog, total_lunch_exceeded_minutes';

    const params: any = {
      select: selectQuery,
      limit: '1',
      order: 'father_name',
      is_active: 'eq.true',
      id: `eq.${this.employee_id()}`,
    };

    // Agregar filtro por company_id
    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
      method: 'GET',
      params,
    };
  });

  ngOnInit() {
    // Cargar datos necesarios para los dropdowns
    console.log('[EmployeeForm] Cargando datos para dropdowns...');
    console.log(
      '[EmployeeForm] Company ID actual:',
      this.organizationService.getCurrentCompanyId()
    );
    console.log('[EmployeeForm] Es Naz:', this.organizationService.isNaz());

    this.store.positions.fetchItems();
    this.store.departments.fetchItems();
    this.store.companies.fetchItems();
    this.store.branches.fetchItems();

    // Debug: Verificar posiciones cargadas
    effect(
      () => {
        const positions = this.store.positions.entities();
        console.log(
          '[EmployeeForm] Posiciones cargadas:',
          positions.length,
          positions
        );
        if (positions.length === 0) {
          console.warn(
            '[EmployeeForm] ⚠️ No hay posiciones disponibles. Verificar company_id y que existan posiciones en la base de datos.'
          );
        }
      },
      { injector: this.injector }
    );

    // Ajustar validaciones según si es Naz o no
    effect(
      () => {
        const isNaz = this.organizationService.isNaz();

        // Ajustar validación de company_id
        const companyControl = this.form.get('company_id');
        if (companyControl) {
          if (isNaz) {
            companyControl.clearValidators();
          } else {
            companyControl.setValidators([Validators.required]);
          }
          companyControl.updateValueAndValidity({ emitEvent: false });
        }

        // Ajustar validación de week_hours
        const weekHoursControl = this.form.get('week_hours');
        if (weekHoursControl) {
          if (isNaz) {
            // En Naz, week_hours no existe, así que no debe tener validadores
            weekHoursControl.clearValidators();
            weekHoursControl.setValue(0, { emitEvent: false });
          } else {
            // En Black Dog, week_hours debe estar entre 40 y 60
            weekHoursControl.setValidators([
              Validators.min(40),
              Validators.max(60),
            ]);
          }
          weekHoursControl.updateValueAndValidity({ emitEvent: false });
        }
      },
      { injector: this.injector }
    );

    effect(
      () => {
        const employee = this.currentEmployee.value()?.[0];
        if (!employee) return;

        untracked(() => {
          this.preloadForm(employee);
        });
      },
      { injector: this.injector }
    );
    // Effect para actualizar el banco cuando se carguen los bancos
    effect(
      () => {
        const employee = this.currentEmployee.value()?.[0];
        const banks = this.banks.value();
        if (employee?.bank && banks && banks.length > 0) {
          const bankExists = banks.some((b) => b.id === employee.bank);
          if (bankExists) {
            this.form
              .get('bank')
              ?.setValue(employee.bank, { emitEvent: false });
          }
        }
      },
      { injector: this.injector }
    );
    effect(
      () => {
        this.form.get('hourly_salary')?.patchValue(this.hourlySalary());
      },
      { injector: this.injector }
    );

    // Effect para establecer company_id por defecto si no es admin
    effect(
      () => {
        const isAdmin = this.store.isAdmin();
        const currentCompanyId = this.organizationService.getCurrentCompanyId();
        const companyControl = this.form.get('company_id');
        const currentCompanyIdValue = companyControl?.value;

        // Si no es admin y no hay company_id establecido, establecer el actual
        if (!isAdmin && currentCompanyId && !currentCompanyIdValue) {
          companyControl?.setValue(currentCompanyId, { emitEvent: false });
        }

        // Si no es admin y hay una empresa disponible, asegurar que esté seleccionada
        const available = this.availableCompanies();
        if (!isAdmin && available.length === 1 && !currentCompanyIdValue) {
          companyControl?.setValue(available[0].id, { emitEvent: false });
        }
      },
      { injector: this.injector }
    );
  }

  preloadForm(employee: Employee) {
    this.form.patchValue(employee);
    employee.birth_date &&
      this.form
        .get('birth_date')
        ?.patchValue(
          toDate(employee.birth_date, { timeZone: 'America/Panama' })
        );
    this.form
      .get('start_date')
      ?.patchValue(toDate(employee.start_date, { timeZone: 'America/Panama' }));
    if (employee.end_date) {
      this.form
        .get('end_date')
        ?.patchValue(toDate(employee.end_date, { timeZone: 'America/Panama' }));
    }

    // Separar código de país del número de teléfono personal
    if (employee.phone_number) {
      const { countryCode, number } = this.parsePhoneNumber(
        employee.phone_number
      );
      this.form.get('phone_country_code')?.setValue(countryCode || '+507');
      this.form.get('phone_number')?.setValue(number || '');
    }

    // Separar código de país del número de teléfono laboral
    if (employee.work_phone_number) {
      const { countryCode, number } = this.parsePhoneNumber(
        employee.work_phone_number
      );
      this.form.get('work_phone_country_code')?.setValue(countryCode || '+507');
      this.form.get('work_phone_number')?.setValue(number || '');
    }

    // Separar código de país del número de teléfono del contacto de emergencia
    if (employee.emergency_contact_phone) {
      const { countryCode, number } = this.parsePhoneNumber(
        employee.emergency_contact_phone
      );
      this.form
        .get('emergency_contact_phone_country_code')
        ?.setValue(countryCode || '+507');
      this.form.get('emergency_contact_phone')?.setValue(number || '');
    }

    // Asegurar que el banco se establezca correctamente cuando los bancos estén cargados
    if (employee.bank && this.banks.value()) {
      const bankExists = this.banks
        .value()
        ?.some((b) => b.id === employee.bank);
      if (bankExists) {
        this.form.get('bank')?.setValue(employee.bank);
      }
    }

    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  getBankName(bankId: string | null | undefined): string {
    if (!bankId) return '';
    const banksList = this.banks.value();
    if (!banksList) return bankId;
    const bank = banksList.find((b) => b.id === bankId);
    return bank?.name || bankId;
  }

  private getFieldLabel(fieldName: string): string {
    const labels: Record<string, string> = {
      first_name: 'Nombre',
      father_name: 'Apellido Paterno',
      document_id: 'Cédula de Identidad',
      gender: 'Sexo',
      branch_id: 'Sucursal',
      department_id: 'Área',
      position_id: 'Cargo',
      start_date: 'Fecha de Inicio',
      company_id: 'Empresa',
    };
    return labels[fieldName] || fieldName;
  }

  // Parsear número de teléfono para separar código de país
  private parsePhoneNumber(phone: string): {
    countryCode: string;
    number: string;
  } {
    if (!phone) return { countryCode: '+507', number: '' };

    // Buscar código de país conocido al inicio
    for (const code of this.countryCodes.map((c) => c.value)) {
      if (phone.startsWith(code)) {
        return {
          countryCode: code,
          number: phone.substring(code.length).trim(),
        };
      }
    }

    // Si no se encuentra código conocido, asumir +507
    if (phone.startsWith('+')) {
      // Extraer código manualmente (primeros 1-4 dígitos después del +)
      const match = phone.match(/^(\+\d{1,4})\s*(.+)$/);
      if (match) {
        return { countryCode: match[1], number: match[2] };
      }
    }

    return { countryCode: '+507', number: phone };
  }

  // Formatear número de teléfono al perder el foco
  formatPhoneNumber(fieldName: 'phone_number' | 'work_phone_number') {
    const numberControl = this.form.get(fieldName);
    const codeControl = this.form.get(
      fieldName === 'phone_number'
        ? 'phone_country_code'
        : 'work_phone_country_code'
    );

    if (numberControl && codeControl) {
      const number = numberControl.value?.trim() || '';
      const code = codeControl.value || '+507';

      // Si el número ya tiene el código, separarlo
      if (number.startsWith('+')) {
        const parsed = this.parsePhoneNumber(number);
        codeControl.setValue(parsed.countryCode);
        numberControl.setValue(parsed.number);
      }
    }
  }

  // Combinar código de país con número de teléfono
  private combinePhoneNumber(
    fieldName: 'phone_number' | 'work_phone_number'
  ): string {
    const numberControl = this.form.get(fieldName);
    const codeControl = this.form.get(
      fieldName === 'phone_number'
        ? 'phone_country_code'
        : 'work_phone_country_code'
    );

    const number = numberControl?.value?.trim() || '';
    const code = codeControl?.value || '+507';

    if (!number) return '';

    return `${code} ${number}`.trim();
  }

  // Formatear teléfono del contacto de emergencia
  formatEmergencyContactPhone() {
    const numberControl = this.form.get('emergency_contact_phone');
    const codeControl = this.form.get('emergency_contact_phone_country_code');

    if (numberControl && codeControl) {
      const number = numberControl.value?.trim() || '';

      // Si el número ya tiene el código, separarlo
      if (number.startsWith('+')) {
        const parsed = this.parsePhoneNumber(number);
        codeControl.setValue(parsed.countryCode);
        numberControl.setValue(parsed.number);
      }
    }
  }

  // Combinar código de país con número de teléfono del contacto de emergencia
  private combineEmergencyContactPhone(): string {
    const numberControl = this.form.get('emergency_contact_phone');
    const codeControl = this.form.get('emergency_contact_phone_country_code');

    const number = numberControl?.value?.trim() || '';
    const code = codeControl?.value || '+507';

    if (!number) return '';

    return `${code} ${number}`.trim();
  }

  saveChanges() {
    const { pristine, invalid } = this.form;
    if (invalid) {
      // Obtener los campos inválidos para mostrar un mensaje más específico
      const invalidFields: string[] = [];
      Object.keys(this.form.controls).forEach((key) => {
        const control = this.form.get(key);
        if (control && control.invalid) {
          const fieldName = this.getFieldLabel(key);
          invalidFields.push(fieldName);
        }
      });

      const errorMessage =
        invalidFields.length > 0
          ? `Por favor complete los siguientes campos requeridos: ${invalidFields.join(
              ', '
            )}`
          : 'Formulario inválido. Por favor complete todos los campos requeridos.';

      this.message.add({
        severity: 'error',
        summary: 'No se guardaron cambios',
        detail: errorMessage,
      });
      markGroupDirty(this.form);
      return;
    }
    if (pristine) {
      this.message.add({
        severity: 'warn',
        summary: 'No se guardaron cambios',
        detail: 'No ha realizado ningun cambio en el formulario',
      });
      return;
    }
    if (!this.employee_id()) {
      // Es un empleado nuevo
      this.addTimeclockQR();

      // Ya no se filtran campos, todo se guarda (tablas compartidas)
      const formValue = this.form.getRawValue();
      const dataToSave: any = {
        ...formValue,
        // Combinar código de país con número de teléfono
        phone_number: this.combinePhoneNumber('phone_number'),
        work_phone_number: this.combinePhoneNumber('work_phone_number'),
        emergency_contact_phone: this.combineEmergencyContactPhone(),
      };
      // Eliminar campos internos de código de país
      delete dataToSave.phone_country_code;
      delete dataToSave.work_phone_country_code;
      delete dataToSave.emergency_contact_phone_country_code;

      // Si no tiene company_id, establecer automáticamente el company_id actual
      if (!dataToSave.company_id) {
        const currentCompanyId = this.organizationService.getCurrentCompanyId();
        if (currentCompanyId) {
          dataToSave.company_id = currentCompanyId;
        }
      }

      // Generar número de empleado automáticamente solo si no se proporcionó uno
      if (
        !dataToSave.employee_number ||
        dataToSave.employee_number.trim() === ''
      ) {
        this.generateEmployeeNumber(dataToSave.company_id)
          .then((employeeNumber) => {
            dataToSave.employee_number = employeeNumber;
            this.saveNewEmployee(dataToSave);
          })
          .catch((error) => {
            console.error('Error al generar número de empleado:', error);
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail:
                'No se pudo generar el número de empleado. Por favor intente nuevamente.',
            });
          });
      } else {
        // Si el usuario ya proporcionó un número, usarlo directamente
        this.saveNewEmployee(dataToSave);
      }
    } else {
      // Ya no se filtran campos, todo se guarda (tablas compartidas)
      const formValue = this.form.getRawValue();
      const dataToSave: any = {
        ...formValue,
        // Combinar código de país con número de teléfono
        phone_number: this.combinePhoneNumber('phone_number'),
        work_phone_number: this.combinePhoneNumber('work_phone_number'),
        emergency_contact_phone: this.combineEmergencyContactPhone(),
      };
      // Eliminar campos internos de código de país
      delete dataToSave.phone_country_code;
      delete dataToSave.work_phone_country_code;
      delete dataToSave.emergency_contact_phone_country_code;

      this.store.employees.editItem(dataToSave).subscribe({
        next: () => {
          // Recargar la lista de empleados
          this.store.employees.reloadItems();
          // Navegar de vuelta a la lista después de editar
          this.router.navigate(['/admin/employees']);
        },
        error: (error) => {
          console.error('Error al editar empleado:', error);
          this.message.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail:
              error?.error?.message ||
              'Ocurrió un error al editar el empleado. Por favor intente nuevamente.',
          });
        },
      });
    }
  }

  private saveNewEmployee(dataToSave: any) {
    this.store.employees.createItem(dataToSave).subscribe({
      next: () => {
        // Recargar la lista de empleados
        this.store.employees.reloadItems();

        // Navegar de vuelta a la lista después de crear
        this.router.navigate(['/admin/employees']);
      },
      error: (error) => {
        console.error('Error al crear empleado:', error);
        this.message.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail:
            error?.error?.message ||
            'Ocurrió un error al crear el empleado. Por favor intente nuevamente.',
        });
      },
    });
  }

  onBackClick(event: Event) {
    event.preventDefault();
    this.cancelChanges(true);
  }

  cancelChanges(list = false) {
    const route = list ? ['../..'] : ['..'];
    if (this.form.pristine) {
      this.router.navigate(route, { relativeTo: this.route });
      return;
    }

    this.confirmationService.confirm({
      message: '¿Desea cancelar los cambios?',
      header: 'Cancelar',
      accept: () => {
        this.router.navigate(route, { relativeTo: this.route });
      },
    });
  }

  private addTimeclockQR() {
    const { first_name, father_name } = this.form.getRawValue();
    const totp = new OTPAuth.TOTP({
      issuer: 'People Blackdog',
      label: `${first_name.trim()} ${father_name.trim()}`,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
    });

    const uri = totp.toString();
    QRCode.toDataURL(uri, async (error, qrCode) => {
      if (error) {
        console.error(error);
        return;
      }
      this.form.patchValue({ qr_code: qrCode, code_uri: uri });
    });
  }

  /**
   * Genera el siguiente número de empleado disponible basado en el company_id o organización
   */
  private async generateEmployeeNumber(
    companyId: string | undefined
  ): Promise<string> {
    try {
      const orgService = this.organizationService;
      const isNaz = orgService.isNaz();

      // Determinar prefijo basado en company_id
      // Si es Black Dog, obtener company_id y determinar prefijo
      let prefix: string;

      if (isNaz) {
        prefix = 'NZ';
      } else {
        const nazCompanyId = orgService.getNazCompanyId();
        const blackdogCompanyId = orgService.getBlackdogCompanyId();
        prefix = getEmployeeNumberPrefix(
          companyId || null,
          nazCompanyId,
          blackdogCompanyId
        );
      }

      // Ya no hay tablas naz_*, todo es por company_id
      const tableName = 'employees';

      // Obtener todos los números de empleado existentes mediante una llamada HTTP directa
      // Solo necesitamos employee_number, no todos los campos
      const params: any = {
        select: 'employee_number',
      };

      // Para Black Dog, agregar filtro por company_id si está disponible
      if (!isNaz && companyId) {
        params.company_id = `eq.${companyId}`;
      }

      const employees = await firstValueFrom(
        this.http.get<Array<{ employee_number: string | null }>>(
          this.apiUrl.build(`rest/v1/${tableName}`),
          { params }
        )
      );

      const existingNumbers = (employees || [])
        .map((emp: { employee_number: string | null }) => emp.employee_number)
        .filter((num: string | null): num is string => !!num);

      // Generar el siguiente número
      return generateNextEmployeeNumber(existingNumbers, prefix);
    } catch (error) {
      console.error('Error generando número de empleado:', error);
      // Fallback: usar prefijo genérico con timestamp
      const timestamp = Date.now().toString().slice(-4);
      const orgService = this.organizationService;
      const prefix = orgService.isNaz() ? 'NZ' : 'BD';
      return `${prefix}${timestamp}`;
    }
  }
}
