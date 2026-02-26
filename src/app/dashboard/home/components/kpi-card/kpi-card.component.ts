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

        <!-- Main Value Slot -->
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
        min-height: 0;
      }

      .kpi-card {
        background: rgba(24, 24, 27, 0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 1rem;
        padding: 1.25rem;
        height: 100%;
        display: flex;
        gap: 1rem;
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
            rgba(255, 255, 255, 0.12) 50%,
            rgba(255, 255, 255, 0) 100%
          );
        }

        &:hover {
          background: rgba(39, 39, 42, 0.95);
          border-color: rgba(251, 191, 36, 0.25);
          transform: translateY(-2px);
          box-shadow: 0 12px 40px -12px rgba(0, 0, 0, 0.4);

          .kpi-icon {
            transform: scale(1.08);
            background: rgba(251, 191, 36, 0.15);
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.35);
            box-shadow: 0 0 24px rgba(251, 191, 36, 0.12);
          }
        }

        &.clickable {
          cursor: pointer;

          &:hover {
            border-color: rgba(251, 191, 36, 0.4);
            background: linear-gradient(
              145deg,
              rgba(39, 39, 42, 0.95),
              rgba(24, 24, 27, 0.9)
            );
          }

          &:active {
            transform: translateY(0);
            transition: transform 0.1s ease;
          }
        }

        &.financial {
          .kpi-value {
            font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
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
            border-color: rgba(16, 185, 129, 0.35);
            box-shadow: 0 0 24px rgba(16, 185, 129, 0.12);
          }
        }
      }

      .kpi-icon {
        width: 3rem;
        height: 3rem;
        border-radius: 0.75rem;
        background: rgba(251, 191, 36, 0.08);
        border: 1px solid rgba(251, 191, 36, 0.15);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
        color: #fbbf24;
        transition: all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
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
        gap: 0.125rem;
      }

      .kpi-label {
        font-size: 0.8125rem;
        font-weight: 500;
        color: #a1a1aa;
        margin-bottom: 0.25rem;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        line-height: 1.3;
      }

      .kpi-value {
        font-size: 2rem;
        font-weight: 700;
        color: #ffffff;
        line-height: 1.15;
        margin-bottom: 0.125rem;
        font-family: system-ui, -apple-system, 'Segoe UI', sans-serif;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .kpi-sublabel {
        font-size: 0.8125rem;
        color: #71717a;
        line-height: 1.3;
      }

      .kpi-value-container {
        display: flex;
        align-items: baseline;
        flex-wrap: wrap;
      }

      .kpi-extra {
        width: 100%;
      }

      /* Responsive adjustments */
      @media (max-width: 768px) {
        .kpi-card {
          padding: 1rem;
          gap: 0.875rem;
        }

        .kpi-icon {
          width: 2.5rem;
          height: 2.5rem;
          font-size: 1.125rem;
        }

        .kpi-label {
          font-size: 0.75rem;
        }

        .kpi-value {
          font-size: 1.625rem;
        }

        .kpi-sublabel {
          font-size: 0.75rem;
        }
      }

      @media (max-width: 480px) {
        .kpi-card {
          padding: 0.875rem;
          gap: 0.75rem;
        }

        .kpi-icon {
          width: 2.25rem;
          height: 2.25rem;
          font-size: 1rem;
        }

        .kpi-value {
          font-size: 1.5rem;
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

  // Helper to check for content projection - in a real app would use contentChild
  // but for simplicity in this template we'll just check layout
  protected readonly projectedValue = false;
}
