import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dialog } from 'primeng/dialog';
import { Select } from 'primeng/select';
import { Button } from 'primeng/button';

type MonthOption = { label: string; value: Date };
type WeekOption = { label: string; value: number };

@Component({
  selector: 'pt-month-week-selector',
  standalone: true,
  imports: [Dialog, FormsModule, Select, Button],
  template: `
    <p-dialog
      [visible]="visible()"
      (visibleChange)="visible.set($event)"
      [modal]="true"
      [closable]="true"
      [draggable]="false"
      [resizable]="false"
      [dismissableMask]="true"
      header="Seleccionar Mes y Semana"
      [style]="{ width: '90vw', maxWidth: '650px', minHeight: '400px' }"
      [styleClass]="'month-week-selector-dialog'"
      (onHide)="visible.set(false)"
    >
      <div class="flex flex-col gap-5 py-2">
        <div class="flex flex-col gap-3">
          <label class="text-sm font-semibold text-gray-200">Mes:</label>
          <p-select
            [options]="monthOptions()"
            [ngModel]="selectedMonthOption()"
            (ngModelChange)="onMonthChange($event)"
            optionLabel="label"
            [styleClass]="'w-full month-select'"
            appendTo="body"
          />
        </div>
        <div class="flex flex-col gap-3">
          <label class="text-sm font-semibold text-gray-200">Semana del mes:</label>
          <p-select
            [options]="weekOptions()"
            [ngModel]="selectedWeek()"
            (ngModelChange)="selectedWeek.set($event)"
            optionLabel="label"
            optionValue="value"
            [styleClass]="'w-full week-select'"
            appendTo="body"
          />
        </div>
        <div class="flex justify-end gap-2 mt-4">
          <p-button
            label="Cancelar"
            (click)="visible.set(false)"
            rounded
            severity="secondary"
          />
          <p-button
            label="Ir a semana"
            (click)="onConfirm()"
            rounded
          />
        </div>
      </div>
    </p-dialog>
  `,
  styles: `
    ::ng-deep .month-week-selector-dialog .p-dialog-content {
      padding: 1.5rem !important;
      min-height: 300px !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select {
      width: 100% !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-trigger {
      min-height: 44px !important;
      padding: 0.625rem 0.75rem !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-panel {
      width: 100% !important;
      max-height: 300px !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-items-wrapper {
      max-height: 280px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
    }
    
    ::ng-deep .month-week-selector-dialog .month-select .p-select-items-wrapper {
      max-height: 320px !important;
      overflow-y: auto !important;
      overflow-x: hidden !important;
      scrollbar-width: thin !important;
      scrollbar-color: rgba(107, 114, 128, 0.5) transparent !important;
    }
    
    ::ng-deep .month-week-selector-dialog .month-select .p-select-items-wrapper::-webkit-scrollbar {
      width: 8px !important;
    }
    
    ::ng-deep .month-week-selector-dialog .month-select .p-select-items-wrapper::-webkit-scrollbar-track {
      background: transparent !important;
    }
    
    ::ng-deep .month-week-selector-dialog .month-select .p-select-items-wrapper::-webkit-scrollbar-thumb {
      background-color: rgba(107, 114, 128, 0.5) !important;
      border-radius: 4px !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-item {
      padding: 0.875rem 1rem !important;
      font-size: 0.95rem !important;
      min-height: 44px !important;
      display: flex !important;
      align-items: center !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-item:hover {
      background-color: rgba(107, 114, 128, 0.2) !important;
    }
    
    ::ng-deep .month-week-selector-dialog .p-select-item.p-highlight {
      background-color: rgba(251, 191, 36, 0.2) !important;
      color: #fbbf24 !important;
    }
  `,
})
export class MonthWeekSelectorComponent {
  // Two-way bindings
  public visible = model.required<boolean>();
  public selectedMonth = model.required<Date>();
  public selectedWeek = model.required<number>();

  // Inputs
  public monthOptions = input.required<MonthOption[]>();
  public weekOptions = input.required<WeekOption[]>();
  public selectedMonthOption = input.required<MonthOption>();

  // Outputs
  public confirm = output<void>();
  public monthChange = output<MonthOption>();

  public onMonthChange(option: MonthOption): void {
    this.monthChange.emit(option);
  }

  public onConfirm(): void {
    this.confirm.emit();
  }
}
