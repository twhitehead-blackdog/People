import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  OnInit,
  signal,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { format } from 'date-fns';
import { toDate } from 'date-fns-tz';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Checkbox } from 'primeng/checkbox';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { DatePicker } from 'primeng/datepicker';
import { InputNumber } from 'primeng/inputnumber';
import { InputText } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { v4 } from 'uuid';
import { PayrollHoliday, PayrollSettings } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { PayrollService } from '../services/payroll.service';
import { markGroupDirty } from '../services/util.service';

@Component({
  selector: 'pt-payroll-settings',
  imports: [
    ReactiveFormsModule,
    Card,
    Button,
    InputNumber,
    InputText,
    Checkbox,
    DatePicker,
    TableModule,
    Tag,
    ConfirmDialog,
  ],
  providers: [ConfirmationService],
  template: `
    <div class="flex flex-col gap-6">
      <!-- Configuración General -->
      <p-card>
        <ng-template #title>
          <div class="flex items-center gap-2">
            <i class="pi pi-cog text-amber-400"></i>
            <span>Configuración de Planilla</span>
          </div>
        </ng-template>
        <form [formGroup]="settingsForm" (ngSubmit)="saveSettings()">
          <div class="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="input-container">
              <label for="cut_off_day_1">Fecha Corte 1</label>
              <p-input-number
                inputId="cut_off_day_1"
                formControlName="cut_off_day_1"
                fluid
                [min]="1"
                [max]="28"
                suffix=" del mes"
              />
            </div>
            <div class="input-container">
              <label for="cut_off_day_2">Fecha Corte 2</label>
              <p-input-number
                inputId="cut_off_day_2"
                formControlName="cut_off_day_2"
                fluid
                [min]="1"
                [max]="31"
                suffix=" del mes"
              />
            </div>
            <div class="input-container">
              <label for="payment_day_1">Dia de Pago 1</label>
              <p-input-number
                inputId="payment_day_1"
                formControlName="payment_day_1"
                fluid
                [min]="1"
                [max]="31"
                suffix=" del mes"
              />
            </div>
            <div class="input-container">
              <label for="payment_day_2">Dia de Pago 2</label>
              <p-input-number
                inputId="payment_day_2"
                formControlName="payment_day_2"
                fluid
                [min]="1"
                [max]="31"
                suffix=" del mes"
              />
            </div>
            <div class="input-container">
              <label for="monthly_hours">Horas Mensuales</label>
              <p-input-number
                inputId="monthly_hours"
                formControlName="monthly_hours"
                fluid
                [min]="1"
                suffix=" hrs"
              />
            </div>
            <div class="input-container">
              <label for="periods_per_year">Periodos al Ano</label>
              <p-input-number
                inputId="periods_per_year"
                formControlName="periods_per_year"
                fluid
                [min]="1"
                [max]="52"
              />
            </div>
            <div class="input-container flex items-end">
              <div class="flex items-center gap-2 pb-2">
                <p-checkbox
                  formControlName="adjust_payment_on_sunday"
                  [binary]="true"
                  inputId="adjust_sunday"
                />
                <label for="adjust_sunday" class="mb-0 cursor-pointer">
                  Ajustar pago si cae domingo
                </label>
              </div>
            </div>
          </div>
          <div class="flex justify-end pt-4">
            <p-button
              label="Guardar Configuracion"
              type="submit"
              icon="pi pi-save"
              severity="success"
              rounded
              [loading]="savingSettings()"
            />
          </div>
        </form>
      </p-card>

      <!-- Feriados -->
      <p-card>
        <ng-template #title>
          <div class="flex items-center justify-between w-full">
            <div class="flex items-center gap-2">
              <i class="pi pi-calendar text-amber-400"></i>
              <span>Feriados</span>
            </div>
            <p-button
              label="Agregar Feriado"
              icon="pi pi-plus-circle"
              severity="success"
              rounded
              (click)="showHolidayForm.set(true)"
            />
          </div>
        </ng-template>

        @if (showHolidayForm()) {
          <div class="mb-4 p-4 rounded-lg border border-zinc-700 bg-zinc-800/50">
            <form [formGroup]="holidayForm" (ngSubmit)="saveHoliday()">
              <div class="flex flex-col md:grid md:grid-cols-4 gap-4">
                <div class="input-container">
                  <label for="h_name">Nombre</label>
                  <input
                    pInputText
                    id="h_name"
                    fluid
                    formControlName="name"
                    placeholder="Ej: Dia de los Trabajadores"
                  />
                </div>
                <div class="input-container">
                  <label for="h_date">Fecha</label>
                  <p-datepicker
                    inputId="h_date"
                    formControlName="date"
                    showIcon
                    appendTo="body"
                    dateFormat="dd/mm/yy"
                  />
                </div>
                <div class="input-container flex items-end">
                  <div class="flex items-center gap-2 pb-2">
                    <p-checkbox
                      formControlName="is_recurring"
                      [binary]="true"
                      inputId="h_recurring"
                    />
                    <label for="h_recurring" class="mb-0 cursor-pointer">
                      Se repite cada ano
                    </label>
                  </div>
                </div>
                <div class="flex items-end gap-2 pb-1">
                  <p-button
                    label="Guardar"
                    type="submit"
                    icon="pi pi-check"
                    severity="success"
                    rounded
                    size="small"
                    [loading]="savingHoliday()"
                  />
                  <p-button
                    label="Cancelar"
                    icon="pi pi-times"
                    severity="secondary"
                    rounded
                    size="small"
                    (click)="cancelHoliday()"
                  />
                </div>
              </div>
            </form>
          </div>
        }

        <p-table
          [value]="holidays()"
          [loading]="loadingHolidays()"
          [paginator]="true"
          [rows]="10"
          showCurrentPageReport
          currentPageReportTemplate="Mostrando {first} a {last} de {totalRecords} feriados"
        >
          <ng-template pTemplate="header">
            <tr>
              <th pSortableColumn="name">
                Nombre
                <p-sortIcon field="name" />
              </th>
              <th pSortableColumn="date">
                Fecha
                <p-sortIcon field="date" />
              </th>
              <th>Tipo</th>
              <th></th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-holiday>
            <tr>
              <td>{{ holiday.name }}</td>
              <td>{{ holiday.date }}</td>
              <td>
                @if (holiday.is_recurring) {
                  <p-tag value="Anual" severity="info" rounded />
                } @else {
                  <p-tag value="Unico" severity="secondary" rounded />
                }
              </td>
              <td>
                <p-button
                  icon="pi pi-trash"
                  severity="danger"
                  text
                  rounded
                  (click)="deleteHoliday(holiday)"
                />
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="4" class="text-center text-gray-400 py-8">
                No hay feriados configurados
              </td>
            </tr>
          </ng-template>
        </p-table>
      </p-card>
    </div>
    <p-confirmDialog />
  `,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollSettingsComponent implements OnInit {
  public payrollId = input.required<string>();

  private payrollService = inject(PayrollService);
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);
  private message = inject(MessageService);
  private confirmation = inject(ConfirmationService);

  public savingSettings = signal(false);
  public savingHoliday = signal(false);
  public loadingHolidays = signal(true);
  public showHolidayForm = signal(false);
  public holidays = signal<PayrollHoliday[]>([]);
  private settingsId = signal<string | null>(null);

  public settingsForm = new FormGroup({
    cut_off_day_1: new FormControl(10, { nonNullable: true, validators: [Validators.required] }),
    cut_off_day_2: new FormControl(25, { nonNullable: true, validators: [Validators.required] }),
    payment_day_1: new FormControl(15, { nonNullable: true, validators: [Validators.required] }),
    payment_day_2: new FormControl(30, { nonNullable: true, validators: [Validators.required] }),
    monthly_hours: new FormControl(208, { nonNullable: true, validators: [Validators.required] }),
    periods_per_year: new FormControl(24, { nonNullable: true, validators: [Validators.required] }),
    adjust_payment_on_sunday: new FormControl(true, { nonNullable: true }),
  });

  public holidayForm = new FormGroup({
    name: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    date: new FormControl<Date>(new Date(), { nonNullable: true, validators: [Validators.required] }),
    is_recurring: new FormControl(true, { nonNullable: true }),
  });

  async ngOnInit() {
    await this.loadSettings();
    await this.loadHolidays();
  }

  private async loadSettings() {
    const settings = await this.payrollService.getSettings();
    if (settings) {
      this.settingsId.set(settings.id);
      this.settingsForm.patchValue({
        cut_off_day_1: settings.cut_off_day_1,
        cut_off_day_2: settings.cut_off_day_2,
        payment_day_1: settings.payment_day_1,
        payment_day_2: settings.payment_day_2,
        monthly_hours: settings.monthly_hours,
        periods_per_year: settings.periods_per_year,
        adjust_payment_on_sunday: settings.adjust_payment_on_sunday,
      });
    }
  }

  private async loadHolidays() {
    this.loadingHolidays.set(true);
    const data = await this.payrollService.getHolidays();
    this.holidays.set(data);
    this.loadingHolidays.set(false);
  }

  async saveSettings() {
    if (this.settingsForm.invalid) {
      markGroupDirty(this.settingsForm);
      return;
    }
    this.savingSettings.set(true);
    try {
      const payload: Partial<PayrollSettings> = {
        ...this.settingsForm.getRawValue(),
      };
      if (this.settingsId()) {
        payload.id = this.settingsId()!;
      }
      const saved = await this.payrollService.saveSettings(payload);
      this.settingsId.set(saved.id);
      this.message.add({
        severity: 'success',
        summary: 'Guardado',
        detail: 'Configuracion actualizada correctamente',
      });
    } catch (err: any) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.error?.message ?? 'Error al guardar configuracion',
      });
    }
    this.savingSettings.set(false);
  }

  async saveHoliday() {
    if (this.holidayForm.invalid) {
      markGroupDirty(this.holidayForm);
      return;
    }
    this.savingHoliday.set(true);
    try {
      const companyId = this.org.getCurrentCompanyId();
      const formVal = this.holidayForm.getRawValue();
      const dateStr = format(formVal.date, 'yyyy-MM-dd');

      const url = this.apiUrl.build('rest/v1/payroll_holidays', { select: '*' });
      await this.http
        .post(url, {
          id: v4(),
          company_id: companyId,
          name: formVal.name,
          date: dateStr,
          is_recurring: formVal.is_recurring,
        }, {
          headers: { Prefer: 'return=representation' },
        })
        .toPromise();

      this.message.add({
        severity: 'success',
        summary: 'Guardado',
        detail: 'Feriado agregado correctamente',
      });

      this.holidayForm.reset({ name: '', date: new Date(), is_recurring: true });
      this.showHolidayForm.set(false);
      await this.loadHolidays();
    } catch (err: any) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.error?.message ?? 'Error al guardar feriado',
      });
    }
    this.savingHoliday.set(false);
  }

  cancelHoliday() {
    this.holidayForm.reset({ name: '', date: new Date(), is_recurring: true });
    this.showHolidayForm.set(false);
  }

  deleteHoliday(holiday: PayrollHoliday) {
    this.confirmation.confirm({
      message: `Eliminar el feriado "${holiday.name}"?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Eliminar',
      rejectLabel: 'Cancelar',
      accept: async () => {
        const url = this.apiUrl.build('rest/v1/payroll_holidays', {
          id: `eq.${holiday.id}`,
        });
        await this.http.delete(url).toPromise();
        this.message.add({
          severity: 'success',
          summary: 'Eliminado',
          detail: 'Feriado eliminado correctamente',
        });
        await this.loadHolidays();
      },
    });
  }
}
