import { DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { Button } from 'primeng/button';
import { DatePicker } from 'primeng/datepicker';
import { Dialog } from 'primeng/dialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
import { firstValueFrom } from 'rxjs';

import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';

const TIMEZONE = 'America/Panama';

type LateArrival = {
  id: string;
  employee_id: string;
  company_id: string;
  branch_id: string;
  timelog_id: string;
  scheduled_at: string;
  arrived_at: string;
  minutes_late: number;
  notes: string | null;
  created_at: string;
  employee: {
    id: string;
    first_name: string;
    father_name: string;
    position: { name: string } | null;
  };
};

@Component({
  selector: 'pt-late-arrivals-dialog',
  imports: [Dialog, TableModule, Button, Tag, DatePipe, DatePicker, FormsModule],
  template: `
    <p-dialog
      header="Llegadas Tarde — Peluqueros"
      [visible]="visible()"
      (visibleChange)="visibleChange.emit($event)"
      [modal]="true"
      [style]="{ width: '850px' }"
      [maximizable]="true"
      [draggable]="false"
    >
      <div class="flex items-center gap-3 mb-4">
        <label class="font-medium text-sm">Mes:</label>
        <p-datepicker
          [ngModel]="selectedMonth()"
          (ngModelChange)="onMonthChange($event)"
          view="month"
          dateFormat="MM yy"
          [showIcon]="true"
          [readonlyInput]="true"
          inputStyleClass="w-48"
        />
      </div>

      @if (loading()) {
        <div class="flex items-center justify-center py-8">
          <i class="pi pi-spin pi-spinner text-2xl mr-2"></i>
          <span>Cargando...</span>
        </div>
      } @else {
        <p-table
          [value]="lateArrivals()"
          [paginator]="true"
          [rows]="15"
          [rowsPerPageOptions]="[10, 15, 25, 50]"
          [sortField]="'arrived_at'"
          [sortOrder]="-1"
          [tableStyle]="{ 'min-width': '100%' }"
          [scrollable]="true"
          scrollHeight="450px"
        >
          <ng-template #header>
            <tr>
              <th pSortableColumn="employee.first_name" style="min-width:180px">
                Peluquero <p-sortIcon field="employee.first_name" />
              </th>
              <th pSortableColumn="arrived_at" style="min-width:120px">
                Fecha <p-sortIcon field="arrived_at" />
              </th>
              <th style="min-width:100px">Hora Turno</th>
              <th style="min-width:100px">Hora Llegada</th>
              <th pSortableColumn="minutes_late" style="min-width:100px">
                Minutos <p-sortIcon field="minutes_late" />
              </th>
            </tr>
          </ng-template>

          <ng-template #body let-row>
            <tr>
              <td>
                <span class="font-medium">
                  {{ row.employee?.first_name }} {{ row.employee?.father_name }}
                </span>
              </td>
              <td>{{ formatDate(row.arrived_at) }}</td>
              <td>{{ formatTime(row.scheduled_at) }}</td>
              <td>{{ formatTime(row.arrived_at) }}</td>
              <td>
                <p-tag
                  [value]="row.minutes_late + ' min'"
                  [severity]="row.minutes_late >= 30 ? 'danger' : row.minutes_late >= 15 ? 'warn' : 'info'"
                />
              </td>
            </tr>
          </ng-template>

          <ng-template #emptymessage>
            <tr>
              <td colspan="5" class="text-center py-6 text-gray-400">
                No hay llegadas tarde registradas en este mes
              </td>
            </tr>
          </ng-template>

          <ng-template #summary>
            <div class="flex justify-between text-sm">
              <span>Total registros: <strong>{{ lateArrivals().length }}</strong></span>
              @if (lateArrivals().length > 0) {
                <span>
                  Promedio atraso:
                  <strong>{{ avgMinutes() }} min</strong>
                </span>
              }
            </div>
          </ng-template>
        </p-table>
      }
    </p-dialog>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LateArrivalsDialogComponent {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private org = inject(OrganizationService);

  visible = input.required<boolean>();
  visibleChange = output<boolean>();

  selectedMonth = signal<Date>(new Date());
  lateArrivals = signal<LateArrival[]>([]);
  loading = signal(false);

  avgMinutes = computed(() => {
    const arr = this.lateArrivals();
    if (arr.length === 0) return 0;
    const total = arr.reduce((sum, r) => sum + (r.minutes_late || 0), 0);
    return Math.round(total / arr.length);
  });

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.loadData();
      }
    });
  }

  formatDate(dateStr: string): string {
    return formatInTimeZone(new Date(dateStr), TIMEZONE, 'EEE d MMM', { locale: undefined });
  }

  formatTime(dateStr: string): string {
    return formatInTimeZone(new Date(dateStr), TIMEZONE, 'h:mm a');
  }

  onMonthChange(date: Date): void {
    if (date) {
      this.selectedMonth.set(date);
      this.loadData();
    }
  }

  async loadData(): Promise<void> {
    const companyId = this.org.getCurrentCompanyId();
    if (!companyId) return;

    const month = this.selectedMonth();
    const from = format(startOfMonth(month), 'yyyy-MM-dd');
    const to = format(endOfMonth(month), 'yyyy-MM-dd');

    this.loading.set(true);
    try {
      const url = this.apiUrl.build('rest/v1/late_arrivals', {
        company_id: `eq.${companyId}`,
        and: `(scheduled_at.gte.${from}T00:00:00-05:00,scheduled_at.lte.${to}T23:59:59-05:00)`,
        select:
          'id,employee_id,scheduled_at,arrived_at,minutes_late,notes,employee:employees!late_arrivals_employee_id_fkey(id,first_name,father_name,position:positions(name))',
        order: 'arrived_at.desc',
      });

      const data = await firstValueFrom(
        this.http.get<LateArrival[]>(url)
      );
      this.lateArrivals.set(data || []);
    } catch (error) {
      console.error('Error loading late arrivals:', error);
      this.lateArrivals.set([]);
    } finally {
      this.loading.set(false);
    }
  }
}
