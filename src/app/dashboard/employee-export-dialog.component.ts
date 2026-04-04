import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Button } from 'primeng/button';
import { Checkbox } from 'primeng/checkbox';
import { Employee } from '../models';
import { styleDataSheet } from './modules/shared/utils/excel-style.utils';

/** Field definition for export selection */
interface ExportField {
  key: string;
  label: string;
  category: string;
  getValue: (emp: Employee) => string | number | boolean | undefined | null;
}

const EXPORT_FIELDS: ExportField[] = [
  // Identificación
  { key: 'employee_number', label: 'Número de empleado', category: 'Identificación', getValue: (e) => e.employee_number },
  { key: 'document_id', label: 'Cédula', category: 'Identificación', getValue: (e) => e.document_id },
  { key: 'first_name', label: 'Primer nombre', category: 'Identificación', getValue: (e) => e.first_name },
  { key: 'middle_name', label: 'Segundo nombre', category: 'Identificación', getValue: (e) => e.middle_name },
  { key: 'father_name', label: 'Primer apellido', category: 'Identificación', getValue: (e) => e.father_name },
  { key: 'mother_name', label: 'Segundo apellido', category: 'Identificación', getValue: (e) => e.mother_name },
  { key: 'full_name', label: 'Nombre completo', category: 'Identificación', getValue: (e) => `${e.first_name} ${e.middle_name || ''} ${e.father_name} ${e.mother_name || ''}`.replace(/\s+/g, ' ').trim() },
  { key: 'gender', label: 'Sexo', category: 'Identificación', getValue: (e) => e.gender === 'M' ? 'Masculino' : 'Femenino' },
  { key: 'birth_date', label: 'Fecha de nacimiento', category: 'Identificación', getValue: (e) => e.birth_date ? String(e.birth_date).substring(0, 10) : '' },

  // Laboral
  { key: 'is_active', label: 'Estado', category: 'Laboral', getValue: (e) => e.is_active ? 'ACTIVO' : 'INACTIVO' },
  { key: 'branch', label: 'Sucursal', category: 'Laboral', getValue: (e) => e.branch?.name },
  { key: 'department', label: 'Departamento', category: 'Laboral', getValue: (e) => e.department?.name },
  { key: 'position', label: 'Cargo', category: 'Laboral', getValue: (e) => e.position?.name },
  { key: 'start_date', label: 'Fecha de inicio', category: 'Laboral', getValue: (e) => e.start_date ? String(e.start_date).substring(0, 10) : '' },
  { key: 'end_date', label: 'Fecha de salida', category: 'Laboral', getValue: (e) => e.end_date ? String(e.end_date).substring(0, 10) : '' },
  { key: 'probatory', label: 'Probatorio', category: 'Laboral', getValue: (e) => (e as any).probatory ? 'PROBATORIO' : 'NORMAL' },
  { key: 'payroll_type', label: 'Tipo de planilla', category: 'Laboral', getValue: (e) => e.payroll_type === 'honorarios' ? 'Honorarios' : 'Regular' },
  { key: 'use_timelog', label: 'Usa reloj', category: 'Laboral', getValue: (e) => e.use_timelog ? 'Sí' : 'No' },
  { key: 'uniform_size', label: 'Talla de uniforme', category: 'Laboral', getValue: (e) => e.uniform_size },

  // Salario / Banco
  { key: 'monthly_salary', label: 'Salario mensual', category: 'Salario / Banco', getValue: (e) => e.monthly_salary },
  { key: 'hourly_salary', label: 'Salario por hora', category: 'Salario / Banco', getValue: (e) => e.hourly_salary },
  { key: 'bank', label: 'Banco', category: 'Salario / Banco', getValue: (e) => e.bank },
  { key: 'account_number', label: 'Número de cuenta', category: 'Salario / Banco', getValue: (e) => e.account_number },
  { key: 'bank_account_type', label: 'Tipo de cuenta', category: 'Salario / Banco', getValue: (e) => e.bank_account_type },

  // Contacto
  { key: 'email', label: 'Email personal', category: 'Contacto', getValue: (e) => e.email },
  { key: 'work_email', label: 'Email laboral', category: 'Contacto', getValue: (e) => e.work_email },
  { key: 'phone_number', label: 'Teléfono personal', category: 'Contacto', getValue: (e) => e.phone_number },
  { key: 'work_phone_number', label: 'Teléfono laboral', category: 'Contacto', getValue: (e) => e.work_phone_number },
  { key: 'address', label: 'Dirección', category: 'Contacto', getValue: (e) => e.address },

  // Emergencia
  { key: 'emergency_contact_name', label: 'Contacto de emergencia', category: 'Emergencia', getValue: (e) => e.emergency_contact_name },
  { key: 'emergency_contact_phone', label: 'Teléfono de emergencia', category: 'Emergencia', getValue: (e) => e.emergency_contact_phone },
  { key: 'emergency_contact_relationship', label: 'Parentesco', category: 'Emergencia', getValue: (e) => e.emergency_contact_relationship },

  // Sistema
  { key: 'has_portal_access', label: 'Acceso a portal', category: 'Sistema', getValue: (e) => e.has_portal_access ? 'Sí' : 'No' },
  { key: 'total_lunch_exceeded', label: 'Minutos almuerzo excedido', category: 'Sistema', getValue: (e) => e.total_lunch_exceeded_minutes },
  { key: 'created_at', label: 'Fecha de creación', category: 'Sistema', getValue: (e) => e.created_at ? String(e.created_at).substring(0, 10) : '' },
];

