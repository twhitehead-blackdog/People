import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ApiUrlService } from '../services/api-url.service';
import { DashboardStore } from '../stores/dashboard.store';

type Status = 'active' | 'suspended' | 'cancelled';

interface MobileLine {
  id: string;
  number: string;
  carrier: string | null;
  plan: string | null;
  monthly_cost: number | null;
  start_date: string | null;
  end_date: string | null;
  employee_id: string | null;
  status: Status;
  notes: string | null;
  created_at: string;
  updated_at: string;
  employee?: { id: string; first_name: string; father_name: string } | null;
}

@Component({
  selector: 'pt-it-mobile-lines',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, FormsModule, ButtonModule, CardModule, ConfirmDialogModule,
    DialogModule, InputNumberModule, InputTextModule, ProgressSpinnerModule, SelectModule,
    TableModule, TagModule, TextareaModule,
  ],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-3 sm:px-5 md:px-8 pt-3 pb-4 space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-2xl font-bold text-gray-100 m-0">Líneas Móviles</h2>
          <p class="text-sm text-gray-400 m-0 mt-0.5">{{ totalCount() }} línea(s) · {{ activeCount() }} activa(s) · {{ expiringSoonCount() }} vencen pronto</p>
        </div>
        <p-button label="Nueva línea" icon="pi pi-plus" size="small" (onClick)="openNew()" />
      </div>

      <p-confirmDialog />
      <p-card>
        @if (linesApi.isLoading()) {
          <div class="flex justify-center py-8"><p-progressSpinner styleClass="w-10 h-10" strokeWidth="3" /></div>
        } @else {
          <p-table [value]="lines()" styleClass="p-datatable-sm" [paginator]="true" [rows]="20" [rowsPerPageOptions]="[10,20,50,100]" sortField="number">
            <ng-template pTemplate="header">
              <tr class="text-xs">
                <th pSortableColumn="number">Número</th>
                <th pSortableColumn="carrier">Operadora</th>
                <th>Plan</th>
                <th pSortableColumn="monthly_cost">Costo/mes</th>
                <th>Empleado</th>
                <th pSortableColumn="end_date">Vencimiento</th>
                <th pSortableColumn="status">Estado</th>
                <th style="width:100px"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-l>
              <tr [class.bg-red-500_10]="isExpiringSoon(l.end_date)">
                <td class="font-mono font-medium text-gray-100">{{ l.number }}</td>
                <td class="text-gray-300">{{ l.carrier || '—' }}</td>
                <td class="text-xs text-gray-400">{{ l.plan || '—' }}</td>
                <td class="text-gray-200">
                  @if (l.monthly_cost) { \${{ l.monthly_cost | number:'1.2-2' }} } @else { <span class="text-gray-500">—</span> }
                </td>
                <td class="text-xs text-gray-300">{{ employeeName(l.employee) }}</td>
                <td>
                  @if (l.end_date) {
                    <span [class]="isExpiringSoon(l.end_date) ? 'text-red-400 font-bold text-xs' : 'text-gray-400 text-xs'">
                      @if (isExpiringSoon(l.end_date)) { <i class="pi pi-exclamation-triangle mr-1"></i> }
                      {{ l.end_date | date:'dd/MM/yyyy' }}
                    </span>
                  } @else { <span class="text-gray-500">—</span> }
                </td>
                <td><p-tag [severity]="statusSeverity(l.status)" [value]="statusLabel(l.status)" /></td>
                <td>
                  <div class="flex gap-1">
                    <p-button icon="pi pi-pencil" size="small" severity="secondary" [text]="true" (onClick)="edit(l)" />
                    <p-button icon="pi pi-trash" size="small" severity="danger"   [text]="true" (onClick)="confirmRemove(l)" />
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="8" class="text-center py-8 text-gray-500">Sin líneas registradas</td></tr>
            </ng-template>
          </p-table>
        }
      </p-card>

      <p-dialog [(visible)]="showDialog" [header]="dialogTitle()" [modal]="true" [style]="{width:'560px'}" [dismissableMask]="true" [closeOnEscape]="true">
        <div class="grid grid-cols-2 gap-3 pt-2">
          <div class="col-span-2">
            <label class="text-xs text-gray-400 block mb-1">Número *</label>
            <input pInputText [(ngModel)]="form.number" class="w-full" placeholder="+507 6000-0000" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Operadora</label>
            <p-select [(ngModel)]="form.carrier" [options]="carriers" [editable]="true" styleClass="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Plan</label>
            <input pInputText [(ngModel)]="form.plan" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Costo mensual ($)</label>
            <p-inputnumber [(ngModel)]="form.monthly_cost" mode="decimal" [minFractionDigits]="2" styleClass="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Empleado</label>
            <p-select [(ngModel)]="form.employee_id" [options]="employeeOptions()" placeholder="Sin asignar" [showClear]="true" [filter]="true" filterBy="label" styleClass="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Inicio</label>
            <input pInputText [(ngModel)]="form.start_date" class="w-full" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Vencimiento</label>
            <input pInputText [(ngModel)]="form.end_date" class="w-full" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Estado</label>
            <p-select [(ngModel)]="form.status" [options]="statusOptions" styleClass="w-full" />
          </div>
          <div class="col-span-2">
            <label class="text-xs text-gray-400 block mb-1">Notas</label>
            <textarea pTextarea [(ngModel)]="form.notes" rows="2" class="w-full"></textarea>
          </div>
        </div>
        <ng-template pTemplate="footer">
          <p-button label="Cancelar" severity="secondary" [text]="true" (onClick)="showDialog = false" />
          <p-button label="Guardar" icon="pi pi-check" [loading]="saving()" (onClick)="save()" />
        </ng-template>
      </p-dialog>
    </div>
  `,
})
export class ItMobileLinesComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private store = inject(DashboardStore);
  private msg = inject(MessageService);
  private confirmSvc = inject(ConfirmationService);

  readonly carriers = ['Claro', 'Tigo', 'Digicel', 'Movistar', '+Movil'];
  readonly statusOptions = [
    { label: 'Activa',     value: 'active'    },
    { label: 'Suspendida', value: 'suspended' },
    { label: 'Cancelada',  value: 'cancelled' },
  ];

  showDialog = false;
  saving = signal(false);
  form: Partial<MobileLine> = { status: 'active' };

  linesApi = httpResource<MobileLine[]>(() => ({
    url: this.apiUrl.build('rest/v1/it_mobile_lines', {
      order:  'number.asc',
      select: '*,employee:employees!it_mobile_lines_employee_id_fkey(id,first_name,father_name)',
    }),
    method: 'GET',
  }));

  lines              = computed(() => this.linesApi.value() ?? []);
  totalCount         = computed(() => this.lines().length);
  activeCount        = computed(() => this.lines().filter(l => l.status === 'active').length);
  expiringSoonCount  = computed(() => this.lines().filter(l => this.isExpiringSoon(l.end_date)).length);

  employeeOptions = computed(() =>
    this.store.employees.entities()
      .filter((e: any) => e.is_active !== false)
      .map((e: any) => ({ label: `${e.first_name} ${e.father_name}`.trim(), value: e.id }))
      .sort((a, b) => a.label.localeCompare(b.label))
  );

  dialogTitle() { return this.form.id ? 'Editar Línea' : 'Nueva Línea'; }

  employeeName(e?: { first_name: string; father_name: string } | null) {
    if (!e) return 'Sin asignar';
    return `${e.first_name ?? ''} ${e.father_name ?? ''}`.trim() || 'Sin asignar';
  }

  isExpiringSoon(date?: string | null) {
    if (!date) return false;
    const d = new Date(date);
    return d <= new Date(Date.now() + 30 * 86400000) && d >= new Date();
  }

  statusSeverity(s: string) {
    return s === 'active' ? 'success' : s === 'suspended' ? 'warn' : 'danger';
  }
  statusLabel(s: string) {
    return s === 'active' ? 'Activa' : s === 'suspended' ? 'Suspendida' : 'Cancelada';
  }

  openNew() {
    this.form = { status: 'active' };
    this.showDialog = true;
  }

  edit(l: MobileLine) {
    this.form = { ...l, employee_id: l.employee?.id ?? l.employee_id ?? null };
    this.showDialog = true;
  }

  async save() {
    if (!this.form.number?.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Falta número', detail: 'El número es requerido.' });
      return;
    }
    this.saving.set(true);
    const payload: any = {
      number:       this.form.number?.trim(),
      carrier:      this.form.carrier || null,
      plan:         this.form.plan || null,
      monthly_cost: this.form.monthly_cost ?? null,
      start_date:   this.form.start_date || null,
      end_date:     this.form.end_date || null,
      employee_id:  this.form.employee_id || null,
      status:       this.form.status || 'active',
      notes:        this.form.notes || null,
      updated_at:   new Date().toISOString(),
    };
    try {
      if (this.form.id) {
        await firstValueFrom(this.http.patch(
          this.apiUrl.build('rest/v1/it_mobile_lines', { id: `eq.${this.form.id}` }),
          payload, { headers: { Prefer: 'return=minimal' } }
        ));
      } else {
        await firstValueFrom(this.http.post(
          this.apiUrl.build('rest/v1/it_mobile_lines'),
          payload, { headers: { Prefer: 'return=minimal' } }
        ));
      }
      this.showDialog = false;
      this.msg.add({ severity: 'success', summary: 'Guardado', detail: 'Línea guardada.' });
      this.linesApi.reload();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
    } finally {
      this.saving.set(false);
    }
  }

  confirmRemove(l: MobileLine) {
    this.confirmSvc.confirm({
      message: `¿Eliminar la línea ${l.number}?`,
      header:  'Confirmar',
      icon:    'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept:  () => this.remove(l),
    });
  }

  async remove(l: MobileLine) {
    try {
      await firstValueFrom(this.http.delete(
        this.apiUrl.build('rest/v1/it_mobile_lines', { id: `eq.${l.id}` }),
        { headers: { Prefer: 'return=minimal' } }
      ));
      this.msg.add({ severity: 'success', summary: 'Eliminada', detail: `Línea ${l.number} eliminada.` });
      this.linesApi.reload();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.' });
    }
  }
}
