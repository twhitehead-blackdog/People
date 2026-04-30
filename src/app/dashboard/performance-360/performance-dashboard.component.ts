import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Button } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { ChartModule } from 'primeng/chart';
import { SelectModule } from 'primeng/select';
import { KnobModule } from 'primeng/knob';
import { ProgressBarModule } from 'primeng/progressbar';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TableModule } from 'primeng/table';
import { firstValueFrom } from 'rxjs';
import { Performance360Service } from '../../services/performance-360.service';
import { PermissionsService } from '../../services/permissions.service';
import { BranchesStore } from '../../stores/branches.store';
import { DashboardStore } from '../../stores/dashboard.store';

@Component({
  selector: 'pt-performance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CardModule,
    Button,
    KnobModule,
    ChartModule,
    ProgressBarModule,
    TableModule,
    ProgressSpinnerModule,
    DatePickerModule,
    SelectModule,
  ],
  template: `
    <div class="p-4 space-y-6">
      <!-- Header -->
      <div class="flex justify-between items-center">
        <div>
          <h1 class="text-2xl font-bold text-white">
            Rendimiento Operacional 360°
          </h1>
          <p class="text-gray-400">Visión general del desempeño de la red</p>
        </div>
        @if (canCreate()) {
        <p-button
          label="Nueva Evaluación"
          icon="pi pi-plus"
          (onClick)="navigateToNew()"
          styleClass="bg-primary-500 border-primary-500 hover:bg-primary-600"
        ></p-button>
        }
      </div>

      <!-- Filters Bar -->
      <div
        class="bg-surface-900 p-4 rounded-xl border border-surface-700 flex flex-col md:flex-row gap-4 items-center"
      >
        <div class="flex-1 w-full md:w-auto">
          <label class="block text-gray-400 text-xs mb-1"
            >Rango de Fechas</label
          >
          <p-datepicker
            [(ngModel)]="dateRange"
            selectionMode="range"
            [readonlyInput]="true"
            placeholder="Seleccionar rango..."
            styleClass="w-full"
            [showIcon]="true"
            (onSelect)="loadData()"
          ></p-datepicker>
        </div>
        <div class="flex-1 w-full md:w-auto">
          <label class="block text-gray-400 text-xs mb-1">Sucursal</label>
          <p-select
            [options]="branchesStore.entities()"
            [(ngModel)]="selectedBranch"
            optionLabel="name"
            optionValue="id"
            placeholder="Todas las sucursales"
            [showClear]="true"
            styleClass="w-full"
            (onChange)="loadData()"
          ></p-select>
        </div>
        <div class="flex items-end self-stretch md:self-end">
          <p-button
            icon="pi pi-refresh"
            (onClick)="loadData()"
            pTooltip="Recargar datos"
            [text]="true"
          ></p-button>
        </div>
      </div>

      <!-- Loading State -->
      @if (isLoading()) {
      <div class="flex justify-center p-12">
        <p-progressSpinner strokeWidth="4"></p-progressSpinner>
      </div>
      } @else {
      <!-- KPI Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <p-card styleClass="h-full bg-surface-900 border-surface-700">
          <div class="flex items-center justify-between p-2">
            <div>
              <span class="block text-gray-400 font-medium mb-1"
                >Promedio Global</span
              >
              <div class="text-3xl font-bold text-white">
                {{ kpis().averageScore }}%
              </div>
              <span class="text-green-500 text-sm font-medium">
                {{ kpis().totalEvaluations }} evaluaciones
              </span>
            </div>
            <div class="w-20">
              <p-knob
                [ngModel]="kpis().averageScore"
                [readonly]="true"
                [size]="70"
                valueColor="#10B981"
                rangeColor="#374151"
              ></p-knob>
            </div>
          </div>
        </p-card>

        <p-card styleClass="h-full bg-surface-900 border-surface-700">
          <div class="flex items-center justify-between p-2">
            <div>
              <span class="block text-gray-400 font-medium mb-1"
                >Auditorías Mes</span
              >
              <div class="text-3xl font-bold text-white">
                {{ kpis().monthlyCount }}
              </div>
            </div>
            <i class="pi pi-check-circle text-4xl text-blue-500 opacity-50"></i>
          </div>
        </p-card>

        <p-card styleClass="h-full bg-surface-900 border-surface-700">
          <div class="flex items-center justify-between p-2">
            <div>
              <span class="block text-gray-400 font-medium mb-1"
                >Nivel Crítico</span
              >
              <div class="text-3xl font-bold text-white">
                {{ kpis().criticalCount }}
              </div>
              <span class="text-red-500 text-sm font-medium"
                >Alertas Activas</span
              >
            </div>
            <i
              class="pi pi-exclamation-triangle text-4xl text-red-500 opacity-50"
            ></i>
          </div>
        </p-card>
      </div>

      <!-- Recent Evaluations Table -->
      <p-card
        header="Evaluaciones Recientes"
        styleClass="bg-surface-900 border-surface-700"
      >
        <p-table
          [value]="recentEvaluations()"
          [tableStyle]="{ 'min-width': '50rem' }"
          [rows]="5"
          [paginator]="true"
        >
          <ng-template pTemplate="header">
            <tr>
              <th>Sucursal</th>
              <th>Unidad</th>
              <th>Auditor</th>
              <th>Fecha</th>
              <th>Puntaje</th>
              <th>Estado</th>
              <th>Acción</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-eval>
            <tr>
              <td class="font-medium text-white">
                {{ eval.branch?.name || 'N/A' }}
              </td>
              <td>
                <span
                  [class]="
                    'px-2 py-1 rounded text-xs font-bold ' +
                    getUnitBadgeClass(eval.audit_form?.business_unit)
                  "
                >
                  {{ eval.audit_form?.business_unit }}
                </span>
              </td>
              <td>
                {{ eval.auditor?.first_name }} {{ eval.auditor?.father_name }}
              </td>
              <td>{{ eval.created_at | date : 'shortDate' }}</td>
              <td>
                @if (eval.status === 'completed') {
                <p-progressBar
                  [value]="eval.total_score || 0"
                  [showValue]="true"
                  [style]="{ height: '12px' }"
                  [color]="getScoreColor(eval.total_score)"
                ></p-progressBar>
                } @else {
                <span class="text-gray-500 text-sm">-</span>
                }
              </td>
              <td>
                <div class="flex items-center gap-2">
                  <i [class]="getStatusIcon(eval.status)" class="text-lg"></i>
                  <span class="capitalize text-sm">{{
                    eval.status === 'completed' ? 'Finalizado' : 'Borrador'
                  }}</span>
                </div>
              </td>
              <td>
                <div class="flex gap-2">
                  @if (eval.status === 'draft') {
                  <p-button
                    icon="pi pi-pencil"
                    [rounded]="true"
                    [text]="true"
                    (onClick)="resumeEvaluation(eval)"
                    pTooltip="Continuar"
                  ></p-button>
                  } @else {
                  <p-button
                    icon="pi pi-eye"
                    [rounded]="true"
                    [text]="true"
                    (onClick)="viewReport(eval.id)"
                    pTooltip="Ver Reporte"
                  ></p-button>
                  }
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="7" class="text-center py-4 text-gray-500">
                No hay evaluaciones recientes.
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
      }
    </div>
  `,
})
export class PerformanceDashboardComponent {
  private router = inject(Router);
  private performanceService = inject(Performance360Service);
  private dashboardStore = inject(DashboardStore);
  private permissions = inject(PermissionsService);
  public branchesStore = inject(BranchesStore);

