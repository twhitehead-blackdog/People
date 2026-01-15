import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-payroll-kpi',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  template: `
    <div
      class="kpi-card financial payroll-cost-compact"
      pTooltip="Muestra el costo total de la planilla de empleados. El costo mensual se calcula sumando el salario mensual (monthly_salary) de todos los empleados activos. El costo anual es una proyección multiplicando el costo mensual por 12 meses. Solo incluye empleados con estado 'is_active = true'."
      tooltipPosition="top"
    >
      <div class="kpi-icon">
        <i class="pi pi-money-bill"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-label">Costo de Planilla</div>
        <div class="kpi-value-stacked">
          <div class="value-item">
            <span class="value-lg">{{ monthlyCost }}</span>
            <span class="value-label">Mensual</span>
          </div>
          <div class="value-item">
            <span class="value-lg">{{ annualCost }}</span>
            <span class="value-label">Anual</span>
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

      .kpi-value-stacked {
        @apply flex w-full items-end gap-6;
      }

      .value-item {
        @apply flex flex-col;
      }

      .value-lg {
        @apply font-mono text-2xl font-bold tracking-tighter text-emerald-400;
      }

      .value-label {
        @apply text-xs font-medium uppercase tracking-wider text-zinc-500;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollKpiComponent {
  @Input({ required: true }) monthlyCost!: string; // Ya formateado con pipe
  @Input({ required: true }) annualCost!: string; // Ya formateado
}
