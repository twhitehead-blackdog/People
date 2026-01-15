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
  selector: 'app-lates-kpi',
  standalone: true,
  imports: [CommonModule, BaseChartDirective, TooltipModule],
  template: `
    <div
      class="kpi-card lates-card"
      pTooltip="Muestra el total de tardanzas registradas en el mes actual. Una tardanza se cuenta cuando un empleado marca su entrada después de la hora programada más la tolerancia definida. Haga clic para ver el top de empleados con más tardanzas."
      tooltipPosition="top"
    >
      <div class="kpi-icon">
        <i class="pi pi-clock"></i>
      </div>
      <div class="kpi-content">
        <div class="headcount-header">
          <div class="kpi-label">TARDANZAS DEL MES</div>
          <div class="kpi-value">{{ count }}</div>
          <div class="kpi-sublabel">
            Top: <span class="text-orange-300">{{ topEmployeeName }}</span>
            <span class="text-xs text-zinc-500 ml-1"
              >({{ topEmployeeCount }})</span
            >
          </div>
        </div>

        <!-- Mini trend chart for lates -->
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

      .kpi-value {
        @apply mb-1 font-mono text-4xl font-bold tracking-tighter text-white;
      }

      .lates-card .kpi-value {
        @apply text-orange-400;
      }

      .kpi-sublabel {
        @apply text-sm font-medium text-zinc-500;
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
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LatesKpiComponent {
  @Input({ required: true }) count!: number;
  @Input({ required: true }) topEmployeeName!: string;
  @Input({ required: true }) topEmployeeCount!: number;
  @Input({ required: true }) chartData!: any;
  @Input({ required: true }) chartOptions!: any;

  @Output() chartClick = new EventEmitter<any>();
}