@Component({
  selector: 'pt-employee-export-dialog',
  standalone: true,
  imports: [FormsModule, Button, Checkbox],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flex flex-col gap-4 max-h-[70vh]">
      <!-- Quick actions -->
      <div class="flex items-center gap-3 flex-wrap">
        <p-button label="Seleccionar todos" icon="pi pi-check-square" severity="secondary" [text]="true" size="small" (onClick)="selectAll()" />
        <p-button label="Deseleccionar todos" icon="pi pi-stop" severity="secondary" [text]="true" size="small" (onClick)="deselectAll()" />
        <span class="text-sm text-gray-400 ml-auto">{{ selectedCount() }} campos seleccionados</span>
      </div>

      <!-- Field categories -->
      <div class="overflow-y-auto flex-1 pr-1" style="max-height: 55vh;">
        @for (category of categories; track category) {
          <div class="mb-4">
            <div class="flex items-center gap-2 mb-2">
              <span class="text-sm font-semibold text-amber-400 uppercase tracking-wide">{{ category }}</span>
              <span class="flex-1 h-px bg-neutral-700"></span>
              <button type="button" class="text-xs text-gray-400 hover:text-white transition-colors" (click)="toggleCategory(category)">
                {{ isCategoryFullySelected(category) ? 'Quitar' : 'Todos' }}
              </button>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2">
              @for (field of getFieldsByCategory(category); track field.key) {
                <label class="flex items-center gap-2 cursor-pointer text-sm text-gray-300 hover:text-white transition-colors py-0.5">
                  <p-checkbox [(ngModel)]="selectedKeys[field.key]" [binary]="true" />
                  {{ field.label }}
                </label>
              }
            </div>
          </div>
        }
      </div>

      <!-- Actions -->
      <div class="flex justify-end gap-3 pt-3 border-t border-neutral-700">
        <p-button label="Cancelar" severity="secondary" [outlined]="true" (onClick)="cancel()" />
        <p-button label="Exportar Excel" icon="pi pi-file-excel" severity="success" (onClick)="exportExcel()" [disabled]="selectedCount() === 0" />
      </div>
    </div>
  `,
})
export class EmployeeExportDialogComponent {
  private dialogRef = inject(DynamicDialogRef);
  private config = inject(DynamicDialogConfig);

  /** All available fields */
  readonly allFields = EXPORT_FIELDS;

  /** Unique categories in order */
  readonly categories = [...new Set(EXPORT_FIELDS.map((f) => f.category))];

  /** Track selected state per field key */
  public selectedKeys: Record<string, boolean> = {};

  constructor() {
    // Default selection: the same fields as the original report
    const defaults = [
      'full_name', 'is_active', 'document_id', 'branch', 'department',
      'position', 'monthly_salary', 'uniform_size', 'start_date',
      'probatory', 'birth_date', 'gender', 'created_at',
    ];
    for (const field of EXPORT_FIELDS) {
      this.selectedKeys[field.key] = defaults.includes(field.key);
    }
  }

  selectedCount(): number {
    return Object.values(this.selectedKeys).filter(Boolean).length;
  }

  getFieldsByCategory(category: string): ExportField[] {
    return this.allFields.filter((f) => f.category === category);
  }

  isCategoryFullySelected(category: string): boolean {
    return this.getFieldsByCategory(category).every((f) => this.selectedKeys[f.key]);
  }

  toggleCategory(category: string): void {
    const full = this.isCategoryFullySelected(category);
    for (const f of this.getFieldsByCategory(category)) {
      this.selectedKeys[f.key] = !full;
    }
  }

  selectAll(): void {
    for (const f of this.allFields) this.selectedKeys[f.key] = true;
  }

  deselectAll(): void {
    for (const f of this.allFields) this.selectedKeys[f.key] = false;
  }

  cancel(): void {
    this.dialogRef.close();
  }

  async exportExcel(): Promise<void> {
    const employees: Employee[] = this.config.data?.employees ?? [];
    const selected = this.allFields.filter((f) => this.selectedKeys[f.key]);

    if (selected.length === 0 || employees.length === 0) {
      this.dialogRef.close();
      return;
    }

    // Build data rows with selected fields only
    const rows = employees.map((emp) => {
      const row: Record<string, any> = {};
      for (const field of selected) {
        row[field.label] = field.getValue(emp) ?? '';
      }
      return row;
    });

    // Create styled workbook using xlsx-js-style
    const xlsxModule = await import('xlsx-js-style');
    const XLSXS = (xlsxModule as any).default || xlsxModule;
    const ws = XLSXS.utils.json_to_sheet(rows);

    // Auto-fit column widths
    const colWidths = selected.map((field, i) => {
      let maxLen = field.label.length;
      for (const row of rows) {
        const val = String(row[field.label] ?? '');
        if (val.length > maxLen) maxLen = val.length;
      }
      return { wch: Math.min(maxLen + 3, 50) };
    });
    ws['!cols'] = colWidths;

    // Apply styling (green header for employee reports)
    styleDataSheet(ws, XLSXS.utils, '16A34A');

    // Format salary columns as currency
    const salaryIndices = selected
      .map((f, i) => (f.key === 'monthly_salary' || f.key === 'hourly_salary') ? i : -1)
      .filter((i) => i >= 0);

    if (salaryIndices.length > 0) {
      const range = XLSXS.utils.decode_range(ws['!ref']!);
      for (let r = 1; r <= range.e.r; r++) {
        for (const c of salaryIndices) {
          const addr = XLSXS.utils.encode_cell({ r, c });
          if (ws[addr] && typeof ws[addr].v === 'number') {
            ws[addr].z = '$#,##0.00';
          }
        }
      }
    }

    const wb = XLSXS.utils.book_new();
    XLSXS.utils.book_append_sheet(wb, ws, 'Empleados');
    XLSXS.writeFile(wb, 'REPORTE_EMPLEADOS.xlsx');

    this.dialogRef.close();
  }
}
