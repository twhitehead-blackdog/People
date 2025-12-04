import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputText } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { firstValueFrom } from 'rxjs';

interface JobApplicationStatus {
  id: string;
  code: string;
  label: string;
  severity: 'success' | 'info' | 'warn' | 'danger' | 'secondary' | 'contrast';
  display_order: number;
  is_default: boolean;
  is_active: boolean;
}

@Component({
  selector: 'pt-job-application-statuses-dialog',
  imports: [
    ReactiveFormsModule,
    Button,
    InputText,
    Select,
    TableModule,
    Tag,
    ToastModule,
    ConfirmDialogModule,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />
    <div class="flex flex-col gap-4">
      <!-- Formulario para agregar/editar estado -->
      <div class="p-4 bg-neutral-800/50 rounded-lg border border-neutral-700">
        <h3 class="text-lg font-semibold text-white mb-4">
          {{ editingStatus() ? 'Editar Estado' : 'Nuevo Estado' }}
        </h3>
        <form [formGroup]="statusForm" (ngSubmit)="saveStatus()">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Estado <span class="text-red-400">*</span>
              </label>
              <input
                pInputText
                formControlName="label"
                placeholder="ej: Pendiente, Revisada, En Proceso"
                class="w-full"
                (input)="onLabelChange($event)"
              />
              <small class="text-gray-400 text-xs mt-1">
                El código se generará automáticamente
              </small>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-2">
                Color <span class="text-red-400">*</span>
              </label>
              <p-select
                formControlName="severity"
                [options]="severityOptions"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar color"
                appendTo="body"
                class="w-full"
              />
            </div>
          </div>
          <div class="flex gap-2 justify-end mt-4">
            @if (editingStatus()) {
            <p-button
              label="Cancelar"
              severity="secondary"
              (onClick)="cancelEdit()"
              [outlined]="true"
            />
            }
            <p-button
              type="submit"
              label="{{ editingStatus() ? 'Actualizar' : 'Agregar' }}"
              icon="pi pi-save"
              [disabled]="statusForm.invalid"
            />
          </div>
        </form>
      </div>

      <!-- Tabla de estados -->
      <div>
        <h3 class="text-lg font-semibold text-white mb-4">
          Estados Existentes
        </h3>
        <p-table
          [value]="statuses()"
          [loading]="isLoading()"
          [paginator]="false"
        >
          <ng-template #header>
            <tr>
              <th class="text-center">Código</th>
              <th class="text-center">Etiqueta</th>
              <th class="text-center">Color</th>
              <th class="text-center">Orden</th>
              <th class="text-center">Por Defecto</th>
              <th class="text-center">Acciones</th>
            </tr>
          </ng-template>
          <ng-template #body let-status>
            <tr>
              <td class="font-mono text-sm text-center">{{ status.code }}</td>
              <td class="font-medium text-center">{{ status.label }}</td>
              <td class="text-center">
                <p-tag [value]="status.label" [severity]="status.severity" />
              </td>
              <td class="text-center">{{ status.display_order }}</td>
              <td class="text-center">
                @if (status.is_default) {
                <i class="pi pi-check-circle text-green-400"></i>
                } @else {
                <span class="text-gray-500">-</span>
                }
              </td>
              <td class="text-center">
                <div class="flex gap-2 justify-center">
                  <p-button
                    icon="pi pi-pencil"
                    severity="success"
                    text
                    rounded
                    (onClick)="editStatus(status)"
                    pTooltip="Editar"
                  />
                  @if (!status.is_default) {
                  <p-button
                    icon="pi pi-trash"
                    severity="danger"
                    text
                    rounded
                    (onClick)="deleteStatus(status)"
                    pTooltip="Eliminar"
                  />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td [attr.colspan]="6" class="text-center py-8">
                <p class="text-gray-400">No hay estados configurados</p>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>
  `,
  styles: `
    ::ng-deep .p-datatable {
      .p-datatable-thead > tr > th {
        text-align: center;
        vertical-align: middle;
      }
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobApplicationStatusesDialogComponent {
  private fb = inject(FormBuilder);
  private http = inject(HttpClient);
  private dialogRef = inject(DynamicDialogRef);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  public editingStatus = signal<JobApplicationStatus | null>(null);
  public isLoading = signal(false);

  public severityOptions = [
    { label: 'Éxito (Verde)', value: 'success' },
    { label: 'Info (Azul)', value: 'info' },
    { label: 'Advertencia (Amarillo)', value: 'warn' },
    { label: 'Peligro (Rojo)', value: 'danger' },
    { label: 'Secundario (Gris)', value: 'secondary' },
    { label: 'Contraste', value: 'contrast' },
  ];

  // API para cargar estados (todos, no solo activos)
  private statusesApi = httpResource<JobApplicationStatus[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_application_statuses`,
    method: 'GET',
    params: {
      select: '*',
      order: 'display_order.asc',
    },
  }));

  public statuses = computed(() => this.statusesApi.value() || []);

  public statusForm: FormGroup = this.fb.group({
    code: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/)]],
    label: ['', [Validators.required]],
    severity: ['secondary', [Validators.required]],
    display_order: [0, [Validators.required]],
  });

  constructor() {
    // Cargar estados al inicializar
    this.statusesApi.reload();

    // Efecto para asegurar que los estados se carguen cuando el componente se inicializa
    effect(() => {
      // Forzar recarga si no hay estados cargados
      if (!this.statusesApi.value() || this.statusesApi.value()?.length === 0) {
        this.statusesApi.reload();
      }
    });
  }

  // Generar código automáticamente desde el label
  onLabelChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const label = input.value;
    if (label && !this.editingStatus()) {
      // Generar código: convertir a minúsculas, remover acentos, reemplazar espacios con guiones bajos
      const code = label
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remover acentos
        .replace(/[^a-z0-9\s]/g, '') // Remover caracteres especiales
        .replace(/\s+/g, '_') // Reemplazar espacios con guiones bajos
        .replace(/_+/g, '_') // Reemplazar múltiples guiones bajos con uno solo
        .replace(/^_+|_+$/g, ''); // Remover guiones bajos al inicio y final

      this.statusForm.patchValue({ code }, { emitEvent: false });
    }
  }

  editStatus(status: JobApplicationStatus) {
    this.editingStatus.set(status);
    this.statusForm.patchValue({
      code: status.code,
      label: status.label,
      severity: status.severity,
      display_order: status.display_order,
    });
  }

  cancelEdit() {
    this.editingStatus.set(null);
    this.statusForm.reset({
      code: '',
      label: '',
      severity: 'secondary',
      display_order: 0,
    });
  }

  async saveStatus() {
    if (this.statusForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Formulario inválido',
        detail: 'Por favor completa todos los campos requeridos',
      });
      return;
    }

    this.isLoading.set(true);
    try {
      const formValue = this.statusForm.value;
      const editing = this.editingStatus();

      // Calcular el siguiente orden automáticamente si es nuevo estado
      let displayOrder = formValue.display_order;
      if (!editing) {
        const currentStatuses = this.statuses();
        const maxOrder =
          currentStatuses.length > 0
            ? Math.max(...currentStatuses.map((s) => s.display_order || 0))
            : 0;
        displayOrder = maxOrder + 1;
      }

      if (editing) {
        // Actualizar estado existente
        await firstValueFrom(
          this.http.patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_application_statuses?id=eq.${editing.id}`,
            {
              label: formValue.label,
              severity: formValue.severity,
              display_order: formValue.display_order,
            }
          )
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Estado actualizado',
          detail: `El estado "${formValue.label}" ha sido actualizado`,
        });
      } else {
        // Crear nuevo estado - generar código si no existe
        let code = formValue.code;
        if (!code && formValue.label) {
          code = formValue.label
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9\s]/g, '')
            .replace(/\s+/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_+|_+$/g, '');
        }

        // Verificar que el código no exista
        const existingStatus = this.statuses().find((s) => s.code === code);
        if (existingStatus) {
          this.messageService.add({
            severity: 'error',
            summary: 'Código duplicado',
            detail: `Ya existe un estado con el código "${code}". Por favor modifica el nombre.`,
          });
          this.isLoading.set(false);
          return;
        }

        // Crear nuevo estado
        await firstValueFrom(
          this.http.post(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_application_statuses`,
            {
              code: code,
              label: formValue.label,
              severity: formValue.severity,
              display_order: displayOrder,
              is_default: false,
              is_active: true,
            }
          )
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Estado creado',
          detail: `El estado "${formValue.label}" ha sido creado`,
        });
      }

      // Recargar estados en el diálogo
      this.statusesApi.reload();
      this.cancelEdit();

      // NO cerrar automáticamente el diálogo - dejar que el usuario lo cierre manualmente
      // Esto permite que el usuario vea el nuevo estado en la tabla y pueda crear más si lo desea
    } catch (error: any) {
      console.error('Error saving status:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'No se pudo guardar el estado',
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  deleteStatus(status: JobApplicationStatus) {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas eliminar el estado "${status.label}"?`,
      header: 'Confirmar eliminación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        this.isLoading.set(true);
        try {
          await firstValueFrom(
            this.http.delete(
              `${process.env['ENV_SUPABASE_URL']}/rest/v1/job_application_statuses?id=eq.${status.id}`
            )
          );
          this.messageService.add({
            severity: 'success',
            summary: 'Estado eliminado',
            detail: `El estado "${status.label}" ha sido eliminado`,
          });
          this.statusesApi.reload();
        } catch (error: any) {
          console.error('Error deleting status:', error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo eliminar el estado',
          });
        } finally {
          this.isLoading.set(false);
        }
      },
    });
  }
}
