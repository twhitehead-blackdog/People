import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { DialogModule } from 'primeng/dialog';

export interface HireExitRecord {
  name: string;
  branch_name?: string;
  job_title?: string;
  start_date?: string;
  date?: string; // for exits
  reason?: string; // for exits
}

@Component({
  selector: 'app-hires-exits-dialog',
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
      [header]="title"
      styleClass="late-details-dialog hires-exits-dialog"
      appendTo="body"
    >
      <div
        class="flex flex-col gap-0"
        style="padding: 1.5rem 2rem; min-height: 100px;"
      >
        <!-- Tabs -->
        <div class="hires-exits-tabs">
          <button
            class="tab-button"
            [class.active]="activeTab() === 'hires'"
            (click)="activeTab.set('hires')"
          >
            <i class="pi pi-arrow-down"></i>
            Ingresos ({{ hires.length }})
          </button>
          <button
            class="tab-button"
            [class.active]="activeTab() === 'exits'"
            (click)="activeTab.set('exits')"
          >
            <i class="pi pi-arrow-up"></i>
            Salidas ({{ exits.length }})
          </button>
        </div>

        <!-- Hires List -->
        <div *ngIf="activeTab() === 'hires'">
          <div
            class="text-sm text-gray-300 text-center py-4"
            *ngIf="hires.length === 0"
          >
            No hay ingresos registrados.
          </div>
          <ul
            class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
            *ngIf="hires.length > 0"
          >
            <li class="hires-exits-list-item" *ngFor="let hire of hires">
              <div class="hires-exits-item-content">
                <div class="hires-exits-icon-box icon-hire">
                  <i class="pi pi-user-plus"></i>
                </div>
                <div class="hires-exits-details">
                  <div class="hires-exits-name-row">
                    <span class="hires-exits-name">{{ hire.name }}</span>
                  </div>
                  <div class="hires-exits-info-row">
                    <span class="hires-exits-branch" *ngIf="hire.branch_name">
                      <i class="pi pi-building"></i>
                      {{ hire.branch_name }}
                    </span>
                    <span class="hires-exits-position" *ngIf="hire.job_title">
                      <i class="pi pi-id-card"></i>
                      {{ hire.job_title }}
                    </span>
                  </div>
                </div>
                <div class="hires-exits-right-section">
                  <div class="hires-exits-date-display">
                    {{ getDay(hire.start_date) }}
                    <span class="date-month">{{
                      getMonth(hire.start_date)
                    }}</span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>

        <!-- Exits List -->
        <div *ngIf="activeTab() === 'exits'">
          <div
            class="text-sm text-gray-300 text-center py-4"
            *ngIf="exits.length === 0"
          >
            No hay salidas registradas.
          </div>
          <ul
            class="flex flex-col gap-0 max-h-96 overflow-auto list-none m-0 p-0"
            *ngIf="exits.length > 0"
          >
            <li class="hires-exits-list-item" *ngFor="let exit of exits">
              <div class="hires-exits-item-content">
                <div class="hires-exits-icon-box icon-exit">
                  <i class="pi pi-user-minus"></i>
                </div>
                <div class="hires-exits-details">
                  <div class="hires-exits-name-row">
                    <span class="hires-exits-name">{{ exit.name }}</span>
                  </div>
                  <div class="hires-exits-info-row">
                    <span class="hires-exits-branch" *ngIf="exit.branch_name">
                      <i class="pi pi-building"></i>
                      {{ exit.branch_name }}
                    </span>
                    <span class="hires-exits-reason" *ngIf="exit.reason">
                      <i class="pi pi-info-circle"></i>
                      {{ exit.reason }}
                    </span>
                  </div>
                </div>
                <div class="hires-exits-right-section">
                  <div class="hires-exits-date-display exit-date">
                    {{ getDay(exit.date) }}
                    <span class="date-month">{{ getMonth(exit.date) }}</span>
                  </div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>
    </p-dialog>
  `,
  styles: [
    `
      .hires-exits-tabs {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }

      .tab-button {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        background: transparent;
        border: none;
        border-bottom: 2px solid transparent;
        color: #9ca3af;
        font-size: 0.875rem;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .tab-button:hover {
        color: #ffffff;
        background: rgba(255, 255, 255, 0.05);
      }

      .tab-button.active {
        color: #fbbf24;
        border-bottom-color: #fbbf24;
        background: rgba(251, 191, 36, 0.05);
      }

      .tab-button i {
        font-size: 0.875rem;
      }

      .hires-exits-list-item {
        background: transparent;
        border: none;
        padding: 0;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        transition: all 0.2s ease;
      }

      .hires-exits-list-item:first-child .hires-exits-item-content {
        padding-top: 0;
      }

      .hires-exits-list-item:last-child {
        border-bottom: none;
      }

      .hires-exits-list-item:hover {
        background: rgba(251, 191, 36, 0.05);
      }

      .hires-exits-item-content {
        display: flex;
        gap: 0.875rem;
        align-items: center;
        padding: 0.875rem 0;
      }

      .hires-exits-icon-box {
        width: 2.5rem;
        height: 2.5rem;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 1.25rem;
        transition: all 0.3s ease;
      }

      .hires-exits-icon-box.icon-hire {
        background: linear-gradient(
          135deg,
          rgba(16, 185, 129, 0.2),
          rgba(5, 150, 105, 0.1)
        );
        border: 2px solid rgba(16, 185, 129, 0.4);
        color: #10b981;
      }

      .hires-exits-icon-box.icon-exit {
        background: linear-gradient(
          135deg,
          rgba(239, 68, 68, 0.2),
          rgba(220, 38, 38, 0.1)
        );
        border: 2px solid rgba(239, 68, 68, 0.4);
        color: #ef4444;
      }

      .hires-exits-details {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
        min-width: 0;
      }

      .hires-exits-name-row {
        display: flex;
        align-items: center;
      }

      .hires-exits-name {
        font-size: 0.875rem;
        font-weight: 600;
        color: #ffffff;
      }

      .hires-exits-info-row {
        display: flex;
        gap: 0.5rem;
        font-size: 0.75rem;
        color: #9ca3af;
        flex-wrap: wrap;
      }

      .hires-exits-branch,
      .hires-exits-position,
      .hires-exits-reason {
        display: inline-flex;
        align-items: center;
        gap: 0.3rem;
      }

      .hires-exits-branch i,
      .hires-exits-position i,
      .hires-exits-reason i {
        font-size: 0.625rem;
        color: rgba(251, 191, 36, 0.5);
      }

      .hires-exits-right-section {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.375rem;
      }

      .hires-exits-date-display {
        font-size: 1.5rem;
        font-weight: 700;
        color: #fbbf24;
        line-height: 1;
        font-family: 'Segoe UI', sans-serif;
      }

      .hires-exits-date-display.exit-date {
        color: #ef4444;
      }

      /* Custom Scrollbar for Hires and Exits List */
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
export class HiresExitsDialogComponent {
  @Input() visible = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  @Input() title = 'Ingresos y Salidas del Personal';
  @Input() hires: HireExitRecord[] = [];
  @Input() exits: HireExitRecord[] = [];

  public activeTab = signal<'hires' | 'exits'>('hires');

  public getDay(dateStr: string | undefined): string {
    if (!dateStr) return '';
    return new Date(dateStr).getDate().toString();
  }

  public getMonth(dateStr: string | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date
      .toLocaleString('es-ES', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
  }
}
