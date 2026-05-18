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
import { ProgressBarModule } from 'primeng/progressbar';
import { SelectModule } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TextareaModule } from 'primeng/textarea';
import { ApiUrlService } from '../services/api-url.service';

type LicenseType = 'subscription' | 'perpetual' | 'oem' | 'free';

interface License {
  id: string;
  software: string;
  version: string | null;
  vendor: string | null;
  license_type: LicenseType;
  expiry_date: string | null;
  total_seats: number | null;
  used_seats: number | null;
  annual_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'pt-it-licenses',
  standalone: true,
  imports: [
    DatePipe, DecimalPipe, FormsModule, ButtonModule, CardModule, ConfirmDialogModule,
    DialogModule, InputNumberModule, InputTextModule, ProgressSpinnerModule, ProgressBarModule,
    SelectModule, TableModule, TagModule, TextareaModule,
  ],
  providers: [MessageService, ConfirmationService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="px-3 sm:px-5 md:px-8 pt-3 pb-4 space-y-3">
      <div class="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 class="text-2xl font-bold text-gray-100 m-0">Licencias de Software</h2>
          <p class="text-sm text-gray-400 m-0 mt-0.5">{{ totalCount() }} licencia(s) · {{ expiringSoonCount() }} vence(n) en 60 días · costo anual \${{ totalCost() | number:'1.2-2' }}</p>
        </div>
        <p-button label="Nueva licencia" icon="pi pi-plus" size="small" (onClick)="openNew()" />
      </div>

      <p-confirmDialog />
      <p-card>
        @if (licensesApi.isLoading()) {
          <div class="flex justify-center py-8"><p-progressSpinner styleClass="w-10 h-10" strokeWidth="3" /></div>
        } @else {
          <p-table [value]="licenses()" styleClass="p-datatable-sm" [paginator]="true" [rows]="20" sortField="software">
            <ng-template pTemplate="header">
              <tr class="text-xs">
                <th pSortableColumn="software">Software</th>
                <th>Vendor</th>
                <th pSortableColumn="license_type">Tipo</th>
                <th pSortableColumn="expiry_date">Vencimiento</th>
                <th>Asientos</th>
                <th pSortableColumn="annual_cost">Costo/año</th>
                <th style="width:100px"></th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-l>
              <tr>
                <td>
                  <div class="font-medium text-gray-100">{{ l.software }}</div>
                  @if (l.version) { <div class="text-[10px] text-gray-500">v{{ l.version }}</div> }
                </td>
                <td class="text-gray-300 text-xs">{{ l.vendor || '—' }}</td>
                <td><p-tag [severity]="typeSeverity(l.license_type)" [value]="typeLabel(l.license_type)" /></td>
                <td>
                  @if (l.expiry_date) {
                    <span [class]="isExpiringSoon(l.expiry_date) ? 'text-amber-400 font-bold text-xs' : 'text-gray-400 text-xs'">
                      @if (isExpiringSoon(l.expiry_date)) { <i class="pi pi-exclamation-triangle mr-1"></i> }
                      {{ l.expiry_date | date:'dd/MM/yyyy' }}
                    </span>
                  } @else { <span class="text-gray-500">—</span> }
                </td>
                <td class="text-xs">
                  @if (l.total_seats) {
                    <div class="text-gray-300">{{ l.used_seats || 0 }} / {{ l.total_seats }}</div>
                    <p-progressBar [value]="seatPct(l)" [showValue]="false" styleClass="h-1 mt-1" />
                  } @else { <span class="text-gray-500">—</span> }
                </td>
                <td class="text-gray-200">
                  @if (l.annual_cost) { \${{ l.annual_cost | number:'1.2-2' }} } @else { <span class="text-gray-500">—</span> }
                </td>
                <td>
                  <div class="flex gap-1">
                    <p-button icon="pi pi-pencil" size="small" severity="secondary" [text]="true" (onClick)="edit(l)" />
                    <p-button icon="pi pi-trash" size="small" severity="danger"   [text]="true" (onClick)="confirmRemove(l)" />
                  </div>
                </td>
              </tr>
            </ng-template>
            <ng-template pTemplate="emptymessage">
              <tr><td colspan="7" class="text-center py-8 text-gray-500">Sin licencias registradas</td></tr>
            </ng-template>
          </p-table>
        }
      </p-card>

      <p-dialog [(visible)]="showDialog" [header]="dialogTitle()" [modal]="true" [style]="{width:'560px'}" [dismissableMask]="true" [closeOnEscape]="true">
        <div class="grid grid-cols-2 gap-3 pt-2">
          <div class="col-span-2">
            <label class="text-xs text-gray-400 block mb-1">Software *</label>
            <input pInputText [(ngModel)]="form.software" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Versión</label>
            <input pInputText [(ngModel)]="form.version" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Vendor</label>
            <input pInputText [(ngModel)]="form.vendor" class="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Tipo</label>
            <p-select [(ngModel)]="form.license_type" [options]="licenseTypes" styleClass="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Vencimiento</label>
            <input pInputText [(ngModel)]="form.expiry_date" class="w-full" placeholder="YYYY-MM-DD" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Total asientos</label>
            <p-inputnumber [(ngModel)]="form.total_seats" styleClass="w-full" />
          </div>
          <div>
            <label class="text-xs text-gray-400 block mb-1">Asientos usados</label>
            <p-inputnumber [(ngModel)]="form.used_seats" styleClass="w-full" />
          </div>
          <div class="col-span-2">
            <label class="text-xs text-gray-400 block mb-1">Costo anual ($)</label>
            <p-inputnumber [(ngModel)]="form.annual_cost" mode="decimal" [minFractionDigits]="2" styleClass="w-full" />
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
export class ItLicensesComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private msg = inject(MessageService);
  private confirmSvc = inject(ConfirmationService);

  readonly licenseTypes = [
    { label: 'Suscripción', value: 'subscription' },
    { label: 'Perpetua',    value: 'perpetual'    },
    { label: 'OEM',         value: 'oem'          },
    { label: 'Gratuita',    value: 'free'         },
  ];

  showDialog = false;
  saving = signal(false);
  form: Partial<License> = { license_type: 'subscription' };

  licensesApi = httpResource<License[]>(() => ({
    url: this.apiUrl.build('rest/v1/it_software_licenses', { order: 'software.asc' }),
    method: 'GET',
  }));

  licenses          = computed(() => this.licensesApi.value() ?? []);
  totalCount        = computed(() => this.licenses().length);
  expiringSoonCount = computed(() => this.licenses().filter(l => l.expiry_date && this.isExpiringSoon(l.expiry_date)).length);
  totalCost         = computed(() => this.licenses().reduce((s, l) => s + (l.annual_cost ?? 0), 0));

  dialogTitle() { return this.form.id ? 'Editar Licencia' : 'Nueva Licencia'; }

  isExpiringSoon(date: string) {
    const d = new Date(date);
    return d <= new Date(Date.now() + 60 * 86400000) && d >= new Date();
  }

  seatPct(l: License) {
    if (!l.total_seats) return 0;
    return Math.round(((l.used_seats || 0) / l.total_seats) * 100);
  }

  typeSeverity(t: string) {
    return t === 'free' ? 'success' : t === 'perpetual' ? 'secondary' : 'info';
  }
  typeLabel(t: string) {
    const m: Record<string, string> = { subscription: 'Suscripción', perpetual: 'Perpetua', oem: 'OEM', free: 'Gratuita' };
    return m[t] || t;
  }

  openNew() {
    this.form = { license_type: 'subscription' };
    this.showDialog = true;
  }

  edit(l: License) {
    this.form = { ...l };
    this.showDialog = true;
  }

  async save() {
    if (!this.form.software?.trim()) {
      this.msg.add({ severity: 'warn', summary: 'Falta software', detail: 'El nombre del software es requerido.' });
      return;
    }
    this.saving.set(true);
    const payload: any = {
      software:     this.form.software?.trim(),
      version:      this.form.version || null,
      vendor:       this.form.vendor || null,
      license_type: this.form.license_type || 'subscription',
      expiry_date:  this.form.expiry_date || null,
      total_seats:  this.form.total_seats ?? null,
      used_seats:   this.form.used_seats ?? null,
      annual_cost:  this.form.annual_cost ?? null,
      notes:        this.form.notes || null,
      updated_at:   new Date().toISOString(),
    };
    try {
      if (this.form.id) {
        await firstValueFrom(this.http.patch(
          this.apiUrl.build('rest/v1/it_software_licenses', { id: `eq.${this.form.id}` }),
          payload, { headers: { Prefer: 'return=minimal' } }
        ));
      } else {
        await firstValueFrom(this.http.post(
          this.apiUrl.build('rest/v1/it_software_licenses'),
          payload, { headers: { Prefer: 'return=minimal' } }
        ));
      }
      this.showDialog = false;
      this.msg.add({ severity: 'success', summary: 'Guardado', detail: 'Licencia guardada.' });
      this.licensesApi.reload();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar.' });
    } finally {
      this.saving.set(false);
    }
  }

  confirmRemove(l: License) {
    this.confirmSvc.confirm({
      message: `¿Eliminar la licencia de ${l.software}?`,
      header:  'Confirmar',
      icon:    'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancelar',
      accept:  () => this.remove(l),
    });
  }

  async remove(l: License) {
    try {
      await firstValueFrom(this.http.delete(
        this.apiUrl.build('rest/v1/it_software_licenses', { id: `eq.${l.id}` }),
        { headers: { Prefer: 'return=minimal' } }
      ));
      this.msg.add({ severity: 'success', summary: 'Eliminada', detail: `Licencia eliminada.` });
      this.licensesApi.reload();
    } catch {
      this.msg.add({ severity: 'error', summary: 'Error', detail: 'No se pudo eliminar.' });
    }
  }
}
