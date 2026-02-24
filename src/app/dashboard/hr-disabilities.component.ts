import { HttpClient } from '@angular/common/http';
import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { MenuItem, MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { DeviceService } from '../services/device.service';
import { OrganizationService } from '../services/organization.service';
import { getEnv } from '../utils/env.utils';
import { getStatusLabel } from './modules/shared/utils/hr-status.utils';
import { DocumentRequestsService } from './modules/document-requests/data/document-requests.service';
import { DocumentRequestsComponent } from './modules/document-requests/ui/document-requests.component';
import { TimelogCorrectionsComponent } from './modules/timelog-corrections/ui/timelog-corrections.component';
import { UniformRequestsComponent } from './modules/uniform-requests/ui/uniform-requests.component';
import { VacationsService } from './modules/vacations/data/vacations.service';
import { VacationsComponent } from './modules/vacations/ui/vacations.component';
import { DisabilitiesTabComponent } from './modules/disabilities/ui/disabilities-tab.component';
import { CompensatoryTabComponent } from './modules/compensatory/ui/compensatory-tab.component';
import { WorkPermitsService } from './modules/work-permits/data/work-permits.service';
import { WorkPermitsComponent } from './modules/work-permits/ui/work-permits.component';

@Component({
  selector: 'pt-hr-disabilities',
  standalone: true,
  imports: [
    FormsModule,
    ButtonModule,
    InputTextModule,
    SplitButtonModule,
    ToastModule,
    TooltipModule,
    DocumentRequestsComponent,
    VacationsComponent,
    TimelogCorrectionsComponent,
    UniformRequestsComponent,
    DisabilitiesTabComponent,
    CompensatoryTabComponent,
    WorkPermitsComponent,
  ],
  providers: [MessageService],
  template: `
    <p-toast />
    <div
      class="h-screen flex flex-col bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 overflow-hidden"
    >
      @if (device.isDesktop()) {
      <!-- Header Compacto con Búsqueda Global (Desktop) -->
      <div
        class="bg-gradient-to-r from-neutral-800 via-neutral-800/95 to-neutral-800 border-b border-neutral-700/50 shadow-xl sticky top-0 z-40 backdrop-blur-sm"
      >
        <div class="px-4 py-2">
          <div class="flex items-center justify-between mb-2 gap-4">
            <div class="flex-1 min-w-0">
              <h1
                class="text-xl font-bold bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent m-0"
              >
                Dashboard de RRHH
              </h1>
              <p
                class="text-xs text-gray-400 m-0 mt-0.5 flex items-center gap-1.5"
              >
                <i class="pi pi-shield text-cyan-400 text-xs"></i>
                <span class="truncate"
                  >Gestión integral de solicitudes y tiempo compensatorio</span
                >
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
              <p-button
                icon="pi pi-shield"
                [label]="''"
                [outlined]="true"
                severity="secondary"
                size="small"
                (onClick)="openAuditHistoryDialog()"
                pTooltip="Ver historial de auditoría completo"
                tooltipPosition="bottom"
              />
              <p-splitButton
                icon="pi pi-download"
                [label]="''"
                [model]="exportMenuItems"
                (onClick)="exportData()"
                [outlined]="true"
                severity="secondary"
                size="small"
                [disabled]="isRefreshing()"
                pTooltip="Exportar datos a Excel"
                tooltipPosition="bottom"
              />
              <p-button
                icon="pi pi-refresh"
                [label]="''"
                [outlined]="true"
                severity="secondary"
                size="small"
                (onClick)="refreshAll()"
                [loading]="isRefreshing()"
                pTooltip="Actualizar todos los datos"
                tooltipPosition="bottom"
              />
            </div>
          </div>

          <!-- Búsqueda Global Compacta -->
          <div class="relative">
            <input
              type="text"
              pInputText
              placeholder="🔍 Búsqueda rápida: empleado, email, descripción, motivo..."
              [(ngModel)]="globalSearchText"
              (input)="onGlobalSearch()"
              class="w-full pl-10 pr-8 py-1.5 text-sm bg-neutral-900/50 border-neutral-600 text-white placeholder-gray-500 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/20 transition-all"
            />
            <i
              class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
            ></i>
            @if (globalSearchText()) {
            <button
              (click)="clearGlobalSearch()"
              class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors p-1"
            >
              <i class="pi pi-times text-sm"></i>
            </button>
            }
          </div>
        </div>
      </div>

      <div class="px-4 py-2 space-y-2 flex-1 overflow-y-auto">
        <!-- Pestañas Compactas -->
        <div
          class="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-0.5 backdrop-blur-sm"
        >
          <div class="flex gap-1 flex-wrap">
            <button
              (click)="activeTab.set('disabilities')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'disabilities'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-heart mr-1.5 text-xs"></i>
              Incapacidades @if (disabilitiesPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ disabilitiesPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="activeTab.set('compensatory')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'compensatory'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-clock mr-1.5 text-xs"></i>
              Tiempo Compensatorio @if (compensatoryPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ compensatoryPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('documents')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'documents'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-file-edit mr-1.5 text-xs"></i>
              Solicitudes de Documentos @if (documentsPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ documentsPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('vacations')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'vacations'
                  ? 'bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 text-cyan-300 shadow-md border border-cyan-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-calendar mr-1.5 text-xs"></i>
              Vacaciones @if (vacationsPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ vacationsPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('timelog_correction')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'timelog_correction'
                  ? 'bg-gradient-to-r from-orange-500/20 to-orange-600/20 text-orange-300 shadow-md border border-orange-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-exclamation-triangle mr-1.5 text-xs"></i>
              Omisión de Marcación @if (timelogCorrectionPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ timelogCorrectionPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('uniform_request')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'uniform_request'
                  ? 'bg-gradient-to-r from-teal-500/20 to-teal-600/20 text-teal-300 shadow-md border border-teal-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-tag mr-1.5 text-xs"></i>
              Uniformes @if (uniformRequestPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ uniformRequestPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="navigateToTab('work_permits')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'work_permits'
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 shadow-md border border-amber-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-id-card mr-1.5 text-xs"></i>
              Permisos @if (workPermitsPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ workPermitsPendingCount() }}
              </span>
              }
            </button>
          </div>
        </div>

        @if (activeTab() === 'disabilities') {
        <pt-disabilities-tab
          [globalSearchText]="globalSearchText()"
          (pendingCountChange)="disabilitiesPendingCount.set($event)"
        />
        } @if (activeTab() === 'compensatory') {
        <pt-compensatory-tab
          [globalSearchText]="globalSearchText()"
          (pendingCountChange)="compensatoryPendingCount.set($event)"
        />
        } @if (activeTab() === 'documents') {
        <pt-document-requests />
        } @if (activeTab() === 'vacations') {
        <pt-vacations />
        } @if (activeTab() === 'timelog_correction') {
        <pt-timelog-corrections />
        } @if (activeTab() === 'uniform_request') {
        <pt-uniform-requests />
        } @if (activeTab() === 'work_permits') {
        <pt-work-permits />
        }
      </div>
    } @else {
      <!-- Vista móvil -->
      <div class="flex flex-col h-full overflow-hidden">
        <header class="flex-shrink-0 px-3 py-2 border-b border-neutral-700/50 bg-neutral-800/95 sticky top-0 z-30">
          <div class="flex items-center justify-between gap-2">
            <h1 class="text-base font-bold text-white truncate m-0">RRHH</h1>
            <div class="flex items-center gap-1">
              <p-button icon="pi pi-refresh" [label]="''" [outlined]="true" severity="secondary" size="small" (onClick)="refreshAll()" [loading]="isRefreshing()" pTooltip="Actualizar" tooltipPosition="bottom" />
              <p-splitButton icon="pi pi-download" [label]="''" [model]="exportMenuItems" (onClick)="exportData()" [outlined]="true" severity="secondary" size="small" [disabled]="isRefreshing()" pTooltip="Exportar" tooltipPosition="bottom" />
            </div>
          </div>
          <div class="mt-2 relative">
            <input type="text" pInputText placeholder="Buscar..." [(ngModel)]="globalSearchText" (input)="onGlobalSearch()" class="w-full text-sm py-2 pl-9 pr-8 bg-neutral-900/50 border-neutral-600 text-white placeholder-gray-500 rounded-lg" />
            <i class="pi pi-search absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm pointer-events-none"></i>
            @if (globalSearchText()) {
              <button type="button" (click)="clearGlobalSearch()" class="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 p-1"><i class="pi pi-times text-sm"></i></button>
            }
          </div>
        </header>

        <div class="flex overflow-x-auto gap-1 px-3 py-2 border-b border-neutral-700/50 bg-neutral-800/50 flex-shrink-0" style="scroll-snap-type: x mandatory;">
          <button (click)="activeTab.set('disabilities')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'disabilities' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-heart mr-1 text-xs"></i>Incapacidades @if (disabilitiesPendingCount() > 0) { <span class="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">{{ disabilitiesPendingCount() }}</span> }
          </button>
          <button (click)="activeTab.set('compensatory')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'compensatory' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-clock mr-1 text-xs"></i>Compensatorio @if (compensatoryPendingCount() > 0) { <span class="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">{{ compensatoryPendingCount() }}</span> }
          </button>
          <button (click)="navigateToTab('documents')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'documents' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-file-edit mr-1 text-xs"></i>Documentos
          </button>
          <button (click)="navigateToTab('vacations')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'vacations' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-calendar mr-1 text-xs"></i>Vacaciones
          </button>
          <button (click)="navigateToTab('timelog_correction')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'timelog_correction' ? 'bg-orange-500/20 text-orange-300 border border-orange-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-exclamation-triangle mr-1 text-xs"></i>Marcación
          </button>
          <button (click)="navigateToTab('uniform_request')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'uniform_request' ? 'bg-teal-500/20 text-teal-300 border border-teal-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-tag mr-1 text-xs"></i>Uniformes
          </button>
          <button (click)="navigateToTab('work_permits')" [class]="'flex-shrink-0 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ' + (activeTab() === 'work_permits' ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'text-gray-400 bg-neutral-700/30')">
            <i class="pi pi-id-card mr-1 text-xs"></i>Permisos @if (workPermitsPendingCount() > 0) { <span class="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded text-xs">{{ workPermitsPendingCount() }}</span> }
          </button>
        </div>

        <main class="flex-1 overflow-y-auto px-3 py-2">
          @if (activeTab() === 'disabilities') {
            <pt-disabilities-tab
              [globalSearchText]="globalSearchText()"
              (pendingCountChange)="disabilitiesPendingCount.set($event)"
            />
          }
          @if (activeTab() === 'compensatory') {
            <pt-compensatory-tab
              [globalSearchText]="globalSearchText()"
              (pendingCountChange)="compensatoryPendingCount.set($event)"
            />
          }
          @if (activeTab() === 'documents') { <pt-document-requests /> }
          @if (activeTab() === 'vacations') { <pt-vacations /> }
          @if (activeTab() === 'timelog_correction') { <pt-timelog-corrections /> }
          @if (activeTab() === 'uniform_request') { <pt-uniform-requests /> }
          @if (activeTab() === 'work_permits') { <pt-work-permits /> }
        </main>
      </div>
    }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HRDisabilitiesComponent {
  protected device = inject(DeviceService);
  private vacationsService = inject(VacationsService);
  private documentRequestsService = inject(DocumentRequestsService);
  private workPermitsService = inject(WorkPermitsService);
  private http = inject(HttpClient);
  private messageService = inject(MessageService);
  private organizationService = inject(OrganizationService);

  private disabilitiesTab = viewChild(DisabilitiesTabComponent);
  private compensatoryTab = viewChild(CompensatoryTabComponent);
  private documentRequestsTab = viewChild(DocumentRequestsComponent);
  private vacationsTab = viewChild(VacationsComponent);
  private timelogCorrectionsTab = viewChild(TimelogCorrectionsComponent);
  private uniformRequestsTab = viewChild(UniformRequestsComponent);
  private workPermitsTab = viewChild(WorkPermitsComponent);

  public exportMenuItems: MenuItem[] = [
    { label: 'Reporte General', icon: 'pi pi-file-excel', command: () => this.exportAllData() },
  ];

  public activeTab = signal<
    | 'disabilities'
    | 'compensatory'
    | 'documents'
    | 'vacations'
    | 'timelog_correction'
    | 'uniform_request'
    | 'work_permits'
  >('disabilities');
  public globalSearchText = signal('');

  public disabilitiesPendingCount = signal(0);
  public compensatoryPendingCount = signal(0);

  public vacationsPendingCount = computed(
    () =>
      this.vacationsService.value().filter((v) => v.status === 'pending')
        .length || 0
  );

  public documentsPendingCount = computed(
    () =>
      this.documentRequestsService
        .value()
        .filter(
          (d) =>
            d.status === 'pending' &&
            d.document_type !== 'timelog_correction' &&
            d.document_type !== 'uniform_request'
        ).length || 0
  );

  public timelogCorrectionPendingCount = computed(
    () =>
      this.documentRequestsService
        .value()
        .filter(
          (d) =>
            d.status === 'pending' && d.document_type === 'timelog_correction'
        ).length || 0
  );

  public uniformRequestPendingCount = computed(
    () =>
      this.documentRequestsService
        .value()
        .filter(
          (d) => d.status === 'pending' && d.document_type === 'uniform_request'
        ).length || 0
  );

  public workPermitsPendingCount = computed(
    () =>
      this.workPermitsService.value().filter((v) => v.status === 'pending')
        .length || 0
  );

  public isRefreshing = computed(
    () =>
      this.vacationsService.isLoading() ||
      this.documentRequestsService.isLoading()
  );

  public navigateToTab(
    tab:
      | 'disabilities'
      | 'compensatory'
      | 'documents'
      | 'vacations'
      | 'timelog_correction'
      | 'uniform_request'
      | 'work_permits'
  ): void {
    this.activeTab.set(tab);
  }

  public refreshAll(): void {
    this.disabilitiesTab()?.reload();
    this.compensatoryTab()?.reload();
    this.vacationsService.reload();
    this.documentRequestsService.reload();
    this.workPermitsService.reload();
  }

  public exportData(): void {
    switch (this.activeTab()) {
      case 'disabilities': this.disabilitiesTab()?.exportData(); break;
      case 'compensatory': this.compensatoryTab()?.exportData(); break;
      case 'documents': this.documentRequestsTab()?.exportData(); break;
      case 'vacations': this.vacationsTab()?.exportData(); break;
      case 'timelog_correction': this.timelogCorrectionsTab()?.exportData(); break;
      case 'uniform_request': this.uniformRequestsTab()?.exportData(); break;
      case 'work_permits': this.workPermitsTab()?.exportData(); break;
    }
  }

  public async exportAllData(): Promise<void> {
    try {
      const xlsxModule = await import('xlsx-js-style');
      const XLSX = (xlsxModule as any).default || xlsxModule;
      const { format } = await import('date-fns');
      const { styleDataSheet, styleGeneralSummary, MODULE_COLORS } = await import('./modules/shared/utils/excel-style.utils');

      this.messageService.add({ severity: 'info', summary: 'Generando reporte...', detail: 'Esto puede tomar unos segundos' });

      const companyId = this.organizationService.getCurrentCompanyId();
      if (!companyId) { this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo obtener la empresa actual' }); return; }

      // Fetch disabilities on-demand
      const disabilities = await firstValueFrom(this.http.get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/employee_disabilities`, {
        params: {
          select: 'id,employee_id,start_date,end_date,description,status,rejection_comment,created_at,employee:employees!employee_disabilities_employee_id_fkey(id,first_name,father_name,work_email,position:positions(name),branch:branches(name))',
          company_id: `eq.${companyId}`,
          order: 'created_at.desc',
        },
      }));

      // Fetch compensatory on-demand
      const compensatoryTypeId = 'f2d92995-96a0-414f-b64a-9823db776745';
      const compensatory = await firstValueFrom(this.http.get<any[]>(`${getEnv('ENV_SUPABASE_URL')}/rest/v1/timeoffs`, {
        params: {
          select: 'id,employee_id,date_from,date_to,compensatory_type,compensatory_amount,review_status,rejection_comment,notes,created_at,employee:employees!time_offs_employee_id_fkey(id,first_name,father_name,work_email,position:positions(name),branch:branches(name))',
          type_id: `eq.${compensatoryTypeId}`,
          company_id: `eq.${companyId}`,
          order: 'created_at.desc',
        },
      }));

      // Get from services (already loaded)
      const allDocRequests = this.documentRequestsService.value();
      const documents = allDocRequests.filter(d => d.document_type !== 'timelog_correction' && d.document_type !== 'uniform_request');
      const timelogCorrections = allDocRequests.filter(d => d.document_type === 'timelog_correction');
      const uniformRequests = allDocRequests.filter(d => d.document_type === 'uniform_request');
      const vacations = this.vacationsService.value();
      const workPermits = this.workPermitsService.value();

      // Status counting helper
      const count = (items: any[], field: string, approvedVal: string) => ({
        total: items.length,
        pending: items.filter(i => i[field] === 'pending').length,
        approved: items.filter(i => i[field] === approvedVal).length,
        rejected: items.filter(i => i[field] === 'rejected').length,
      });

      const stats = [
        { name: 'Incapacidades', ...count(disabilities, 'status', 'approved') },
        { name: 'Tiempo Compensatorio', ...count(compensatory, 'review_status', 'approved') },
        { name: 'Solicitudes de Documentos', ...count(documents, 'status', 'completed') },
        { name: 'Vacaciones', ...count(vacations, 'status', 'approved') },
        { name: 'Omisión de Marcación', ...count(timelogCorrections, 'status', 'completed') },
        { name: 'Uniformes', ...count(uniformRequests, 'status', 'completed') },
        { name: 'Permisos', ...count(workPermits, 'status', 'approved') },
      ];

      const wb = XLSX.utils.book_new();

      // Sheet 1: Summary
      const summaryRows: any[][] = [
        ['REPORTE GENERAL - Dashboard RRHH'],
        ['Fecha', format(new Date(), 'dd/MM/yyyy HH:mm:ss')],
        [''],
        ['Módulo', 'Total', 'Pendientes', 'Aprobadas/Completadas', 'Rechazadas'],
        ...stats.map(s => [s.name, s.total, s.pending, s.approved, s.rejected]),
        [''],
        ['TOTALES', stats.reduce((a, s) => a + s.total, 0), stats.reduce((a, s) => a + s.pending, 0), stats.reduce((a, s) => a + s.approved, 0), stats.reduce((a, s) => a + s.rejected, 0)],
      ];
      const summaryWs = XLSX.utils.aoa_to_sheet(summaryRows);
      summaryWs['!cols'] = [{ wch: 28 }, { wch: 10 }, { wch: 14 }, { wch: 24 }, { wch: 14 }];
      styleGeneralSummary(summaryWs, XLSX.utils, [
        MODULE_COLORS['disabilities'], MODULE_COLORS['compensatory'], MODULE_COLORS['documents'],
        MODULE_COLORS['vacations'], MODULE_COLORS['timelog_correction'], MODULE_COLORS['uniform_request'], MODULE_COLORS['work_permits'],
      ]);
      XLSX.utils.book_append_sheet(wb, summaryWs, 'Resumen General');

      // Helper
      const emp = (e: any) => `${e?.first_name || ''} ${e?.father_name || ''}`.trim();
      const fmtDate = (d: string) => d ? format(new Date(d), 'dd/MM/yyyy') : '';
      const fmtDateTime = (d: string) => d ? format(new Date(d), 'dd/MM/yyyy HH:mm') : '';
      const daysBetween = (s: string, e: string) => { const diff = Math.abs(new Date(e).getTime() - new Date(s).getTime()); return Math.ceil(diff / 86400000) + 1; };

      // Sheet 2: Disabilities
      const disData = disabilities.map(d => ({ Empleado: emp(d.employee), Email: d.employee?.work_email || '', Posición: d.employee?.position?.name || '', Sucursal: d.employee?.branch?.name || '', Inicio: fmtDate(d.start_date), Fin: fmtDate(d.end_date), Días: daysBetween(d.start_date, d.end_date), Descripción: d.description || '', Estado: getStatusLabel(d.status), 'Fecha Solicitud': fmtDateTime(d.created_at) }));
      if (disData.length) { const ws = XLSX.utils.json_to_sheet(disData); ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 40 }, { wch: 15 }, { wch: 18 }]; styleDataSheet(ws, XLSX.utils, MODULE_COLORS['disabilities']); XLSX.utils.book_append_sheet(wb, ws, 'Incapacidades'); }

      // Sheet 3: Compensatory
      const extractReason = (notes: any, reason?: string): string => {
        if (reason) return reason;
        const arr = Array.isArray(notes) ? notes : typeof notes === 'string' ? [notes] : [];
        for (const n of arr) { if (typeof n === 'string') { if (n.includes('Motivo:')) { const m = n.match(/Motivo:\s*(.+)/); return m?.[1]?.trim() || ''; } } }
        return '';
      };
      const compData = compensatory.map(c => ({ Empleado: emp(c.employee), Email: c.employee?.work_email || '', Posición: c.employee?.position?.name || '', Sucursal: c.employee?.branch?.name || '', 'Fecha Desde': fmtDate(c.date_from), 'Fecha Hasta': fmtDate(c.date_to), Tipo: c.compensatory_type === 'hours' ? 'Horas' : 'Días', Cantidad: c.compensatory_amount || 0, Motivo: extractReason(c.notes, c.reason), Estado: getStatusLabel(c.review_status), 'Fecha Solicitud': fmtDateTime(c.created_at) }));
      if (compData.length) { const ws = XLSX.utils.json_to_sheet(compData); ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 10 }, { wch: 30 }, { wch: 15 }, { wch: 18 }]; styleDataSheet(ws, XLSX.utils, MODULE_COLORS['compensatory']); XLSX.utils.book_append_sheet(wb, ws, 'Compensatorio'); }

      // Sheet 4: Documents
      const docTypeLabels: Record<string, string> = { work_certificate: 'Constancia Laboral', work_letter: 'Carta de Trabajo', salary_certificate: 'Constancia Salarial', employment_certificate: 'Certificación Laboral', social_security: 'Ficha Seguro Social', other: 'Otro' };
      const docData = documents.map(d => ({ Empleado: emp(d.employee), Email: d.employee?.work_email || '', Posición: d.employee?.position?.name || '', Sucursal: d.employee?.branch?.name || '', 'Tipo Documento': docTypeLabels[d.document_type] || d.document_type, Motivo: d.reason || '', Estado: getStatusLabel(d.status), 'Fecha Solicitud': fmtDateTime(d.created_at) }));
      if (docData.length) { const ws = XLSX.utils.json_to_sheet(docData); ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 22 }, { wch: 30 }, { wch: 15 }, { wch: 18 }]; styleDataSheet(ws, XLSX.utils, MODULE_COLORS['documents']); XLSX.utils.book_append_sheet(wb, ws, 'Documentos'); }

      // Sheet 5: Vacations
      const vacData = vacations.map(v => ({ Empleado: emp(v.employee), Email: v.employee?.work_email || '', Posición: v.employee?.position?.name || '', Sucursal: v.employee?.branch?.name || '', Inicio: fmtDate(v.start_date), Fin: fmtDate(v.end_date), Días: daysBetween(v.start_date, v.end_date), Motivo: v.reason || '', Estado: getStatusLabel(v.status), 'Fecha Solicitud': fmtDateTime(v.created_at) }));
      if (vacData.length) { const ws = XLSX.utils.json_to_sheet(vacData); ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 30 }, { wch: 15 }, { wch: 18 }]; styleDataSheet(ws, XLSX.utils, MODULE_COLORS['vacations']); XLSX.utils.book_append_sheet(wb, ws, 'Vacaciones'); }

      // Sheet 6: Timelog Corrections
      const tlTypeLabels: Record<string, string> = { entry: 'Entrada', lunch_start: 'Inicio Almuerzo', lunch_end: 'Fin Almuerzo', exit: 'Salida' };
      const tlData = timelogCorrections.map(r => ({ Empleado: emp(r.employee), Email: r.employee?.work_email || '', Posición: r.employee?.position?.name || '', Sucursal: r.employee?.branch?.name || '', 'Fecha Marcación': r.metadata?.timelog_date ? fmtDate(r.metadata.timelog_date) : '', 'Tipo Marcación': tlTypeLabels[r.metadata?.timelog_type || ''] || '', Motivo: r.reason || '', Estado: getStatusLabel(r.status), 'Fecha Solicitud': fmtDateTime(r.created_at) }));
      if (tlData.length) { const ws = XLSX.utils.json_to_sheet(tlData); ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 30 }, { wch: 15 }, { wch: 18 }]; styleDataSheet(ws, XLSX.utils, MODULE_COLORS['timelog_correction']); XLSX.utils.book_append_sheet(wb, ws, 'Omisión Marcación'); }

      // Sheet 7: Uniform Requests
      const uniData = uniformRequests.map(r => ({ Empleado: emp(r.employee), Email: r.employee?.work_email || '', Posición: r.employee?.position?.name || '', Sucursal: r.employee?.branch?.name || '', Prenda: r.metadata?.item_type || '', Talla: r.metadata?.size || '', Cantidad: r.metadata?.quantity || 0, Estado: getStatusLabel(r.status), 'Fecha Solicitud': fmtDateTime(r.created_at) }));
      if (uniData.length) { const ws = XLSX.utils.json_to_sheet(uniData); ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 15 }, { wch: 18 }]; styleDataSheet(ws, XLSX.utils, MODULE_COLORS['uniform_request']); XLSX.utils.book_append_sheet(wb, ws, 'Uniformes'); }

      // Sheet 8: Work Permits
      const permitTypeLabels: Record<string, string> = { family_death: 'Defunción', personal: 'Personal', medical: 'Tema Médico', other: 'Otros' };
      const wpData = workPermits.map(p => ({ Empleado: emp(p.employee), Email: p.employee?.work_email || '', Posición: p.employee?.position?.name || '', Sucursal: p.employee?.branch?.name || '', 'Tipo Permiso': permitTypeLabels[p.permit_type] || p.permit_type, Inicio: fmtDate(p.start_date), Fin: fmtDate(p.end_date), 'Hora Inicio': p.start_time || '', 'Hora Fin': p.end_time || '', Equivalente: p.equivalent_value ? `${p.equivalent_value} ${p.equivalent_unit === 'hours' ? 'horas' : 'días'}` : '', Observaciones: p.observations || '', Estado: getStatusLabel(p.status), 'Fecha Solicitud': fmtDateTime(p.created_at) }));
      if (wpData.length) { const ws = XLSX.utils.json_to_sheet(wpData); ws['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 20 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 30 }, { wch: 15 }, { wch: 18 }]; styleDataSheet(ws, XLSX.utils, MODULE_COLORS['work_permits']); XLSX.utils.book_append_sheet(wb, ws, 'Permisos'); }

      XLSX.writeFile(wb, `Reporte_General_RRHH_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`);
      this.messageService.add({ severity: 'success', summary: 'Reporte generado', detail: 'El reporte general ha sido exportado exitosamente' });
    } catch (error) {
      console.error('Error generando reporte general:', error);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo generar el reporte general' });
    }
  }

  public openAuditHistoryDialog(): void {
    this.compensatoryTab()?.openAuditHistoryDialog();
  }

  public onGlobalSearch(): void {
    // Applied automatically via input binding to child components
  }

  public clearGlobalSearch(): void {
    this.globalSearchText.set('');
  }
}
