import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

export interface TopLateRecord {
  name: string;
  count: number;
}

@Component({
  selector: 'app-top-lates-dialog',
  standalone: true,
  imports: [CommonModule, DialogModule],
  template: `
    <p-dialog
      [visible]="visible"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      [style]="{ width: '600px' }"
      header="Top de Empleados con Más Tardanzas"
      styleClass="late-details-dialog top-lates-dialog"
      appendTo="body"
    >
      <div
        class="flex flex-col gap-0"
        style="padding: 1.5rem 2rem; min-height: 100px;"
      >
        <div
          class="text-sm text-gray-300 text-center py-4"
          *ngIf="lates.length === 0"
        >
          No hay tardanzas registradas este mes.
        </div>
        <ul *ngIf="lates.length > 0" class="top-lates-list">
          <li
            class="top-lates-list-item"
            *ngFor="let item of lates; let i = index"
          >
            <div class="top-lates-item-content">
              <div
                class="top-lates-rank"
                [class.rank-1]="i === 0"
                [class.rank-2]="i === 1"
                [class.rank-3]="i === 2"
              >
                {{ i + 1 }}
              </div>
              <div class="top-lates-details">
                <div class="top-lates-name-row">
                  <span class="top-lates-name">{{ item.name }}</span>
                </div>
                <div class="top-lates-info-row">
                  <span class="top-lates-count"
                    >{{ item.count }} tardanza{{
                      item.count > 1 ? 's' : ''
                    }}</span
                  >
                </div>
              </div>
              <div class="top-lates-right-section">
                <div
                  class="top-lates-badge"
                  [class.badge-high]="item.count >= 5"
                  [class.badge-medium]="item.count >= 3 && item.count < 5"
                >
                  {{ item.count }}
                </div>
              </div>
            </div>
          </li>
        </ul>
      </div>
    </p-dialog>
  `,
  styles: [
    `
      .top-lates-list {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-direction: column;
        gap: 0;
        max-height: 500px;
        overflow-y: auto;
      }

      .top-lates-list-item {
        background: transparent;
        border: none;
        padding: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
      }

      .top-lates-list-item:first-child .top-lates-item-content {
        padding-top: 0;
      }

      .top-lates-list-item:last-child {
        border-bottom: none;
      }

      .top-lates-list-item:hover {
        background: rgba(251, 191, 36, 0.05);
      }

      .top-lates-item-content {
        display: flex;
        gap: 0.875rem;
        align-items: center;
        padding: 0.875rem 0;
      }

      .top-lates-rank {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 1rem;
        font-weight: 700;
        background: rgba(255, 255, 255, 0.1);
        color: #ffffff;
        border: 2px solid rgba(255, 255, 255, 0.2);
      }

      .top-lates-rank.rank-1 {
        background: linear-gradient(
          135deg,
          rgba(251, 191, 36, 0.3),
          rgba(245, 158, 11, 0.2)
        );
        border-color: rgba(251, 191, 36, 0.6);
        color: #fbbf24;
        font-size: 1.125rem;
      }

      .top-lates-rank.rank-2 {
        background: linear-gradient(
          135deg,
          rgba(156, 163, 175, 0.3),
          rgba(107, 114, 128, 0.2)
        );
        border-color: rgba(156, 163, 175, 0.6);
        color: #9ca3af;
      }

      .top-lates-rank.rank-3 {
        background: linear-gradient(
          135deg,
          rgba(180, 83, 9, 0.3),
          rgba(154, 52, 18, 0.2)
        );
        border-color: rgba(180, 83, 9, 0.6);
        color: #b45309;
      }

      .top-lates-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
      }

      .top-lates-name-row {
        display: flex;
        align-items: center;
      }

      .top-lates-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ffffff;
      }

      .top-lates-info-row {
        display: flex;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: #9ca3af;
      }

      .top-lates-count {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }

      .top-lates-right-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.375rem;
      }

      .top-lates-badge {
        font-size: 1.25rem;
        font-weight: 700;
        color: #fbbf24;
        line-height: 1;
        font-family: 'Segoe UI', sans-serif;
        padding: 0.25rem 0.5rem;
        border-radius: 0.375rem;
        background: rgba(251, 191, 36, 0.1);
        border: 1px solid rgba(251, 191, 36, 0.3);
      }

      .top-lates-badge.badge-medium {
        color: #f59e0b;
        background: rgba(245, 158, 11, 0.15);
        border-color: rgba(245, 158, 11, 0.4);
      }

      .top-lates-badge.badge-high {
        color: #ef4444;
        background: rgba(239, 68, 68, 0.15);
        border-color: rgba(239, 68, 68, 0.4);
      }

      /* Custom Scrollbar */
      ul {
        scrollbar-width: thin;
        scrollbar-color: rgba(251, 191, 36, 0.4) rgba(255, 255, 255, 0.05);
      }

      ul::-webkit-scrollbar {
        width: 10px;
      }

      ul::-webkit-scrollbar-track {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 10px;
        margin: 4px 0;
      }

      ul::-webkit-scrollbar-thumb {
        background: linear-gradient(
          180deg,
          rgba(251, 191, 36, 0.6),
          rgba(245, 158, 11, 0.4)
        );
        border-radius: 10px;
        border: 2px solid rgba(24, 24, 27, 0.3);
        transition: all 0.3s ease;
      }

      ul::-webkit-scrollbar-thumb:hover {
        background: linear-gradient(
          180deg,
          rgba(251, 191, 36, 0.8),
          rgba(245, 158, 11, 0.6)
        );
        box-shadow: 0 0 10px rgba(251, 191, 36, 0.3);
      }

      ul::-webkit-scrollbar-thumb:active {
        background: linear-gradient(180deg, #fbbf24, #f59e0b);
      }
    `,
  ],
})
export class TopLatesDialogComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Input() lates: TopLateRecord[] = [];
}
