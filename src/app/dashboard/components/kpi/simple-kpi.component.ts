import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-simple-kpi',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  template: `
    <div class="kpi-card" [pTooltip]="tooltipText" tooltipPosition="top">
      <div class="kpi-icon" [ngClass]="iconClassWrapper">
        <i [class]="'pi ' + icon" [ngClass]="iconClass"></i>
      </div>
      <div class="kpi-content">
        <div class="kpi-label">{{ title }}</div>
        <div class="kpi-value" [ngClass]="valueClass">{{ value }}</div>
        <div class="kpi-sublabel">{{ sublabel }}</div>
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

      .kpi-sublabel {
        @apply text-sm font-medium text-zinc-500;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SimpleKpiComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) value!: string | number;
  @Input({ required: true }) sublabel!: string;
  @Input({ required: true }) icon!: string;
  @Input() tooltipText: string = '';
  @Input() valueClass: string = '';
  @Input() iconClass: string = '';
  @Input() iconClassWrapper: string = '';
}
