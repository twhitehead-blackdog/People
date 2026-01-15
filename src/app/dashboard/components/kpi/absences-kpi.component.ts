import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-absences-kpi',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  template: `
    <div
      class="kpi-card absences-card"
      pTooltip="Muestra el empleado con mayor número de ausencias injustificadas en el mes. Una ausencia se cuenta cuando un empleado tiene horario asignado pero no registra entrada. Haga clic para ver el top completo."
      tooltipPosition="top"
    >
      <div class="kpi-icon">
        <i class="pi pi-calendar-times"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-label">MAYOR N° DE AUSENCIAS</div>
        <div class="kpi-value-container">
          <div class="kpi-value">{{ maxAbsencesCount }}</div>
          <div class="kpi-sparkline-placeholder">
            <i class="pi pi-user-minus text-3xl text-red-500/50"></i>
          </div>
        </div>
        <div class="kpi-sublabel">
          Empleado: <span class="text-red-300">{{ topEmployeeName }}</span>
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

      .kpi-value-container {
        @apply mb-4 flex items-center justify-between;
      }

      .kpi-value {
        @apply font-mono text-4xl font-bold tracking-tighter text-white;
      }

      .absences-card .kpi-value {
        @apply text-red-400;
      }

      .kpi-sparkline-placeholder {
        @apply flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 transition-all duration-300;
      }

      .kpi-card:hover .kpi-sparkline-placeholder {
        @apply scale-110 bg-red-500/20;
        i {
          @apply text-red-400;
        }
      }

      .kpi-sublabel {
        @apply text-sm font-medium text-zinc-500;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AbsencesKpiComponent {
  @Input({ required: true }) maxAbsencesCount!: number;
  @Input({ required: true }) topEmployeeName!: string;
}
