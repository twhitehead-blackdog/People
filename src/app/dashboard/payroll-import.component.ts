import { CurrencyPipe, DatePipe, JsonPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { Dialog } from 'primeng/dialog';
import { ProgressBar } from 'primeng/progressbar';
import { ProgressSpinner } from 'primeng/progressspinner';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { FileUpload } from 'primeng/fileupload';
import { OrganizationService } from '../services/organization.service';
import {
  PayrollImportService,
  type ImportBatch,
  type ImportStagingRecord,
  type ImportType,
  type CsvParseResult,
} from '../services/payroll-import.service';
import type { Employee } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

interface ImportTypeOption {
  label: string;
  value: ImportType;
  description: string;
  requiredColumns: string;
}

@Component({
  selector: 'pt-payroll-import',
  standalone: true,
  imports: [
    CurrencyPipe,
    DatePipe,
    JsonPipe,
    FormsModule,
    Button,
    Card,
    Select,
    TableModule,
    Tag,
    Dialog,
    ProgressBar,
    ProgressSpinner,
    ConfirmDialog,
    Toast,
    FileUpload,
  ],
  providers: [ConfirmationService, MessageService],
  template: `
    <div class="space-y-6">
      <!-- Header -->
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 class="text-xl font-bold text-white">Importar Datos de Payday</h2>
          <p class="text-sm text-gray-400 mt-1">Migra historial de planillas, saldos y datos desde el sistema anterior</p>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="text-xs text-gray-400 uppercase tracking-wide">Total Lotes</div>
          <div class="text-2xl font-bold text-white mt-1">{{ batches().length }}</div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="text-xs text-gray-400 uppercase tracking-wide">Completados</div>
          <div class="text-2xl font-bold text-green-400 mt-1">{{ completedCount() }}</div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="text-xs text-gray-400 uppercase tracking-wide">En Proceso</div>
          <div class="text-2xl font-bold text-amber-400 mt-1">{{ inProgressCount() }}</div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="text-xs text-gray-400 uppercase tracking-wide">Registros Importados</div>
          <div class="text-2xl font-bold text-blue-400 mt-1">{{ totalImportedRecords() }}</div>
        </div>
      </div>

      <!-- New Import Section -->
      <div class="bg-neutral-800 rounded-lg p-6 border border-neutral-700">
        <h3 class="text-lg font-semibold text-white mb-4">Nueva Importación</h3>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Step 1: Select import type -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Tipo de Importación</label>
            <p-select
              [options]="importTypes"
              [(ngModel)]="selectedImportType"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar tipo..."
              styleClass="w-full"
            />
            @if (selectedImportType()) {
              <div class="mt-3 p-3 bg-neutral-700/50 rounded-lg">
                <p class="text-xs text-gray-400">{{ selectedTypeInfo()?.description }}</p>
                <p class="text-xs text-amber-400 mt-2">
                  <i class="pi pi-info-circle mr-1"></i>
                  Columnas requeridas: {{ selectedTypeInfo()?.requiredColumns }}
                </p>
              </div>
            }
          </div>

          <!-- Step 2: Upload file -->
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-2">Archivo CSV</label>
            @if (selectedImportType()) {
              <p-fileUpload
                mode="basic"
                accept=".csv"
                [maxFileSize]="10000000"
                chooseLabel="Seleccionar CSV"
                styleClass="w-full"
                (onSelect)="onFileSelect($event)"
              />
            } @else {
              <div class="flex items-center justify-center h-20 border-2 border-dashed border-neutral-600 rounded-lg">
                <span class="text-gray-500 text-sm">Primero selecciona el tipo de importación</span>
              </div>
            }
          </div>
        </div>

        <!-- Preview -->
        @if (previewData()) {
          <div class="mt-6">
            <div class="flex items-center justify-between mb-3">
              <h4 class="text-sm font-medium text-gray-300">
                Vista previa ({{ previewData()!.totalRows }} registros)
              </h4>
              <div class="flex gap-2">
                <p-button
                  label="Cancelar"
                  severity="secondary"
                  size="small"
                  (onClick)="cancelPreview()"
                />
                <p-button
                  label="Iniciar Importación"
                  icon="pi pi-upload"
                  size="small"
                  [loading]="importing()"
                  (onClick)="startImport()"
                />
              </div>
            </div>

            <div class="overflow-x-auto max-h-64 border border-neutral-600 rounded-lg">
              <table class="w-full text-xs">
                <thead class="bg-neutral-700 sticky top-0">
                  <tr>
                    @for (header of previewData()!.headers; track header) {
                      <th class="px-3 py-2 text-left text-gray-300 font-medium">{{ header }}</th>
                    }
                  </tr>
                </thead>
                <tbody>
                  @for (row of previewData()!.rows.slice(0, 10); track $index) {
                    <tr class="border-t border-neutral-700 hover:bg-neutral-700/50">
                      @for (header of previewData()!.headers; track header) {
                        <td class="px-3 py-2 text-gray-400">{{ row[header] }}</td>
                      }
                    </tr>
                  }
                </tbody>
              </table>
            </div>
            @if (previewData()!.totalRows > 10) {
              <p class="text-xs text-gray-500 mt-2">Mostrando 10 de {{ previewData()!.totalRows }} registros</p>
            }
          </div>
        }

        <!-- Progress -->
        @if (importing()) {
          <div class="mt-6 space-y-3">
            <div class="flex items-center gap-3">
              <p-progressSpinner
                styleClass="w-5 h-5"
                strokeWidth="6"
              />
              <span class="text-sm text-gray-300">{{ importStatus() }}</span>
            </div>
            <p-progressBar [value]="importProgress()" styleClass="h-2" />
          </div>
        }
      </div>

      <!-- Batch History -->
      @if (batches().length > 0) {
        <div class="bg-neutral-800 rounded-lg border border-neutral-700">
          <div class="p-4 border-b border-neutral-700">
            <h3 class="text-lg font-semibold text-white">Historial de Importaciones</h3>
          </div>
          <p-table
            [value]="batches()"
            [rows]="10"
            [paginator]="batches().length > 10"
            styleClass="p-datatable-sm"
          >
            <ng-template #header>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Archivo</th>
                <th>Registros</th>
                <th>Importados</th>
                <th>Errores</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </ng-template>
            <ng-template #body let-batch>
              <tr>
                <td>{{ batch.created_at | date:'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ getImportTypeLabel(batch.import_type) }}</td>
                <td class="text-sm">{{ batch.file_name }}</td>
                <td class="text-center">{{ batch.total_records }}</td>
                <td class="text-center text-green-400">{{ batch.imported_records }}</td>
                <td class="text-center text-red-400">{{ batch.error_records }}</td>
                <td>
                  <p-tag
                    [value]="batch.status"
                    [severity]="getBatchSeverity(batch.status)"
                  />
                </td>
                <td>
                  <p-button
                    icon="pi pi-eye"
                    [rounded]="true"
                    [text]="true"
                    size="small"
                    pTooltip="Ver detalle"
                    (onClick)="viewBatchDetail(batch)"
                  />
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      }
    </div>

    <!-- Detail Dialog -->
    <p-dialog
      header="Detalle de Importación"
      [(visible)]="detailDialogVisible"
      [modal]="true"
      [style]="{ width: '80vw', maxWidth: '1000px' }"
    >
      @if (selectedBatchRecords()) {
        <p-table
          [value]="selectedBatchRecords()!"
          [rows]="20"
          [paginator]="selectedBatchRecords()!.length > 20"
          styleClass="p-datatable-sm"
        >
          <ng-template #header>
            <tr>
              <th>Ref. Empleado</th>
              <th>Estado</th>
              <th>Datos</th>
              <th>Errores</th>
            </tr>
          </ng-template>
          <ng-template #body let-record>
            <tr>
              <td>{{ record.source_reference }}</td>
              <td>
                <p-tag
                  [value]="record.status"
                  [severity]="getRecordSeverity(record.status)"
                />
              </td>
              <td class="text-xs max-w-xs truncate">{{ record.raw_data | json }}</td>
              <td class="text-xs text-red-400">
                @if (record.validation_errors) {
                  {{ record.validation_errors.join(', ') }}
                }
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </p-dialog>

    <p-confirmDialog />
    <p-toast />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollImportComponent {
  private readonly importService = inject(PayrollImportService);
  private readonly orgService = inject(OrganizationService);
  private readonly messageService = inject(MessageService);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly http = inject(HttpClient);

  // State
  batches = signal<ImportBatch[]>([]);
  selectedImportType = signal<ImportType | null>(null);
  previewData = signal<CsvParseResult | null>(null);
  importing = signal(false);
  importStatus = signal('');
  importProgress = signal(0);
  detailDialogVisible = signal(false);
  selectedBatchRecords = signal<ImportStagingRecord[] | null>(null);
  private rawFileContent = '';
  private fileName = '';

  // Computed
  completedCount = computed(() => this.batches().filter(b => b.status === 'completed').length);
  inProgressCount = computed(() => this.batches().filter(b => !['completed', 'failed', 'cancelled'].includes(b.status)).length);
  totalImportedRecords = computed(() => this.batches().reduce((sum, b) => sum + b.imported_records, 0));

  importTypes: ImportTypeOption[] = [
    {
      label: 'Historial de Salarios',
      value: 'salary_history',
      description: 'Importa el historial de cambios de salario de cada empleado. Necesario para cálculos de liquidación con salario promedio.',
      requiredColumns: 'cedula, salario, fecha_efectiva, razon (opcional)',
    },
    {
      label: 'Saldos de Vacaciones',
      value: 'vacation_balance',
      description: 'Importa los saldos acumulados y usados de vacaciones. Necesario para que el cálculo de vacaciones y liquidaciones sea correcto.',
      requiredColumns: 'cedula, dias_acumulados, dias_usados, fecha_corte',
    },
    {
      label: 'Fondo de Cesantía',
      value: 'fondo_cesantia',
      description: 'Importa el saldo acumulado del fondo de cesantía por empleado. Se usa como offset en liquidaciones.',
      requiredColumns: 'cedula, saldo',
    },
    {
      label: 'Deudas / Préstamos Activos',
      value: 'debt_history',
      description: 'Importa préstamos, embargos y deudas activas. Se descontarán automáticamente en las próximas planillas.',
      requiredColumns: 'cedula, descripcion, monto, saldo, cuota, tipo (company_loan/bank_loan/creditor/embargo)',
    },
    {
      label: 'Historial de Planillas',
      value: 'payroll_history',
      description: 'Importa planillas pagadas anteriormente. Necesario para cálculos correctos de XIII mes e ISR.',
      requiredColumns: 'cedula, periodo, fecha, ingreso_bruto, deducciones, neto',
    },
    {
      label: 'Historial de XIII Mes',
      value: 'decimo_history',
      description: 'Importa registros de XIII mes ya pagados. Evita duplicar pagos en el período actual.',
      requiredColumns: 'cedula, año, periodo (1-3), monto, estado',
    },
  ];

  selectedTypeInfo = computed(() =>
    this.importTypes.find(t => t.value === this.selectedImportType())
  );

  constructor() {
    this.loadBatches();
  }

  async loadBatches(): Promise<void> {
    try {
      const result = await this.importService.getBatches();
      this.batches.set(result);
    } catch {
      // Silently handle - table may not exist yet
    }
  }

  onFileSelect(event: { files: File[] }): void {
    const file = event.files?.[0];
    if (!file) return;

    this.fileName = file.name;
    const reader = new FileReader();
    reader.onload = () => {
      this.rawFileContent = reader.result as string;
      const parsed = this.importService.parseCsv(this.rawFileContent);
      this.previewData.set(parsed);
    };
    reader.readAsText(file);
  }

  cancelPreview(): void {
    this.previewData.set(null);
    this.rawFileContent = '';
    this.fileName = '';
  }

  async startImport(): Promise<void> {
    const importType = this.selectedImportType();
    const preview = this.previewData();
    if (!importType || !preview) return;

    this.importing.set(true);
    this.importProgress.set(0);

    try {
      // Step 1: Load employee map (cedula → id)
      this.importStatus.set('Cargando empleados...');
      const employeeMap = await this.loadEmployeeMap();
      this.importProgress.set(10);

      // Step 2: Create batch
      this.importStatus.set('Creando lote de importación...');
      const batch = await this.importService.createBatch(importType, this.fileName, preview.totalRows);
      this.importProgress.set(20);

      // Step 3: Upload to staging
      this.importStatus.set('Cargando registros al staging...');
      await this.importService.uploadToStaging(batch.id, importType, preview.rows, employeeMap);
      this.importProgress.set(50);

      // Step 4: Validate
      this.importStatus.set('Validando registros...');
      const validation = await this.importService.validateBatch(batch.id);
      this.importProgress.set(70);

      // Step 5: Execute import
      this.importStatus.set(`Importando ${validation.validated} registros validados...`);
      const result = await this.importService.executeBatch(batch.id);
      this.importProgress.set(100);

      this.messageService.add({
        severity: 'success',
        summary: 'Importación Completada',
        detail: `${result.imported} registros importados, ${validation.errors} errores, ${result.skipped} omitidos`,
        life: 8000,
      });

      this.cancelPreview();
      this.selectedImportType.set(null);
      await this.loadBatches();

    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error durante la importación. Revisa el detalle del lote.',
        life: 5000,
      });
    } finally {
      this.importing.set(false);
      this.importStatus.set('');
    }
  }

  async viewBatchDetail(batch: ImportBatch): Promise<void> {
    try {
      const records = await this.importService.getStagingRecords(batch.id);
      this.selectedBatchRecords.set(records);
      this.detailDialogVisible.set(true);
    } catch {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo cargar el detalle del lote',
      });
    }
  }

  getImportTypeLabel(type: string): string {
    return this.importTypes.find(t => t.value === type)?.label ?? type;
  }

  getBatchSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'completed': return 'success';
      case 'importing':
      case 'validating': return 'info';
      case 'uploaded':
      case 'validated': return 'warn';
      case 'failed': return 'danger';
      default: return 'secondary';
    }
  }

  getRecordSeverity(status: string): 'success' | 'info' | 'warn' | 'danger' | 'secondary' {
    switch (status) {
      case 'imported': return 'success';
      case 'validated': return 'info';
      case 'pending': return 'warn';
      case 'error': return 'danger';
      default: return 'secondary';
    }
  }

  private async loadEmployeeMap(): Promise<Map<string, string>> {
    const companyId = this.orgService.getCurrentCompanyId();
    const url = this.apiUrl.build('rest/v1/employees', {
      select: 'id,document_id',
      company_id: `eq.${companyId}`,
    });
    const employees = await firstValueFrom(
      this.http.get<{ id: string; document_id: string }[]>(url)
    );

    const map = new Map<string, string>();
    for (const emp of employees ?? []) {
      if (emp.document_id) {
        map.set(emp.document_id, emp.id);
        // Also map without dashes/spaces
        map.set(emp.document_id.replace(/[-\s]/g, ''), emp.id);
      }
    }
    return map;
  }
}
