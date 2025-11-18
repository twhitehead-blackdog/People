import { httpResource } from '@angular/common/http';
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
import { debounceTime } from 'rxjs';
import { markGroupDirty } from 'src/app/services/util.service';
import { v4 } from 'uuid';
import { Bank, Employee, UniformSize } from '../models';
import { DashboardStore } from '../stores/dashboard.store';
import { WassengerService } from '../services/wassenger.service';

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
    <div class="flex items-center justify-between">
      <div class="flex flex-col items-center gap-2">
        <h1>Datos del empleado</h1>
        <p-button
          text
          label="Volver al listado"
          icon="pi pi-arrow-left"
          (onClick)="cancelChanges(true)"
        />
      </div>
      <div class="flex col-span-4 justify-end gap-2">
        <p-button
          label="Cancelar"
          severity="secondary"
          outlined
          rounded
          icon="pi pi-refresh"
          (click)="cancelChanges()"
        />
        <p-button
          form="employee-form"
          label="Guardar cambios"
          (click)="saveChanges()"
          icon="pi pi-save"
          rounded
          [loading]="store.employees.isLoading()"
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
      <p-tabs value="0">
        <p-tablist>
          <p-tab value="0">
            <i class="pi pi-user mr-2"></i>
            Información Personal
          </p-tab>
          <p-tab value="1">
            <i class="pi pi-phone mr-2"></i>
            Contacto
          </p-tab>
          <p-tab value="2">
            <i class="pi pi-money-bill mr-2"></i>
            Información Bancaria
          </p-tab>
          <p-tab value="3">
            <i class="pi pi-briefcase mr-2"></i>
            Datos Laborales
          </p-tab>
        </p-tablist>
        <p-tabpanels>
          <p-tabpanel value="0">
            <div class="space-y-6">
              <!-- Información Básica -->
              <div class="border-b border-neutral-700 pb-4">
                <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <i class="pi pi-check-circle text-amber-400"></i>
                  Estado
                </h3>
                <div class="flex gap-2 items-center">
                  <p-checkbox
                    formControlName="is_active"
                    [binary]="true"
                    inputId="is_active"
                  />
                  <label for="is_active" class="text-gray-300">Empleado Activo</label>
                </div>
              </div>
            </div>
          </p-tabpanel>
          
          <p-tabpanel value="1">
            <div class="space-y-6">
              <!-- Información de Contacto -->
              <div class="border-b border-neutral-700 pb-4">
                <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <i class="pi pi-phone text-amber-400"></i>
                  Teléfono
                </h3>
                <div class="flex flex-col md:grid grid-cols-2 md:gap-4">
                  <div class="input-container">
                    <label for="phone_number">Número de Teléfono</label>
                    <input
                      type="text"
                      id="phone_number"
                      pInputText
                      formControlName="phone_number"
                      placeholder="+507 1234-5678"
                    />
                  </div>
                </div>
              </div>

              <!-- Dirección -->
              <div>
                <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
              <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
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
                  />
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
              <h3 class="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <i class="pi pi-building text-amber-400"></i>
                Información Laboral
              </h3>
              <div class="flex flex-col md:grid grid-cols-4 md:gap-4">
              <div class="input-container">
                <label for="company">Empresa</label>
                <p-select
                  [options]="store.companies.entities()"
                  optionLabel="name"
                  optionValue="id"
                  inputId="company"
                  formControlName="company_id"
                  placeholder="Seleccione una empresa"
                  appendTo="body"
                />
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
                />
              </div>
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
    
    ::ng-deep .p-tabs .p-tablist {
      background: #18181b !important;
      border-bottom: 1px solid rgba(251, 191, 36, 0.2) !important;
    }
    
    ::ng-deep .p-tabs .p-tab {
      color: #9ca3af !important;
      padding: 0.75rem 1rem !important;
    }
    
    ::ng-deep .p-tabs .p-tab:hover {
      color: #fbbf24 !important;
    }
    
    ::ng-deep .p-tabs .p-tab.p-highlight {
      color: #fbbf24 !important;
      border-bottom: 2px solid #fbbf24 !important;
    }
    
    ::ng-deep .p-tabpanel {
      padding: 1.5rem 0 !important;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeFormComponent implements OnInit {
  public store = inject(DashboardStore);
  public sizes = ['XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL'];
  public genderOptions = [
    { label: 'Masculino', value: 'M' },
    { label: 'Femenino', value: 'F' }
  ];
  public accountTypes = ['Ahorros', 'Corriente'];

  public banks = httpResource<Bank[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/banks`,
    method: 'GET',
    params: {
      select: 'id,name',
    },
  }));
  public employee_id = input<string>();
  private injector = inject(Injector);
  private message = inject(MessageService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
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
    address: new FormControl('', { nonNullable: true }),
    birth_date: new FormControl<Date | undefined>(undefined, {
      nonNullable: true,
    }),
    start_date: new FormControl<Date>(new Date(), {
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
      validators: [Validators.required],
    }),
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
      validators: [Validators.min(40), Validators.max(60)],
    }),
    use_timelog: new FormControl(false, { nonNullable: true }),
  });

  private confirmationService = inject(ConfirmationService);
  private wassengerService = inject(WassengerService);
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
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
      method: 'GET',
      params: {
        select:
          'id,first_name,father_name, middle_name, mother_name, document_id, email, phone_number, address, birth_date, start_date, branch_id, department_id, position_id, gender, uniform_size, is_active, company_id, work_email, monthly_salary, hourly_salary, qr_code, code_uri, bank, account_number, bank_account_type, week_hours, use_timelog',
        limit: '1',
        order: 'father_name',
        is_active: 'eq.true',
        id: `eq.${this.employee_id()}`,
      },
    };
  });

  ngOnInit() {
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
    effect(
      () => {
        this.form.get('hourly_salary')?.patchValue(this.hourlySalary());
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
    this.form.markAsPristine();
    this.form.markAsUntouched();
  }

  saveChanges() {
    const { pristine, invalid } = this.form;
    if (invalid) {
      this.message.add({
        severity: 'error',
        summary: 'No se guardaron cambios',
        detail: 'Formulario invalido',
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
      this.store.employees.createItem(this.form.getRawValue()).subscribe({
        next: () => {
          // Después de crear, preguntar si quiere invitar por Wassenger
          const formValue = this.form.getRawValue();
          if (formValue.phone_number && formValue.work_email) {
            this.confirmationService.confirm({
              message: `¿Deseas enviar una invitación por Wassenger a ${formValue.first_name} ${formValue.father_name}?`,
              header: 'Invitación por Wassenger',
              icon: 'pi pi-comments',
              acceptLabel: 'Sí, enviar',
              rejectLabel: 'No, después',
              accept: () => {
                const employeeName = `${formValue.first_name} ${formValue.father_name}`;
                this.wassengerService
                  .sendEmployeeInvitation(
                    employeeName,
                    formValue.phone_number,
                    formValue.work_email
                  )
                  .then((success) => {
                    if (success) {
                      this.message.add({
                        severity: 'success',
                        summary: 'Invitación enviada',
                        detail: 'La invitación se envió correctamente por Wassenger',
                      });
                    }
                  });
              },
            });
          }
        },
      });
    } else {
      this.store.employees.editItem(this.form.getRawValue()).subscribe();
    }
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
      issuer: 'Peopletrak Blackdog',
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
}
