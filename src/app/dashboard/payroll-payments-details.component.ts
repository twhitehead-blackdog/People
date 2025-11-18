/* eslint-disable no-sparse-arrays */
import {
  CurrencyPipe,
  DatePipe,
  DecimalPipe,
  KeyValuePipe,
} from '@angular/common';
import { HttpClient, httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  linkedSignal,
  model,
  OnInit,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  addDays,
  differenceInMinutes,
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSunday,
} from 'date-fns';
import { toDate } from 'date-fns-tz';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { catchError, forkJoin, switchMap, throwError } from 'rxjs';
import { utils, writeFile } from 'xlsx';
import {
  AttendanceSheet,
  EmployeeSchedule,
  Payroll,
  PayrollEmployee,
  PayrollPayment,
  PayrollPaymentEmployee,
  PayrollPaymentEmployeeItem,
  Schedule,
  TimeLog,
  TimeLogEnum,
} from '../models';
import { roundNumber } from '../services/util.service';
import { DashboardStore } from '../stores/dashboard.store';
import { LateCompensatoryFormComponent } from './late-compensatory-form.component';
import { PaymentItemFormComponent } from './payment-item-form.component';

@Component({
  selector: 'pt-payroll-payments-details',
  imports: [
    Button,
    Select,
    FormsModule,
    TableModule,
    DatePipe,
    DecimalPipe,
    CurrencyPipe,
    Card,
    KeyValuePipe,
    RouterLink,
  ],
  providers: [DynamicDialogRef, DialogService],
  template: `<div class="flex flex-col gap-4">
    <h1 class="text-2xl font-bold text-gray-700 dark:text-gray-200">
      Planilla: {{ payment.value()?.[0]?.payroll?.name }}
    </h1>
    <div class="flex gap-4 items-center">
      <p-select
        id="employee"
        fluid
        [(ngModel)]="currentEmployee"
        (ngModelChange)="generateAttendanceSheet()"
        [options]="employees.value() ?? []"
        optionLabel="employee.first_name"
        optionValue="employee.id"
        placeholder="---Seleccione un empleado---"
        filter
        filterBy="employee.first_name, employee.father_name"
      >
        <ng-template #selectedItem let-selected>
          <div class="flex justify-between items-center">
            <div>
              {{ selected.employee.first_name }}
              {{ selected.employee.father_name }}
            </div>
            @if (approved()[selected.employee.id]) {
            <i class="pi pi-check-circle text-green-500"></i>
            }
          </div>
        </ng-template>
        <ng-template #item let-item>
          <div class="flex justify-between items-center w-full">
            <div>
              {{ item.employee.first_name }}
              {{ item.employee.father_name }}
            </div>
            @if (approved()[item.employee.id]) {
            <i class="pi pi-check-circle text-green-500"></i>
            }
          </div>
        </ng-template>
      </p-select>
      <div class="flex items-center gap-4">
        <p class=" text-gray-500 text-nowrap">
          {{ approvedCount() }} de {{ employees.value()?.length }} aprobados
        </p>
        <p-button
          label="Borrador"
          severity="secondary"
          icon="pi pi-file"
          rounded
          routerLink="draft"
        />
      </div>
    </div>
    @if (currentAttendanceSheets().length > 0) {
    <p-card>
      <ng-template #title>Consolidado</ng-template>
      <div class="flex gap-4">
        <div class="flex flex-col gap-2 w-full">
          <div
            class="uppercase font-bold bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 p-2 rounded text-sm"
          >
            Ingresos
          </div>
          <div class="flex justify-between items-center gap-2 text-sm">
            <div class="text-gray-800 dark:text-gray-200">Salario base</div>
            <div
              class="cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2"
              (click)="!isApproved() ? editItem('salary_base') : null"
            >
              {{ employeeSalaryBase() | currency : '$' }}
            </div>
          </div>
          <div class="flex justify-between items-center gap-2 text-sm">
            <div class="text-gray-800 dark:text-gray-200">Recargo domingo</div>
            <div
              class="cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2"
              (click)="!isApproved() ? editItem('sunday_payment') : null"
            >
              {{ summary().sunday_payment | currency : '$' }}
            </div>
          </div>
          <div class="flex justify-between items-center gap-2 text-sm">
            <div class="text-gray-800 dark:text-gray-200">Tardanzas</div>
            <div
              class="cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2"
              (click)="!isApproved() ? editItem('late_hours_payment') : null"
            >
              {{ summary().late_hours_payment | currency : '$' }}
            </div>
          </div>
          <div class="flex justify-between items-center gap-2 text-sm">
            <div class="text-gray-800 dark:text-gray-200">Justificado</div>
            <div
              class="cursor-pointer hover:text-blue-500 hover:underline hover:underline-offset-2"
              (click)="
                !isApproved() ? editItem('compensatory_hours_payment') : null
              "
            >
              {{ summary().compensatory_hours_payment | currency : '$' }}
            </div>
          </div>
          @for (otherIncome of otherIncome(); track $index) {
          <div class="flex justify-between items-center gap-2 text-sm">
            <div class="text-gray-800 dark:text-gray-200">
              {{ otherIncome.description }}
            </div>
            <div>{{ otherIncome.amount | currency : '$' }}</div>
          </div>
          } @if (!isApproved()) {
          <div class="flex justify-end">
            <p-button
              severity="success"
              icon="pi pi-plus"
              rounded
              text
              size="small"
              (onClick)="!isApproved() ? editItem('new_income') : null"
            />
          </div>
          }
          <div
            class="flex justify-between items-center gap-2 text-sm border-t border-gray-200 pt-2"
          >
            <div class="text-gray-800 font-semibold dark:text-gray-200">
              Total
            </div>
            <div class="font-semibold">
              {{ totalIncome() | currency : '$' }}
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2 w-full">
          <div
            class="uppercase font-bold bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 p-2 rounded text-sm"
          >
            Deducciones
          </div>
          @for (deduction of employeeDeductions() | keyvalue; track $index) {
          <div class="flex justify-between items-center gap-2 text-sm">
            <div class="text-gray-800 dark:text-gray-200">
              {{ deduction.key }}
            </div>
            <div>{{ deduction.value | currency : '$' }}</div>
          </div>
          }
          <div
            class="flex justify-between items-center gap-2 text-sm border-t border-gray-200 pt-2"
          >
            <div class="text-gray-800 font-semibold dark:text-gray-200">
              Total
            </div>
            <div class="font-semibold">
              {{ totalDeductions() | currency : '$' }}
            </div>
          </div>
        </div>
        <div class="flex flex-col gap-2 w-full">
          <div
            class="uppercase font-bold bg-gray-200 text-gray-800 dark:bg-gray-800 dark:text-gray-200 p-2 rounded text-sm"
          >
            Otros descuentos
          </div>
          @for (debt of currentDebts(); track debt.id) {
          <div class="flex justify-between items-center gap-2 text-sm">
            <div class="text-gray-800 dark:text-gray-200">
              {{ debt.description }}
            </div>
            <div>{{ debt.amount | currency : '$' }}</div>
          </div>
          }
          <div
            class="flex justify-between items-center gap-2 text-sm border-t border-gray-200 pt-2"
          >
            <div class="text-gray-800 font-semibold dark:text-gray-200">
              Total
            </div>
            <div class="font-semibold">
              {{ totalDebt() | currency : '$' }}
            </div>
          </div>
        </div>
      </div>
      <div class="flex justify-end">
        <div class="w-1/3">
          <div class="flex justify-between items-center gap-2 text-sm">
            <div>Total Ingresos</div>
            <div>{{ totalIncome() | currency : '$' }}</div>
          </div>
          <div class="flex justify-between items-center gap-2 text-sm">
            <div>Total Deducciones</div>
            <div>{{ totalDeductions() | currency : '$' }}</div>
          </div>
          <div class="flex justify-between items-center gap-2 text-sm">
            <div>Total Otros descuentos</div>
            <div>{{ totalDebt() | currency : '$' }}</div>
          </div>
          <div class="flex justify-between items-center gap-2 text-sm">
            <div>Total</div>
            <p class="font-semibold">
              {{
                totalIncome() - totalDeductions() - totalDebt() | currency : '$'
              }}
            </p>
          </div>
          <div class="flex justify-end mt-4">
            <p-button
              label="Aprobar"
              rounded
              [severity]="isApproved() ? 'secondary' : 'success'"
              icon="pi pi-check"
              size="small"
              [disabled]="isApproved()"
              [loading]="loading()"
              class="justify-self-end"
              (click)="approvePayment(currentEmployee()!)"
            />
          </div>
        </div>
      </div>
    </p-card>
    }
    <div>
      <p-table
        [value]="currentAttendanceSheets()"
        [responsiveLayout]="'scroll'"
        scrollable
        dataKey="date"
        showGridlines
      >
        <ng-template pTemplate="header">
          <tr>
            <th pFrozenColumn>Fecha</th>
            <th>Turno</th>
            <th>Entrada</th>
            <th>Salida</th>
            <th>Hrs. Trabajadas</th>
            <th>Salario base</th>
            <th>Recargo domingo</th>
            <th>Hrs. Extras</th>
            <th>Minutos Tardías</th>
            <th>Hrs. Tardías Desc.</th>
            <th>Justificadas</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-attendanceSheet>
          <tr>
            <td pFrozenColumn>
              {{ attendanceSheet.date | date : 'fullDate' }}
            </td>
            <td>{{ attendanceSheet.schedule?.name }}</td>
            <td>{{ attendanceSheet.entry_time | date : 'hh:mm a' }}</td>
            <td>{{ attendanceSheet.exit_time | date : 'hh:mm a' }}</td>
            <td>{{ attendanceSheet.worked_hours | number : '1.0-2' }}</td>
            <td>
              {{ attendanceSheet.worked_hours_payment | currency : '$' }}
            </td>
            <td>{{ attendanceSheet.sunday_payment | currency : '$' }}</td>
            <td>{{ attendanceSheet.overtime_hours | number : '1.0-2' }}</td>
            <td>{{ attendanceSheet.late_hours * 60 | number : '1.0-2' }}</td>
            <td>
              <div class="flex items-center gap-2">
                <span
                  [class.text-red-500]="attendanceSheet.late_hours_payment > 0"
                  >{{
                    attendanceSheet.late_hours_payment | currency : '$'
                  }}</span
                >
                @if(attendanceSheet.late_hours_payment > 0){
                <p-button
                  label="Compensar"
                  rounded
                  severity="success"
                  icon="pi pi-check"
                  size="small"
                  [disabled]="isApproved()"
                  class="justify-self-end"
                  (click)="
                    setCompensatoryHours(
                      attendanceSheet.date,
                      attendanceSheet.late_hours
                    )
                  "
                />
                }
              </div>
            </td>
            <td>
              {{ attendanceSheet.compensatory_hours_payment | currency : '$' }}
            </td>
          </tr>
        </ng-template>
      </p-table>
    </div>
  </div>`,
  styles: ``,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PayrollPaymentsDetailsComponent implements OnInit {
  public payment_id = input.required<string>();
  public currentEmployee = model<string>();
  public loading = signal(false);
  private message = inject(MessageService);
  public absenceCauses = [
    { value: 'PERSONAL', label: 'Personal' },
    { value: 'INJUSTIFICADA', label: 'Injustificada' },
    { value: 'JUSTIFICADA', label: 'Justificada' },
  ];
  selectedSheets!: AttendanceSheet[];
  private http = inject(HttpClient);
  public currentDebts = computed(
    () =>
      this.selectedEmployee()?.employee?.debts?.filter(
        (debt) => debt.payroll_id === this.payment.value()?.[0]?.payroll_id
      ) ?? []
  );

  private dialogService = inject(DialogService);
  private dialogRef = inject(DynamicDialogRef);
  private injector = inject(Injector);
  private dashboardStore = inject(DashboardStore);
  public otherIncome = signal<PayrollPaymentEmployeeItem[]>([]);

  public payroll = httpResource<Payroll[]>(() => {
    if (!this.payment.value()?.[0]) {
      return undefined;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/payrolls`,
      method: 'GET',
      params: {
        select: '*, deductions:payroll_deductions(*)',
        id: `eq.${this.payment.value()?.[0]?.payroll_id}`,
      },
    };
  });

  public completed = httpResource<PayrollPaymentEmployee[]>(() => {
    if (!this.payment.value()?.[0]) {
      return undefined;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_payment_employees`,
      method: 'GET',
      params: {
        select:
          '*, items:payroll_payment_employee_items(*), employee:employees(id, first_name, father_name, document_id)',
        payroll_payment_id: `eq.${this.payment.value()?.[0]?.id}`,
      },
    };
  });

  public isApproved = computed(() => this.approved()[this.currentEmployee()!]);

  public employeeDeductions = computed(() => {
    const employee = this.selectedEmployee();
    const payroll = this.payroll.value()?.[0];
    const items: Record<string, number> = {};
    if (!employee || !payroll) return items;

    payroll.deductions?.forEach((deduction) => {
      if (deduction.income_tax) {
        items[deduction.name] = this.incomeTax();
      } else {
        let amount = 0;
        if (deduction.calculation_type === 'fixed') {
          amount = deduction.value;
        } else {
          amount = this.totalIncome() * (deduction.value / 100);
        }
        items[deduction.name] = amount;
      }
    });
    return items;
  });

  public incomeTax = computed(() => {
    const employee = this.selectedEmployee();
    const deductions = this.payroll.value()?.[0].deductions ?? [];
    if (!deductions.length || !employee) return 0;
    const incomeTax = deductions.find((deduction) => deduction.income_tax);
    if (!incomeTax) return 0;
    const income = this.totalIncome();
    const annualIncome = income * 13 * 2;
    let taxAmount = 0;
    if (annualIncome < 11000) return 0;
    if (annualIncome > 50000) {
      taxAmount = (annualIncome - 50000) * 0.25;
      taxAmount += (annualIncome - 11000) * 0.15;
    } else {
      taxAmount = (annualIncome - 11000) * 0.15;
    }

    return taxAmount / 13 / 2;
  });

  public payment = httpResource<PayrollPayment[]>(() => ({
    url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_payments`,
    method: 'GET',
    params: {
      select: '*, payroll:payrolls(*)',
      id: `eq.${this.payment_id()}`,
    },
  }));

  public employees = httpResource<PayrollEmployee[]>(() => {
    if (!this.payment.value()?.[0]) {
      return undefined;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_payrolls`,
      method: 'GET',
      params: {
        select:
          '*, employee:employees(id, first_name, father_name, monthly_salary, hourly_salary, week_hours, use_timelog, branch_id, debts:payroll_debts(*))',
        payroll_id: `eq.${this.payment.value()?.[0]?.payroll_id}`,
      },
    };
  });

  selectedEmployee = computed(() =>
    this.employees
      .value()
      ?.find((employee) => employee.employee.id === this.currentEmployee())
  );

  public approved = signal<Record<string, boolean>>({});
  public approvedCount = computed(
    () => Object.values(this.approved()).filter((approved) => approved).length
  );

  ngOnInit() {
    effect(
      () => {
        const completed = this.completed.value();
        if (completed?.length) {
          completed.forEach((item) => {
            this.approved.update((approved) => ({
              ...approved,
              [item.employee_id]: true,
            }));
          });
        }
      },
      { injector: this.injector }
    );
  }

  editItem(concept: string, item?: PayrollPaymentEmployeeItem) {
    let label = '';
    switch (concept) {
      case 'salary_base':
        label = 'salario base';
        item = {
          type: 'income',
          amount: this.employeeSalaryBase(),
          description: 'Salario base',
          payment_employee_id: '',
        };
        break;
      case 'sunday_payment':
        label = 'recargo domingo';
        item = {
          type: 'income',
          amount: this.summary().sunday_payment,
          description: 'Recargo domingo',
          payment_employee_id: '',
        };
        break;
      case 'late_hours_payment':
        label = 'horas tardías';
        item = {
          type: 'deduction',
          amount: this.summary().late_hours_payment,
          description: 'Horas tardías',
          payment_employee_id: '',
        };
        break;
      case 'compensatory_hours_payment':
        label = 'horas justificadas';
        item = {
          type: 'income',
          amount: this.summary().compensatory_hours_payment,
          description: 'Horas justificadas',
          payment_employee_id: '',
        };
        break;
      case 'other_income':
        label = 'otros ingresos';
        break;
      case 'new_income':
        label = 'nuevo ingreso';
        item = {
          type: 'income',
          amount: 0,
          description: 'Nuevo ingreso',
          payment_employee_id: '',
        };
        break;
    }

    this.dialogService
      .open(PaymentItemFormComponent, {
        modal: true,
        width: '36rem',
        header: `Editar ${label}`,
        data: {
          item,
        },
      })
      .onClose.subscribe({
        next: (item) => {
          if (!item) return;
          switch (concept) {
            case 'salary_base':
              this.employeeSalaryBase.set(item.amount);
              break;
            case 'sunday_payment':
              this.summary.update((summary) => ({
                ...summary,
                sunday_payment: item.amount,
              }));
              break;
            case 'late_hours_payment':
              this.summary.update((summary) => ({
                ...summary,
                late_hours_payment: item.amount,
              }));
              break;
            case 'compensatory_hours_payment':
              this.summary.update((summary) => ({
                ...summary,
                compensatory_hours_payment: item.amount,
              }));
              break;
            case 'other_income':
              this.otherIncome.update((otherIncome) => [...otherIncome, item]);
              break;
            case 'new_income':
              this.otherIncome.update((otherIncome) => [...otherIncome, item]);
              break;
          }
        },
      });
  }

  approvePayment(id: string) {
    this.loading.set(true);
    const attendanceSheet = this.sheetRegistry();
    const sheets$ = this.http.post(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/attendance_sheets`,
      attendanceSheet
    );

    const summary$ = this.http.post<PayrollPaymentEmployee[]>(
      `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_payment_employees`,
      this.employeeSummary(),
      {
        params: {
          select: '*',
        },
      }
    );

    const items: PayrollPaymentEmployeeItem[] = [];
    items.push({
      payment_employee_id: '',
      type: 'income',
      amount: this.employeeSalaryBase(),
      description: 'Salario base',
    });

    items.push({
      payment_employee_id: '',
      type: 'income',
      amount: this.summary().sunday_payment,
      description: 'Recargo domingo',
    });

    items.push({
      payment_employee_id: '',
      type: 'income',
      amount: this.summary().compensatory_hours_payment,
      description: 'Horas justificadas',
    });

    for (const deduction of Object.entries(this.employeeDeductions())) {
      items.push({
        payment_employee_id: '',
        type: 'deduction',
        amount: deduction[1],
        description: deduction[0],
      });
    }

    for (const debt of this.currentDebts() ?? []) {
      items.push({
        payment_employee_id: '',
        type: 'debt',
        amount: debt.amount,
        description: debt.description,
      });
    }

    for (const income of this.otherIncome()) {
      items.push({
        payment_employee_id: '',
        type: 'income',
        amount: income.amount,
        description: income.description,
      });
    }
    items.push({
      payment_employee_id: '',
      type: 'deduction',
      amount: this.summary().late_hours_payment,
      description: 'Horas tardías',
    });
    items.push({
      payment_employee_id: '',
      type: 'deduction',
      amount: this.summary().absence_hours_payment,
      description: 'Horas ausencia',
    });

    forkJoin([summary$, sheets$])
      .pipe(
        switchMap(([summary]) => {
          items.map((x) => (x.payment_employee_id = summary[0].id ?? ''));
          return this.http.post(
            `${process.env['ENV_SUPABASE_URL']}/rest/v1/payroll_payment_employee_items`,
            items
          );
        }),
        catchError((error) => {
          console.error(error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Ha ocurrido un error al aprobar el pago',
          });
          return throwError(() => error);
        })
      )
      .subscribe({
        next: () => {
          this.message.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Pago aprobado correctamente',
          });
          this.approved.update((approved) => ({
            ...approved,
            [id]: true,
          }));
        },
        complete: () => {
          this.loading.set(false);
        },
      });
  }

  public attendanceSheet = signal<Record<string, AttendanceSheet>>({});

  public sheetRegistry = computed(() =>
    this.currentAttendanceSheets().map((sheet) => ({
      employee_id: sheet.employee_id,
      branch_id: sheet.branch_id,
      schedule_id: sheet.schedule_id,
      date: sheet.date,
      entry_time: sheet.entry_time,
      exit_time: sheet.exit_time,
      is_late: sheet.is_late,
      is_sunday: sheet.is_sunday,
      is_holiday: sheet.is_holiday,
      worked_hours: sheet.worked_hours,
      lunch_start_time: sheet.lunch_start_time,
      lunch_end_time: sheet.lunch_end_time,
      late_hours: sheet.late_hours,
      is_justified: sheet.is_justified,
      justification_notes: sheet.justification_notes,
      justification_cause: sheet.justification_cause,
      justified_hours: sheet.justified_hours,
    }))
  );

  public timeLogs = httpResource<TimeLog[]>(() => {
    if (!this.payment.value()?.[0]) {
      return undefined;
    }
    return {
      url: `${
        process.env['ENV_SUPABASE_URL']
      }/rest/v1/timelogs?created_at=lte.${format(
        addDays(this.payment.value()![0].end_date, 1),
        'yyyy-MM-dd 23:59:59'
      )}`,
      method: 'GET',
      params: {
        select:
          '*, employee:employees(id, first_name, father_name), branch:branches(id, name)',
        created_at: `gte.${format(
          addDays(this.payment.value()![0].start_date, 1),
          'yyyy-MM-dd 06:00:00'
        )}`,
      },
    };
  });

  public schedules = httpResource<EmployeeSchedule[]>(() => {
    if (!this.payment.value()?.[0]) {
      return undefined;
    }
    return {
      url: `${process.env['ENV_SUPABASE_URL']}/rest/v1/employee_schedules`,
      method: 'GET',
      params: {
        select: '*,schedule:schedules(*)',
        start_date: `gte.${format(
          this.payment.value()![0].start_date,
          'yyyy-MM-dd 06:00:00'
        )}`,
        end_date: `lte.${format(
          addDays(this.payment.value()![0].end_date, 1),
          'yyyy-MM-dd 23:59:59'
        )}`,
      },
    };
  });
  public currentAttendanceSheets = computed(() =>
    Object.values(this.attendanceSheet()).map(
      (attendanceSheet) => attendanceSheet
    )
  );

  public summary = linkedSignal(() =>
    this.currentAttendanceSheets().reduce(
      (acc, attendanceSheet) => {
        return {
          worked_hours_payment:
            acc.worked_hours_payment + attendanceSheet.worked_hours_payment,
          late_hours_payment:
            acc.late_hours_payment + attendanceSheet.late_hours_payment,
          sunday_payment: acc.sunday_payment + attendanceSheet.sunday_payment,
          worked_hours: acc.worked_hours + attendanceSheet.worked_hours,
          late_hours: acc.late_hours + attendanceSheet.late_hours,
          compensatory_hours:
            acc.compensatory_hours + (attendanceSheet.compensatory_hours ?? 0),
          compensatory_hours_payment:
            acc.compensatory_hours_payment +
            (attendanceSheet.compensatory_hours_payment ?? 0),
          absence_hours: acc.absence_hours + attendanceSheet.absence_hours,
          absence_hours_payment:
            acc.absence_hours_payment + attendanceSheet.absence_hours_payment,
          other_income: this.otherIncome().reduce(
            (acc, otherIncome) => acc + otherIncome.amount,
            0
          ),
        };
      },
      {
        sunday_payment: 0,
        worked_hours_payment: 0,
        late_hours_payment: 0,
        worked_hours: 0,
        late_hours: 0,
        compensatory_hours: 0,
        compensatory_hours_payment: 0,
        absence_hours: 0,
        absence_hours_payment: 0,
        other_income: 0,
      }
    )
  );

  public totalIncome = computed(() =>
    roundNumber(
      this.employeeSalaryBase() +
        this.summary().sunday_payment +
        this.summary().compensatory_hours_payment -
        this.summary().late_hours_payment +
        this.summary().other_income
    )
  );

  public totalDeductions = computed(() =>
    Object.values(this.employeeDeductions()).reduce(
      (acc, deduction) => roundNumber(acc + deduction),
      0
    )
  );

  totalDebt = computed(
    () => this.currentDebts()?.reduce((acc, debt) => acc + debt.amount, 0) ?? 0
  );

  employeeSalaryBase = linkedSignal(() => {
    const employee = this.selectedEmployee();
    if (!employee) return 0;
    return roundNumber(employee.hourly_salary * 104.28);
  });

  public employeeSummary = computed<PayrollPaymentEmployee>(() => ({
    employee_id: this.selectedEmployee()?.employee?.id ?? '',
    payroll_id: this.payment.value()?.[0].payroll_id ?? '',
    payroll_payment_id: this.payment.value()?.[0].id ?? '',
    total_amount:
      this.totalIncome() - this.totalDeductions() - this.totalDebt(),
    debt_amount: this.totalDebt(),
    late_amount: this.summary().late_hours_payment,
    absence_amount: this.summary().absence_hours_payment,
    income_amount: this.totalIncome(),
    deduction_amount: this.totalDeductions(),
    overtime_amount: this.summary().sunday_payment,
  }));

  generateAttendanceSheet() {
    const schedules = this.schedules.value() ?? [];
    const timeLogs = this.timeLogs.value() ?? [];
    const days = eachDayOfInterval({
      start: toDate(this.payment.value()![0].start_date, {
        timeZone: 'America/Panama',
      }),
      end: toDate(this.payment.value()![0].end_date, {
        timeZone: 'America/Panama',
      }),
    }).map((day) => format(day, 'yyyy-MM-dd'));
    const employeeTimelog: Record<string, AttendanceSheet> = {};

    if (!this.selectedEmployee()?.employee?.id) return;
    this.otherIncome.set([]);
    for (const day of days) {
      const employeeTimeLogs = timeLogs.filter(
        (timeLog) =>
          timeLog.employee_id === this.selectedEmployee()?.employee?.id &&
          isSameDay(
            timeLog.created_at,
            toDate(day, { timeZone: 'America/Panama' })
          )
      );

      const entryTime = employeeTimeLogs.find(
        (timeLog) => timeLog.type === TimeLogEnum.entry
      )?.created_at;

      const exitTime = employeeTimeLogs.find(
        (timeLog) => timeLog.type === TimeLogEnum.exit
      )?.created_at;
      const lunchStartTime = employeeTimeLogs.find(
        (timeLog) => timeLog.type === TimeLogEnum.lunch_start
      )?.created_at;
      const lunchEndTime = employeeTimeLogs.find(
        (timeLog) => timeLog.type === TimeLogEnum.lunch_end
      )?.created_at;
      const schedule = schedules.find(
        (schedule) =>
          schedule.employee_id === this.selectedEmployee()?.employee?.id &&
          (isBefore(
            toDate(schedule.start_date, { timeZone: 'America/Panama' }),
            toDate(day, { timeZone: 'America/Panama' })
          ) ||
            isSameDay(
              toDate(schedule.start_date, { timeZone: 'America/Panama' }),
              toDate(day, { timeZone: 'America/Panama' })
            )) &&
          (isAfter(
            toDate(schedule.end_date, { timeZone: 'America/Panama' }),
            toDate(day, { timeZone: 'America/Panama' })
          ) ||
            isSameDay(
              toDate(schedule.end_date, { timeZone: 'America/Panama' }),
              toDate(day, { timeZone: 'America/Panama' })
            ))
      )?.schedule;
      const { worked_hours, overtime_hours } = this.getHours({
        entryTime: entryTime!,
        exitTime: exitTime!,
        lunchStartTime,
        lunchEndTime,
      });
      const late_hours = this.getLateHours({
        entryTime: entryTime!,
        schedule: schedule!,
      });
      const is_sunday = isSunday(toDate(day, { timeZone: 'America/Panama' }));
      const hourly_salary = this.selectedEmployee()!.hourly_salary!;
      const worked_hours_payment = roundNumber(
        schedule?.day_off || worked_hours === 0 ? 0 : 8 * hourly_salary
      );

      const late_hours_payment = roundNumber(
        late_hours * hourly_salary * (is_sunday ? 1.5 : 1)
      );
      const sunday_payment =
        is_sunday && worked_hours > 0 && !schedule?.day_off
          ? roundNumber(8 * hourly_salary * 0.5)
          : 0;
      const absence_hours = 0;
      const absence_hours_payment = 0;

      employeeTimelog[day] = {
        employee_id: this.selectedEmployee()!.employee!.id,
        branch_id:
          employeeTimeLogs.find((timeLog) => timeLog.type === TimeLogEnum.entry)
            ?.branch_id ?? null,
        branch: employeeTimeLogs.find(
          (timeLog) => timeLog.type === TimeLogEnum.entry
        )?.branch,
        base_salary: hourly_salary * 8,
        schedule_id: schedule?.id ?? null,
        justification_notes: '',
        justification_cause: 'NORMAL',
        is_justified: false,
        schedule: schedule,
        date: day,
        entry_time: entryTime ?? null,
        exit_time: exitTime ?? null,
        lunch_start_time: lunchStartTime ?? null,
        lunch_end_time: lunchEndTime ?? null,
        is_sunday,
        is_holiday: false,
        worked_hours_payment,
        late_hours_payment,
        sunday_payment,
        holiday_payment: 0,
        absence_hours,
        absence_hours_payment,
        compensatory_hours: 0,
        compensatory_hours_payment: 0,
        justified_hours: 0,

        is_late: schedule?.day_off
          ? false
          : entryTime &&
            schedule?.entry_time &&
            this.calcTimeDiff(
              format(entryTime, 'hh:mm:ss'),
              schedule.entry_time as string
            ) > schedule.minutes_tolerance
          ? true
          : false,
        worked_hours,
        late_hours,
        overtime_hours,
      };
    }
    this.attendanceSheet.set(employeeTimelog);

    /*  this.http
      .post(
        `${process.env['ENV_SUPABASE_URL']}/rest/v1/attendance_sheets`,
        attendanceSheets
      )
      .subscribe(); */
  }

  calcTimeDiff = (time1: string, time2: string) => {
    if (!time2) return 0;
    const timeStart = new Date();
    const timeEnd = new Date();
    const valueStart = time1.split(':');
    const valueEnd = time2.split(':');

    timeStart.setHours(+valueStart[0], +valueStart[1], 0, 0);
    timeEnd.setHours(+valueEnd[0], +valueEnd[1], 0, 0);

    return differenceInMinutes(timeStart, timeEnd);
  };

  setCompensatoryHours(id: string, hours: number) {
    this.dialogService
      .open(LateCompensatoryFormComponent, {
        data: {
          hours,
        },
        modal: true,
        width: '36rem',
        header: 'Justifiacion de Horas',
      })
      .onClose.subscribe({
        next: (res) => {
          if (res) {
            this.attendanceSheet.update((attendanceSheet) => ({
              ...attendanceSheet,
              [id]: {
                ...attendanceSheet[id],
                is_justified: res.cause === 'JUSTIFICADA',
                justified_hours: res.hours,
                justification_notes: res.notes,
                justification_cause: res.cause,
                compensatory_hours_payment: roundNumber(
                  res.hours * this.selectedEmployee()!.hourly_salary!
                ),
              },
            }));
            console.log(this.attendanceSheet()[id]);
          }
        },
      });
  }

  getHours({
    entryTime,
    exitTime,
    lunchStartTime,
    lunchEndTime,
  }: {
    entryTime: Date;
    exitTime: Date;
    lunchStartTime: Date | undefined;
    lunchEndTime: Date | undefined;
  }) {
    const totalMinutes = differenceInMinutes(exitTime, entryTime);
    if (!lunchStartTime || !lunchEndTime) {
      return {
        worked_hours: totalMinutes ? Math.floor(totalMinutes / 60) : 0,
        overtime_hours: 0,
      };
    }
    if (!totalMinutes) {
      return {
        worked_hours: 0,
        overtime_hours: 0,
      };
    }
    const lunchMinutes = differenceInMinutes(lunchEndTime, lunchStartTime);
    const workedMinutes = totalMinutes - lunchMinutes;
    const hours = Math.floor(workedMinutes / 60);
    if (hours > 8) {
      const overtimeMinutes = workedMinutes - 8 * 60;
      const overtimeHours = Math.floor(overtimeMinutes / 60);
      const overtimeMinutesLeft = overtimeMinutes % 60;
      const overtimeTotalHours = Math.floor(
        overtimeHours + overtimeMinutesLeft / 60
      );
      return {
        worked_hours: 8,
        overtime_hours: overtimeTotalHours,
      };
    }

    const minutes = workedMinutes % 60;
    const totalHours = hours + minutes / 60;
    return {
      worked_hours: totalHours,
      overtime_hours: 0,
    };
  }

  getLateHours({
    entryTime,
    schedule,
  }: {
    entryTime: Date;
    schedule: Schedule;
  }) {
    if (!schedule || !entryTime) {
      return 0;
    }
    const totalMinutes = this.calcTimeDiff(
      format(entryTime, 'hh:mm:ss'),
      schedule.entry_time as string
    );
    const earlyMinutes = this.calcTimeDiff(
      format(entryTime, 'hh:mm:ss'),
      schedule.exit_time as string
    );
    if (totalMinutes < schedule.minutes_tolerance && earlyMinutes < 0) {
      return 0;
    }
    if (earlyMinutes > 0) {
      return (earlyMinutes + totalMinutes) / 60;
    }
    const lateHours = totalMinutes / 60;
    return lateHours;
  }

  generateDraft() {
    this.completed.reload();
    const wb = utils.book_new();
    // utils.book_append_sheet(wb, ws, 'Empleados');
    const ws = utils.aoa_to_sheet([
      // Title row 1 (will be merged across 10 columns)
      ['BO Capital', , , , , , , , , , ,], // 10 columns
      // Title row 2 (subtitle)
      [`Planilla: ${this.payroll.value()?.[0].name}`, , , , , , , , ,], // 10 columns
      // Title row 3 (date or other info)
      [`Fecha: ${this.payment.value()?.[0].start_date}`, , , , , , , , ,], // 10 columns
      ['Generado por: Odilis Quintero'],
      ['Fecha de generación: ' + new Date().toISOString()], // empty row for spacing
      // your actual data
    ]);
    const branches = this.dashboardStore.branches.entities();
    let currentRow = 5;
    branches.forEach((branch) => {
      utils.sheet_add_aoa(ws, [[branch.name.toUpperCase()]], {
        origin: `A${currentRow + 1}`,
      });
      currentRow++;
      const employees = this.employees
        .value()
        ?.filter((employee) => employee.employee.branch_id === branch.id);
      const completed = this.completed
        .value()
        ?.filter((completed) =>
          employees
            ?.map((employee) => employee.employee.id)
            .includes(completed.employee_id)
        );
      utils.sheet_add_aoa(ws, []);
      currentRow++;
      completed?.forEach((item) => {
        utils.sheet_add_aoa(
          ws,
          [
            [
              `${item.employee?.first_name} ${item.employee?.father_name} / ${item.employee?.document_id}`,
            ],
          ],
          {
            origin: `A${currentRow + 1}`,
          }
        );
        currentRow++;
        utils.sheet_add_aoa(
          ws,
          [
            [
              ...(item.items
                ?.filter((x) => x.type === 'income')
                .map((item) => item.description) ?? []),
              '',
              ...(item.items
                ?.filter((x) => x.type === 'deduction')
                .map((item) => item.description) ?? []),
              '',
              ...(item.items
                ?.filter((x) => x.type === 'debt')
                .map((item) => item.description) ?? []),
              'Total a pagar',
            ],
          ],
          {
            origin: `A${currentRow + 1}`,
          }
        );
        currentRow++;
        utils.sheet_add_aoa(
          ws,
          [
            [
              ...(item.items
                ?.filter((x) => x.type === 'income')
                .map((item) => item.amount) ?? []),
              '',
              ...(item.items
                ?.filter((x) => x.type === 'deduction')
                .map((item) => item.amount) ?? []),
              '',
              ...(item.items
                ?.filter((x) => x.type === 'debt')
                .map((item) => item.amount) ?? []),
              item.total_amount,
            ],
          ],
          {
            origin: `A${currentRow + 1}`,
          }
        );
        currentRow++;
      });
      currentRow++;
      utils.sheet_add_aoa(
        ws,
        [
          [
            `Total a pagar para ${branch.name.toUpperCase()}:`,
            completed?.reduce((acc, item) => acc + item.total_amount, 0),
          ],
        ],
        {
          origin: `A${currentRow + 1}`,
        }
      );
      currentRow++;
      currentRow++;
    });

    utils.sheet_add_aoa(
      ws,
      [
        [
          `Total a pagar para ${this.payment
            .value()?.[0]
            .payroll?.name.toUpperCase()}:`,
          this.completed
            .value()
            ?.reduce((acc, item) => acc + item.total_amount, 0),
        ],
      ],
      {
        origin: `A${currentRow + 1}`,
      }
    );

    utils.book_append_sheet(wb, ws, 'Empleados');
    writeFile(wb, 'BORRADOR.xlsx');
  }
}