  isLoading = signal(true);
  recentEvaluations = signal<any[]>([]);

  // Filtros
  dateRange = signal<Date[] | null>(null);
  selectedBranch = signal<string | null>(null);

  // Permisos UI
  canCreate = computed(
    () =>
      this.permissions.canCurrentUser('admin') ||
      this.permissions.canCurrentUser('schedule_admin')
  );

  // KPIs
  kpis = computed(() => {
    const list = this.recentEvaluations();
    const completed = list.filter((e) => e.status === 'completed');

    const totalEvaluations = completed.length;

    // Average Score
    const sumScores = completed.reduce(
      (acc, curr) => acc + (curr.total_score || 0),
      0
    );
    const averageScore =
      totalEvaluations > 0 ? Math.round(sumScores / totalEvaluations) : 0;

    // Monthly Count (Mock: asume todos son del mes actual para simplificar visualización)
    const monthlyCount = list.length;

    // Critical Count
    const criticalCount = completed.filter(
      (e) => (e.total_score || 0) < 61
    ).length;

    return {
      averageScore,
      totalEvaluations,
      monthlyCount,
      criticalCount,
    };
  });

  constructor() {
    this.loadData();
  }

  async loadData() {
    this.isLoading.set(true);
    try {
      // Aplicar filtros
      const filters: any = {};

      const dates = this.dateRange();
      if (dates && dates.length > 0) {
        filters.startDate = dates[0];
        if (dates[1]) filters.endDate = dates[1];
      }

      const branch = this.selectedBranch();
      if (branch) {
        filters.branchId = branch;
      } else if (!this.permissions.canCurrentUser('admin')) {
        // Si no es admin y no seleccionó branch (aunque el dropdown deberia estar filtrado o preseleccionado para locales)
        // Forzamos su branch si existe
        const myBranch = this.dashboardStore.currentEmployee()?.branch_id;
        if (myBranch) filters.branchId = myBranch;
      }

      const data = await firstValueFrom(this.performanceService
        .getEvaluations(filters));

      if (data) {
        this.recentEvaluations.set(data);
      }
    } catch (e) {
      console.error('Error cargando dashboard', e);
    } finally {
      this.isLoading.set(false);
    }
  }

