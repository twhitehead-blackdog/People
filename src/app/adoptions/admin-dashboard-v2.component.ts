import { CommonModule } from '@angular/common';
import { PhosphorIconComponent } from '../shared/phosphor-icon.component';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';
import { TableModule } from 'primeng/table';
import { MenuItem } from 'primeng/api';
import { StatisticsService, StatisticsData } from '../services/statistics.service';
import { ExportService } from '../services/export.service';
import { PetsStore } from '../stores/pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { FoundationsStore } from '../stores/foundations.store';

@Component({
  selector: 'pt-admin-dashboard-v2',
  standalone: true,
  imports: [CommonModule, Card, Button, SplitButtonModule, TableModule, PhosphorIconComponent],
  template: `
    <div class="dashboard-container">
      <!-- Header mejorado estilo PrimeNG -->
      <div class="dashboard-header">
        <div class="header-content">
          <div class="header-title-section">
            <span class="header-subtitle">Overview</span>
            <h1 class="dashboard-title">Bienvenido a Black Dog</h1>
          </div>
          <div class="header-actions">
            <p-splitButton
              label="Exportar"
              (onClick)="exportStatistics('pdf')"
              [model]="exportMenuItems()"
              severity="success"
              [style]="{ marginRight: '0.5rem' }"
            >
              <ng-template pTemplate="icon">
                <ph-icon name="download" [size]="18" color="currentColor" weight="regular"></ph-icon>
              </ng-template>
            </p-splitButton>
            <p-button
              (onClick)="refreshStatistics()"
              [loading]="isRefreshing()"
              severity="secondary"
              [text]="true"
              [rounded]="true"
              title="Actualizar"
            >
              <ng-template pTemplate="icon">
                <ph-icon name="refresh" [size]="18" color="currentColor" weight="regular"></ph-icon>
              </ng-template>
            </p-button>
          </div>
        </div>
      </div>

      @if (statistics(); as stats) {
      <!-- Métricas principales estilo PrimeNG -->
      <div class="metrics-grid">
        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon-wrapper" style="background: rgba(251, 191, 36, 0.1);">
              <ph-icon name="paw-print" [size]="24" color="#fbbf24" weight="fill"></ph-icon>
            </div>
            <div class="metric-info">
              <span class="metric-label">Total Mascotas</span>
              <span class="metric-value">{{ stats.pets.total }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon-wrapper" style="background: rgba(16, 185, 129, 0.1);">
              <ph-icon name="check-circle" [size]="24" color="#10b981" weight="fill"></ph-icon>
            </div>
            <div class="metric-info">
              <span class="metric-label">Disponibles</span>
              <span class="metric-value">{{ stats.pets.available }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon-wrapper" style="background: rgba(239, 68, 68, 0.1);">
              <ph-icon name="heart" [size]="24" color="#ef4444" weight="fill"></ph-icon>
            </div>
            <div class="metric-info">
              <span class="metric-label">Adoptadas</span>
              <span class="metric-value">{{ stats.pets.adopted }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon-wrapper" style="background: rgba(59, 130, 246, 0.1);">
              <ph-icon name="chart-bar" [size]="24" color="#3b82f6" weight="fill"></ph-icon>
            </div>
            <div class="metric-info">
              <span class="metric-label">Tasa de Adopción</span>
              <span class="metric-value">{{ stats.adoptionRate }}%</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon-wrapper" style="background: rgba(99, 102, 241, 0.1);">
              <ph-icon name="file-text" [size]="24" color="#6366f1" weight="fill"></ph-icon>
            </div>
            <div class="metric-info">
              <span class="metric-label">Total Solicitudes</span>
              <span class="metric-value">{{ stats.applications.total }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon-wrapper" style="background: rgba(245, 158, 11, 0.1);">
              <ph-icon name="hourglass" [size]="24" color="#f59e0b" weight="fill"></ph-icon>
            </div>
            <div class="metric-info">
              <span class="metric-label">Pendientes</span>
              <span class="metric-value">{{ stats.applications.pending }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon-wrapper" style="background: rgba(16, 185, 129, 0.1);">
              <ph-icon name="check-circle" [size]="24" color="#10b981" weight="fill"></ph-icon>
            </div>
            <div class="metric-info">
              <span class="metric-label">Aprobadas</span>
              <span class="metric-value">{{ stats.applications.approved }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon-wrapper" style="background: rgba(251, 191, 36, 0.1);">
              <ph-icon name="confetti" [size]="24" color="#fbbf24" weight="fill"></ph-icon>
            </div>
            <div class="metric-info">
              <span class="metric-label">Completadas</span>
              <span class="metric-value">{{ stats.applications.completed }}</span>
            </div>
          </div>
        </p-card>
      </div>

      <!-- Sección de gráficos estilo PrimeNG -->
      <div class="charts-section">
        <p-card class="chart-card">
          <ng-template pTemplate="header">
            <div class="card-header">
              <h3>Adopciones por Mes</h3>
              <div class="time-selector">
                <p-button label="Mensual" severity="secondary" [text]="true" [style]="{ fontSize: '0.875rem', padding: '0.5rem 1rem' }" />
              </div>
            </div>
          </ng-template>
          <div class="chart-container">
            <div class="chart-legend">
              <div class="legend-item">
                <span class="legend-color" style="background: #1f2937;"></span>
                <span>Total</span>
              </div>
            </div>
            <div class="stacked-bar-chart">
              @for (item of stats.applications.byMonth; track item.month) {
              <div class="chart-bar-wrapper">
                <div class="chart-bar-label">{{ item.month }}</div>
                <div class="chart-bar-container">
                  <div 
                    class="chart-bar-stacked"
                    [style.height.px]="getBarHeight(item.count, stats.applications.total)"
                    [title]="item.count + ' solicitudes'"
                  >
                    <div class="bar-fill" [style.height.%]="100"></div>
                  </div>
                  <span class="chart-value">{{ item.count }}</span>
                </div>
              </div>
              }
            </div>
          </div>
        </p-card>

        <p-card class="chart-card">
          <ng-template pTemplate="header">
            <h3>Distribución por Especie</h3>
          </ng-template>
          <div class="distribution-chart">
            @for (item of stats.pets.bySpecies; track item.species) {
            <div class="chart-item">
              <div class="chart-label">{{ item.species }}</div>
              <div class="chart-bar-container">
                <div
                  class="chart-bar"
                  [style.width.%]="(item.count / stats.pets.total) * 100"
                ></div>
                <span class="chart-value">{{ item.count }}</span>
              </div>
            </div>
            }
          </div>
        </p-card>
      </div>

      <!-- Tabla de mascotas populares estilo PrimeNG -->
      @if (stats.mostPopularPets.length > 0) {
      <p-card class="table-card">
        <ng-template pTemplate="header">
          <h3>Mascotas Más Populares</h3>
        </ng-template>
        <p-table
          [value]="stats.mostPopularPets"
          [paginator]="true"
          [rows]="5"
          styleClass="p-datatable-striped"
          [tableStyle]="{ 'min-width': '50rem' }"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Nombre</th>
              <th>Especie</th>
              <th>Solicitudes</th>
              <th>Estado</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-item>
            <tr>
              <td>
                <div class="pet-name-cell">
                  <ph-icon 
                    [name]="item.pet.species === 'dog' ? 'dog' : 'cat'" 
                    [size]="20" 
                    color="#fbbf24" 
                    weight="fill"
                    style="margin-right: 0.5rem;"
                  ></ph-icon>
                  <strong>{{ item.pet.name }}</strong>
                </div>
              </td>
              <td>{{ getSpeciesLabel(item.pet.species) }}</td>
              <td>
                <span class="badge-count">{{ item.applicationsCount }}</span>
              </td>
              <td>
                <span class="status-badge" [class.available]="item.pet.is_available" [class.adopted]="!item.pet.is_available">
                  {{ item.pet.is_available ? 'Disponible' : 'Adoptada' }}
                </span>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
      }
      } @else {
      <div class="loading-state">
        <ph-icon name="refresh" [size]="48" color="#6b7280" weight="regular" style="animation: spin 1s linear infinite;"></ph-icon>
        <p>Cargando estadísticas...</p>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        width: 100%;
        padding: 1.5rem;
        background: #f9fafb;
        min-height: 100vh;
      }

      .dashboard-header {
        margin-bottom: 2rem;
      }

      .header-content {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        gap: 2rem;
      }

      .header-title-section {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .header-subtitle {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .dashboard-title {
        font-size: 2.5rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      .header-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .metric-card {
        border: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        transition: all 0.2s ease;
        border-radius: 0.75rem;
      }

      .metric-card:hover {
        box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05);
        transform: translateY(-2px);
      }

      .metric-content {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1.25rem;
      }

      .metric-icon-wrapper {
        width: 48px;
        height: 48px;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .metric-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        flex: 1;
      }

      .metric-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 500;
      }

      .metric-value {
        font-size: 1.875rem;
        font-weight: 700;
        color: #000000;
        line-height: 1.2;
      }

      .charts-section {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .chart-card {
        border: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        border-radius: 0.75rem;
      }

      .card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
      }

      .card-header h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #000000;
        margin: 0;
      }

      .time-selector {
        display: flex;
        gap: 0.5rem;
      }

      .chart-container {
        padding: 1.5rem;
      }

      .chart-legend {
        display: flex;
        gap: 1.5rem;
        margin-bottom: 1.5rem;
        padding-bottom: 1rem;
        border-bottom: 1px solid #e5e7eb;
      }

      .legend-item {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
        color: #6b7280;
      }

      .legend-color {
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }

      .stacked-bar-chart {
        display: flex;
        align-items: flex-end;
        gap: 0.75rem;
        height: 300px;
        padding: 1rem 0;
      }

      .chart-bar-wrapper {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
      }

      .chart-bar-label {
        font-size: 0.75rem;
        color: #6b7280;
        font-weight: 500;
        text-align: center;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
      }

      .chart-bar-container {
        width: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        position: relative;
      }

      .chart-bar-stacked {
        width: 100%;
        min-height: 20px;
        max-height: 100%;
        background: #f3f4f6;
        border-radius: 0.375rem;
        position: relative;
        overflow: hidden;
        transition: height 0.3s ease;
      }

      .bar-fill {
        width: 100%;
        background: linear-gradient(180deg, #1f2937 0%, #374151 100%);
        border-radius: 0.375rem;
      }

      .chart-value {
        font-size: 0.875rem;
        font-weight: 600;
        color: #000000;
      }

      .distribution-chart {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1.5rem;
      }

      .chart-item {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
      }

      .chart-label {
        font-size: 0.875rem;
        font-weight: 600;
        color: #374151;
      }

      .chart-bar {
        height: 32px;
        background: linear-gradient(90deg, #fbbf24, #fcd34d);
        border-radius: 0.5rem;
        min-width: 20px;
        transition: width 0.3s ease;
      }

      .table-card {
        border: none;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06);
        border-radius: 0.75rem;
      }

      .table-card h3 {
        font-size: 1.25rem;
        font-weight: 600;
        color: #000000;
        margin: 0;
        padding: 1rem 1.5rem;
      }

      .pet-name-cell {
        display: flex;
        align-items: center;
      }

      .badge-count {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        padding: 0.25rem 0.75rem;
        background: #fbbf24;
        color: #000000;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 600;
        min-width: 2rem;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 0.375rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .status-badge.available {
        background: rgba(16, 185, 129, 0.1);
        color: #10b981;
      }

      .status-badge.adopted {
        background: rgba(239, 68, 68, 0.1);
        color: #ef4444;
      }

      .loading-state {
        text-align: center;
        padding: 4rem 2rem;
        color: #6b7280;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      @keyframes spin {
        from {
          transform: rotate(0deg);
        }
        to {
          transform: rotate(360deg);
        }
      }

      @media (max-width: 1024px) {
        .charts-section {
          grid-template-columns: 1fr;
        }
      }

      @media (max-width: 768px) {
        .dashboard-container {
          padding: 1rem;
        }

        .header-content {
          flex-direction: column;
          gap: 1rem;
        }

        .dashboard-title {
          font-size: 1.875rem;
        }

        .metrics-grid {
          grid-template-columns: 1fr;
        }

        .stacked-bar-chart {
          height: 250px;
        }
      }
    `,
  ],
})
export class AdminDashboardV2Component implements OnInit {
  private statisticsService = inject(StatisticsService);
  private exportService = inject(ExportService);
  private petsStore = inject(PetsStore);
  private applicationsStore = inject(AdoptionApplicationsStore);
  private foundationsStore = inject(FoundationsStore);

