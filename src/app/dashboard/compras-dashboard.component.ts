import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { DocumentRequestsService } from './modules/document-requests/data/document-requests.service';
import { SupplyRequestsComponent } from './modules/supply-requests/ui/supply-requests.component';
import { UniformRequestsComponent } from './modules/uniform-requests/ui/uniform-requests.component';
import { DeviceService } from '../services/device.service';

@Component({
  selector: 'pt-compras-dashboard',
  standalone: true,
  imports: [
    ButtonModule,
    ToastModule,
    TooltipModule,
    SupplyRequestsComponent,
    UniformRequestsComponent,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <p-toast />
    <div
      class="h-screen flex flex-col bg-gradient-to-br from-neutral-900 via-neutral-900 to-neutral-800 overflow-hidden"
    >
      <!-- Header -->
      <div
        class="bg-gradient-to-r from-neutral-800 via-neutral-800/95 to-neutral-800 border-b border-neutral-700/50 shadow-xl sticky top-0 z-40 backdrop-blur-sm"
      >
        <div class="px-4 py-2">
          <div class="flex items-center justify-between mb-2 gap-4">
            <div class="flex-1 min-w-0">
              <h1
                class="text-xl font-bold bg-gradient-to-r from-white via-amber-100 to-amber-300 bg-clip-text text-transparent m-0"
              >
                Dashboard de Compras
              </h1>
              <p class="text-xs text-gray-400 m-0 mt-0.5 flex items-center gap-1.5">
                <i class="pi pi-shopping-cart text-amber-400 text-xs"></i>
                <span class="truncate">Gestión de insumos y uniformes</span>
              </p>
            </div>
            <div class="flex items-center gap-2 flex-shrink-0">
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
        </div>
      </div>

      <div class="px-4 py-2 space-y-2 flex-1 overflow-y-auto">
        <!-- Pestañas -->
        <div
          class="bg-neutral-800/50 rounded-lg border border-neutral-700/50 p-0.5 backdrop-blur-sm"
        >
          <div class="flex gap-1">
            <button
              (click)="activeTab.set('supply_request')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'supply_request'
                  ? 'bg-gradient-to-r from-amber-500/20 to-amber-600/20 text-amber-300 shadow-md border border-amber-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-box mr-1.5 text-xs"></i>
              Insumos
              @if (supplyPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ supplyPendingCount() }}
              </span>
              }
            </button>
            <button
              (click)="activeTab.set('uniform_request')"
              [class]="
                'px-3 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ' +
                (activeTab() === 'uniform_request'
                  ? 'bg-gradient-to-r from-teal-500/20 to-teal-600/20 text-teal-300 shadow-md border border-teal-400/30'
                  : 'text-gray-400 hover:text-white hover:bg-neutral-700/50')
              "
            >
              <i class="pi pi-tag mr-1.5 text-xs"></i>
              Uniformes
              @if (uniformPendingCount() > 0) {
              <span
                class="ml-1.5 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 rounded-full text-xs font-bold"
              >
                {{ uniformPendingCount() }}
              </span>
              }
            </button>
          </div>
        </div>

        @if (activeTab() === 'supply_request') {
        <pt-supply-requests />
        } @if (activeTab() === 'uniform_request') {
        <pt-uniform-requests />
        }
      </div>
    </div>
  `,
})
export class ComprasDashboardComponent {
  private docService = inject(DocumentRequestsService);
  protected device = inject(DeviceService);

  public activeTab = signal<'supply_request' | 'uniform_request'>('supply_request');

  public supplyPendingCount = computed(() =>
    this.docService.value().filter(
      (d) => d.document_type === 'supply_request' && d.status === 'pending'
    ).length
  );

  public uniformPendingCount = computed(() =>
    this.docService.value().filter(
      (d) => d.document_type === 'uniform_request' && d.status === 'pending'
    ).length
  );

  public isRefreshing = computed(() => this.docService.isLoading());

  public refreshAll(): void {
    this.docService.reload();
  }
}
