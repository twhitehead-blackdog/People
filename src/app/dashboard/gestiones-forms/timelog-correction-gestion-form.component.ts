import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format, set, startOfDay } from 'date-fns';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { FileUpload } from 'primeng/fileupload';
import { InputText } from 'primeng/inputtext';
import { Textarea } from 'primeng/textarea';
import { Select } from 'primeng/select';
import { TooltipModule } from 'primeng/tooltip';
import { firstValueFrom } from 'rxjs';
import { Branch, Employee } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { TutorialStepDirective } from '../../shared/directives/tutorial-step.directive';
import { notifyBranchManagers } from '../../utils/manager-notification.utils';

interface CorrectionRow {
  id: string;
  date: Date | null;
  type: 'entry' | 'lunch_start' | 'lunch_end' | 'exit';
  time: string;
}

@Component({
  selector: 'pt-timelog-correction-gestion-form',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    Button,
    DatePicker,
    FileUpload,
    InputText,
    Textarea,
    Select,
    TooltipModule,
    TutorialStepDirective,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-5">
      <!-- Paso 1: Marcaciones a corregir (multi-fila) -->
      <div class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md">
        <div class="flex items-center justify-between gap-3 mb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center">
              <i class="pi pi-calendar text-orange-400"></i>
            </div>
            <h3 class="text-lg font-semibold text-white m-0">
              Paso 1: Marcaciones a corregir
            </h3>
          </div>
          <span class="text-xs text-gray-400">{{ rows().length }} marcación(es)</span>
        </div>

        <p class="text-xs text-amber-300 mb-3">
          <i class="pi pi-exclamation-circle mr-1"></i>
          Cada marcación requiere fecha, tipo y <strong>hora exacta</strong> obligatoria.
          Puede agregar varias filas si el empleado olvidó marcar varias veces.
        </p>

        <div class="space-y-3">
          @for (row of rows(); track row.id; let i = $index) {
            <div class="p-3 rounded-lg bg-neutral-900/40 border border-neutral-700/40">
              <div class="flex items-center justify-between mb-2">
                <span class="text-xs uppercase tracking-wide text-gray-500">Marcación #{{ i + 1 }}</span>
                @if (rows().length > 1) {
                  <button type="button"
                    class="text-rose-300 hover:text-rose-200 text-xs"
                    (click)="removeRow(row.id)">
                    <i class="pi pi-trash text-[10px] mr-1"></i>Quitar
                  </button>
                }
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-300">Fecha</label>
                  <p-datepicker
                    [ngModel]="row.date"
                    (ngModelChange)="updateRow(row.id, 'date', $event)"
                    [showIcon]="true"
                    dateFormat="dd/mm/yy"
                    placeholder="Fecha"
                    [maxDate]="today"
                    styleClass="w-full"
                    appendTo="body"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-300">Tipo</label>
                  <p-select
                    [ngModel]="row.type"
                    (ngModelChange)="updateRow(row.id, 'type', $event)"
                    [options]="typeOptions"
                    optionLabel="label"
                    optionValue="value"
                    placeholder="Tipo"
                    styleClass="w-full"
                    appendTo="body"
                  />
                </div>
                <div class="flex flex-col gap-1">
                  <label class="text-xs font-medium text-gray-300">Hora exacta *</label>
                  <input
                    pInputText
                    type="text"
                    inputmode="numeric"
                    [ngModel]="row.time"
                    (ngModelChange)="updateRowTime(row.id, $event)"
                    placeholder="HHMM (ej 0800)"
                    maxlength="4"
                    class="w-full"
                  />
                  @if (rowTimePreview(row); as preview) {
                    <span class="text-sm font-bold text-orange-300">{{ preview }}</span>
                  } @else {
                    <span class="text-[11px] text-amber-400">⚠ Hora obligatoria</span>
                  }
                </div>
              </div>
            </div>
          }
        </div>

        <div class="flex flex-wrap gap-2 mt-3">
          <button type="button"
            class="px-3 py-1.5 text-xs rounded-md bg-orange-500/10 border border-orange-500/30 text-orange-200 hover:bg-orange-500/20"
            (click)="addRow()">
            <i class="pi pi-plus text-[10px] mr-1"></i>Agregar otra marcación
          </button>
          <button type="button"
            class="px-3 py-1.5 text-xs rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-200 hover:bg-amber-500/20"
            (click)="addFullDayRows()"
            title="Agrega entrada, inicio almuerzo, fin almuerzo y salida para el día seleccionado">
            <i class="pi pi-list text-[10px] mr-1"></i>Día completo (4 marcaciones)
          </button>
        </div>
      </div>

      <!-- Paso 2: Motivo -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file-edit text-orange-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 2: Motivo de la Corrección
          </h3>
        </div>
        <textarea
          pInputTextarea
          [ngModel]="reason()"
          (ngModelChange)="reason.set($event)"
          placeholder="Explica por qué se necesita la corrección de esta marcación (ej: olvidé marcar entrada, el reloj no funcionaba, etc.)"
          rows="4"
          class="w-full"
          ptTutorialStep="timelog-correction-reason"
        ></textarea>
      </div>

      <!-- Paso 3: Evidencia (Opcional) -->
      <div
        class="p-5 rounded-lg bg-neutral-800/50 border border-neutral-700/50 shadow-md"
      >
        <div class="flex items-center gap-3 mb-4">
          <div
            class="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"
          >
            <i class="pi pi-file text-orange-400"></i>
          </div>
          <h3 class="text-lg font-semibold text-white m-0">
            Paso 3: Evidencia (Opcional)
          </h3>
        </div>
        <p class="text-sm text-gray-400 mb-4">
          Si tienes evidencia de la marcación correcta (captura de
          pantalla, foto del reloj, etc.), puedes adjuntarla.
        </p>
        <p-fileUpload
          mode="basic"
          accept=".pdf,.jpg,.jpeg,.png"
          maxFileSize="5000000"
          [auto]="false"
          chooseLabel="Seleccionar Archivo"
          (onSelect)="onFileSelect($event)"
          class="w-full"
          ptTutorialStep="timelog-correction-file"
        />
        <p class="text-xs text-gray-500 mt-2">
          Formatos permitidos: PDF, JPG, PNG (máx. 5MB)
        </p>
        @if (file()) {
        <div
          class="mt-3 p-3 bg-orange-500/10 border border-orange-400/30 rounded-lg flex items-center justify-between"
        >
          <div class="flex items-center gap-2">
            @if (uploadingDoc()) {
            <i class="pi pi-spin pi-spinner text-orange-400"></i>
            <span class="text-sm text-gray-300">Subiendo...</span>
            } @else {
            <i class="pi pi-file text-orange-400"></i>
            <span class="text-sm text-gray-300">{{ file()!.name }}</span>
            }
          </div>
          <p-button
            icon="pi pi-times"
            severity="danger"
            text
            rounded
            size="small"
            (onClick)="clearFile()"
            pTooltip="Eliminar archivo"
            [disabled]="uploadingDoc()"
          />
        </div>
        }
      </div>

      <!-- Botones de Acción -->
      <div class="flex justify-between pt-4">
        <p-button
          label="Volver"
          icon="pi pi-arrow-left"
          severity="secondary"
          (onClick)="close.emit()"
        />
        <p-button
          label="Enviar Solicitud"
          icon="pi pi-check"
          [disabled]="!canSubmit()"
          [loading]="submitting()"
          (onClick)="submit()"
          severity="success"
          ptTutorialStep="timelog-correction-submit"
        />
      </div>
    </div>
  `,
})
export class TimelogCorrectionGestionFormComponent {
  selectedEmployee = input.required<Employee>();
  currentEmployee = input<Employee | null>(null);
  currentBranch = input<Branch | null>(null);
  requestCreated = output<void>();
  close = output<void>();

  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);

  public today = startOfDay(new Date());

  public rows = signal<CorrectionRow[]>([this.newEmptyRow()]);
  public reason = signal<string>('');
  public file = signal<File | null>(null);
  public docUrl = signal<string | null>(null);
  public uploadingDoc = signal<boolean>(false);
  public submitting = signal<boolean>(false);

  private newEmptyRow(): CorrectionRow {
    return {
      id: crypto.randomUUID(),
      date: null,
      type: 'entry',
      time: '',
    };
  }

  public addRow(): void {
    this.rows.update(list => [...list, this.newEmptyRow()]);
  }

  public addFullDayRows(): void {
    // Si hay una fila con fecha válida, úsala; si no, hoy
    const sourceDate = this.rows().find(r => r.date)?.date || new Date();
    const types: Array<CorrectionRow['type']> = ['entry', 'lunch_start', 'lunch_end', 'exit'];
    const existing = this.rows().filter(r => r.date && r.time);
    const newRows: CorrectionRow[] = types.map(t => ({
      id: crypto.randomUUID(),
      date: sourceDate,
      type: t,
      time: '',
    }));
    // Si el usuario ya tenía filas válidas (con time), las preservamos al inicio
    this.rows.set(existing.length > 0 ? [...existing, ...newRows] : newRows);
  }

  public removeRow(id: string): void {
    this.rows.update(list => list.length > 1 ? list.filter(r => r.id !== id) : list);
  }

  public updateRow(id: string, field: 'date' | 'type', value: any): void {
    this.rows.update(list => list.map(r => r.id === id ? { ...r, [field]: value } : r));
  }

  public updateRowTime(id: string, value: string): void {
    const clean = value.replace(/\D/g, '').slice(0, 4);
    this.rows.update(list => list.map(r => r.id === id ? { ...r, time: clean } : r));
  }

  public rowTimePreview(row: CorrectionRow): string | null {
    const parsed = this.parseTimeDigits(row.time);
    if (!parsed) return null;
    return format(set(new Date(), { hours: parsed.hours, minutes: parsed.minutes, seconds: 0, milliseconds: 0 }), 'h:mm a');
  }

  private parseTimeDigits(digits: string): { hours: number; minutes: number } | null {
    const clean = (digits || '').replace(/\D/g, '');
    if (clean.length < 3) return null;
    const padded = clean.padStart(4, '0');
    const h = parseInt(padded.slice(0, 2), 10);
    const m = parseInt(padded.slice(2, 4), 10);
    if (h > 23 || m > 59) return null;
    return { hours: h, minutes: m };
  }

  private isRowComplete(r: CorrectionRow): boolean {
    return !!(r.date && r.type && this.parseTimeDigits(r.time));
  }

  public typeOptions = [
    { label: 'Entrada', value: 'entry' },
    { label: 'Inicio Almuerzo', value: 'lunch_start' },
    { label: 'Fin Almuerzo', value: 'lunch_end' },
    { label: 'Salida', value: 'exit' },
  ];

  public canSubmit = computed(() => {
    const rows = this.rows();
    if (rows.length === 0) return false;
    if (!this.reason().trim()) return false;
    return rows.every(r => this.isRowComplete(r));
  });

  public getTypeLabel(): string {
    return 'Marcación';
  }

  public async onFileSelect(event: any): Promise<void> {
    const files = event.currentFiles || event.files;
    if (!files || files.length === 0) return;

    const f = files[0];
    this.file.set(f);
    this.uploadingDoc.set(true);

    try {
      const employeeId = this.selectedEmployee()?.id || 'temp';
      const fileExt = f.name.split('.').pop();
      const fileName = `timelog-corrections/${employeeId}_${Date.now()}.${fileExt}`;
      const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${fileName}`;

      await firstValueFrom(this.http.post(uploadUrl, f, { headers: { 'x-upsert': 'true' } }));
      this.docUrl.set(`${this.apiUrl.baseUrl}/storage/v1/object/public/employee-documents/${fileName}`);
    } catch (error) {
      console.error('Background upload failed:', error);
      this.docUrl.set(null);
    } finally {
      this.uploadingDoc.set(false);
    }
  }

  public clearFile(): void {
    this.file.set(null);
    this.docUrl.set(null);
  }

  public async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    if (this.uploadingDoc()) {
      this.messageService.add({ severity: 'info', summary: 'Subiendo archivo...', detail: 'Por favor espera a que termine de subirse el documento adjunto.' });
      return;
    }

    this.submitting.set(true);

    try {
      const employee = this.selectedEmployee();
      const f = this.file();
      let attachmentUrl = this.docUrl();

      // Fallback upload
      if (f && !attachmentUrl) {
        const fileExt = f.name.split('.').pop();
        const fileName = `timelog-corrections/${employee.id}_${Date.now()}.${fileExt}`;
        const uploadUrl = `${this.apiUrl.baseUrl}/storage/v1/object/employee-documents/${fileName}`;
        await firstValueFrom(this.http.post(uploadUrl, f, { headers: { 'x-upsert': 'true' } }));
        attachmentUrl = `${this.apiUrl.baseUrl}/storage/v1/object/public/employee-documents/${fileName}`;
      }

      const rows = this.rows();
      const companyId = this.organizationService.getCurrentCompanyId();
      const branchId = employee.branch?.id || this.currentBranch()?.id || null;
      const batchId = crypto.randomUUID();

      // Construye payloads — uno por marcación
      const payloads = rows.map(r => {
        const parsed = this.parseTimeDigits(r.time)!;
        const timeStr = `${String(parsed.hours).padStart(2, '0')}:${String(parsed.minutes).padStart(2, '0')}`;
        const dateStr = r.date!.toISOString().split('T')[0];
        return {
          employee_id: employee.id,
          document_type: 'timelog_correction',
          reason: this.reason(),
          status: 'pending',
          created_by: this.currentEmployee()?.id || null,
          company_id: companyId,
          metadata: {
            timelog_date: dateStr,
            timelog_type: r.type,
            timelog_time: timeStr,
            branch_id: branchId,
            attachment_url: attachmentUrl,
            batch_id: batchId,
            batch_size: rows.length,
          },
        };
      });

      // Inserción en batch (PostgREST acepta array)
      await firstValueFrom(this.http.post(this.apiUrl.build('rest/v1/document_requests'), payloads));

      // Notificar a gerentes de la sucursal una sola vez por el lote
      notifyBranchManagers({
        http: this.http,
        apiUrl: this.apiUrl,
        employee,
        title: 'Nueva Corrección de Marcación',
        message: `${employee.first_name} ${employee.father_name} solicitó ${rows.length} corrección(es) de marcación.`,
        relatedType: 'timelog_correction',
        messageType: 'timelog_correction_manager',
      });

      this.messageService.add({
        severity: 'success',
        summary: 'Solicitud Enviada',
        detail: `${rows.length} corrección(es) enviada(s) para ${employee.first_name} ${employee.father_name}.`,
      });

      this.requestCreated.emit();
    } catch (error: any) {
      console.error('Error submitting timelog correction:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || error?.message || 'No se pudo enviar la solicitud.',
      });
    } finally {
      this.submitting.set(false);
    }
  }
}
