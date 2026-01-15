import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-hires-exits-kpi',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TooltipModule],
  template: `
    <div
      class="kpi-card hires-exits-card"
      pTooltip="Muestra la rotación de personal del mes actual (Ingresos vs Salidas). Los datos provienen de los campos 'start_date' para ingresos y 'termination_date' para salidas. Haga clic para ver la lista detallada."
      tooltipPosition="top"
    >
      <div class="kpi-icon">
        <i class="pi pi-sort-alt"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-label">Ingresos vs Salidas (Mes Actual)</div>
        <div class="gender-chart-container">
          <div class="gender-chart-wrapper">
            <canvas
              baseChart
              [type]="'doughnut'"
              [data]="chartData"
              [options]="chartOptions"
              class="gender-chart-canvas"
            ></canvas>

            <!-- Center icons inside the arc -->
            <div class="gender-center-icons">
              <i class="pi pi-user-plus hires-center-icon"></i>
              <i class="pi pi-user-minus exits-center-icon"></i>
            </div>
          </div>

          <div class="gender-legend">
            <div class="legend-item">
              <span class="legend-label">Ingresos</span>
              <span class="legend-value text-emerald-400">{{
                hiresCount
              }}</span>
            </div>
            <div class="legend-item">
              <span class="legend-label">Salidas</span>
              <span class="legend-value text-red-400">{{ exitsCount }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Estilos iguales al anterior (compartidos en concepto) */
      .kpi-card {
        @apply relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl transition-all duration-300;
        cursor: pointer;
      }

      .kpi-card:hover {
        @apply border-yellow-500/20 bg-zinc-900/80 shadow-2xl shadow-yellow-500/5;
        transform: translateY(-4px);
      }

      .kpi-icon {
        @apply absolute right-0 top-0 p-6 text-zinc-800 transition-colors duration-300;
        i {
          @apply text-6xl opacity-10;
        }
      }

      .kpi-card:hover .kpi-icon i {
        @apply text-yellow-500 opacity-20;
      }

      .kpi-content {
        @apply relative z-10 flex h-full flex-col justify-between;
      }

      .kpi-label {
        @apply mb-2 text-xs font-bold uppercase tracking-widest text-zinc-500;
      }

      .gender-chart-container {
        @apply relative mt-2 flex flex-col items-center justify-center;
      }

      .gender-chart-wrapper {
        @apply relative h-32 w-48;
      }

      .gender-center-icons {
        @apply absolute bottom-0 left-0 right-0 flex justify-center gap-4 pb-4;

        i {
          @apply text-xl opacity-50 transition-all duration-300;
        }
      }

      .hires-center-icon {
        @apply text-emerald-500;
      }
      .exits-center-icon {
        @apply text-red-500;
      }

      .kpi-card:hover .gender-center-icons i {
        @apply scale-125 opacity-100;
      }

      .gender-legend {
        @apply mt-2 flex w-full justify-between px-2;
      }

      .legend-item {
        @apply flex flex-col items-center;
      }

      .legend-label {
        @apply text-[10px] font-bold uppercase tracking-wider text-zinc-500;
      }

      .legend-value {
        @apply font-mono text-sm font-bold text-white;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HiresExitsKpiComponent {
  @Input({ required: true }) hiresCount!: number;
  @Input({ required: true }) exitsCount!: number;
  @Input({ required: true }) chartData!: any;
  @Input({ required: true }) chartOptions!: any;
}