  public isRefreshing = signal(false);

  // Computed signal que se actualiza automáticamente cuando cambian los stores
  public statistics = computed(() => {
    const pets = this.petsStore.entities();
    const applications = this.applicationsStore.entities();
    const foundations = this.foundationsStore.entities();
    
    this.statisticsService.invalidateCache();
    
    return this.statisticsService.getStatistics();
  });

  public exportMenuItems = signal<MenuItem[]>([
    {
      label: 'Exportar a PDF',
      icon: 'pi pi-file-pdf',
      command: () => this.exportStatistics('pdf'),
    },
    {
      label: 'Exportar a Excel',
      icon: 'pi pi-file-excel',
      command: () => this.exportStatistics('excel'),
    },
  ]);

  constructor() {
    effect(() => {
      const pets = this.petsStore.entities();
      const applications = this.applicationsStore.entities();
      const foundations = this.foundationsStore.entities();
      
      if (pets.length > 0 || applications.length > 0 || foundations.length > 0) {
        this.statisticsService.invalidateCache();
      }
    });
  }

  ngOnInit(): void {
    // Las estadísticas se calculan automáticamente con el computed signal
  }

  public refreshStatistics(): void {
    this.isRefreshing.set(true);
    this.statisticsService.invalidateCache();
    this.petsStore.fetchItems();
    this.applicationsStore.fetchItems();
    this.foundationsStore.fetchItems();
    
    setTimeout(() => {
      this.isRefreshing.set(false);
    }, 500);
  }

  public getSpeciesLabel(species: string): string {
    const labels: Record<string, string> = {
      dog: 'Perro',
      cat: 'Gato',
      other: 'Otro',
    };
    return labels[species] || species;
  }

  public exportStatistics(format: 'pdf' | 'excel'): void {
    this.exportService.exportStatistics(format);
  }

  public getBarHeight(count: number, max: number): number {
    if (max === 0) return 20;
    const percentage = (count / max) * 100;
    return Math.max(20, (percentage / 100) * 280);
  }
}

