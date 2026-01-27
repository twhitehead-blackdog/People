import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Button } from 'primeng/button';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { InputNumber } from 'primeng/inputnumber';
import { MultiSelect } from 'primeng/multiselect';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { Schedule, ScheduleConfiguration } from '../models';
import { PositionsStore } from '../stores/positions.store';
import { ScheduleConfigurationsStore } from '../stores/schedule-configurations.store';

@Component({
  selector: 'pt-schedule-configuration-dialog',
  standalone: true,
  imports: [FormsModule, Button, ToggleSwitch, MultiSelect, InputNumber],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Schedule name display -->
      <div class="bg-neutral-800 rounded-lg p-4">
        <span class="text-sm text-gray-400">Horario:</span>
        <h3 class="text-lg font-semibold m-0">{{ schedule?.name }}</h3>
      </div>

      <!-- Active toggle -->
      <div class="flex items-center justify-between">
        <div>
          <label for="is_active" class="font-medium">Estado Activo</label>
          <p class="text-sm text-gray-400 m-0">
            Si está desactivado, el horario no aparecerá en el selector
          </p>
        </div>
        <p-toggleswitch [(ngModel)]="isActive" inputId="is_active" />
      </div>

      <!-- Managers toggle -->
      <div class="flex items-center justify-between">
        <div>
          <label for="allow_managers" class="font-medium"
            >Disponible para Gerentes</label
          >
          <p class="text-sm text-gray-400 m-0">
            Permitir que gerentes de tienda usen este horario
          </p>
        </div>
        <p-toggleswitch
          [(ngModel)]="allowForManagers"
          inputId="allow_managers"
        />
      </div>

      <!-- Submanagers toggle -->
      <div class="flex items-center justify-between">
        <div>
          <label for="allow_submanagers" class="font-medium"
            >Disponible para Subgerentes</label
          >
          <p class="text-sm text-gray-400 m-0">
            Permitir que subgerentes usen este horario
          </p>
        </div>
        <p-toggleswitch
          [(ngModel)]="allowForSubmanagers"
          inputId="allow_submanagers"
        />
      </div>

      <!-- Positions filter -->
      <div class="flex flex-col gap-2">
        <label for="positions" class="font-medium">Posiciones Permitidas</label>
        <p class="text-sm text-gray-400 m-0">
          Si no seleccionas ninguna, todas las posiciones podrán usar este
          horario
        </p>
        <p-multiselect
          [(ngModel)]="allowedPositionIds"
          [options]="positionsList()"
          optionLabel="name"
          optionValue="id"
          placeholder="Todas las posiciones"
          [showClear]="true"
          [filter]="true"
          filterPlaceholder="Buscar posición..."
          appendTo="body"
          styleClass="w-full"
        />
      </div>

      <!-- Daily usage limit -->
      <div class="flex flex-col gap-2">
        <label for="daily_limit" class="font-medium"
          >Limite Diario de Uso</label
        >
        <p class="text-sm text-gray-400 m-0">
          Numero maximo de empleados que pueden usar este horario por dia. 0 =
          sin limite
        </p>
        <p-inputNumber
          [(ngModel)]="dailyUsageLimit"
          inputId="daily_limit"
          [min]="0"
          [showButtons]="true"
          buttonLayout="horizontal"
          incrementButtonIcon="pi pi-plus"
          decrementButtonIcon="pi pi-minus"
          styleClass="w-full"
        />
      </div>

      <!-- Action buttons -->
      <div class="flex justify-end gap-3 pt-4 border-t border-neutral-700">
        <p-button
          label="Cancelar"
          severity="secondary"
          rounded
          (onClick)="dialogRef.close()"
        />
        <p-button
          label="Guardar"
          rounded
          [loading]="saving()"
          (onClick)="saveConfiguration()"
        />
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScheduleConfigurationDialogComponent implements OnInit {
  public dialogRef = inject(DynamicDialogRef);
  private dialogConfig = inject(DynamicDialogConfig);
  private configStore = inject(ScheduleConfigurationsStore);
  private positionsStore = inject(PositionsStore);

  // Form state
  public isActive = true;
  public allowForManagers = true;
  public allowForSubmanagers = true;
  public allowedPositionIds: string[] = [];
  public dailyUsageLimit = 0;

  public saving = signal(false);
  public schedule: Schedule | null = null;

  // Get positions list from store
  public positionsList = computed(() => this.positionsStore.entities());

  ngOnInit(): void {
    // Ensure positions are loaded
    this.positionsStore.fetchItems();

    // Get schedule from dialog data
    this.schedule = this.dialogConfig.data?.schedule || null;

    if (!this.schedule) {
      console.error(
        '[ScheduleConfigurationDialog] No schedule provided in dialog data'
      );
      return;
    }

    // Load existing configuration if any
    const existingConfig = this.configStore.getConfigForSchedule(
      this.schedule.id
    );

    if (existingConfig) {
      this.isActive = existingConfig.is_active;
      this.allowForManagers = existingConfig.allow_for_managers;
      this.allowForSubmanagers = existingConfig.allow_for_submanagers;
      this.allowedPositionIds = existingConfig.allowed_position_ids || [];
      this.dailyUsageLimit = existingConfig.daily_usage_limit;
    } else {
      // Use defaults
      const defaults = this.configStore.getDefaultConfig();
      this.isActive = defaults.is_active;
      this.allowForManagers = defaults.allow_for_managers;
      this.allowForSubmanagers = defaults.allow_for_submanagers;
      this.allowedPositionIds = defaults.allowed_position_ids;
      this.dailyUsageLimit = defaults.daily_usage_limit;
    }
  }

  async saveConfiguration(): Promise<void> {
    if (!this.schedule) return;

    this.saving.set(true);

    const configData: Partial<ScheduleConfiguration> & { schedule_id: string } =
      {
        schedule_id: this.schedule.id,
        is_active: this.isActive,
        allow_for_managers: this.allowForManagers,
        allow_for_submanagers: this.allowForSubmanagers,
        allowed_position_ids: this.allowedPositionIds,
        daily_usage_limit: this.dailyUsageLimit,
      };

    const result = await this.configStore.saveConfiguration(configData);

    this.saving.set(false);

    if (result) {
      this.dialogRef.close(result);
    }
  }
}
