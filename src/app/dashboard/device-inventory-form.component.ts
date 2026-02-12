import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  effect,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { v4 } from 'uuid';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import { Select } from 'primeng/select';
import { DatePicker } from 'primeng/datepicker';
import { Textarea } from 'primeng/textarea';
import { Tag } from 'primeng/tag';

import { iif, of, switchMap } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { markGroupDirty } from '../services/util.service';
import {
  DeviceInventoryStore,
  DeviceAssignmentStore,
} from '../stores/device-inventory.store';
import { EmployeesStore } from '../stores/employees.store';
import { DashboardStore } from '../stores/dashboard.store';
import { AuthStore } from '../stores/auth.store';
import {
  Device,
  DeviceType,
  DeviceStatus,
  DeviceAssignment,
  DEVICE_TYPE_OPTIONS,
  DEVICE_STATUS_OPTIONS,
} from '../models';

type AssignmentType = 'employee' | 'branch' | null;

@Component({
  selector: 'pt-device-inventory-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Button,
    InputText,
    Select,
    DatePicker,
    Textarea,
    Tag,


  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="saveChanges()">
      <div class="flex flex-col gap-4">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="input-container">
            <label for="name">Nombre del Dispositivo *</label>
            <input
              type="text"
              id="name"
              pInputText
              formControlName="name"
              placeholder="Ej: Laptop Dell XPS 13"
            />
          </div>

          <div class="input-container">
            <label for="device_type">Tipo de Dispositivo *</label>
            <p-select
              inputId="device_type"
              formControlName="device_type"
              [options]="deviceTypeOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccione el tipo"
              appendTo="body"
            >
              <ng-template let-option pTemplate="item">
                <div class="flex items-center gap-2">
                  <i [class]="option.icon"></i>
                  <span>{{ option.label }}</span>
                </div>
              </ng-template>
            </p-select>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="input-container">
            <label for="brand">Marca</label>
            <input
              type="text"
              id="brand"
              pInputText
              formControlName="brand"
              placeholder="Ej: Dell, HP, Apple"
            />
          </div>

          <div class="input-container">
            <label for="model">Modelo</label>
            <input
              type="text"
              id="model"
              pInputText
              formControlName="model"
              placeholder="Ej: XPS 13 9310"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="input-container">
            <label for="serial_number">Número de Serie</label>
            <input
              type="text"
              id="serial_number"
              pInputText
              formControlName="serial_number"
              placeholder="Número de serie del fabricante"
            />
          </div>

          <div class="input-container">
            <label for="status">Estado *</label>
            <p-select
              inputId="status"
              formControlName="status"
              [options]="deviceStatusOptions"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccione el estado"
              appendTo="body"
              (onChange)="onStatusChange($event)"
            >
              <ng-template let-option pTemplate="item">
                <p-tag [value]="option.label" [severity]="option.severity" />
              </ng-template>
            </p-select>
          </div>
        </div>

        <!-- Sección de Asignación (solo cuando estado es 'assigned') -->
        @if (showAssignmentSection()) {
        <div
          class="p-4 bg-blue-900/20 border border-blue-700/50 rounded-lg space-y-4"
        >
          <div class="flex items-center gap-2 mb-3">
            <i class="pi pi-user-plus text-blue-400"></i>
            <h3 class="text-blue-300 font-medium m-0">
              Información de Asignación
            </h3>
          </div>

          <!-- Tipo de asignación -->
          <div class="input-container">
            <label>Asignar a *</label>
            <div class="flex gap-4 mt-2">
              <button
                type="button"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                [class.bg-blue-600]="assignmentType() === 'employee'"
                [class.text-white]="assignmentType() === 'employee'"
                [class.bg-neutral-700]="assignmentType() !== 'employee'"
                [class.text-gray-300]="assignmentType() !== 'employee'"
                (click)="onAssignmentTypeChange('employee')"
              >
                <i class="pi pi-user"></i>
                <span>Empleado</span>
              </button>
              <button
                type="button"
                class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors"
                [class.bg-blue-600]="assignmentType() === 'branch'"
                [class.text-white]="assignmentType() === 'branch'"
                [class.bg-neutral-700]="assignmentType() !== 'branch'"
                [class.text-gray-300]="assignmentType() !== 'branch'"
                (click)="onAssignmentTypeChange('branch')"
              >
                <i class="pi pi-shop"></i>
                <span>Sucursal</span>
              </button>
            </div>
          </div>

          <!-- Seleccionar Empleado -->
          @if (assignmentType() === 'employee') {
          <div class="input-container">
            <label for="employee_id">Empleado *</label>
            <p-select
              inputId="employee_id"
              formControlName="employee_id"
              [options]="activeEmployees()"
              optionLabel="full_name"
              optionValue="id"
              placeholder="Seleccione un empleado"
              appendTo="body"
              [filter]="true"
              filterBy="full_name"
              styleClass="w-full"
            >
              <ng-template let-employee pTemplate="item">
                <div class="flex flex-col">
                  <span class="font-medium"
                    >{{ employee.first_name }} {{ employee.father_name }}</span
                  >
                  <span class="text-xs text-gray-400"
                    >{{ employee.position?.name }} -
                    {{ employee.branch?.name }}</span
                  >
                </div>
              </ng-template>
            </p-select>
          </div>
          }

          <!-- Seleccionar Sucursal -->
          @if (assignmentType() === 'branch') {
          <div class="input-container">
            <label for="branch_id">Sucursal *</label>
            <p-select
              inputId="branch_id"
              formControlName="branch_id"
              [options]="branches()"
              optionLabel="name"
              optionValue="id"
              placeholder="Seleccione una sucursal"
              appendTo="body"
              styleClass="w-full"
            />
          </div>
          }

          <!-- Fecha de asignación -->
          <div class="input-container">
            <label for="assignment_date">Fecha de Asignación *</label>
            <p-date-picker
              inputId="assignment_date"
              formControlName="assignment_date"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              appendTo="body"
            />
          </div>

          <!-- Accesorios -->
          <div class="input-container">
            <label for="accessories_included">Accesorios Incluidos</label>
            <input
              type="text"
              id="accessories_included"
              pInputText
              formControlName="accessories_included"
              placeholder="Ej: Cargador, mouse, funda..."
            />
          </div>

          <!-- Condición -->
          <div class="input-container">
            <label for="condition_notes">Condición del Dispositivo</label>
            <textarea
              id="condition_notes"
              pTextarea
              formControlName="condition_notes"
              rows="2"
              placeholder="Describa el estado físico al momento de la entrega..."
            ></textarea>
          </div>
        </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="input-container">
            <label for="purchase_date">Fecha de Compra</label>
            <p-date-picker
              inputId="purchase_date"
              formControlName="purchase_date"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              appendTo="body"
            />
          </div>

          <div class="input-container">
            <label for="warranty_expiry">Vencimiento de Garantía</label>
            <p-date-picker
              inputId="warranty_expiry"
              formControlName="warranty_expiry"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              appendTo="body"
            />
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="input-container">
            <label for="cost">Costo (USD)</label>
            <input
              type="number"
              id="cost"
              pInputText
              formControlName="cost"
              placeholder="0.00"
              min="0"
              step="0.01"
            />
          </div>

          <div class="input-container">
            <label for="last_maintenance_date">Último Mantenimiento</label>
            <p-date-picker
              inputId="last_maintenance_date"
              formControlName="last_maintenance_date"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              appendTo="body"
            />
          </div>
        </div>

        <div class="input-container">
          <label for="device_branch_id">Sucursal (ubicación del dispositivo)</label>
          <p-select
            inputId="device_branch_id"
            formControlName="device_branch_id"
            [options]="branches()"
            optionLabel="name"
            optionValue="id"
            placeholder="Seleccione una sucursal"
            appendTo="body"
            [showClear]="true"
            styleClass="w-full"
          />
        </div>

        <div class="input-container">
          <label for="notes">Notas</label>
          <textarea
            id="notes"
            pTextarea
            formControlName="notes"
            rows="3"
            placeholder="Notas adicionales sobre el dispositivo..."
          ></textarea>
        </div>

        <div
          class="flex gap-4 items-center justify-end pt-4 border-t border-neutral-700"
        >
          <p-button
            label="Cancelar"
            severity="secondary"
            outlined
            rounded
            icon="pi pi-times"
            (click)="dialogRef.close()"
          />
          <p-button
            label="Guardar cambios"
            type="submit"
            rounded
            icon="pi pi-save"
            [loading]="store.isLoading() || assignmentStore.isLoading()"
            [disabled]="form.invalid"
          />
        </div>
      </div>
    </form>
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
      color: #9ca3af;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeviceInventoryFormComponent implements OnInit {
  public dialogRef = inject(DynamicDialogRef);
  private dialog = inject(DynamicDialogConfig);
  public store = inject(DeviceInventoryStore);
  public assignmentStore = inject(DeviceAssignmentStore);
  private employeesStore = inject(EmployeesStore);
  private dashboardStore = inject(DashboardStore);
  private authStore = inject(AuthStore);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  public organizationService = inject(OrganizationService);

  deviceTypeOptions = DEVICE_TYPE_OPTIONS;
  deviceStatusOptions = DEVICE_STATUS_OPTIONS;

  // Signals para controlar la asignación
  assignmentType = signal<AssignmentType>(null);
  showAssignmentSection = signal(false);

  // Datos para los selects
  activeEmployees = computed(() =>
    this.employeesStore
      .employeesList()
      .filter((emp) => emp.is_active)
      .map((emp) => ({
        ...emp,
        full_name: `${emp.first_name} ${emp.father_name}`,
      }))
  );

  branches = computed(() => this.dashboardStore.branches.entities());

  form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    name: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    device_type: new FormControl<DeviceType>('laptop', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    brand: new FormControl<string | null>(null),
    model: new FormControl<string | null>(null),
    serial_number: new FormControl<string | null>(null),
    status: new FormControl<DeviceStatus>('available', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    purchase_date: new FormControl<Date | null>(null),
    warranty_expiry: new FormControl<Date | null>(null),
    notes: new FormControl<string | null>(null),
    cost: new FormControl<number | null>(null),
    last_maintenance_date: new FormControl<Date | null>(null),
    device_branch_id: new FormControl<string | null>(null),
    company_id: new FormControl('', { nonNullable: true }),

    // Campos de asignación (solo cuando status = 'assigned')
    employee_id: new FormControl<string | null>(null),
    branch_id: new FormControl<string | null>(null),
    assignment_date: new FormControl<Date>(new Date(), { nonNullable: true }),
    accessories_included: new FormControl<string | null>(null),
    condition_notes: new FormControl<string | null>(null),
  });

  constructor() {
    // Efecto para mostrar/ocultar sección de asignación
    effect(() => {
      const status = this.form.get('status')?.value;
      if (status === 'assigned') {
        this.showAssignmentSection.set(true);
        // Si no hay tipo seleccionado, default a empleado
        if (!this.assignmentType()) {
          this.assignmentType.set('employee');
          this.updateAssignmentValidators('employee');
        }
      } else {
        this.showAssignmentSection.set(false);
        this.assignmentType.set(null);
        this.clearAssignmentFields();
      }
    });
  }

  ngOnInit() {
    // Cargar datos necesarios
    this.employeesStore.fetchItems();
    this.dashboardStore.branches.fetchItems();

    const { device } = this.dialog.data;
    if (device) {
      this.form.patchValue({
        id: device.id,
        name: device.name || '',
        device_type: device.device_type || 'laptop',
        brand: device.brand || null,
        model: device.model || null,
        serial_number: device.serial_number || null,
        status: device.status || 'available',
        purchase_date: device.purchase_date
          ? new Date(device.purchase_date)
          : null,
        warranty_expiry: device.warranty_expiry
          ? new Date(device.warranty_expiry)
          : null,
        notes: device.notes || null,
        cost: device.cost ?? null,
        last_maintenance_date: device.last_maintenance_date
          ? new Date(device.last_maintenance_date)
          : null,
        device_branch_id: device.branch_id || null,
        company_id: device.company_id || '',
      });

      // Si el dispositivo ya está asignado, cargar datos de asignación
      if (device.status === 'assigned') {
        this.loadExistingAssignment(device.id);
      }
    } else {
      // Si es un nuevo dispositivo
      const currentCompanyId = this.organizationService.getCurrentCompanyId();
      if (currentCompanyId) {
        this.form.patchValue({
          company_id: currentCompanyId,
        });
      }
    }
  }

  loadExistingAssignment(deviceId: string) {
    // Buscar asignación activa para este dispositivo
    const assignments = this.assignmentStore.entities();
    const activeAssignment = assignments.find(
      (a) => a.device_id === deviceId && a.status === 'active'
    );

    if (activeAssignment) {
      // Determinar si es asignación a empleado o sucursal
      if (activeAssignment.employee_id) {
        this.assignmentType.set('employee');
        this.form.patchValue({
          employee_id: activeAssignment.employee_id,
          assignment_date: new Date(activeAssignment.assigned_date),
          accessories_included: activeAssignment.accessories_included || null,
          condition_notes: activeAssignment.condition_notes || null,
        });
      }
      this.updateAssignmentValidators('employee');
    }
  }

  onStatusChange(event: any) {
    const status = event?.value;
    if (status === 'assigned') {
      this.showAssignmentSection.set(true);
      if (!this.assignmentType()) {
        this.assignmentType.set('employee');
        this.updateAssignmentValidators('employee');
      }
    } else {
      this.showAssignmentSection.set(false);
      this.assignmentType.set(null);
      this.clearAssignmentFields();
    }
  }

  onAssignmentTypeChange(type: AssignmentType) {
    this.assignmentType.set(type);
    this.updateAssignmentValidators(type);

    // Limpiar el campo que no se usa
    if (type === 'employee') {
      this.form.get('branch_id')?.setValue(null);
    } else if (type === 'branch') {
      this.form.get('employee_id')?.setValue(null);
    }
  }

  updateAssignmentValidators(type: AssignmentType) {
    const employeeControl = this.form.get('employee_id');
    const branchControl = this.form.get('branch_id');

    if (type === 'employee') {
      employeeControl?.setValidators([Validators.required]);
      branchControl?.clearValidators();
    } else if (type === 'branch') {
      branchControl?.setValidators([Validators.required]);
      employeeControl?.clearValidators();
    } else {
      employeeControl?.clearValidators();
      branchControl?.clearValidators();
    }

    employeeControl?.updateValueAndValidity();
    branchControl?.updateValueAndValidity();
  }

  clearAssignmentFields() {
    this.form.patchValue({
      employee_id: null,
      branch_id: null,
      assignment_date: new Date(),
      accessories_included: null,
      condition_notes: null,
    });
    this.form.get('employee_id')?.clearValidators();
    this.form.get('branch_id')?.clearValidators();
    this.form.get('employee_id')?.updateValueAndValidity();
    this.form.get('branch_id')?.updateValueAndValidity();
  }

  async saveChanges() {
    if (this.form.invalid) {
      markGroupDirty(this.form);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Por favor complete todos los campos requeridos',
      });
      return;
    }

    const currentCompanyId = this.organizationService.getCurrentCompanyId();
    if (!currentCompanyId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo determinar la empresa actual',
      });
      return;
    }

    const currentUserId = this.authStore.currentEmployeeId();
    if (!currentUserId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo determinar el usuario actual',
      });
      return;
    }

    const formValue = this.form.getRawValue();
    const isAssigned = formValue.status === 'assigned';

    // Preparar datos del dispositivo
    const deviceData: Device = {
      id: formValue.id,
      company_id: currentCompanyId,
      name: formValue.name,
      device_type: formValue.device_type,
      brand: formValue.brand,
      model: formValue.model,
      serial_number: formValue.serial_number,
      status: formValue.status,
      purchase_date: formValue.purchase_date || undefined,
      warranty_expiry: formValue.warranty_expiry || undefined,
      notes: formValue.notes,
      cost: formValue.cost ?? null,
      last_maintenance_date: formValue.last_maintenance_date || undefined,
      branch_id: formValue.device_branch_id || null,
    };

    // Guardar el dispositivo
    const saveDevice$ = this.dialog.data.device
      ? this.store.editItem(deviceData)
      : this.store.createItem(deviceData);

    saveDevice$
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        switchMap((result: any) => {
          const deviceId = result?.[0]?.id || formValue.id;

          // Si el estado es 'assigned', crear/actualizar la asignación
          if (isAssigned && this.assignmentType()) {
            const assignmentData: DeviceAssignment = {
              id: v4(),
              company_id: currentCompanyId,
              device_id: deviceId,
              employee_id:
                this.assignmentType() === 'employee'
                  ? formValue.employee_id!
                  : currentUserId, // Si es sucursal, asignamos al usuario actual como responsable
              assigned_by: currentUserId,
              assigned_date: formValue.assignment_date,
              status: 'active',
              employee_confirmed: false,
              accessories_included: formValue.accessories_included,
              condition_notes: formValue.condition_notes,
            };

            return this.assignmentStore.createItem(assignmentData);
          }

          return of(result);
        })
      )
      .subscribe({
        next: () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: isAssigned
              ? 'Dispositivo guardado y asignado correctamente'
              : 'Dispositivo guardado correctamente',
          });
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error al guardar:', error);
          let errorMessage = 'Error al guardar el dispositivo';

          if (error?.error?.code === '23505') {
            errorMessage = 'Ya existe un dispositivo con ese número de serie';
          } else if (error?.error?.message) {
            errorMessage = error.error.message;
          }

          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: errorMessage,
          });
        },
      });
  }
}