  navigateToNew() {
    console.log('========================================');
    console.log('[PerformanceDashboard] navigateToNew() - INICIO');
    console.log('[PerformanceDashboard] Current URL:', window.location.href);
    console.log('[PerformanceDashboard] Target route: /admin/performance/new');
    console.log(
      '[PerformanceDashboard] Router state before navigate:',
      this.router.url
    );
    console.log(
      '[PerformanceDashboard] Current employee:',
      this.dashboardStore.currentEmployee()
    );
    console.log(
      '[PerformanceDashboard] Current employee position:',
      this.dashboardStore.currentEmployee()?.position
    );
    console.log('[PerformanceDashboard] canCreate():', this.canCreate());

    // Suscribirse a eventos del router para debug
    const routerSub = this.router.events.subscribe((event) => {
      console.log(
        '[PerformanceDashboard] Router Event:',
        event.constructor.name,
        event
      );
    });

    this.router.navigate(['/admin/performance/new']).then(
      (success) => {
        console.log(
          '[PerformanceDashboard] Navigation result (success):',
          success
        );
        console.log(
          '[PerformanceDashboard] New URL after navigate:',
          this.router.url
        );
        routerSub.unsubscribe();
      },
      (error) => {
        console.error('[PerformanceDashboard] Navigation ERROR:', error);
        routerSub.unsubscribe();
      }
    );
    console.log(
      '[PerformanceDashboard] navigateToNew() - FIN (navigate called, awaiting result)'
    );
    console.log('========================================');
  }

  viewReport(id: string) {
    this.router.navigate(['/admin/performance/report', id]);
  }

  resumeEvaluation(evalData: any) {
    this.router.navigate(['/admin/performance/evaluate', evalData.id], {
      queryParams: { formId: evalData.audit_form_id },
    });
  }

  getUnitBadgeClass(unit: string): string {
    switch (unit?.toLowerCase()) {
      case 'petshop':
        return 'bg-orange-500/20 text-orange-400';
      case 'clinica':
        return 'bg-blue-500/20 text-blue-400';
      case 'grooming':
        return 'bg-pink-500/20 text-pink-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  }

  getScoreColor(score: number): string {
    if (score >= 81) return '#10B981'; // Green
    if (score >= 61) return '#F59E0B'; // Orange/Yellow
    return '#EF4444'; // Red
  }

  getStatusIcon(status: string): string {
    return status === 'completed'
      ? 'pi pi-check-circle text-green-500'
      : 'pi pi-clock text-yellow-500';
  }
}
