import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  Output,
} from '@angular/core';
import { BaseChartDirective } from 'ng2-charts';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-headcount-kpi',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="kpi-card headcount-card"
      pTooltip="Muestra el número total de empleados activos en la empresa. Se calcula contando todos los empleados con estado 'is_active = true'. El gráfico muestra la tendencia histórica del número de empleados."
      tooltipPosition="top"
    >
      <div class="kpi-icon">
        <i class="pi pi-users"></i>
      </div>
      <div class="kpi-content">
        <div class="headcount-header">
          <div class="kpi-label">TOTAL COLABORADORES</div>
          <div class="kpi-value">{{ headcount }}</div>
          <div class="kpi-sublabel">Empleados activos</div>
        </div>

        <!-- Mini trend chart -->
        <div class="sparkline-box">
          <div class="kpi-sparkline">
            <canvas
              baseChart
              [type]="'line'"
              [data]="chartData"
              [options]="chartOptions"
              (chartClick)="chartClick.emit($event)"
            ></canvas>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      /* Estilos copiados/adaptados para mantener la apariencia */
      :host {
        display: block;
        height: 100%;
      }

      .kpi-card {
        @apply relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 backdrop-blur-xl transition-all duration-300;
        height: 100%;
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

      .kpi-value {
        @apply mb-1 font-mono text-4xl font-bold tracking-tighter text-white;
      }

      .kpi-sublabel {
        @apply text-sm font-medium text-zinc-500;
      }

      .headcount-card .kpi-value {
        @apply text-yellow-400;
      }

      .sparkline-box {
        @apply mt-6 h-16 w-full opacity-50 transition-opacity duration-300;
      }

      .kpi-card:hover .sparkline-box {
        @apply opacity-100;
      }

      .kpi-sparkline {
        @apply relative h-full w-full;
      }
    `,
  ],
})
export class HeadcountKpiComponent {
  @Input({ required: true }) headcount!: number;
  @Input({ required: true }) chartData!: any;
  @Input({ required: true }) chartOptions!: any;
  @Output() chartClick = new EventEmitter<any>();
}
