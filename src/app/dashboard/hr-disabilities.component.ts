import {
    ChangeDetectionStrategy,
    Component,
    computed,
    inject,
    signal,
    viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { DeviceService } from '../services/device.service';
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
    TooltipModule,
    DocumentRequestsComponent,
    VacationsComponent,
    TimelogCorrectionsComponent,
    UniformRequestsComponent,
    DisabilitiesTabComponent,
    CompensatoryTabComponent,
    WorkPermitsComponent,
  ],
  template: `
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
              <p-button
                icon="pi pi-download"
                [label]="''"
                [outlined]="true"
                severity="secondary"
                size="small"
                (onClick)="exportData()"
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
              <p-button icon="pi pi-download" [label]="''" [outlined]="true" severity="secondary" size="small" (onClick)="exportData()" [disabled]="isRefreshing()" pTooltip="Exportar" tooltipPosition="bottom" />
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

  private disabilitiesTab = viewChild(DisabilitiesTabComponent);
  private compensatoryTab = viewChild(CompensatoryTabComponent);

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
    this.compensatoryTab()?.exportData();
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
