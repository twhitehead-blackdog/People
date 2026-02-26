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
import { ActivatedRoute, Router } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { Skeleton } from 'primeng/skeleton';
import { TabsModule } from 'primeng/tabs';
import { debounceTime, firstValueFrom } from 'rxjs';
import { markGroupDirty } from 'src/app/services/util.service';
import { v4 } from 'uuid';
import { Bank, Employee, UniformSize } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { WassengerService } from '../services/wassenger.service';
import { DashboardStore } from '../stores/dashboard.store';
import {
  generateNextEmployeeNumber,
  getEmployeeNumberPrefix,
} from '../utils/employee-number.utils';
import {
  ACCOUNT_TYPES,
  COUNTRY_CODES,
  EMERGENCY_CONTACT_RELATIONSHIPS,
  EMPLOYEE_SELECT_QUERY,
  GENDER_OPTIONS,
  UNIFORM_SIZES,
} from './employee-form/employee-form.constants';
import {
  buildSavePayload,
  formatPhoneField,
  generateTimeclockQR,
  getInvalidFieldLabels,
  preloadEmployeeForm,
  setBankIfExists,
} from './employee-form/employee-form.utils';

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
  public sizes = UNIFORM_SIZES;
  public genderOptions = GENDER_OPTIONS;
  public accountTypes = ACCOUNT_TYPES;
  public countryCodes = COUNTRY_CODES;
  public emergencyContactRelationships = EMERGENCY_CONTACT_RELATIONSHIPS;

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
  private wassengerService = inject(WassengerService);
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

    const params: any = {
      select: EMPLOYEE_SELECT_QUERY,
      limit: '1',
      order: 'father_name',
      is_active: 'eq.true',
      id: `eq.${this.employee_id()}`,
    };

    if (companyId) {
      params.company_id = `eq.${companyId}`;
    }

    return {
      url: this.apiUrl.build('rest/v1/employees'),
      method: 'GET',
      params,
    };
  });

  ngOnInit() {
    this.store.positions.fetchItems();
    this.store.departments.fetchItems();
    this.store.companies.fetchItems();
    this.store.branches.fetchItems();

    // Adjust validators based on Naz vs BlackDog
    effect(
      () => {
        const isNaz = this.organizationService.isNaz();
        const companyControl = this.form.get('company_id');
        if (companyControl) {
          isNaz
            ? companyControl.clearValidators()
            : companyControl.setValidators([Validators.required]);
          companyControl.updateValueAndValidity({ emitEvent: false });
        }

        const weekHoursControl = this.form.get('week_hours');
        if (weekHoursControl) {
          if (isNaz) {
            weekHoursControl.clearValidators();
            weekHoursControl.setValue(0, { emitEvent: false });
          } else {
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

    // Preload form when employee data arrives
    effect(
      () => {
        const employee = this.currentEmployee.value()?.[0];
        if (!employee) return;
        untracked(() => preloadEmployeeForm(this.form, employee));
      },
      { injector: this.injector }
    );

    // Set bank when banks load
    effect(
      () => {
        const employee = this.currentEmployee.value()?.[0];
        setBankIfExists(this.form, employee?.bank, this.banks.value());
      },
      { injector: this.injector }
    );

    // Auto-compute hourly salary
    effect(
      () => {
        this.form.get('hourly_salary')?.patchValue(this.hourlySalary());
      },
      { injector: this.injector }
    );

    // Set default company_id for non-admin users
    effect(
      () => {
        const isAdmin = this.store.isAdmin();
        const currentCompanyId = this.organizationService.getCurrentCompanyId();
        const companyControl = this.form.get('company_id');
        const currentValue = companyControl?.value;

        if (!isAdmin && currentCompanyId && !currentValue) {
          companyControl?.setValue(currentCompanyId, { emitEvent: false });
        }

        const available = this.availableCompanies();
        if (!isAdmin && available.length === 1 && !currentValue) {
          companyControl?.setValue(available[0].id, { emitEvent: false });
        }
      },
      { injector: this.injector }
    );
  }

  getBankName(bankId: string | null | undefined): string {
    if (!bankId) return '';
    const banksList = this.banks.value();
    if (!banksList) return bankId;
    const bank = banksList.find((b) => b.id === bankId);
    return bank?.name || bankId;
  }

  formatPhoneNumber(fieldName: 'phone_number' | 'work_phone_number') {
    const codeField =
      fieldName === 'phone_number'
        ? 'phone_country_code'
        : 'work_phone_country_code';
    formatPhoneField(this.form, fieldName, codeField);
  }

  formatEmergencyContactPhone() {
    formatPhoneField(
      this.form,
      'emergency_contact_phone',
      'emergency_contact_phone_country_code'
    );
  }

  saveChanges() {
    if (this.form.invalid) {
      const invalidFields = getInvalidFieldLabels(this.form);
      const errorMessage =
        invalidFields.length > 0
          ? `Por favor complete los siguientes campos requeridos: ${invalidFields.join(', ')}`
          : 'Formulario invalido. Por favor complete todos los campos requeridos.';

      this.message.add({
        severity: 'error',
        summary: 'No se guardaron cambios',
        detail: errorMessage,
      });
      markGroupDirty(this.form);
      return;
    }
    if (this.form.pristine) {
      this.message.add({
        severity: 'warn',
        summary: 'No se guardaron cambios',
        detail: 'No ha realizado ningun cambio en el formulario',
      });
      return;
    }

    const { data: dataToSave, phoneNumber } = buildSavePayload(this.form);

    if (!this.employee_id()) {
      // New employee
      const { first_name, father_name } = this.form.getRawValue();
      generateTimeclockQR(this.form, first_name, father_name);

      if (!dataToSave['company_id']) {
        const currentCompanyId = this.organizationService.getCurrentCompanyId();
        if (currentCompanyId) {
          dataToSave['company_id'] = currentCompanyId;
        }
      }

      if (
        !dataToSave['employee_number'] ||
        dataToSave['employee_number'].trim() === ''
      ) {
        this.generateEmployeeNumber(dataToSave['company_id'])
          .then((employeeNumber) => {
            dataToSave['employee_number'] = employeeNumber;
            this.saveNewEmployee(dataToSave, phoneNumber);
          })
          .catch((error) => {
            console.error('Error al generar numero de empleado:', error);
            this.message.add({
              severity: 'error',
              summary: 'Error',
              detail:
                'No se pudo generar el numero de empleado. Por favor intente nuevamente.',
            });
          });
      } else {
        this.saveNewEmployee(dataToSave, phoneNumber);
      }
    } else {
      // Existing employee
      this.store.employees.editItem(dataToSave as Employee).subscribe({
        next: () => {
          this.store.employees.reloadItems();
          this.router.navigate(['/admin/employees']);
        },
        error: (error) => {
          console.error('Error al editar empleado:', error);
          this.message.add({
            severity: 'error',
            summary: 'Error al guardar',
            detail:
              error?.error?.message ||
              'Ocurrio un error al editar el empleado. Por favor intente nuevamente.',
          });
        },
      });
    }
  }

  private saveNewEmployee(dataToSave: any, phoneNumber: string) {
    this.store.employees.createItem(dataToSave).subscribe({
      next: () => {
        this.store.employees.reloadItems();

        if (phoneNumber && dataToSave.work_email) {
          this.confirmationService.confirm({
            message: `Deseas enviar una invitacion por Wassenger a ${dataToSave.first_name} ${dataToSave.father_name}?`,
            header: 'Invitacion por Wassenger',
            icon: 'pi pi-comments',
            acceptLabel: 'Si, enviar',
            rejectLabel: 'No, despues',
            accept: () => {
              const employeeName = `${dataToSave.first_name} ${dataToSave.father_name}`;
              this.wassengerService
                .sendEmployeeInvitation(
                  employeeName,
                  phoneNumber,
                  dataToSave.work_email
                )
                .then((success: boolean) => {
                  if (success) {
                    this.message.add({
                      severity: 'success',
                      summary: 'Invitacion enviada',
                      detail:
                        'La invitacion se envio correctamente por Wassenger',
                    });
                  }
                });
            },
            reject: () => {
              this.router.navigate(['/admin/employees']);
            },
          });
        } else {
          this.router.navigate(['/admin/employees']);
        }
      },
      error: (error) => {
        console.error('Error al crear empleado:', error);
        this.message.add({
          severity: 'error',
          summary: 'Error al guardar',
          detail:
            error?.error?.message ||
            'Ocurrio un error al crear el empleado. Por favor intente nuevamente.',
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
