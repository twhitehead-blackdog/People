import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, OnInit, signal } from '@angular/core';
import { Card } from 'primeng/card';
import { Button } from 'primeng/button';
import { SplitButtonModule } from 'primeng/splitbutton';
import { MenuItem } from 'primeng/api';
import { StatisticsService, StatisticsData } from '../services/statistics.service';
import { ExportService } from '../services/export.service';
import { PetsStore } from '../stores/pets.store';
import { AdoptionApplicationsStore } from '../stores/adoption-applications.store';
import { FoundationsStore } from '../stores/foundations.store';

@Component({
  selector: 'pt-admin-dashboard',
  standalone: true,
  imports: [CommonModule, Card, Button, SplitButtonModule],
  template: `
    <div class="dashboard-container">
      <div class="dashboard-header">
        <h2>Dashboard de Estadísticas</h2>
        <div class="header-actions">
          <p-splitButton
            label="Exportar"
            icon="pi pi-download"
            (onClick)="exportStatistics('pdf')"
            [model]="exportMenuItems()"
            severity="success"
            [style]="{ marginRight: '0.5rem' }"
          />
          <p-button
            label="Forzar Actualización"
            icon="pi pi-refresh"
            (onClick)="refreshStatistics()"
            [loading]="isRefreshing()"
            severity="secondary"
            [style]="{ fontSize: '0.875rem' }"
            title="Las estadísticas se actualizan automáticamente. Usa este botón para forzar una actualización inmediata."
          />
        </div>
      </div>

      @if (statistics(); as stats) {
      <div class="metrics-grid">
        <!-- Métricas de Mascotas -->
        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">🐾</div>
            <div class="metric-info">
              <span class="metric-label">Total Mascotas</span>
              <span class="metric-value">{{ stats.pets.total }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card available">
          <div class="metric-content">
            <div class="metric-icon">✅</div>
            <div class="metric-info">
              <span class="metric-label">Disponibles</span>
              <span class="metric-value">{{ stats.pets.available }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card adopted">
          <div class="metric-content">
            <div class="metric-icon">❤️</div>
            <div class="metric-info">
              <span class="metric-label">Adoptadas</span>
              <span class="metric-value">{{ stats.pets.adopted }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card rate">
          <div class="metric-content">
            <div class="metric-icon">📊</div>
            <div class="metric-info">
              <span class="metric-label">Tasa de Adopción</span>
              <span class="metric-value">{{ stats.adoptionRate }}%</span>
            </div>
          </div>
        </p-card>

        <!-- Métricas de Solicitudes -->
        <p-card class="metric-card">
          <div class="metric-content">
            <div class="metric-icon">📝</div>
            <div class="metric-info">
              <span class="metric-label">Total Solicitudes</span>
              <span class="metric-value">{{ stats.applications.total }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card pending">
          <div class="metric-content">
            <div class="metric-icon">⏳</div>
            <div class="metric-info">
              <span class="metric-label">Pendientes</span>
              <span class="metric-value">{{ stats.applications.pending }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card approved">
          <div class="metric-content">
            <div class="metric-icon">✅</div>
            <div class="metric-info">
              <span class="metric-label">Aprobadas</span>
              <span class="metric-value">{{ stats.applications.approved }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card completed">
          <div class="metric-content">
            <div class="metric-icon">🎉</div>
            <div class="metric-info">
              <span class="metric-label">Completadas</span>
              <span class="metric-value">{{ stats.applications.completed }}</span>
            </div>
          </div>
        </p-card>

        <p-card class="metric-card time">
          <div class="metric-content">
            <div class="metric-icon">⏱️</div>
            <div class="metric-info">
              <span class="metric-label">Tiempo Promedio</span>
              <span class="metric-value">{{ stats.averageTimeToAdoption }} días</span>
            </div>
          </div>
        </p-card>
      </div>

      <!-- Distribuciones -->
      <div class="charts-grid">
        <p-card>
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

        <p-card>
          <ng-template pTemplate="header">
            <h3>Distribución por Tamaño</h3>
          </ng-template>
          <div class="distribution-chart">
            @for (item of stats.pets.bySize; track item.size) {
            <div class="chart-item">
              <div class="chart-label">{{ item.size }}</div>
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

        <p-card>
          <ng-template pTemplate="header">
            <h3>Solicitudes por Mes</h3>
          </ng-template>
          <div class="distribution-chart">
            @for (item of stats.applications.byMonth; track item.month) {
            <div class="chart-item">
              <div class="chart-label">{{ item.month }}</div>
              <div class="chart-bar-container">
                <div
                  class="chart-bar applications"
                  [style.width.%]="
                    stats.applications.total > 0
                      ? (item.count / stats.applications.total) * 100
                      : 0
                  "
                ></div>
                <span class="chart-value">{{ item.count }}</span>
              </div>
            </div>
            }
          </div>
        </p-card>
      </div>

      <!-- Mascotas Más Populares -->
      @if (stats.mostPopularPets.length > 0) {
      <p-card>
        <ng-template pTemplate="header">
          <h3>Mascotas Más Populares</h3>
        </ng-template>
        <div class="popular-pets">
          @for (item of stats.mostPopularPets; track item.pet.id) {
          <div class="popular-pet-item">
            <div class="pet-info">
              <span class="pet-name">{{ item.pet.name }}</span>
              <span class="pet-species">{{ getSpeciesLabel(item.pet.species) }}</span>
            </div>
            <div class="pet-applications">
              <span class="applications-count">{{ item.applicationsCount }}</span>
              <span class="applications-label">solicitudes</span>
            </div>
          </div>
          }
        </div>
      </p-card>
      }
      } @else {
      <div class="loading-state">
        <i class="pi pi-spin pi-spinner" style="font-size: 2rem;"></i>
        <p>Cargando estadísticas...</p>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .dashboard-container {
        width: 100%;
        position: relative;
        overflow-x: hidden;
      }

      .dashboard-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        padding-bottom: 1rem;
        border-bottom: 2px solid #e5e7eb;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .header-actions {
        display: flex;
        gap: 0.5rem;
        align-items: center;
      }

      .dashboard-header h2 {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
        margin: 0;
      }

      .metrics-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .metric-card {
        border: 1px solid #e5e7eb;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .metric-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }

      .metric-card.available {
        border-left: 4px solid #10b981;
      }

      .metric-card.adopted {
        border-left: 4px solid #ef4444;
      }

      .metric-card.pending {
        border-left: 4px solid #f59e0b;
      }

      .metric-card.approved {
        border-left: 4px solid #10b981;
      }

      .metric-card.completed {
        border-left: 4px solid #3b82f6;
      }

      .metric-card.rate {
        border-left: 4px solid #8b5cf6;
      }

      .metric-card.time {
        border-left: 4px solid #ec4899;
      }

      .metric-content {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 1rem;
      }

      .metric-icon {
        font-size: 2.5rem;
      }

      .metric-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .metric-label {
        font-size: 0.875rem;
        color: #6b7280;
        font-weight: 600;
      }

      .metric-value {
        font-size: 2rem;
        font-weight: 700;
        color: #000000;
      }

      .charts-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 1.5rem;
        margin-bottom: 2rem;
      }

      .distribution-chart {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
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

      .chart-bar-container {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        position: relative;
      }

      .chart-bar {
        height: 24px;
        background: linear-gradient(90deg, #fbbf24, #fcd34d);
        border-radius: 0.375rem;
        min-width: 20px;
        transition: width 0.3s ease;
      }

      .chart-bar.applications {
        background: linear-gradient(90deg, #3b82f6, #60a5fa);
      }

      .chart-value {
        font-size: 0.875rem;
        font-weight: 600;
        color: #000000;
        min-width: 40px;
        text-align: right;
      }

      .popular-pets {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        padding: 1rem;
      }

      .popular-pet-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem;
        background: #f9fafb;
        border-radius: 0.5rem;
        border: 1px solid #e5e7eb;
      }

      .pet-info {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .pet-name {
        font-size: 1rem;
        font-weight: 600;
        color: #000000;
      }

      .pet-species {
        font-size: 0.875rem;
        color: #6b7280;
      }

      .pet-applications {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.25rem;
      }

      .applications-count {
        font-size: 1.5rem;
        font-weight: 700;
        color: #fbbf24;
      }

      .applications-label {
        font-size: 0.75rem;
        color: #6b7280;
      }

      .loading-state {
        text-align: center;
        padding: 4rem 2rem;
        color: #6b7280;
      }

      @media (max-width: 768px) {
        .dashboard-header {
          flex-direction: column;
          align-items: flex-start;
          gap: 1rem;
        }

        .metrics-grid {
          grid-template-columns: 1fr;
        }

        .charts-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AdminDashboardComponent implements OnInit {
  private statisticsService = inject(StatisticsService);
  private exportService = inject(ExportService);
  private petsStore = inject(PetsStore);
  private applicationsStore = inject(AdoptionApplicationsStore);
  private foundationsStore = inject(FoundationsStore);

  public isRefreshing = signal(false);

  // Computed signal que se actualiza automáticamente cuando cambian los stores
  // Depende directamente de los stores para reactividad automática
  public statistics = computed(() => {
    // Leer los stores para que el computed se actualice cuando cambien
    const pets = this.petsStore.entities();
    const applications = this.applicationsStore.entities();
    const foundations = this.foundationsStore.entities();
    
    // Invalidar caché para forzar recálculo con datos frescos
    this.statisticsService.invalidateCache();
    
    // Retornar estadísticas calculadas con los datos actuales
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
    // Efecto que se ejecuta cuando cambian los datos en los stores
    // Esto fuerza la invalidación del caché cuando cambian los datos
    effect(() => {
      // Leer los stores para que el effect se active cuando cambien
      const pets = this.petsStore.entities();
      const applications = this.applicationsStore.entities();
      const foundations = this.foundationsStore.entities();
      
      // Invalidar caché para que se recalculen las estadísticas con datos frescos
      // Solo invalidar si hay datos (evitar invalidaciones innecesarias al inicio)
      if (pets.length > 0 || applications.length > 0 || foundations.length > 0) {
        this.statisticsService.invalidateCache();
      }
    });
  }

  ngOnInit(): void {
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/c0122114-0a18-454b-b40e-dcae99b0f576',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'admin-dashboard.component.ts:524',message:'AdminDashboardComponent ngOnInit',data:{petsCount:this.petsStore.entities().length,applicationsCount:this.applicationsStore.entities().length,foundationsCount:this.foundationsStore.entities().length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    // Las estadísticas se calculan automáticamente con el computed signal
  }

  public refreshStatistics(): void {
    this.isRefreshing.set(true);
    // Invalidar caché y forzar recálculo
    this.statisticsService.invalidateCache();
    // Forzar actualización de los stores
    this.petsStore.fetchItems();
    this.applicationsStore.fetchItems();
    this.foundationsStore.fetchItems();
    
    // El computed signal se actualizará automáticamente
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
}

