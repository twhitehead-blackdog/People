import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { MultiSelectModule } from 'primeng/multiselect';
import { FormsModule } from '@angular/forms';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { PositionsStore } from '../stores/positions.store';
import { EmployeesStore } from '../stores/employees.store';
import { Position, Employee } from '../models';
import { catchError } from 'rxjs/operators';
import { of, firstValueFrom } from 'rxjs';
import { TooltipModule } from 'primeng/tooltip';
import { ApiUrlService } from '../services/api-url.service';
import { DeviceService } from '../services/device.service';
import { LoggerService } from '../services/logger.service';

interface OrgNode {
  position: Position;
  employees: Employee[];
  children: OrgNode[];
  parentId?: string;
}

@Component({
  selector: 'pt-organigrama',
  standalone: true,
  imports: [Card, Button, ToastModule, MultiSelectModule, FormsModule, OrganizationChartModule, TooltipModule],
  providers: [MessageService, PositionsStore, EmployeesStore],
  template: `
    <p-toast />
    <div class="organigrama-page w-full">
    @if (device.isDesktop()) {
    <p-card styleClass="organigrama-card">
      <ng-template #title>
        <div class="flex items-center justify-between w-full">
          <div>
            <h2 class="m-0 text-xl font-bold text-white">Organigrama</h2>
            <p class="text-sm text-gray-400 m-0 mt-1">
              Visualiza y configura la estructura organizacional basada en posiciones laborales
            </p>
          </div>
        </div>
      </ng-template>

      <div class="organigrama-container">
        <!-- Tabs para Organigrama y Configuración -->
        <div class="organigrama-tabs">
          <button
            class="tab-button"
            [class.active]="activeTab() === 'view'"
            (click)="activeTab.set('view')"
          >
            <i class="pi pi-sitemap"></i>
            <span>Vista del Organigrama</span>
          </button>
          <button
            class="tab-button"
            [class.active]="activeTab() === 'config'"
            (click)="activeTab.set('config')"
          >
            <i class="pi pi-cog"></i>
            <span>Configuración</span>
          </button>
        </div>

        <!-- Vista del Organigrama -->
        @if (activeTab() === 'view') {
          <div class="organigrama-view-section">
            <!-- Debug info -->
            <div class="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded text-xs text-blue-300">
              <div>Estructura cargada: {{ orgStructure().size }} relaciones</div>
              <div>Nodos raíz: {{ rootNodes().length }}</div>
              <div>Datos del chart: {{ orgChartData().length }} elementos</div>
              <div>Posiciones disponibles: {{ availablePositions().length }}</div>
            </div>
            
            <div class="organigrama-tree">
              @if (orgChartData() && orgChartData().length > 0) {
                <div class="org-chart-wrapper">
                  <p-organizationChart
                    [value]="orgChartData()"
                    [style]="{ width: '100%', height: 'auto' }"
                    selectionMode="single"
                    [collapsible]="true"
                    styleClass="compact-org-chart"
                  >
                  <ng-template let-node pTemplate="node">
                    <div class="org-node-box">
                      <div class="org-node-title">{{ node.data?.position?.name || node.label || 'Sin nombre' }}</div>
                      <div class="org-node-subtitle">{{ node.data?.position?.department?.name || 'Sin departamento' }}</div>
                      <div class="org-node-count">{{ (node.data?.employees?.length || 0) }} empleado{{ (node.data?.employees?.length || 0) !== 1 ? 's' : '' }}</div>
                    </div>
                  </ng-template>
                  </p-organizationChart>
                </div>
              } @else {
                <div class="text-center py-12 text-gray-400">
                  <i class="pi pi-sitemap text-4xl mb-4"></i>
                  <p>No hay estructura configurada.</p>
                  <p class="text-sm mt-2">Ve a la pestaña "Configuración" para configurar las relaciones.</p>
                  <p class="text-xs mt-4 text-gray-500">
                    Debug: Estructura={{ orgStructure().size }}, Raíces={{ rootNodes().length }}, Chart={{ orgChartData().length }}
                  </p>
                </div>
              }
            </div>
          </div>
        }

        <!-- Configuración del Organigrama -->
        @if (activeTab() === 'config') {
          <div class="organigrama-config-section">
            <!-- Botones de acción -->
            <div class="mb-6 flex justify-end gap-2">
              <p-button
                label="Restablecer"
                (click)="loadStructure()"
                icon="pi pi-refresh"
                severity="secondary"
                rounded
              />
              <p-button
                label="Guardar Estructura"
                (click)="saveStructure()"
                icon="pi pi-save"
                [disabled]="!hasChanges()"
                rounded
              />
            </div>

            <!-- Información de Estructura -->
            <div class="mb-6 p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <h4 class="text-amber-300 font-semibold mb-3">
                <i class="pi pi-info-circle mr-2"></i>Estructura Organizacional Black Dog
              </h4>
              <div class="text-sm text-gray-300 space-y-2">
                <div>
                  <strong class="text-amber-300">1. Dirección General:</strong> CEO → COO
                </div>
                <div>
                  <strong class="text-amber-300">2. Dirección Administrativa:</strong> Administrador
                  <ul class="ml-4 mt-1 text-xs text-gray-400">
                    <li>• RRHH → Asistente de RRHH / Encargada de Planilla</li>
                    <li>• Jefa de Contabilidad → Asistente de Contabilidad</li>
                  </ul>
                </div>
                <div>
                  <strong class="text-amber-300">3. Áreas Estratégicas:</strong> Mercadeo, Operaciones, Compras, Distribución, IT Manager → IT 2
                </div>
                <div>
                  <strong class="text-amber-300">4. Estructura de Tienda:</strong> Gerente de Tienda → Subgerente, Piso de Venta, Peluquero, Veterinario
                </div>
              </div>
            </div>

            <!-- Vista de Configuración -->
            <div class="mb-6">
              <h3 class="text-lg font-semibold text-white mb-4">Configurar Jerarquía</h3>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                @for (position of availablePositions(); track position.id) {
                  <div class="bg-neutral-800 rounded-lg p-4 border border-neutral-700">
                    <div class="flex items-center justify-between mb-3">
                      <div>
                        <h4 class="text-white font-medium">{{ position.name }}</h4>
                        <p class="text-sm text-gray-400">
                          {{ position.department?.name || 'Sin departamento' }}
                        </p>
                      </div>
                      <span class="text-xs text-gray-500">
                        {{ getEmployeeCount(position.id) }} empleados
                      </span>
                    </div>
                    <div class="mt-3">
                      <label class="block text-sm text-gray-300 mb-2">
                        Reporta a (puede seleccionar múltiples):
                      </label>
                      <p-multiSelect
                        [options]="getParentOptions(position.id)"
                        optionLabel="name"
                        optionValue="id"
                        [ngModel]="getParentIds(position.id)"
                        (ngModelChange)="setParents(position.id, $event)"
                        [showClear]="true"
                        placeholder="Seleccionar posición(es) superior(es)"
                        [display]="'chip'"
                        class="w-full"
                      />
                    </div>
                  </div>
                }
              </div>
            </div>
          </div>
        }
      </div>
    </p-card>
    } @else {
    <!-- Vista móvil Organigrama -->
    <div class="mobile-organigrama flex flex-col min-h-[60vh]">
      <header class="sticky top-0 z-20 bg-neutral-800/95 border-b border-neutral-700/50 px-3 py-3 shadow-sm">
        <h2 class="m-0 text-lg font-bold text-white">Organigrama</h2>
        <p class="text-xs text-gray-400 m-0 mt-1">Estructura organizacional</p>
        <div class="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
          <button
            type="button"
            class="tab-button-mobile flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [class.bg-amber-500/20]="activeTab() === 'view'"
            [class.text-amber-400]="activeTab() === 'view'"
            [class.border]="activeTab() === 'view'"
            [class.border-amber-500/50]="activeTab() === 'view'"
            [class.text-gray-400]="activeTab() !== 'view'"
            [class.bg-neutral-700/50]="activeTab() !== 'view'"
            (click)="activeTab.set('view')"
          >
            <i class="pi pi-sitemap mr-2"></i>Vista
          </button>
          <button
            type="button"
            class="tab-button-mobile flex-shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            [class.bg-amber-500/20]="activeTab() === 'config'"
            [class.text-amber-400]="activeTab() === 'config'"
            [class.border]="activeTab() === 'config'"
            [class.border-amber-500/50]="activeTab() === 'config'"
            [class.text-gray-400]="activeTab() !== 'config'"
            [class.bg-neutral-700/50]="activeTab() !== 'config'"
            (click)="activeTab.set('config')"
          >
            <i class="pi pi-cog mr-2"></i>Configuración
          </button>
        </div>
      </header>
      <main class="flex-1 overflow-y-auto px-3 py-3">
        @if (activeTab() === 'view') {
          @if (orgChartData() && orgChartData().length > 0) {
            <div class="organigrama-tree organigrama-tree-mobile">
              <p-organizationChart
                [value]="orgChartData()"
                [style]="{ width: '100%', height: 'auto' }"
                selectionMode="single"
                [collapsible]="true"
                styleClass="compact-org-chart"
              >
                <ng-template let-node pTemplate="node">
                  <div class="org-node-box">
                    <div class="org-node-title">{{ node.data?.position?.name || node.label || 'Sin nombre' }}</div>
                    <div class="org-node-subtitle">{{ node.data?.position?.department?.name || 'Sin departamento' }}</div>
                    <div class="org-node-count">{{ (node.data?.employees?.length || 0) }} empleado(s)</div>
                  </div>
                </ng-template>
              </p-organizationChart>
            </div>
          } @else {
            <div class="text-center py-12 text-gray-400 px-4">
              <i class="pi pi-sitemap text-4xl mb-4 block opacity-60"></i>
              <p class="text-sm font-medium">No hay estructura configurada</p>
              <p class="text-xs mt-2">Ve a Configuración para definir relaciones.</p>
            </div>
          }
        } @else {
          <div class="flex flex-col gap-3 pb-4">
            <div class="flex gap-2 justify-end">
              <p-button icon="pi pi-refresh" severity="secondary" rounded size="small" (click)="loadStructure()" pTooltip="Restablecer" />
              <p-button icon="pi pi-save" [disabled]="!hasChanges()" rounded size="small" (click)="saveStructure()" pTooltip="Guardar" />
            </div>
            @for (position of availablePositions(); track position.id) {
              <div class="rounded-xl border border-neutral-700/50 bg-neutral-800/80 p-3">
                <div class="flex items-center justify-between mb-2">
                  <div>
                    <p class="font-semibold text-white text-sm m-0">{{ position.name }}</p>
                    <p class="text-xs text-gray-400 m-0">{{ position.department?.name || 'Sin departamento' }}</p>
                  </div>
                  <span class="text-xs text-gray-500">{{ getEmployeeCount(position.id) }} emp.</span>
                </div>
                <label class="block text-xs text-gray-400 mb-1">Reporta a:</label>
                <p-multiSelect
                  [options]="getParentOptions(position.id)"
                  optionLabel="name"
                  optionValue="id"
                  [ngModel]="getParentIds(position.id)"
                  (ngModelChange)="setParents(position.id, $event)"
                  [showClear]="true"
                  placeholder="Superior(es)"
                  [display]="'chip'"
                  class="w-full"
                  styleClass="w-full"
                />
              </div>
            }
          </div>
        }
      </main>
    </div>
    }
    </div>
  `,
  styles: `
    :host { display: block; width: 100%; }
    :host ::ng-deep .organigrama-card.p-card {
      background: rgba(31, 41, 55, 0.95) !important;
      border: 1px solid rgba(75, 85, 99, 0.5) !important;
      border-radius: 0.75rem !important;
    }
    :host ::ng-deep .organigrama-card .p-card-body { background: transparent !important; }
    :host ::ng-deep .organigrama-card .p-card-title { color: #f3f4f6 !important; }

    .organigrama-container {
      padding: 1rem;
    }
    
    /* Tabs */
    .organigrama-tabs {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1.5rem;
      border-bottom: 2px solid rgba(255, 255, 255, 0.1);
    }
    
    .tab-button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      background: transparent;
      border: none;
      border-bottom: 2px solid transparent;
      color: #9ca3af;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
    }
    
    .tab-button:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.05);
    }
    
    .tab-button.active {
      color: #fbbf24;
      border-bottom-color: #fbbf24;
      background: rgba(251, 191, 36, 0.05);
    }
    
    .tab-button i {
      font-size: 1rem;
    }
    
    /* Secciones */
    .organigrama-view-section,
    .organigrama-config-section {
      animation: fadeIn 0.3s ease;
    }
    
    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    
    .organigrama-tree {
      min-height: 500px;
      padding: 1rem;
      background: #1f2937;
      border-radius: 0.5rem;
      border: 1px solid #374151;
      overflow: auto;
      max-height: calc(100vh - 200px);
      width: 100%;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    
    .org-chart-wrapper {
      width: 100%;
      display: flex;
      justify-content: center;
      padding: 0.5rem;
    }
    
    .org-chart-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      width: 100%;
    }
    
    .org-root-level {
      width: 100%;
    }
    
    .org-root-boxes {
      display: flex;
      justify-content: center;
      gap: 2rem;
      align-items: flex-start;
    }
    
    .org-root-box-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      position: relative;
    }
    
    .org-root-box {
      padding: 1.25rem 2rem;
      border-radius: 0.5rem;
      text-align: center;
      min-width: 200px;
      background: #374151;
      border: 2px solid #fbbf24;
      color: white;
      transition: all 0.2s;
      cursor: pointer;
    }
    
    .org-root-box:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 16px rgba(251, 191, 36, 0.3);
      border-color: #fcd34d;
    }
    
    .org-root-box-container::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      width: 2px;
      height: 2rem;
      background: #6b7280;
      transform: translateX(-50%);
      z-index: 1;
    }
    
    .org-root-boxes::before {
      content: '';
      position: absolute;
      top: calc(100% + 2rem);
      left: 0;
      right: 0;
      height: 2px;
      background: #6b7280;
      z-index: 1;
    }
    
    .org-root-box-container:only-child::after {
      display: block;
    }
    
    .org-box-title {
      font-weight: 600;
      font-size: 1rem;
      margin-bottom: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #fbbf24;
    }
    
    .org-box-subtitle {
      font-size: 0.8rem;
      opacity: 0.8;
      margin-bottom: 0.5rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      color: #d1d5db;
    }
    
    .org-box-count {
      font-size: 0.75rem;
      opacity: 0.7;
      margin-top: 0.5rem;
      padding-top: 0.5rem;
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      color: #9ca3af;
    }

    /* Estilos para PrimeNG OrganizationChart */
    ::ng-deep .p-organizationchart {
      background: transparent !important;
      width: 100% !important;
      height: auto !important;
      display: block !important;
      
      .p-organizationchart-table {
        width: 100% !important;
        table-layout: auto !important;
        margin: 0 auto !important;
        border-collapse: separate !important;
        border-spacing: 0.25rem !important;
      }
      
      .p-organizationchart-node-content {
        padding: 0.6rem 0.8rem !important;
        border-radius: 0.5rem !important;
        background: #374151 !important;
        border: 2px solid #fbbf24 !important;
        color: white !important;
        transition: all 0.2s;
        cursor: pointer;
        min-width: 130px !important;
        max-width: 150px !important;
        width: auto !important;
        font-size: 0.75rem !important;
        margin: 0.1rem !important;
        box-sizing: border-box !important;
      }

      .p-organizationchart-node-content:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(251, 191, 36, 0.4);
        border-color: #fcd34d !important;
        background: #4b5563 !important;
      }

      .p-organizationchart-lines {
        .p-organizationchart-line-down {
          background: #6b7280 !important;
          width: 2px !important;
        }
        .p-organizationchart-line-left {
          border-left: 2px solid #6b7280 !important;
        }
        .p-organizationchart-line-right {
          border-right: 2px solid #6b7280 !important;
        }
        .p-organizationchart-line-top {
          border-top: 2px solid #6b7280 !important;
        }
      }

      .p-organizationchart-node-content.p-organizationchart-selectable-node:not(.p-highlight):hover {
        background: #4b5563 !important;
        border-color: #fcd34d !important;
      }

      .p-organizationchart-node-content.p-highlight {
        background: #4b5563 !important;
        border-color: #fbbf24 !important;
      }
      
      td {
        padding: 0.1rem !important;
        vertical-align: top !important;
      }
    }

    .org-node-box {
      text-align: center;
      width: 100%;
      color: white !important;
      padding: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
    }

    .org-node-title {
      font-weight: 600;
      font-size: 0.7rem;
      margin-bottom: 0.15rem;
      color: #fbbf24 !important;
      white-space: normal;
      word-wrap: break-word;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      line-height: 1.15;
      max-height: 2.3em;
    }

    .org-node-subtitle {
      font-size: 0.55rem;
      opacity: 0.85;
      margin-bottom: 0.15rem;
      color: #d1d5db !important;
      white-space: normal;
      word-wrap: break-word;
      overflow: hidden;
      text-overflow: ellipsis;
      display: -webkit-box;
      -webkit-line-clamp: 1;
      -webkit-box-orient: vertical;
      line-height: 1.1;
      max-height: 1.65em;
    }

    .org-node-count {
      font-size: 0.55rem;
      opacity: 0.75;
      margin-top: 0.15rem;
      padding-top: 0.15rem;
      border-top: 1px solid rgba(255, 255, 255, 0.15);
      color: #9ca3af !important;
      display: block;
    }
    
    /* Estilos compactos para el organigrama */
    ::ng-deep .compact-org-chart {
      .p-organizationchart-table {
        margin: 0 auto !important;
        width: 100% !important;
        max-width: 100% !important;
      }
      
      .p-organizationchart-node-content {
        margin: 0.1rem !important;
      }
      
      .p-organizationchart-lines {
        .p-organizationchart-line-down {
          height: 0.5rem !important;
        }
      }
      
      td {
        padding: 0.1rem !important;
        text-align: center !important;
      }
      
      tr {
        display: table-row !important;
      }
    }

    .organigrama-tree-mobile {
      min-height: 300px;
      padding: 0.5rem;
      max-height: none;
    }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    .scrollbar-hide::-webkit-scrollbar { display: none; }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrganigramaComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private messageService = inject(MessageService);
  public positionsStore = inject(PositionsStore);
  public employeesStore = inject(EmployeesStore);
  protected device = inject(DeviceService);

  // Tab activa: 'view' o 'config'
  public activeTab = signal<'view' | 'config'>('view');

  // Estructura del organigrama: position_id -> Set<parent_position_id>
  // Permite múltiples padres para la misma posición
  public orgStructure = signal<Map<string, Set<string | null>>>(new Map());
  public originalStructure = signal<Map<string, Set<string | null>>>(new Map());

  public availablePositions = computed(() => {
    return this.positionsStore.entities();
  });

  public employees = computed(() => {
    return this.employeesStore.entities().filter((e) => e.is_active);
  });

  public getEmployeeCount(positionId: string): number {
    return this.employees().filter((e) => e.position_id === positionId).length;
  }

  public getParentIds(positionId: string): (string | null)[] {
    const parents = this.orgStructure().get(positionId);
    if (!parents || parents.size === 0) return [];
    return Array.from(parents);
  }
  
  public getParentId(positionId: string): string | null {
    const parents = this.getParentIds(positionId);
    return parents.length > 0 ? parents[0] : null;
  }

  public getParentOptions(currentPositionId: string) {
    return this.availablePositions().filter(
      (p) => p.id !== currentPositionId
    );
  }
  
  public getPositionName(positionId: string | null): string {
    if (!positionId) return '';
    const position = this.availablePositions().find(p => p.id === positionId);
    return position?.name || '';
  }
  
  public setParents(positionId: string, parentIds: (string | null)[]) {
    const newStructure = new Map(this.orgStructure());
    if (!parentIds || parentIds.length === 0) {
      newStructure.set(positionId, new Set());
    } else {
      newStructure.set(positionId, new Set(parentIds.filter(id => id !== null)));
    }
    this.orgStructure.set(newStructure);
  }

  public setParent(positionId: string, parentId: string | null) {
    const newStructure = new Map(this.orgStructure());
    const parents = newStructure.get(positionId) || new Set<string | null>();
    if (parentId === null) {
      // Si se selecciona null, limpiar todos los padres
      newStructure.set(positionId, new Set());
    } else {
      parents.add(parentId);
      newStructure.set(positionId, parents);
    }
    this.orgStructure.set(newStructure);
  }
  
  public removeParent(positionId: string, parentId: string | null) {
    const newStructure = new Map(this.orgStructure());
    const parents = newStructure.get(positionId) || new Set<string | null>();
    parents.delete(parentId);
    if (parents.size === 0) {
      newStructure.delete(positionId);
    } else {
      newStructure.set(positionId, parents);
    }
    this.orgStructure.set(newStructure);
  }

  public hasChanges(): boolean {
    const current = this.orgStructure();
    const original = this.originalStructure();
    
    if (current.size !== original.size) return true;
    
    for (const [key, currentParents] of Array.from(current.entries())) {
      const originalParents = original.get(key);
      if (!originalParents) return true;
      
      // Comparar sets
      if (currentParents.size !== originalParents.size) return true;
      
      for (const parentId of currentParents) {
        if (!originalParents.has(parentId)) return true;
      }
    }
    
    return false;
  }

  public rootNodes = computed(() => {
    const structure = this.orgStructure();
    const positions = this.availablePositions();
    const employees = this.employees();

    // Solo incluir posiciones que están en la estructura del organigrama
    const configuredPositionIds = new Set<string>();
    
    // Agregar todas las posiciones que tienen padres configurados
    structure.forEach((parents, positionId) => {
      if (parents && parents.size > 0) {
        configuredPositionIds.add(positionId);
        // Agregar todos los padres
        parents.forEach(parentId => {
          if (parentId !== null) {
            configuredPositionIds.add(parentId);
          }
        });
      }
    });

    // Si no hay estructura configurada, retornar vacío
    if (configuredPositionIds.size === 0) {
      return [];
    }

    // Filtrar solo las posiciones configuradas
    const configuredPositions = positions.filter(p => configuredPositionIds.has(p.id));

    // Encontrar posiciones raíz (sin padres configurados)
    const rootPositions = configuredPositions.filter(
      (p) => {
        const parents = structure.get(p.id);
        // Es raíz si no tiene padres configurados o el set está vacío
        return !parents || parents.size === 0;
      }
    );

    // Construir árbol recursivamente solo con posiciones configuradas
    // Si una posición tiene múltiples padres, aparecerá bajo el primer padre en el árbol
    const buildTree = (position: Position): OrgNode => {
      const positionEmployees = employees.filter(
        (e) => e.position_id === position.id
      );
      
      // Encontrar hijos: posiciones que tienen esta posición como uno de sus padres
      const children = configuredPositions
        .filter((p) => {
          const parents = structure.get(p.id);
          if (!parents || parents.size === 0) return false;
          return parents.has(position.id);
        })
        .map((p) => buildTree(p));

      return {
        position,
        employees: positionEmployees,
        children,
        parentId: undefined, // Ya no usamos un solo parentId
      };
    };

    return rootPositions.map((p) => buildTree(p));
  });

  private logger = inject(LoggerService);

  // Convertir el árbol a formato compatible con PrimeNG OrganizationChart
  public orgChartData = computed(() => {
    const nodes = this.rootNodes();
    this.logger.debug('[OrganigramaComponent] rootNodes:', nodes);
    this.logger.debug('[OrganigramaComponent] orgStructure:', Array.from(this.orgStructure().entries()));
    
    if (nodes.length === 0) {
      this.logger.debug('[OrganigramaComponent] No hay nodos raíz');
      return [];
    }

    // Convertir OrgNode a formato PrimeNG
    const convertToPrimeNGFormat = (node: OrgNode): any => {
      const result = {
        label: node.position.name, // Label para compatibilidad con PrimeNG
        data: {
          position: node.position,
          employees: node.employees,
        },
        expanded: true,
        children: node.children.length > 0 
          ? node.children.map(child => convertToPrimeNGFormat(child))
          : undefined,
      };
      this.logger.debug('[OrganigramaComponent] Converted node:', result);
      return result;
    };

    // Si hay múltiples raíces, crear un nodo raíz virtual
    if (nodes.length > 1) {
      // Crear un Position válido con valores por defecto
      const virtualRootPosition: Position = {
        id: 'virtual-root',
        name: 'Organización',
        department_id: '',
        department: undefined,
        schedule_admin: false,
        admin: false,
        schedule_approver: false,
      };
      const result = [{
        label: 'Organización',
        data: {
          position: virtualRootPosition,
          employees: [],
        },
        expanded: true,
        children: nodes.map(node => convertToPrimeNGFormat(node)),
      }];
      this.logger.debug('[OrganigramaComponent] Multiple roots, created virtual root:', result);
      return result;
    }

    const result = nodes.map(node => convertToPrimeNGFormat(node));
    this.logger.debug('[OrganigramaComponent] Single root result:', result);
    return result;
  });

  public loadStructure() {
    const url = this.apiUrl.build('rest/v1/organization_chart', {
      select: 'position_id,parent_position_id',
    });
    this.logger.debug('[OrganigramaComponent] Loading structure from:', url);
    this.http
      .get<any[]>(url)
      .subscribe({
        next: (data) => {
          this.logger.debug('[OrganigramaComponent] Loaded structure data:', data);
          const structure = new Map<string, Set<string | null>>();
          
          // Agrupar por position_id para manejar múltiples padres
          data.forEach((item) => {
            const positionId = item.position_id;
            const parentId = item.parent_position_id;
            
            if (!structure.has(positionId)) {
              structure.set(positionId, new Set());
            }
            
            if (parentId) {
              structure.get(positionId)!.add(parentId);
            }
          });
          
          this.logger.debug('[OrganigramaComponent] Parsed structure:', Array.from(structure.entries()).map(([k, v]) => [k, Array.from(v)]));
          this.orgStructure.set(structure);
          this.originalStructure.set(new Map(structure));
          this.messageService.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Estructura cargada correctamente',
          });
        },
        error: (error) => {
          this.logger.error('[OrganigramaComponent] Error loading structure:', error);
          // Si la tabla no existe, inicializar vacío
          this.orgStructure.set(new Map<string, Set<string | null>>());
          this.originalStructure.set(new Map<string, Set<string | null>>());
        },
      });
  }

  public saveStructure() {
    const structure = this.orgStructure();

    // Preparar los registros a guardar (cada posición puede tener múltiples padres)
    const records: Array<{ position_id: string; parent_position_id: string }> = [];
    
    structure.forEach((parents, positionId) => {
      if (parents && parents.size > 0) {
        parents.forEach(parentId => {
          if (parentId !== null) {
            records.push({
              position_id: positionId,
              parent_position_id: parentId,
            });
          }
        });
      }
    });

    this.logger.debug('[OrganigramaComponent] Saving structure with records:', records);

    if (records.length === 0) {
      // Si no hay registros, eliminar todos los existentes
      this.http
        .delete(this.apiUrl.build('rest/v1/organization_chart'), {
          params: { position_id: 'not.is.null' } // Eliminar todos
        })
        .subscribe({
          next: () => {
            this.originalStructure.set(new Map(structure));
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Estructura guardada correctamente',
            });
            this.loadStructure();
          },
          error: (error) => {
            this.logger.error('[OrganigramaComponent] Error deleting all records:', error);
            // Aún así marcar como guardado si no hay registros
            this.originalStructure.set(new Map(structure));
            this.messageService.add({
              severity: 'success',
              summary: 'Éxito',
              detail: 'Estructura guardada correctamente',
            });
            this.loadStructure();
          },
        });
      return;
    }

    // Obtener los registros existentes
    this.http
      .get<any[]>(this.apiUrl.build('rest/v1/organization_chart', {
        select: 'position_id',
      }))
      .subscribe({
        next: (existingRecords) => {
          this.logger.debug('[OrganigramaComponent] Existing records:', existingRecords);
          const existingPositionIds = new Set(existingRecords.map(r => r.position_id));
          const newPositionIds = new Set(records.map(r => r.position_id));
          
          // Encontrar posiciones que deben eliminarse (están en BD pero no en la nueva estructura)
          const toDelete = Array.from(existingPositionIds).filter(
            id => !newPositionIds.has(id)
          );

          // Función para insertar/actualizar registros usando PATCH con UPSERT
          const upsertRecords = () => {
            // Usar PATCH con Prefer: resolution=merge-duplicates para hacer UPSERT
            // Pero como Supabase REST API no soporta UPSERT directamente en POST,
            // vamos a hacer DELETE + INSERT o usar PATCH individual
            
            // Hacer PATCH individual para cada registro (actualiza si existe)
            // Si falla, hacer POST (crea nuevo)
            const upsertOperations = records.map(record => {
              const request = this.http
                .patch(this.apiUrl.build('rest/v1/organization_chart'), record, {
                  params: { position_id: `eq.${record.position_id}` }
                })
                .pipe(
                  catchError((error) => {
                    // Si el PATCH falla (404 o 400), intentar POST
                    if (error.status === 404 || error.status === 400 || error.status === 0) {
                      return this.http.post(this.apiUrl.build('rest/v1/organization_chart'), record);
                    }
                    // Si es otro error, propagarlo
                    throw error;
                  })
                );
              return firstValueFrom(request);
            });

            Promise.all(upsertOperations)
              .then(() => {
                this.logger.debug('[OrganigramaComponent] Records upserted successfully');
                this.originalStructure.set(new Map(structure));
                this.messageService.add({
                  severity: 'success',
                  summary: 'Éxito',
                  detail: 'Estructura guardada correctamente',
                });
                this.loadStructure();
              })
              .catch((error) => {
                this.logger.error('[OrganigramaComponent] Error upserting records:', error);
                this.messageService.add({
                  severity: 'error',
                  summary: 'Error',
                  detail: error.error?.message || error.message || 'Error al guardar la estructura',
                });
              });
          };

          // Eliminar registros que ya no están en la estructura
          if (toDelete.length > 0) {
            const deleteOperations = toDelete.map(positionId =>
              firstValueFrom(
                this.http.delete(this.apiUrl.build('rest/v1/organization_chart'), {
                  params: { position_id: `eq.${positionId}` }
                })
              )
            );

            Promise.all(deleteOperations)
              .then(() => {
                this.logger.debug('[OrganigramaComponent] Deleted old records:', toDelete.length);
                upsertRecords();
              })
              .catch((error) => {
                this.logger.error('[OrganigramaComponent] Error deleting records:', error);
                // Continuar con la inserción aunque falle el delete
                upsertRecords();
              });
          } else {
            upsertRecords();
          }
        },
        error: (error) => {
          this.logger.error('[OrganigramaComponent] Error fetching existing records:', error);
          // Si falla obtener los existentes, intentar insertar directamente
          const insertOperations = records.map(record =>
            firstValueFrom(
              this.http.post(this.apiUrl.build('rest/v1/organization_chart'), record)
            )
          );

          Promise.all(insertOperations)
            .then(() => {
              this.originalStructure.set(new Map(structure));
              this.messageService.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Estructura guardada correctamente',
              });
              this.loadStructure();
            })
            .catch((error) => {
              this.logger.error('[OrganigramaComponent] Error inserting records:', error);
              this.messageService.add({
                severity: 'error',
                summary: 'Error',
                detail: error.error?.message || error.message || 'Error al guardar la estructura',
              });
            });
        },
      });
  }

  constructor() {
    this.loadStructure();
  }
}
