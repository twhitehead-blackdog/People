import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { DashboardStore } from '../../stores/dashboard.store';

@Component({
  selector: 'app-structure-section',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="section-content">
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-building"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Sucursales Activas</div>
            <div class="kpi-value">{{ state.branchesCount() }}</div>
            <div class="kpi-sublabel">Ubicaciones</div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-file"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Empleados Fijos</div>
            <div class="kpi-value">
              {{ state.contractDistribution().fixed }}
            </div>
            <div class="kpi-sublabel">
              {{ getContractPercentage('fixed') }}% del total
            </div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-file"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Empleados Temporales</div>
            <div class="kpi-value">
              {{ state.contractDistribution().temporary }}
            </div>
            <div class="kpi-sublabel">
              {{ getContractPercentage('temporary') }}% del total
            </div>
          </div>
        </div>
        <div class="kpi-card">
          <div class="kpi-icon">
            <i class="pi pi-users"></i>
          </div>
          <div class="kpi-content">
            <div class="kpi-label">Ratio de Supervisión</div>
            <div class="kpi-value">{{ state.supervisionRatio() }}</div>
            <div class="kpi-sublabel">Empleados por supervisor</div>
          </div>
        </div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructureSectionComponent {
  public state = inject(DashboardStore);

  public getContractPercentage(type: 'fixed' | 'temporary'): number {
    const dist = this.state.contractDistribution();
    const total = dist.fixed + dist.temporary;
    if (total === 0) return 0;
    return Math.round((dist[type] / total) * 100);
  }
}
