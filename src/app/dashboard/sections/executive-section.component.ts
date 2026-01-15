import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import { endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { DashboardStore } from '../../stores/dashboard.store';
import { EmployeesStore } from '../../stores/employees.store';
import { getMonthNameSpanish, getPanamaNowParts } from '../../utils/panama-date.utils';
import { AbsencesKpiComponent } from '../components/kpi/absences-kpi.component';
import {
  Birthday,
  BirthdaysDialogComponent,
} from '../components/dialogs/birthdays-dialog.component';
import { BirthdaysKpiComponent } from '../components/kpi/birthdays-kpi.component';
import { GenderKpiComponent } from '../components/kpi/gender-kpi.component';
import { HeadcountKpiComponent } from '../components/kpi/headcount-kpi.component';
import {
  HireExitRecord,
  HiresExitsDialogComponent,
} from '../components/dialogs/hires-exits-dialog.component';
import { HiresExitsKpiComponent } from '../components/kpi/hires-exits-kpi.component';
import {
  LateDetail,
  LateDetailsDialogComponent,
} from '../components/dialogs/late-details-dialog.component';
import { LatesKpiComponent } from '../components/kpi/lates-kpi.component';
import { PayrollKpiComponent } from '../components/kpi/payroll-kpi.component';
import { SimpleKpiComponent } from '../components/kpi/simple-kpi.component';
import {
  TopAbsenceRecord,
  TopAbsencesDialogComponent,
} from '../components/dialogs/top-absences-dialog.component';
import {
  TopLateRecord,
  TopLatesDialogComponent,
} from '../components/dialogs/top-lates-dialog.component';
import {
  HEADCOUNT_CHART_OPTIONS,
  LATES_CHART_OPTIONS,
} from '../config/chart-options.config';
import { HomeDataService } from '../services/home-data.service';
import { TardinessCalculationService } from '../services/tardiness-calculation.service';

@Component({
  selector: 'app-executive-section',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    HeadcountKpiComponent,
    GenderKpiComponent,
    LatesKpiComponent,
    AbsencesKpiComponent,
    HiresExitsKpiComponent,
    BirthdaysKpiComponent,
    PayrollKpiComponent,
    SimpleKpiComponent,
    LateDetailsDialogComponent,
    BirthdaysDialogComponent,
    HiresExitsDialogComponent,
    TopLatesDialogComponent,
    TopAbsencesDialogComponent,
  ],
  template: `
    <div class="section-content executive-section">
      <div class="kpi-grid executive-kpi-grid">
        <app-headcount-kpi
          [headcount]="state.headCount()"
          [chartData]="headcountChartData()"
          [chartOptions]="headcountChartOptions"
          (chartClick)="handleHeadcountChartClick($event)"
        ></app-headcount-kpi>

        <app-gender-kpi
          [maleCount]="getGenderCount('M')"
          [femaleCount]="getGenderCount('F')"
          [malePercentage]="getGenderPercentage('M')"
          [femalePercentage]="getGenderPercentage('F')"
          [chartData]="genderChartData()"
          [chartOptions]="genderChartOptions"
        ></app-gender-kpi>

        <app-lates-kpi
          [count]="getMonthlyLates()"
          [topEmployeeName]="getTopLatesEmployeeName()"
          [topEmployeeCount]="getTopLatesCount()"
          [chartData]="latesDailyChartData()"
          [chartOptions]="latesChartOptions"
          (chartClick)="handleLatesChartClick($event)"
        ></app-lates-kpi>

        <app-simple-kpi
          title="Top Tardanzas"
          [value]="getTopLatesCount()"
          [sublabel]="getTopLatesEmployeeName()"
          icon="pi-exclamation-triangle"
          tooltipText="Muestra el top de empleados con más tardanzas en el mes actual."
          (click)="openTopLatesDialog()"
          class="kpi-card-clickable"
        ></app-simple-kpi>

        <app-absences-kpi
          [maxAbsencesCount]="getTopAbsencesCount()"
          [topEmployeeName]="getTopAbsencesEmployeeName()"
          (click)="openTopAbsencesDialog()"
        ></app-absences-kpi>

        <app-hires-exits-kpi
          [hiresCount]="getHiresExitsCount('hires')"
          [exitsCount]="getHiresExitsCount('exits')"
          [chartData]="hiresExitsChartData()"
          [chartOptions]="hiresExitsChartOptions"
          (click)="openHiresExitsDialog()"
        ></app-hires-exits-kpi>

        <app-simple-kpi
          title="Tasa de Retención"
          [value]="state.retentionRate() + '%'"
          sublabel="Retención anual"
          icon="pi-heart"
          tooltipText="Mide el porcentaje de empleados que permanecen en la empresa después de 12 meses."
        ></app-simple-kpi>

        <app-birthdays-kpi
          [count]="monthlyBirthdaysCount()"
          (click)="openBirthdaysDialog()"
        ></app-birthdays-kpi>

        <app-payroll-kpi
          [monthlyCost]="monthlyCostFormatted()"
          [annualCost]="annualCostFormatted()"
        ></app-payroll-kpi>

        <app-simple-kpi
          title="Antigüedad Promedio"
          [value]="state.averageTenure()"
          sublabel="Años de experiencia"
          icon="pi-calendar-clock"
          tooltipText="Calcula el promedio de años de antigüedad de los empleados activos."
        ></app-simple-kpi>

        <app-simple-kpi
          title="Edad Promedio"
          [value]="state.averageAge()"
          sublabel="Años promedio"
          icon="pi-calendar"
          tooltipText="Calcula la edad promedio de todos los empleados activos."
        ></app-simple-kpi>

        <app-simple-kpi
          title="Salario Promedio"
          [value]="averageSalaryFormatted()"
          sublabel="Salario promedio"
          icon="pi-dollar"
          tooltipText="Calcula el salario mensual promedio de todos los empleados activos."
          class="financial"
        ></app-simple-kpi>

        <app-simple-kpi
          title="Índice de Clima Laboral"
          [value]="getWorkClimateIndex() + '%'"
          sublabel="Satisfacción general"
          icon="pi-users"
          tooltipText="Indicador compuesto que mide el clima laboral."
        ></app-simple-kpi>

        <app-simple-kpi
          title="Índice de Cumplimiento de Horario"
          [value]="getScheduleComplianceIndex() + '%'"
          sublabel="Cumplimiento mensual"
          icon="pi-check-circle"
          tooltipText="Mide el porcentaje de cumplimiento de horarios."
        ></app-simple-kpi>
      </div>

      <!-- Dialog for lates details -->
      <app-late-details-dialog
        [visible]="lateDialogVisible()"
        (visibleChange)="lateDialogVisible.set($event)"
        [title]="lateDialogTitle()"
        [details]="lateDialogDetails()"
      ></app-late-details-dialog>

      <!-- Dialog for birthdays details -->
      <app-birthdays-dialog
        [visible]="birthdaysDialogVisible()"
        (visibleChange)="birthdaysDialogVisible.set($event)"
        [birthdays]="birthdaysListMapped()"
      ></app-birthdays-dialog>

      <!-- Dialog for hires and exits details -->
      <app-hires-exits-dialog
        [visible]="hiresExitsDialogVisible()"
        (visibleChange)="hiresExitsDialogVisible.set($event)"
        title="Ingresos y Salidas del Personal"
        [hires]="monthlyHiresListMapped()"
        [exits]="monthlyExitsListMapped()"
      ></app-hires-exits-dialog>

      <!-- Dialog for top lates -->
      <app-top-lates-dialog
        [visible]="topLatesDialogVisible()"
        (visibleChange)="topLatesDialogVisible.set($event)"
        [lates]="topLatesListMapped()"
      ></app-top-lates-dialog>

      <!-- Dialog for top absences -->
      <app-top-absences-dialog
        [visible]="topAbsencesDialogVisible()"
        (visibleChange)="topAbsencesDialogVisible.set($event)"
        [absences]="topAbsencesList()"
      ></app-top-absences-dialog>

      <!-- Dialog for month-specific hires and exits details -->
      <app-hires-exits-dialog
        [visible]="monthHiresExitsDialogVisible()"
        (visibleChange)="monthHiresExitsDialogVisible.set($event)"
        [title]="'Ingresos y Salidas - ' + selectedMonthLabel()"
        [hires]="selectedMonthHiresListMapped()"
        [exits]="selectedMonthExitsListMapped()"
      ></app-hires-exits-dialog>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ExecutiveSectionComponent {
  public state = inject(DashboardStore);
  public employees = inject(EmployeesStore);
  private homeData = inject(HomeDataService);
  public tardinessService = inject(TardinessCalculationService);

  // Chart options
  public headcountChartOptions = HEADCOUNT_CHART_OPTIONS;
  public latesChartOptions = LATES_CHART_OPTIONS;

  // Dialog visibility signals
  public lateDialogVisible = signal(false);
  public lateDialogTitle = signal('');
  public lateDialogDetails = signal<LateDetail[]>([]);
  public birthdaysDialogVisible = signal(false);
  public hiresExitsDialogVisible = signal(false);
  public hiresExitsTab = signal<'hires' | 'exits'>('hires');
  public topLatesDialogVisible = signal(false);
  public topAbsencesDialogVisible = signal(false);
  public monthHiresExitsDialogVisible = signal(false);
  public monthHiresExitsTab = signal<'hires' | 'exits'>('hires');
  public selectedMonthLabel = signal<string>('');
  public selectedMonthIndex = signal<number>(-1);

  // Computed values
  public monthlyBirthdaysCount = computed(() => this.state.birthDates().length);

  public monthlyCostFormatted = computed(() => {
    const value = this.state.monthlyBudget();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  });

  public annualCostFormatted = computed(() => {
    const value = this.state.monthlyBudget() * 12;
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  });

  public averageSalaryFormatted = computed(() => {
    const value = this.state.averageSalary();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  });

  public headcountChartData = computed(() => this.homeData.headcountTrendData());
  public latesDailyChartData = computed(() => this.tardinessService.latesChartData());

  public genderChartData = computed(() => {
    const male = this.getGenderCount('M');
    const female = this.getGenderCount('F');
    return {
      labels: ['Masculino', 'Femenino'],
      datasets: [
        {
          data: [male, female],
          backgroundColor: ['#60a5fa', '#f472b6'],
          borderColor: ['#60a5fa', '#f472b6'],
          borderWidth: 0,
        },
      ],
    };
  });

  public genderChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '85%',
    rotation: -90,
    circumference: 180,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#18181b',
        titleColor: '#fbbf24',
        bodyColor: '#ffffff',
        borderColor: 'rgba(107, 114, 128, 0.3)',
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
            const percentage = total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  public hiresExitsChartData = computed(() => {
    const hires = this.homeData.monthlyHiresAndExits().hires;
    const exits = this.homeData.monthlyHiresAndExits().exits;
    return {
      labels: ['Ingresos', 'Salidas'],
      datasets: [
        {
          data: [hires, exits],
          backgroundColor: ['#10b981', '#ef4444'],
          borderColor: ['#10b981', '#ef4444'],
          borderWidth: 0,
        },
      ],
    };
  });

  public hiresExitsChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '85%',
    rotation: -90,
    circumference: 180,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        backgroundColor: '#18181b',
        titleColor: '#fbbf24',
        bodyColor: '#ffffff',
        callbacks: {
          label: (context: any) => {
            const label = context.label || '';
            const value = context.parsed || 0;
            return `${label}: ${value}`;
          },
        },
      },
    },
  };

  // Mapped lists for dialogs
  public birthdaysListMapped = computed<Birthday[]>(() => {
    return this.state.birthDates().map((x) => ({
      name: `${x.first_name || ''} ${x.father_name || ''}`.trim(),
      birth_date: x.birth_date
        ? new Date(x.birth_date).toISOString().split('T')[0]
        : undefined,
      branch_name: x.branch?.name,
    }));
  });

  public monthlyHiresList = computed(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    return this.employees
      .entities()
      .filter(
        (x) =>
          x.start_date &&
          new Date(x.start_date) >= monthStart &&
          new Date(x.start_date) <= monthEnd
      )
      .map((x) => ({
        first_name: x.first_name,
        father_name: x.father_name,
        start_date: x.start_date,
        branch: x.branch,
        position: x.position,
      }))
      .sort((a, b) => {
        if (!a.start_date || !b.start_date) return 0;
        return new Date(a.start_date).getTime() - new Date(b.start_date).getTime();
      });
  });

  public monthlyHiresListMapped = computed<HireExitRecord[]>(() => {
    return this.monthlyHiresList().map((x) => ({
      name: `${x.first_name || ''} ${x.father_name || ''}`.trim(),
      branch_name: x.branch?.name,
      job_title: x.position?.name,
      start_date: x.start_date
        ? new Date(x.start_date).toISOString().split('T')[0]
        : undefined,
    }));
  });

  public monthlyExitsList = computed(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    const terminations = this.homeData.terminationsResource.value() ?? [];
    return terminations
      .filter((t) => {
        if (!t.date) return false;
        const terminationDate = new Date(t.date);
        return terminationDate >= monthStart && terminationDate <= monthEnd;
      })
      .map((t) => ({
        date: t.date,
        reason: t.reason,
        employee: this.employees.entities().find((e) => e.id === t.employee_id),
      }))
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });
  });

  public monthlyExitsListMapped = computed<HireExitRecord[]>(() => {
    return this.monthlyExitsList().map((x) => ({
      name: x.employee
        ? `${x.employee.first_name || ''} ${x.employee.father_name || ''}`.trim()
        : 'Sin nombre',
      branch_name: x.employee?.branch?.name,
      job_title: x.employee?.position?.name,
      date: x.date ? new Date(x.date).toISOString().split('T')[0] : undefined,
      reason: x.reason,
    }));
  });

  public topLatesListMapped = computed<TopLateRecord[]>(() => {
    return this.tardinessService.topLatesList().map((x) => ({
      name: x.name || 'Sin nombre',
      count: x.count,
      branch_name: x.branch_name,
    }));
  });

  public topAbsencesList = computed<TopAbsenceRecord[]>(() => {
    return this.tardinessService.topAbsencesList().map((x) => ({
      name: x.name || 'Sin nombre',
      count: x.count,
      branch_name: x.branch_name,
    }));
  });

  public selectedMonthHiresList = computed(() => {
    const monthIndex = this.selectedMonthIndex();
    if (monthIndex < 0) return [];

    const data: any = this.homeData.headcountTrendData();
    const labels = data?.labels || [];
    if (monthIndex >= labels.length) return [];

    const label = labels[monthIndex];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const parts = label.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const monthIndexNum = monthNames.indexOf(monthName);

    if (monthIndexNum === -1 || isNaN(year)) return [];

    const monthStart = new Date(year, monthIndexNum, 1);
    const monthEnd = endOfMonth(monthStart);

    return this.employees
      .entities()
      .filter((x) => {
        if (!x.start_date) return false;
        const startDateValue: Date | string = x.start_date as any;
        const startDate = startDateValue instanceof Date ? startDateValue : parseISO(startDateValue);
        return startDate >= monthStart && startDate <= monthEnd;
      })
      .map((x) => ({
        first_name: x.first_name,
        father_name: x.father_name,
        start_date: x.start_date,
        branch: x.branch,
        position: x.position,
      }));
  });

  public selectedMonthHiresListMapped = computed<HireExitRecord[]>(() => {
    return this.selectedMonthHiresList().map((x) => ({
      name: `${x.first_name || ''} ${x.father_name || ''}`.trim(),
      branch_name: x.branch?.name,
      job_title: x.position?.name,
      start_date: x.start_date
        ? new Date(x.start_date).toISOString().split('T')[0]
        : undefined,
    }));
  });

  public selectedMonthExitsList = computed(() => {
    const monthIndex = this.selectedMonthIndex();
    if (monthIndex < 0) return [];

    const data: any = this.homeData.headcountTrendData();
    const labels = data?.labels || [];
    if (monthIndex >= labels.length) return [];

    const label = labels[monthIndex];
    const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const parts = label.split(' ');
    const monthName = parts[0];
    const year = parseInt(parts[1]);
    const monthIndexNum = monthNames.indexOf(monthName);

    if (monthIndexNum === -1 || isNaN(year)) return [];

    const monthStart = new Date(year, monthIndexNum, 1);
    const monthEnd = endOfMonth(monthStart);

    const terminations = this.homeData.terminationsResource.value() ?? [];
    return terminations
      .filter((t) => {
        if (!t.date) return false;
        const termDateValue: Date | string = t.date as any;
        const terminationDate = termDateValue instanceof Date ? termDateValue : parseISO(termDateValue);
        return terminationDate >= monthStart && terminationDate <= monthEnd;
      })
      .map((t) => ({
        date: t.date,
        reason: t.reason,
        employee: this.employees.entities().find((e) => e.id === t.employee_id),
      }));
  });

  public selectedMonthExitsListMapped = computed<HireExitRecord[]>(() => {
    return this.selectedMonthExitsList().map((x) => ({
      name: x.employee
        ? `${x.employee.first_name || ''} ${x.employee.father_name || ''}`.trim()
        : 'Sin nombre',
      branch_name: x.employee?.branch?.name,
      job_title: x.employee?.position?.name,
      date: x.date ? new Date(x.date).toISOString().split('T')[0] : undefined,
      reason: x.reason,
    }));
  });

  // Methods
  public getGenderCount(gender: 'M' | 'F'): number {
    return this.state.genderDistribution()[gender === 'M' ? 'male' : 'female'];
  }

  public getGenderPercentage(gender: 'M' | 'F'): number {
    const dist = this.state.genderDistribution();
    const total = dist.male + dist.female;
    if (total === 0) return 0;
    return Math.round(((gender === 'M' ? dist.male : dist.female) / total) * 100);
  }

  public getMonthlyLates(): number {
    return this.tardinessService.monthlyLatesCount();
  }

  public getTopLatesEmployeeName(): string {
    const topList = this.tardinessService.topLatesList();
    return topList.length > 0 ? topList[0].name || 'N/A' : 'N/A';
  }

  public getTopLatesCount(): number {
    const topList = this.tardinessService.topLatesList();
    return topList.length > 0 ? topList[0].count : 0;
  }

  public getTopAbsencesEmployeeName(): string {
    const topList = this.tardinessService.topAbsencesList();
    return topList.length > 0 ? topList[0].name || 'N/A' : 'N/A';
  }

  public getTopAbsencesCount(): number {
    const topList = this.tardinessService.topAbsencesList();
    return topList.length > 0 ? topList[0].count : 0;
  }

  public getHiresExitsCount(type: 'hires' | 'exits'): number {
    return this.homeData.monthlyHiresAndExits()[type];
  }

  public getWorkClimateIndex(): number {
    return this.tardinessService.workClimateIndex();
  }

  public getScheduleComplianceIndex(): number {
    return this.tardinessService.scheduleComplianceIndex();
  }

  public openBirthdaysDialog(): void {
    this.birthdaysDialogVisible.set(true);
  }

  public openHiresExitsDialog(): void {
    this.hiresExitsDialogVisible.set(true);
    this.hiresExitsTab.set('hires');
  }

  public openTopLatesDialog(): void {
    this.topLatesDialogVisible.set(true);
  }

  public openTopAbsencesDialog(): void {
    this.topAbsencesDialogVisible.set(true);
  }

  public handleHeadcountChartClick(event: any): void {
    if (event.active && event.active.length > 0) {
      const idx = event.active[0].index;
      const data: any = this.homeData.headcountTrendData();
      const labels = data?.labels || [];

      if (idx !== undefined && labels[idx]) {
        const label = labels[idx];
        this.openMonthHiresExitsDialog(label, idx);
      }
    }
  }

  public handleLatesChartClick(event: any): void {
    if (event.active && event.active.length > 0) {
      const idx = event.active[0].index;
      const { month } = getPanamaNowParts();
      const monthName = getMonthNameSpanish(month - 1);
      const dayNum = idx + 1;

      this.lateDialogTitle.set(`Tardanzas del ${dayNum} de ${monthName}`);

      const dailyLates = this.tardinessService.dailyLatesData();
      const dayData = dailyLates[idx];
      if (dayData && dayData.details) {
        this.lateDialogDetails.set(dayData.details);
      } else {
        this.lateDialogDetails.set([]);
      }

      this.lateDialogVisible.set(true);
    }
  }

  public openMonthHiresExitsDialog(monthLabel: string, monthIndex: number): void {
    this.selectedMonthLabel.set(monthLabel);
    this.selectedMonthIndex.set(monthIndex);
    this.monthHiresExitsDialogVisible.set(true);
    this.monthHiresExitsTab.set('hires');
  }
}
