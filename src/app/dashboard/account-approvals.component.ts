import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpClient, httpResource } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { ConfirmationService } from 'primeng/api';
import { DatePipe } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { IconField } from 'primeng/iconfield';
import { InputIcon } from 'primeng/inputicon';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { CardModule } from 'primeng/card';
import { FormsModule } from '@angular/forms';
import { Employee } from '../models';

interface PendingAccount extends Omit<Employee, 'created_at' | 'account_approved'> {
  account_approved: boolean | null;
  has_portal_access: boolean;
  created_at: string | Date;
}

@Component({
  selector: 'pt-account-approvals',
  standalone: true,
  imports: [
    TableModule,
    ButtonModule,
    TagModule,
    TooltipModule,
    InputTextModule,
    IconField,
    InputIcon,
    ToastModule,
    ConfirmDialogModule,
    CardModule,
    FormsModule,
    DatePipe,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <p-toast />
    <p-confirmDialog />

    <div class="space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold text-white m-0">Aprobación de Cuentas</h2>
          <p class="text-sm text-gray-400 m-0 mt-1">
            Revisa y aprueba las cuentas de empleados pendientes de acceso al portal
          </p>
        </div>
        <div class="flex items-center gap-3">
          <p-button
            icon="pi pi-refresh"
            label="Actualizar"
            [outlined]="true"
            severity="secondary"
            (onClick)="pendingAccountsApi.reload()"
            [loading]="pendingAccountsApi.isLoading()"
          />
        </div>
      </div>

      <!-- Estadísticas -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Cuentas Pendientes</p>
              <p class="text-2xl font-bold text-yellow-400 m-0 mt-1">{{ pendingCount() }}</p>
            </div>
            <i class="pi pi-clock text-3xl text-yellow-500"></i>
          </div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Con Acceso al Portal</p>
              <p class="text-2xl font-bold text-blue-400 m-0 mt-1">{{ withPortalAccess() }}</p>
            </div>
            <i class="pi pi-user text-3xl text-blue-500"></i>
          </div>
        </div>
        <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
          <div class="flex items-center justify-between">
            <div>
              <p class="text-sm text-gray-400 m-0">Sin Acceso al Portal</p>
              <p class="text-2xl font-bold text-gray-400 m-0 mt-1">{{ withoutPortalAccess() }}</p>
            </div>
            <i class="pi pi-user-minus text-3xl text-gray-500"></i>
          </div>
        </div>
      </div>

      <!-- Tabla de Cuentas Pendientes -->
      <p-card class="bg-neutral-800 border-neutral-700">
        <ng-template #title>Cuentas en Espera de Aprobación</ng-template>
        <p-table
          #dt
          [value]="filteredAccounts()"
          [loading]="pendingAccountsApi.isLoading()"
          [paginator]="true"
          [rows]="10"
          [rowsPerPageOptions]="[5, 10, 20, 50]"
          [scrollable]="true"
          dataKey="id"
          paginatorDropdownAppendTo="body"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} cuentas"
          [globalFilterFields]="['first_name', 'father_name', 'work_email', 'position.name', 'branch.name']"
        >
          <ng-template #caption>
            <div class="flex gap-2 items-center">
              <p-iconfield iconPosition="left">
                <p-inputicon>
                  <i class="pi pi-search"></i>
                </p-inputicon>
                <input
                  pInputText
                  type="text"
                  (input)="dt.filterGlobal($event.target.value, 'contains')"
                  placeholder="Buscar por nombre, email, cargo..."
                  class="w-full"
                />
              </p-iconfield>
            </div>
          </ng-template>
          <ng-template #header>
            <tr>
              <th pSortableColumn="first_name">
                Empleado <p-sortIcon field="first_name" />
              </th>
              <th pSortableColumn="work_email">
                Email <p-sortIcon field="work_email" />
              </th>
              <th pSortableColumn="position.name">
                Cargo <p-sortIcon field="position" />
              </th>
              <th pSortableColumn="branch.name">
                Sucursal <p-sortIcon field="branch" />
              </th>
              <th pSortableColumn="has_portal_access">
                Acceso Portal <p-sortIcon field="has_portal_access" />
              </th>
              <th pSortableColumn="created_at">
                Fecha de Solicitud <p-sortIcon field="created_at" />
              </th>
              <th>Acciones</th>
            </tr>
          </ng-template>
          <ng-template #body let-account>
            <tr>
              <td>
                <div class="flex flex-col">
                  <span class="font-semibold text-white">
                    {{ account.first_name }} {{ account.father_name }}
                  </span>
                  @if(account.document_id) {
                  <span class="text-xs text-gray-400">C.I.: {{ account.document_id }}</span>
                  }
                </div>
              </td>
              <td>
                <span class="text-gray-300">{{ account.work_email || account.email || '-' }}</span>
              </td>
              <td>
                <span class="text-gray-300">{{ account.position?.name || 'Sin cargo' }}</span>
              </td>
              <td>
                <span class="text-gray-300">{{ account.branch?.name || 'Sin sucursal' }}</span>
              </td>
              <td>
                @if(account.has_portal_access) {
                <p-tag value="Sí" severity="success" icon="pi pi-check" />
                } @else {
                <p-tag value="No" severity="secondary" icon="pi pi-times" />
                }
              </td>
              <td>
                <span class="text-gray-300">{{ account.created_at | date : 'medium' }}</span>
              </td>
              <td>
                <div class="flex gap-2">
                  @if(account.has_portal_access) {
                  <p-button
                    icon="pi pi-check-circle"
                    severity="success"
                    [rounded]="true"
                    [text]="true"
                    (onClick)="approveAccount(account)"
                    [loading]="processingId() === account.id"
                    pTooltip="Aprobar cuenta"
                    tooltipPosition="top"
                  />
                  <p-button
                    icon="pi pi-times-circle"
                    severity="danger"
                    [rounded]="true"
                    [text]="true"
                    (onClick)="rejectAccount(account)"
                    [loading]="processingId() === account.id"
                    pTooltip="Rechazar cuenta"
                    tooltipPosition="top"
                  />
                  } @else {
                  <p-button
                    icon="pi pi-info-circle"
                    severity="info"
                    [rounded]="true"
                    [text]="true"
                    [disabled]="true"
                    pTooltip="Primero debe habilitarse el acceso al portal desde la edición del empleado"
                    tooltipPosition="top"
                  />
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template #emptymessage>
            <tr>
              <td colspan="7">
                <div class="flex flex-col items-center justify-center gap-4 py-8">
                  <i class="pi pi-check-circle text-green-400 text-4xl"></i>
                  <p class="text-gray-400">No hay cuentas pendientes de aprobación</p>
                </div>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
  `,
  styles: `
    :host {
      display: block;
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountApprovalsComponent {
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private confirmationService = inject(ConfirmationService);

  public processingId = signal<string | null>(null);
  public searchText = signal<string>('');

  // API para obtener empleados con cuenta pendiente de aprobación
  public pendingAccountsApi = httpResource<PendingAccount[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
    method: 'GET',
    params: {
      select:
        '*,position:positions(id,name),branch:branches(id,name),department:departments(id,name)',
      or: '(account_approved.is.null,account_approved.eq.false)',
      has_portal_access: 'eq.true',
      order: 'created_at.desc',
    },
  }));

  // Estadísticas
  public pendingCount = computed(() => this.pendingAccountsApi.value()?.length || 0);
  public withPortalAccess = computed(
    () => this.pendingAccountsApi.value()?.filter((a) => a.has_portal_access).length || 0
  );
  public withoutPortalAccess = computed(
    () => this.pendingAccountsApi.value()?.filter((a) => !a.has_portal_access).length || 0
  );

  // Filtrar cuentas por búsqueda
  public filteredAccounts = computed(() => {
    const accounts = this.pendingAccountsApi.value() || [];
    const search = this.searchText().toLowerCase();
    if (!search) return accounts;

    return accounts.filter(
      (account) =>
        account.first_name?.toLowerCase().includes(search) ||
        account.father_name?.toLowerCase().includes(search) ||
        account.work_email?.toLowerCase().includes(search) ||
        account.email?.toLowerCase().includes(search) ||
        account.position?.name?.toLowerCase().includes(search) ||
        account.branch?.name?.toLowerCase().includes(search)
    );
  });

  public approveAccount(account: PendingAccount): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas aprobar la cuenta de ${account.first_name} ${account.father_name}?`,
      header: 'Confirmar Aprobación',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.processingId.set(account.id);
        this.http
          .patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
            { account_approved: true },
            {
              params: { id: `eq.${account.id}` },
            }
          )
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'success',
                summary: 'Cuenta aprobada',
                detail: `La cuenta de ${account.first_name} ${account.father_name} ha sido aprobada exitosamente`,
              });
              this.pendingAccountsApi.reload();
              this.processingId.set(null);
            },
            error: (error) => {
              console.error('Error approving account:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo aprobar la cuenta. Por favor, intenta nuevamente.',
              });
              this.processingId.set(null);
            },
          });
      },
    });
  }

  public rejectAccount(account: PendingAccount): void {
    this.confirmationService.confirm({
      message: `¿Estás seguro de que deseas rechazar la cuenta de ${account.first_name} ${account.father_name}? Esta acción deshabilitará su acceso al portal.`,
      header: 'Confirmar Rechazo',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-secondary',
      accept: () => {
        this.processingId.set(account.id);
        this.http
          .patch(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/employees`,
            { account_approved: false, has_portal_access: false },
            {
              params: { id: `eq.${account.id}` },
            }
          )
          .subscribe({
            next: () => {
              this.messageService.add({
                severity: 'warn',
                summary: 'Cuenta rechazada',
                detail: `La cuenta de ${account.first_name} ${account.father_name} ha sido rechazada`,
              });
              this.pendingAccountsApi.reload();
              this.processingId.set(null);
            },
            error: (error) => {
              console.error('Error rejecting account:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: 'No se pudo rechazar la cuenta. Por favor, intenta nuevamente.',
              });
              this.processingId.set(null);
            },
          });
      },
    });
  }
}

