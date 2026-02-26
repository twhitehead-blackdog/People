import { CommonModule } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  model,
} from '@angular/core';
import { DialogModule } from 'primeng/dialog';
import { DeviceService } from '../../../../services/device.service';

@Component({
  selector: 'pt-top-lates-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  template: `
    @if (device.isDesktop()) {
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '600px' }"
      header="Top de Empleados con Más Tardanzas"
      styleClass="late-details-dialog top-lates-dialog"
    >
      <div class="dialog-content">
        @if (list().length === 0) {
        <div class="empty-state">No hay tardanzas registradas este mes.</div>
        } @else {
        <ul class="ranking-list">
          @for (item of list(); track item.employee_name; let i = $index) {
          <li class="ranking-list-item">
            <div class="ranking-item-content">
              <div
                class="ranking-number"
                [class.rank-1]="i === 0"
                [class.rank-2]="i === 1"
                [class.rank-3]="i === 2"
              >
                {{ i + 1 }}
              </div>
              <div class="ranking-details">
                <div class="ranking-name-row">
                  <span class="ranking-name">{{ item.employee_name }}</span>
                </div>
                <div class="ranking-info-row">
                  <span class="ranking-count-label">
                    {{ item.count }} tardanza{{ item.count > 1 ? 's' : '' }}
                  </span>
                </div>
              </div>
              <div class="ranking-right-section">
                <div
                  class="ranking-badge"
                  [class.badge-high]="item.count >= 5"
                  [class.badge-medium]="item.count >= 3 && item.count < 5"
                >
                  {{ item.count }}
                </div>
              </div>
            </div>
          </li>
          }
        </ul>
        }
      </div>
    </p-dialog>
    } @else {
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '95vw', 'max-height': '90vh' }"
      position="bottom"
      header="Top Tardanzas"
      styleClass="late-details-dialog top-lates-dialog"
    >
      <div class="p-2">
        @if (list().length === 0) {
        <div class="text-sm text-gray-400 text-center py-4">No hay tardanzas registradas este mes.</div>
        } @else {
        <div class="flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto">
          @for (item of list(); track item.employee_name; let i = $index) {
          <div class="bg-neutral-800/60 rounded-xl p-3 border border-neutral-700/30">
            <div class="flex items-center gap-3">
              <div
                class="ranking-number flex-shrink-0"
                [class.rank-1]="i === 0"
                [class.rank-2]="i === 1"
                [class.rank-3]="i === 2"
              >
                {{ i + 1 }}
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-sm text-white font-medium truncate">{{ item.employee_name }}</div>
                <div class="text-xs text-gray-400 mt-0.5">
                  {{ item.count }} tardanza{{ item.count > 1 ? 's' : '' }}
                </div>
              </div>
              <div class="flex-shrink-0">
                <div
                  class="ranking-badge"
                  [class.badge-high]="item.count >= 5"
                  [class.badge-medium]="item.count >= 3 && item.count < 5"
                >
                  {{ item.count }}
                </div>
              </div>
            </div>
          </div>
          }
        </div>
        }
      </div>
    </p-dialog>
    }
  `,
  styles: [
    `
      .dialog-content {
        padding: 1.5rem 2rem;
        min-height: 100px;
      }

      .empty-state {
        font-size: 0.875rem;
        color: #d1d5db;
        text-align: center;
        padding: 1rem 0;
      }

      .ranking-list {
        display: flex;
        flex-direction: column;
        gap: 0;
        max-height: 24rem;
        overflow-y: auto;
        list-style: none;
        margin: 0;
        padding: 0;
      }

      .ranking-list-item {
        border-bottom: 1px solid rgba(255, 255, 255, 0.05);
        &:last-child {
          border-bottom: none;
        }
      }

      .ranking-item-content {
        display: flex;
        align-items: center;
        padding: 1rem 0;
        gap: 1rem;
      }

      .ranking-number {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.05);
        color: #9ca3af;
        font-weight: 700;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.875rem;

        &.rank-1 {
          background: linear-gradient(135deg, #fbbf24 0%, #d97706 100%);
          color: #fff;
          box-shadow: 0 4px 6px -1px rgba(251, 191, 36, 0.3);
        }
        &.rank-2 {
          background: linear-gradient(135deg, #9ca3af 0%, #4b5563 100%);
          color: #fff;
        }
        &.rank-3 {
          background: linear-gradient(135deg, #b45309 0%, #78350f 100%);
          color: #fff;
        }
      }

      .ranking-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .ranking-name {
        font-weight: 500;
        color: #e4e4e7;
      }

      .ranking-count-label {
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .ranking-right-section {
        display: flex;
        align-items: center;
      }

      .ranking-badge {
        font-size: 0.875rem;
        font-weight: 700;
        color: #fff;
        background: rgba(255, 255, 255, 0.1);
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;

        &.badge-high {
          background: rgba(248, 113, 113, 0.2);
          color: #f87171;
        }
        &.badge-medium {
          background: rgba(251, 191, 36, 0.2);
          color: #fbbf24;
        }
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopLatesDialogComponent {
  protected device = inject(DeviceService);
  visible = model.required<boolean>();
  list = input.required<any[]>();
}
