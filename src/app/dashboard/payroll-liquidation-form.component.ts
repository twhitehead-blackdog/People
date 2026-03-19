import { CurrencyPipe, DatePipe } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { Select } from 'primeng/select';
import { InputNumber } from 'primeng/inputnumber';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { Tag } from 'primeng/tag';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { LiquidationService } from '../services/liquidation.service';
import { VacationPaymentService } from '../services/vacation-payment.service';
import type { Employee, LiquidationTerminationType, ContractType } from '../models';
import { TERMINATION_TYPE_OPTIONS, CONTRACT_TYPE_OPTIONS } from '../models';
import {
  calculateFullLiquidation,
  getApplicableComponents,
  type LiquidationResult,
} from '../utils/liquidation-calculation.utils';

@Component({
  selector: 'pt-payroll-liquidation-form',
  standalone: true,
  imports: [
    CurrencyPipe, DatePipe, FormsModule,
    Button, Card, Select, InputNumber, Textarea, DatePicker, Tag, Toast,
  ],
  providers: [MessageService],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="max-w-4xl mx-auto">
      <!-- Header -->
      <div class="flex items-center gap-4 mb-6">
        <p-button icon="pi pi-arrow-left" severity="secondary" rounded outlined (click)="goBack()" />
        <div>
          <h1 class="text-2xl font-bold text-white m-0">Nueva Liquidacion</h1>
          <p class="text-sm text-gray-400 m-0 mt-1">Calculo de liquidacion laboral</p>
        </div>
      </div>

      <!-- Step 1: Select Employee -->
      <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
        <h2 class="text-lg font-semibold text-white mb-4">
          <i class="pi pi-user mr-2"></i>Datos del Empleado
        </h2>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-300 mb-1">Empleado</label>
            <p-select
              [options]="employees()"
              [(ngModel)]="selectedEmployeeId"
              optionLabel="label"
              optionValue="value"
              placeholder="Seleccionar empleado"
              [filter]="true"
              filterBy="label"
              class="w-full"
              (onChange)="onEmployeeSelected()"
            />
          </div>
          @if (selectedEmployee()) {
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Cedula</label>
              <div class="text-white p-2 bg-gray-700/50 rounded">{{ selectedEmployee()!.document_id }}</div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Fecha de ingreso</label>
              <div class="text-white p-2 bg-gray-700/50 rounded">{{ selectedEmployee()!.start_date | date:'dd/MM/yyyy' }}</div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Salario mensual</label>
              <div class="text-white p-2 bg-gray-700/50 rounded">{{ selectedEmployee()!.monthly_salary | currency:'USD':'symbol':'1.2-2' }}</div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Posicion</label>
              <div class="text-white p-2 bg-gray-700/50 rounded">{{ selectedEmployee()!.position?.name ?? 'N/A' }}</div>
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Sucursal</label>
              <div class="text-white p-2 bg-gray-700/50 rounded">{{ selectedEmployee()!.branch?.name ?? 'N/A' }}</div>
            </div>
          }
        </div>
      </div>

      @if (selectedEmployee()) {
        <!-- Step 2: Termination Details -->
        <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
          <h2 class="text-lg font-semibold text-white mb-4">
            <i class="pi pi-file mr-2"></i>Datos de Terminacion
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Tipo de terminacion</label>
              <p-select
                [options]="terminationTypes"
                [(ngModel)]="terminationType"
                optionLabel="label"
                optionValue="value"
                placeholder="Seleccionar tipo"
                class="w-full"
                (onChange)="recalculate()"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Tipo de contrato</label>
              <p-select
                [options]="contractTypes"
                [(ngModel)]="contractType"
                optionLabel="label"
                optionValue="value"
                class="w-full"
                (onChange)="recalculate()"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Fecha de terminacion</label>
              <p-datepicker
                [(ngModel)]="terminationDate"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                class="w-full"
                (onSelect)="recalculate()"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Ultimo dia pagado</label>
              <p-datepicker
                [(ngModel)]="lastPayDate"
                dateFormat="dd/mm/yy"
                [showIcon]="true"
                class="w-full"
                (onSelect)="recalculate()"
              />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Dias vacaciones usados</label>
              <p-inputNumber [(ngModel)]="vacationUsedDays" [min]="0" class="w-full" (onInput)="recalculate()" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Fondo de Cesantia (offset)</label>
              <p-inputNumber [(ngModel)]="fondoCesantia" [min]="0" mode="currency" currency="USD" class="w-full" (onInput)="recalculate()" />
            </div>
            <div>
              <label class="block text-sm font-medium text-gray-300 mb-1">Otras deducciones</label>
              <p-inputNumber [(ngModel)]="otherDeductions" [min]="0" mode="currency" currency="USD" class="w-full" (onInput)="recalculate()" />
            </div>
          </div>
        </div>

        @if (result()) {
          <!-- Step 3: Calculation Results -->
          <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
            <h2 class="text-lg font-semibold text-white mb-4">
              <i class="pi pi-calculator mr-2"></i>Desglose de Liquidacion
            </h2>

            <div class="space-y-3">
              <!-- Ingresos -->
              <div class="text-sm font-semibold text-gray-400 uppercase tracking-wide">Ingresos</div>

              @if (result()!.pendingSalary > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">Salario pendiente ({{ result()!.pendingSalaryDays }} dias)</span>
                  <span class="text-white">{{ result()!.pendingSalary | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
              @if (result()!.vacationPay > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">Vacaciones ({{ result()!.vacationDaysProportional }} dias prop.)</span>
                  <span class="text-white">{{ result()!.vacationPay | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
              @if (result()!.xiiiMonthProportional > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">XIII Mes proporcional</span>
                  <span class="text-white">{{ result()!.xiiiMonthProportional | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
              @if (result()!.seniorityBonus > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">Prima de antiguedad ({{ result()!.seniorityYears }} anos)</span>
                  <span class="text-white">{{ result()!.seniorityBonus | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
              @if (result()!.noticePay > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">Preaviso (30 dias)</span>
                  <span class="text-white">{{ result()!.noticePay | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
              @if (result()!.severancePay > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">Indemnizacion ({{ result()!.severanceWeeks }} semanas)</span>
                  <span class="text-white">{{ result()!.severancePay | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }

              <div class="flex justify-between py-2 border-t border-gray-600">
                <span class="text-white font-semibold">Total Bruto</span>
                <span class="text-white font-bold text-lg">{{ result()!.grossTotal | currency:'USD':'symbol':'1.2-2' }}</span>
              </div>

              <!-- Deducciones -->
              <div class="text-sm font-semibold text-gray-400 uppercase tracking-wide mt-4">Deducciones</div>

              @if (result()!.cssDeduction > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">CSS (9.75%)</span>
                  <span class="text-red-400">-{{ result()!.cssDeduction | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
              @if (result()!.seDeduction > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">Seguro Educativo (1.25%)</span>
                  <span class="text-red-400">-{{ result()!.seDeduction | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
              @if (result()!.isrDeduction > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">ISR</span>
                  <span class="text-red-400">-{{ result()!.isrDeduction | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
              @if (result()!.otherDeductions > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">Otras deducciones</span>
                  <span class="text-red-400">-{{ result()!.otherDeductions | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }
              @if (result()!.fondoCesantiaOffset > 0) {
                <div class="flex justify-between text-sm py-1 border-b border-gray-700/50">
                  <span class="text-gray-300">Fondo de Cesantia</span>
                  <span class="text-red-400">-{{ result()!.fondoCesantiaOffset | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              }

              <!-- Total Neto -->
              <div class="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 mt-4">
                <div class="flex justify-between items-center">
                  <span class="text-gray-300 font-semibold text-lg">TOTAL NETO A PAGAR</span>
                  <span class="text-3xl font-bold text-amber-400">{{ result()!.netTotal | currency:'USD':'symbol':'1.2-2' }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Notes -->
          <div class="bg-gray-800 border border-gray-700 rounded-xl p-6 mb-6">
            <label class="block text-sm font-medium text-gray-300 mb-1">Notas (opcional)</label>
            <textarea pTextarea [(ngModel)]="notes" rows="3" class="w-full"></textarea>
          </div>

          <!-- Actions -->
          <div class="flex justify-end gap-3 mb-8">
            <p-button label="Cancelar" severity="secondary" outlined rounded (click)="goBack()" />
            <p-button
              label="Guardar Liquidacion"
              icon="pi pi-save"
              rounded
              [loading]="saving()"
              (click)="save()"
            />
          </div>
        }
      }

      <p-toast />
    </div>
  `,
  styles: `
    :host { display: block; padding: 1.5rem; }
  `,
})
export class PayrollLiquidationFormComponent {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly apiUrl = inject(ApiUrlService);
  private readonly orgService = inject(OrganizationService);
  private readonly liquidationService = inject(LiquidationService);
  private readonly vacPayService = inject(VacationPaymentService);
  private readonly messageService = inject(MessageService);

  // Constants
  readonly terminationTypes = TERMINATION_TYPE_OPTIONS;
  readonly contractTypes = CONTRACT_TYPE_OPTIONS;

  // State
  readonly employeeList = signal<Partial<Employee>[]>([]);
  readonly selectedEmployeeId = signal<string | null>(null);
  readonly selectedEmployee = signal<Partial<Employee> | null>(null);
  readonly terminationType = signal<LiquidationTerminationType>('RENUNCIA');
  readonly contractType = signal<ContractType>('INDEFINIDO');
  readonly terminationDate = signal<Date>(new Date());
  readonly lastPayDate = signal<Date>(new Date());
  readonly vacationUsedDays = signal(0);
  readonly fondoCesantia = signal(0);
  readonly otherDeductions = signal(0);
  readonly notes = signal('');
  readonly result = signal<LiquidationResult | null>(null);
  readonly saving = signal(false);

  readonly employees = computed(() => {
    return this.employeeList().map(e => ({
      label: `${e.first_name} ${e.father_name} (${e.document_id})`,
      value: e.id!,
    }));
  });

  constructor() {
    this.loadEmployees();
  }

  private async loadEmployees(): Promise<void> {
    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;

    const url = this.apiUrl.build('rest/v1/employees', {
      select: 'id,first_name,father_name,mother_name,document_id,start_date,monthly_salary,branch:branches(id,name),position:positions(id,name),department:departments(id,name)',
      company_id: `eq.${companyId}`,
      is_active: 'eq.true',
      payroll_type: 'eq.regular',
      order: 'first_name.asc',
    });
    const result = await firstValueFrom(this.http.get<Partial<Employee>[]>(url));
    this.employeeList.set(result ?? []);
  }

  async onEmployeeSelected(): Promise<void> {
    const empId = this.selectedEmployeeId();
    if (!empId) {
      this.selectedEmployee.set(null);
      this.result.set(null);
      return;
    }

    const emp = this.employeeList().find(e => e.id === empId) ?? null;
    this.selectedEmployee.set(emp);

    if (emp?.start_date) {
      const usedDays = await this.vacPayService.getUsedVacationDays(empId);
      this.vacationUsedDays.set(usedDays);
    }

    this.recalculate();
  }

  recalculate(): void {
    const emp = this.selectedEmployee();
    if (!emp?.monthly_salary || !emp?.start_date || !this.terminationDate()) {
      this.result.set(null);
      return;
    }

    const calc = calculateFullLiquidation({
      monthlySalary: emp.monthly_salary,
      hireDate: String(emp.start_date),
      terminationDate: this.terminationDate(),
      terminationType: this.terminationType(),
      contractType: this.contractType(),
      lastPayDate: this.lastPayDate(),
      vacationUsedDays: this.vacationUsedDays(),
      fondoCesantiaOffset: this.fondoCesantia(),
      otherDeductions: this.otherDeductions(),
    });
    this.result.set(calc);
  }

  async save(): Promise<void> {
    const emp = this.selectedEmployee();
    const calc = this.result();
    if (!emp || !calc) return;

    const companyId = this.orgService.getCurrentCompanyId();
    if (!companyId) return;

    this.saving.set(true);
    try {
      await this.liquidationService.create({
        company_id: companyId,
        employee_id: emp.id!,
        employee_name: `${emp.first_name} ${emp.father_name}`,
        document_id: emp.document_id,
        hire_date: String(emp.start_date),
        termination_date: this.terminationDate().toISOString().split('T')[0],
        monthly_salary: emp.monthly_salary!,
        position: (emp.position as any)?.name,
        department: (emp.department as any)?.name,
        branch: (emp.branch as any)?.name,
        contract_type: this.contractType(),
        termination_type: this.terminationType(),
        pending_salary: calc.pendingSalary,
        pending_salary_days: calc.pendingSalaryDays,
        vacation_days_accrued: calc.vacationDaysAccrued,
        vacation_days_proportional: calc.vacationDaysProportional,
        vacation_pay: calc.vacationPay,
        xiii_month_proportional: calc.xiiiMonthProportional,
        seniority_bonus: calc.seniorityBonus,
        seniority_years: calc.seniorityYears,
        notice_pay: calc.noticePay,
        severance_pay: calc.severancePay,
        severance_weeks: calc.severanceWeeks,
        gross_total: calc.grossTotal,
        css_deduction: calc.cssDeduction,
        se_deduction: calc.seDeduction,
        isr_deduction: calc.isrDeduction,
        other_deductions: calc.otherDeductions,
        fondo_cesantia_offset: calc.fondoCesantiaOffset,
        net_total: calc.netTotal,
        status: 'CALCULATED',
        notes: this.notes() || undefined,
      });

      this.messageService.add({ severity: 'success', summary: 'Guardado', detail: 'Liquidacion registrada' });
      this.router.navigate(['/dashboard/payroll/liquidation']);
    } catch (err) {
      console.error('Error saving liquidation:', err);
      this.messageService.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la liquidacion' });
    } finally {
      this.saving.set(false);
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard/payroll/liquidation']);
  }
}
