import {
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
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
import { Checkbox } from 'primeng/checkbox';
import { Tag } from 'primeng/tag';
import { iif } from 'rxjs';
import { OrganizationService } from '../services/organization.service';
import { markGroupDirty } from '../services/util.service';
import { DeviceAssignmentStore } from '../stores/device-inventory.store';
import { EmployeesStore } from '../stores/employees.store';
import { DeviceInventoryStore } from '../stores/device-inventory.store';
import { AuthStore } from '../stores/auth.store';
import {
  DeviceAssignment,
  DeviceAssignmentStatus,
  Device,
  DEVICE_ASSIGNMENT_STATUS_OPTIONS,
} from '../models';

@Component({
  selector: 'pt-device-assignment-form',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    Button,
    InputText,
    Select,
    DatePicker,
    Textarea,
    Checkbox,
    Tag,
  ],
  template: `
    <form [formGroup]="form" (ngSubmit)="saveChanges()">
      <div class="flex flex-col gap-4">
        @if (selectedDevice(); as device) {
        <div class="p-3 bg-neutral-800/50 rounded-lg border border-neutral-700">
          <div class="flex items-center gap-3">
            <i class="pi pi-desktop text-primary text-xl"></i>
            <div class="flex-1">
              <p class="font-medium text-white m-0">{{ device.name }}</p>
              <p class="text-sm text-gray-400 m-0">
                {{ device.brand }} {{ device.model }}
              </p>
            </div>
            <p-tag
              [value]="getStatusLabel(device.status)"
              [severity]="getStatusSeverity(device.status)"
            />
          </div>
        </div>
        }

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
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

          <div class="input-container">
            <label for="assigned_date">Fecha de Entrega *</label>
            <p-date-picker
              inputId="assigned_date"
              formControlName="assigned_date"
              [showIcon]="true"
              dateFormat="dd/mm/yy"
              appendTo="body"
            />
          </div>
        </div>

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

        <div class="input-container">
          <label for="condition_notes">Condición del Dispositivo</label>
          <textarea
            id="condition_notes"
            pTextarea
            formControlName="condition_notes"
            rows="2"
            placeholder="Describa el estado físico del dispositivo al momento de la entrega..."
          ></textarea>
        </div>

        @if (dialog.data.assignment) {
        <div class="border-t border-neutral-700 pt-4">
          <p class="text-sm font-medium text-gray-300 mb-3">Confirmación del Empleado</p>
          
          <div class="flex items-center gap-3 mb-3">
            <p-checkbox
              inputId="employee_confirmed"
              formControlName="employee_confirmed"
              [binary]="true"
            />
            <label for="employee_confirmed" class="text-sm cursor-pointer">
              El empleado ha confirmado la recepción del dispositivo
            </label>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div class="input-container">
              <label for="employee_confirmed_at">Fecha de Confirmación</label>
              <p-date-picker
                inputId="employee_confirmed_at"
                formControlName="employee_confirmed_at"
                [showIcon]="true"
                dateFormat="dd/mm/yy"
                appendTo="body"
              />
            </div>

            <div class="input-container">
              <label for="status">Estado de la Asignación</label>
              <p-select
                inputId="status"
                formControlName="status"
                [options]="assignmentStatusOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccione el estado"
                appendTo="body"
              />
            </div>
          </div>

          <div class="input-container mt-3">
            <label for="employee_notes">Notas del Empleado</label>
            <textarea
              id="employee_notes"
              pTextarea
              formControlName="employee_notes"
              rows="2"
              placeholder="Observaciones del empleado sobre el dispositivo recibido..."
            ></textarea>
          </div>
        </div>
        }

        <div class="flex gap-4 items-center justify-end pt-4 border-t border-neutral-700">
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
            [loading]="assignmentStore.isLoading()"
            [disabled]="form.invalid || form.pristine"
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
export class DeviceAssignmentFormComponent implements OnInit {
  public dialogRef = inject(DynamicDialogRef);
  public dialog = inject(DynamicDialogConfig);
  public assignmentStore = inject(DeviceAssignmentStore);
  public deviceStore = inject(DeviceInventoryStore);
  private employeesStore = inject(EmployeesStore);
  private messageService = inject(MessageService);
  private destroyRef = inject(DestroyRef);
  private organizationService = inject(OrganizationService);
  private authStore = inject(AuthStore);

  assignmentStatusOptions = DEVICE_ASSIGNMENT_STATUS_OPTIONS;

  activeEmployees = computed(() =>
    this.employeesStore
      .employeesList()
      .filter((emp) => emp.is_active)
      .map((emp) => ({
        ...emp,
        full_name: `${emp.first_name} ${emp.father_name}`,
      }))
  );

  selectedDevice = computed(() => {
    const deviceId = this.dialog.data.deviceId;
    if (!deviceId) return null;
    return (
      this.deviceStore.entities().find((d) => d.id === deviceId) || null
    );
  });

  form = new FormGroup({
    id: new FormControl(v4(), { nonNullable: true }),
    device_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    employee_id: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    assigned_date: new FormControl<Date>(new Date(), {
      nonNullable: true,
      validators: [Validators.required],
    }),
    return_date: new FormControl<Date | null>(null),
    status: new FormControl<DeviceAssignmentStatus>('active', {
      nonNullable: true,
    }),
    employee_confirmed: new FormControl(false, { nonNullable: true }),
    employee_confirmed_at: new FormControl<Date | null>(null),
    employee_signature_url: new FormControl<string | null>(null),
    employee_notes: new FormControl<string | null>(null),
    condition_notes: new FormControl<string | null>(null),
    accessories_included: new FormControl<string | null>(null),
    company_id: new FormControl('', { nonNullable: true }),
  });

  ngOnInit() {
    const deviceId = this.dialog.data.deviceId;
    const assignment: DeviceAssignment | undefined = this.dialog.data.assignment;

    if (assignment) {
      this.form.patchValue({
        id: assignment.id,
        device_id: assignment.device_id,
        employee_id: assignment.employee_id,
        assigned_date: assignment.assigned_date
          ? new Date(assignment.assigned_date)
          : new Date(),
        return_date: assignment.return_date
          ? new Date(assignment.return_date)
          : null,
        status: assignment.status || 'active',
        employee_confirmed: assignment.employee_confirmed || false,
        employee_confirmed_at: assignment.employee_confirmed_at
          ? new Date(assignment.employee_confirmed_at)
          : null,
        employee_signature_url: assignment.employee_signature_url || null,
        employee_notes: assignment.employee_notes || null,
        condition_notes: assignment.condition_notes || null,
        accessories_included: assignment.accessories_included || null,
        company_id: assignment.company_id || '',
      });
    } else if (deviceId) {
      this.form.patchValue({
        device_id: deviceId,
        assigned_date: new Date(),
      });
    }

    // Cargar empleados si no están cargados
    if (this.employeesStore.employeesList().length === 0) {
      this.employeesStore.fetchItems();
    }
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      available: 'Disponible',
      assigned: 'Asignado',
      maintenance: 'Mantenimiento',
      retired: 'Retirado',
    };
    return labels[status] || status;
  }

  getStatusSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast' | undefined {
    const severities: Record<string, 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast'> = {
      available: 'success',
      assigned: 'info',
      maintenance: 'warn',
      retired: 'secondary',
    };
    return severities[status] || 'secondary';
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
    const currentUserId = this.authStore.currentEmployeeId();

    if (!currentCompanyId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo determinar la empresa actual',
      });
      return;
    }

    if (!currentUserId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo determinar el empleado actual. Por favor inicie sesión nuevamente.',
      });
      return;
    }

    const formValue = this.form.getRawValue();
    const dataToSave: DeviceAssignment = {
      ...formValue,
      company_id: currentCompanyId,
      assigned_by: currentUserId,
      return_date: formValue.return_date || undefined,
      employee_confirmed_at: formValue.employee_confirmed_at || undefined,
    };

    iif(
      () => this.dialog.data.assignment,
      this.assignmentStore.editItem(dataToSave),
      this.assignmentStore.createItem(dataToSave)
    )
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.dialogRef.close(true);
        },
        error: (error) => {
          console.error('Error al guardar asignación:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al guardar la asignación del dispositivo',
          });
        },
      });
  }
}
