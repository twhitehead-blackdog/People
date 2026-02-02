import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'pt-kpi-card',
  standalone: true,
  imports: [CommonModule, TooltipModule],
  template: `
    <div
      class="kpi-card"
      [class.clickable]="clickable()"
      [class.financial]="variant() === 'financial'"
      [pTooltip]="tooltip() || ''"
      tooltipPosition="top"
      (click)="cardClick.emit()"
      tabindex="0"
      (keydown.enter)="cardClick.emit()"
      (keydown.space)="cardClick.emit()"
    >
      <div class="kpi-icon" [ngClass]="iconClass()">
        <i [class]="icon()"></i>
      </div>

      <div class="kpi-content">
        <div class="kpi-label">{{ label() }}</div>

        <!-- Trend Indicator -->
        @if (trend()) {
        <div class="kpi-trend" [ngClass]="getTrendClass()">
          <i [class]="getTrendIcon()"></i>
          <span class="trend-value">{{ trend()?.value }}%</span>
          <span class="trend-label">{{ trend()?.label }}</span>
        </div>
        }

        <div class="kpi-value-container">
          <ng-content select="[value]"></ng-content>
          <!-- Allow complex value projection -->
          @if (!projectedValue) {
          <div class="kpi-value">{{ value() }}</div>
          }
        </div>

        <div class="kpi-sublabel">{{ sublabel() }}</div>

        <!-- Extra content slot (charts, sparklines, etc) -->
        <div class="kpi-extra">
          <ng-content select="[extra]"></ng-content>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        height: 100%;
      }

      .kpi-card {
        background: rgba(24, 24, 27, 0.6);
        backdrop-filter: blur(12px);
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 1rem;
        padding: 1.5rem;
        height: 100%;
        display: flex;
        gap: 1.25rem;
        position: relative;
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        overflow: hidden;

        &::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 1px;
          background: linear-gradient(
            90deg,
            rgba(255, 255, 255, 0) 0%,
            rgba(255, 255, 255, 0.1) 50%,
            rgba(255, 255, 255, 0) 100%
          );
        }

        &:hover {
          background: rgba(39, 39, 42, 0.8);
          border-color: rgba(251, 191, 36, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -10px rgba(0, 0, 0, 0.5);

          .kpi-icon {
            transform: scale(1.1) rotate(5deg);
            background: rgba(251, 191, 36, 0.15);
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.3);
            box-shadow: 0 0 20px rgba(251, 191, 36, 0.15);
          }
        }

        &.clickable {
          cursor: pointer;

          &:hover {
            border-color: rgba(251, 191, 36, 0.4);
            background: linear-gradient(
              145deg,
              rgba(39, 39, 42, 0.9),
              rgba(24, 24, 27, 0.8)
            );
          }

          &:active {
            transform: translateY(0);
          }
        }

        &.financial {
          .kpi-value {
            font-family: 'Space Mono', monospace;
            letter-spacing: -0.5px;
          }

          .kpi-icon {
            color: #34d399;
            background: rgba(52, 211, 153, 0.1);
            border-color: rgba(52, 211, 153, 0.2);
          }

          &:hover .kpi-icon {
            color: #10b981;
            background: rgba(16, 185, 129, 0.15);
            border-color: rgba(16, 185, 129, 0.3);
            box-shadow: 0 0 20px rgba(16, 185, 129, 0.15);
          }
        }
      }

      .kpi-icon {
        width: 3.5rem;
        height: 3.5rem;
        border-radius: 1rem;
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.05);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        color: #a1a1aa;
        transition: all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        flex-shrink: 0;

        &.female {
          color: #f472b6;
          background: rgba(244, 114, 182, 0.1);
          border-color: rgba(244, 114, 182, 0.2);
        }
      }

      .kpi-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-width: 0;
      }

      .kpi-label {
        font-size: 0.875rem;
        font-weight: 500;
        color: #a1a1aa;
        margin-bottom: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.05em;
      }

      .kpi-value {
        font-size: 1.75rem;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.2;
        margin-bottom: 0.25rem;
        font-family: 'Segoe UI', sans-serif;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .kpi-sublabel {
        font-size: 0.8125rem;
        color: #71717a;
      }

      .kpi-value-container {
        display: flex;
        align-items: baseline;
      }

      .kpi-trend {
        display: flex;
        align-items: center;
        gap: 0.25rem;
        font-size: 0.75rem;
        font-weight: 600;
        margin-bottom: 0.25rem;

        &.trend-up {
          color: #34d399;
        }
        &.trend-down {
          color: #f87171;
        }
        &.trend-neutral {
          color: #a1a1aa;
        }

        &.trend-inverse {
          &.trend-up {
            color: #f87171;
          }
          &.trend-down {
            color: #34d399;
          }
        }

        i {
          font-size: 0.75rem;
        }
        .trend-label {
          font-weight: 400;
          color: #71717a;
          margin-left: 0.25rem;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class KpiCardComponent {
  icon = input<string>('');
  label = input.required<string>();
  value = input<string | number | null>('');
  sublabel = input<string>();
  tooltip = input<string>();
  clickable = input<boolean>(false);
  variant = input<'default' | 'financial'>('default');
  iconClass = input<string>('');

  cardClick = output<void>();

  // Trend Inputs
  trend = input<{
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  } | null>(null);
  trendInverse = input<boolean>(false); // If true, Up is Bad (Red), Down is Good (Green)

  // Computed helpers for template
  getTrendClass() {
    const t = this.trend();
    if (!t) return '';
    const baseClass = `trend-${t.direction}`; // trend-up, trend-down
    return this.trendInverse() ? `${baseClass} trend-inverse` : baseClass;
  }

  getTrendIcon() {
    const t = this.trend();
    if (!t) return '';
    if (t.direction === 'up') return 'pi pi-arrow-up';
    if (t.direction === 'down') return 'pi pi-arrow-down';
    return 'pi pi-minus';
  }

  // Helper to check for content projection - in a real app would use contentChild
  // but for simplicity in this template we'll just check layout
  protected readonly projectedValue = false;
}
