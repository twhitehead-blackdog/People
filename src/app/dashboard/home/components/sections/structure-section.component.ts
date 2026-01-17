import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { DashboardStore } from '../../../../stores/dashboard.store';
import { KpiCardComponent } from '../kpi-card/kpi-card.component';

@Component({
  selector: 'pt-structure-section',
  standalone: true,
  imports: [CommonModule, KpiCardComponent],
  template: `
    <div class="section-content">
      <div class="kpi-grid">
        <!-- Sucursales Activas -->
        <pt-kpi-card
          icon="pi pi-building"
          label="Sucursales Activas"
          [value]="state.branchesCount()"
          sublabel="Ubicaciones"
        ></pt-kpi-card>

        <!-- Empleados Fijos -->
        <pt-kpi-card
          icon="pi pi-file"
          label="Empleados Fijos"
          [value]="state.contractDistribution().fixed"
        >
          <div sublabel>{{ getContractPercentage('fixed') }}% del total</div>
        </pt-kpi-card>

        <!-- Empleados Temporales -->
        <pt-kpi-card
          icon="pi pi-file"
          label="Empleados Temporales"
          [value]="state.contractDistribution().temporary"
        >
          <div sublabel>
            {{ getContractPercentage('temporary') }}% del total
          </div>
        </pt-kpi-card>

        <!-- Ratio de Supervisión -->
        <pt-kpi-card
          icon="pi pi-users"
          label="Ratio de Supervisión"
          [value]="state.supervisionRatio()"
          sublabel="Empleados por supervisor"
        ></pt-kpi-card>
      </div>
    </div>
  `,
  styles: [
    `
      .section-content {
        padding: 0;
      }

      .kpi-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 1.5rem;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StructureSectionComponent {
  state = inject(DashboardStore);

  getContractPercentage(type: 'fixed' | 'temporary'): number {
    const dist = this.state.contractDistribution();
    const total = dist.fixed + dist.temporary;
    if (total === 0) return 0;
    return Math.round((dist[type] / total) * 100);
  }
}
