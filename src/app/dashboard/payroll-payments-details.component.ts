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
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import {
  addDays,
  differenceInMinutes,
  eachDayOfInterval,
  format,
  isAfter,
  isBefore,
  isSameDay,
  isSunday,
  set,
} from 'date-fns';
import { toDate } from 'date-fns-tz';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { Select } from 'primeng/select';
import { TableModule } from 'primeng/table';
import { catchError, firstValueFrom, forkJoin, switchMap, throwError } from 'rxjs';
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
import { PayrollService } from '../services/payroll.service';
import { EmailService } from '../services/email.service';
import { DashboardStore } from '../stores/dashboard.store';
import { LateCompensatoryFormComponent } from './late-compensatory-form.component';
import { PaymentItemFormComponent } from './payment-item-form.component';
import { Tag } from 'primeng/tag';

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
    Tag,
  ],
  providers: [DynamicDialogRef, DialogService],
  template: `<div class="flex flex-col gap-4">
    <div class="flex items-center justify-between flex-wrap gap-4">
      <div class="flex items-center gap-3">
        <i class="pi pi-calculator text-3xl text-amber-400"></i>
        <div>
          <h1 class="text-2xl font-bold text-white m-0">
            {{ payment.value()?.[0]?.title ?? payment.value()?.[0]?.payroll?.name }}
          </h1>
          <p class="text-sm text-gray-400 m-0 mt-1">
            {{ payment.value()?.[0]?.start_date | date:'dd/MM/yyyy' }} -
            {{ payment.value()?.[0]?.end_date | date:'dd/MM/yyyy' }}
            @if (payment.value()?.[0]?.payment_date) {
              &middot; Pago: {{ payment.value()?.[0]?.payment_date | date:'dd/MM/yyyy' }}
            }
          </p>
        </div>
      </div>
      <div class="flex items-center gap-2">
        @if (payment.value()?.[0]?.status; as status) {
          @switch (status) {
            @case ('DRAFT') {
              <p-tag value="Borrador" severity="secondary" rounded />
            }
            @case ('CALCULATED') {
              <p-tag value="Calculado" severity="info" rounded />
            }
            @case ('REVIEWED') {
              <p-tag value="Revisado" severity="warn" rounded />
            }
            @case ('APPROVED') {
              <p-tag value="Aprobado" severity="success" rounded />
            }
            @case ('PAID') {
              <p-tag value="Pagado" severity="contrast" rounded />
            }
          }
        }
        @if (payment.value()?.[0]?.status === 'DRAFT' || payment.value()?.[0]?.status === 'CALCULATED') {
          <p-button
            label="Calcular"
            icon="pi pi-calculator"
            severity="info"
            rounded
            size="small"
            [loading]="calculating()"
            (click)="calculateBatch()"
          />
        }
        @if (payment.value()?.[0]?.status === 'CALCULATED') {
          <p-button
            label="Marcar Revisado"
            icon="pi pi-eye"
            severity="warn"
            rounded
            size="small"
            [loading]="updatingStatus()"
            (click)="updateStatus('REVIEWED')"
          />
        }
        @if (payment.value()?.[0]?.status === 'REVIEWED') {
          <p-button
            label="Aprobar"
            icon="pi pi-check-circle"
            severity="success"
            rounded
            size="small"
            [loading]="updatingStatus()"
            (click)="updateStatus('APPROVED')"
          />
        }
        @if (payment.value()?.[0]?.status === 'APPROVED') {
          <p-button
            label="Marcar Pagado"
            icon="pi pi-wallet"
            severity="contrast"
            rounded
            size="small"
            [loading]="updatingStatus()"
            (click)="updateStatus('PAID')"
          />
        }
        <p-button
          label="Borrador"
          severity="secondary"
          icon="pi pi-file"
          rounded
          size="small"
          routerLink="draft"
        />
      </div>
    </div>
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
  public calculating = signal(false);
  public updatingStatus = signal(false);
  private message = inject(MessageService);
  private organizationService = inject(OrganizationService);
  private apiUrl = inject(ApiUrlService);
  private payrollService = inject(PayrollService);
  public absenceCauses = [
    { value: 'PERSONAL', label: 'Personal' },
    { value: 'INJUSTIFICADA', label: 'Injustificada' },
    { value: 'JUSTIFICADA', label: 'Justificada' },
  ];
  selectedSheets!: AttendanceSheet[];
  private http = inject(HttpClient);
  private emailService = inject(EmailService);
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
      url: `${this.apiUrl.baseUrl}/rest/v1/payrolls`,
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
      url: `${this.apiUrl.baseUrl}/rest/v1/payroll_payment_employees`,
      method: 'GET',
      params: {
        select:
          '*, items:payroll_payment_employee_items(*), employee:employees!inner(id, first_name, father_name, document_id, is_active)',
        payroll_payment_id: `eq.${this.payment.value()?.[0]?.id}`,
        'employee.is_active': 'eq.true', // Solo empleados activos
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
    url: `${this.apiUrl.baseUrl}/rest/v1/payroll_payments`,
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
      url: `${this.apiUrl.baseUrl}/rest/v1/employee_payrolls`,
      method: 'GET',
      params: {
        select:
          '*, employee:employees!inner(id, first_name, father_name, monthly_salary, hourly_salary, week_hours, use_timelog, branch_id, is_active, debts:payroll_debts(*))',
        payroll_id: `eq.${this.payment.value()?.[0]?.payroll_id}`,
        'employee.is_active': 'eq.true', // Solo empleados activos
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

  async updateStatus(status: 'REVIEWED' | 'APPROVED' | 'PAID') {
    const paymentId = this.payment_id();
    this.updatingStatus.set(true);
    try {
      await this.payrollService.updatePeriodStatus(paymentId, status);
      const labels: Record<string, string> = {
        REVIEWED: 'Periodo marcado como revisado',
        APPROVED: 'Periodo aprobado',
        PAID: 'Periodo marcado como pagado. Enviando comprobantes...',
      };
      this.message.add({
        severity: 'success',
        summary: 'Estado Actualizado',
        detail: labels[status],
      });
      if (status === 'PAID') {
        this.sendPayrollReceipts(paymentId);
      }
      this.payment.reload();
    } catch (err: any) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: err?.message ?? 'Error al actualizar estado',
      });
    }
    this.updatingStatus.set(false);
  }

  private async sendPayrollReceipts(paymentId: string): Promise<void> {
    const payment = this.payment.value()?.[0];
    if (!payment) return;

    try {
      const employees = await firstValueFrom(
        this.http.get<PayrollPaymentEmployee[]>(
          `${this.apiUrl.baseUrl}/rest/v1/payroll_payment_employees`,
          {
            params: {
              select:
                '*, items:payroll_payment_employee_items(*), employee:employees(id, first_name, father_name, email, work_email)',
              payroll_payment_id: `eq.${paymentId}`,
            },
          }
        )
      );

      const paymentDate = payment.payment_date
        ? new Date(payment.payment_date).toLocaleDateString('es-PA')
        : new Date().toLocaleDateString('es-PA');
      const startDate = new Date(payment.start_date).toLocaleDateString('es-PA');
      const endDate = new Date(payment.end_date).toLocaleDateString('es-PA');

      for (const emp of employees) {
        const email = (emp.employee as any)?.work_email || emp.employee?.email;
        if (!email) continue;

        const name =
          `${emp.employee?.first_name ?? ''} ${(emp.employee as any)?.father_name ?? ''}`.trim();
        const incomeItems = emp.items?.filter((i) => i.type === 'income') ?? [];
        const deductionItems = emp.items?.filter((i) => i.type === 'deduction') ?? [];
        const debtItems = emp.items?.filter((i) => i.type === 'debt') ?? [];

        const html = this.buildReceiptHtml(
          name,
          payment.title,
          paymentDate,
          startDate,
          endDate,
          incomeItems,
          deductionItems,
          debtItems,
          emp.total_amount
        );

        this.emailService
          .sendEmail({
            to: email,
            subject: `Comprobante de Pago - ${payment.title}`,
            html,
          })
          .subscribe({
            error: (err) =>
              console.error(`Error enviando comprobante a ${email}:`, err),
          });
      }
    } catch (err) {
      console.error('Error enviando comprobantes:', err);
      this.message.add({
        severity: 'warn',
        summary: 'Comprobantes',
        detail: 'No se pudieron enviar algunos comprobantes por email',
      });
    }
  }

  private buildReceiptHtml(
    employeeName: string,
    title: string,
    paymentDate: string,
    startDate: string,
    endDate: string,
    incomeItems: PayrollPaymentEmployeeItem[],
    deductionItems: PayrollPaymentEmployeeItem[],
    debtItems: PayrollPaymentEmployeeItem[],
    netPay: number
  ): string {
    const fmt = (amount: number) =>
      new Intl.NumberFormat('es-PA', {
        style: 'currency',
        currency: 'USD',
      }).format(amount);

    const buildRows = (items: PayrollPaymentEmployeeItem[]) =>
      items
        .map(
          (item) => `
        <tr>
          <td style="padding:6px 8px; border-bottom:1px solid #e5e7eb;">${item.description}</td>
          <td style="padding:6px 8px; border-bottom:1px solid #e5e7eb; text-align:right;">${fmt(item.amount)}</td>
        </tr>`
        )
        .join('');

    const incomeTotal = incomeItems.reduce((s, i) => s + i.amount, 0);
    const deductionTotal = deductionItems.reduce((s, i) => s + i.amount, 0);
    const debtTotal = debtItems.reduce((s, i) => s + i.amount, 0);

    const incomeSection =
      incomeItems.length > 0
        ? `<h3 style="font-size:13px;text-transform:uppercase;color:#374151;margin:16px 0 8px;">Ingresos</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${buildRows(incomeItems)}
          <tr style="font-weight:bold;">
            <td style="padding:8px;background:#f9fafb;">Total Ingresos</td>
            <td style="padding:8px;background:#f9fafb;text-align:right;">${fmt(incomeTotal)}</td>
          </tr>
        </table>`
        : '';

    const deductionSection =
      deductionItems.length > 0
        ? `<h3 style="font-size:13px;text-transform:uppercase;color:#374151;margin:16px 0 8px;">Deducciones</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${buildRows(deductionItems)}
          <tr style="font-weight:bold;">
            <td style="padding:8px;background:#fef2f2;color:#991b1b;">Total Deducciones</td>
            <td style="padding:8px;background:#fef2f2;color:#991b1b;text-align:right;">(${fmt(deductionTotal)})</td>
          </tr>
        </table>`
        : '';

    const debtSection =
      debtItems.length > 0
        ? `<h3 style="font-size:13px;text-transform:uppercase;color:#374151;margin:16px 0 8px;">Préstamos / Deudas</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          ${buildRows(debtItems)}
          <tr style="font-weight:bold;">
            <td style="padding:8px;background:#fef3c7;color:#92400e;">Total Deudas</td>
            <td style="padding:8px;background:#fef3c7;color:#92400e;text-align:right;">(${fmt(debtTotal)})</td>
          </tr>
        </table>`
        : '';

    return `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#ffffff;">
        <div style="background:#111827;color:#f9fafb;padding:16px 24px;border-radius:8px 8px 0 0;">
          <h2 style="margin:0;font-size:20px;">Comprobante de Pago</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
          <table style="width:100%;margin-bottom:16px;">
            <tr><td style="color:#6b7280;padding:4px 0;width:140px;">Período</td><td><strong>${title}</strong></td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Empleado</td><td><strong>${employeeName}</strong></td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Fechas</td><td>${startDate} – ${endDate}</td></tr>
            <tr><td style="color:#6b7280;padding:4px 0;">Fecha de pago</td><td>${paymentDate}</td></tr>
          </table>
          ${incomeSection}
          ${deductionSection}
          ${debtSection}
          <div style="margin-top:24px;padding:16px;background:#f0fdf4;border-radius:8px;text-align:right;">
            <span style="font-size:16px;color:#166534;font-weight:bold;">Neto a Pagar: ${fmt(netPay)}</span>
          </div>
        </div>
      </div>`;
  }

  async calculateBatch() {
    const payrollId = this.payment.value()?.[0]?.payroll_id;
    const paymentId = this.payment_id();
    if (!payrollId) return;

    this.calculating.set(true);
    try {
      const result = await this.payrollService.calculatePayroll(payrollId, paymentId);
      await this.payrollService.saveCalculation(paymentId, result.results);
      this.message.add({
        severity: 'success',
        summary: 'Planilla Calculada',
        detail: `${result.totals.employee_count} empleados procesados. Neto: $${result.totals.total_net.toFixed(2)}`,
      });
      this.payment.reload();
      this.completed.reload();
    } catch (err: any) {
      this.message.add({
        severity: 'error',
        summary: 'Error al calcular',
        detail: err?.message ?? 'Error inesperado',
      });
    }
    this.calculating.set(false);
  }

  approvePayment(id: string) {
    this.loading.set(true);
    const attendanceSheet = this.sheetRegistry();
    const sheets$ = this.http.post(
      `${this.apiUrl.baseUrl}/rest/v1/attendance_sheets`,
      attendanceSheet
    );

    const summary$ = this.http.post<PayrollPaymentEmployee[]>(
      `${this.apiUrl.baseUrl}/rest/v1/payroll_payment_employees`,
      this.employeeSummary(),
      {
        params: {
          select: 'id,payroll_id,employee_id,payroll_payment_id,total_amount,debt_amount,late_amount,absence_amount,income_amount,deduction_amount,created_at',
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
            `${this.apiUrl.baseUrl}/rest/v1/payroll_payment_employee_items`,
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
    const companyId = this.organizationService.getCurrentCompanyId();

    const startDate = format(
      addDays(this.payment.value()![0].start_date, 1),
      "yyyy-MM-dd'T'06:00:00"
    );
    const endDate = format(
      addDays(this.payment.value()![0].end_date, 1),
      "yyyy-MM-dd'T'23:59:59"
    );

    const params: Record<string, string> = {
      select: '*, employee:employees!timelogs_employee_id_fkey(id, first_name, father_name), branch:branches(id, name)',
      'created_at': `gte.${startDate}`,
      order: 'created_at.asc',
    };

    if (companyId) {
      params['company_id'] = `eq.${companyId}`;
    }

    // Construir URL con ApiUrlService y agregar filtro lte manualmente
    // (ApiUrlService.build() no soporta claves duplicadas como created_at)
    const url = this.apiUrl.build('rest/v1/timelogs', params)
      + `&created_at=lte.${endDate}`;

    return {
      url,
      method: 'GET',
    };
  });

  public schedules = httpResource<EmployeeSchedule[]>(() => {
    if (!this.payment.value()?.[0]) {
      return undefined;
    }
    const companyId = this.organizationService.getCurrentCompanyId();

    const startDate = format(
      this.payment.value()![0].start_date,
      'yyyy-MM-dd'
    );
    const endDate = format(
      addDays(this.payment.value()![0].end_date, 1),
      'yyyy-MM-dd'
    );

    const params: Record<string, string> = {
      select: '*,schedule:schedules(*),employee:employees!employee_schedule_employee_id_fkey(id,company_id)',
      start_date: `gte.${startDate}`,
      order: 'start_date.asc',
    };

    if (companyId) {
      params['employee.company_id'] = `eq.${companyId}`;
    }

    // Agregar filtro end_date manualmente (clave duplicada con start_date en PostgREST)
    const url = this.apiUrl.build('rest/v1/employee_schedules', params)
      + `&end_date=lte.${endDate}`;

    return {
      url,
      method: 'GET',
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
    overtime_amount: 0,
    sunday_amount: this.summary().sunday_payment,
    holiday_amount: 0,
    employer_cost: 0,
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
        `${this.apiUrl.baseUrl}/rest/v1/attendance_sheets`,
        attendanceSheets
      )
      .subscribe(); */
  }

  calcTimeDiff = (time1: string, time2: string) => {
    if (!time1 || !time2) return 0;

    // Validar formato de hora (debe tener :)
    if (!time1.includes(':') || !time2.includes(':')) {
      return 0;
    }

    let timeStart = new Date();
    let timeEnd = new Date();
    const valueStart = time1.split(':');
    const valueEnd = time2.split(':');

    // Validar que tenga al menos horas y minutos
    if (valueStart.length < 2 || valueEnd.length < 2) {
      return 0;
    }

    timeStart = set(timeStart, { hours: +valueStart[0], minutes: +valueStart[1], seconds: 0, milliseconds: 0 });
    timeEnd = set(timeEnd, { hours: +valueEnd[0], minutes: +valueEnd[1], seconds: 0, milliseconds: 0 });

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

  async generateDraft() {
    this.completed.reload();
    const { utils, writeFile } = await import('xlsx');
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
