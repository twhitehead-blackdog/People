import { CommonModule, CurrencyPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { endOfMonth, parseISO, startOfMonth } from 'date-fns';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';
import { getMonthNameSpanish, getPanamaNowParts } from '../utils/panama-date.utils';
import { Birthday } from './components/dialogs/birthdays-dialog.component';
import { HireExitRecord } from './components/dialogs/hires-exits-dialog.component';
import { LateDetail } from './components/dialogs/late-details-dialog.component';
import { TopLateRecord } from './components/dialogs/top-lates-dialog.component';
import { TopAbsenceRecord } from './components/dialogs/top-absences-dialog.component';
import {
  HEADCOUNT_CHART_OPTIONS,
  LATES_CHART_OPTIONS,
} from './config/chart-options.config';
import {
  ChartsSectionComponent,
  EventsSectionComponent,
  ExecutiveSectionComponent,
  FinancialSectionComponent,
  ManagementSectionComponent,
  StructureSectionComponent,
} from './sections';
import { HomeDataService } from './services/home-data.service';
import { TardinessCalculationService } from './services/tardiness-calculation.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    ExecutiveSectionComponent,
    FinancialSectionComponent,
    ManagementSectionComponent,
    StructureSectionComponent,
    ChartsSectionComponent,
    EventsSectionComponent,
  ],
  template: `
    <div class="dashboard-layout fade-in-up">
      <!-- Overlay para móvil cuando el sidebar está abierto -->
      @if (sidebarOpen()) {
      <div class="sidebar-overlay md:hidden" (click)="toggleSidebar()"></div>
      }
      <!-- Sidebar Navigation -->
      <aside class="dashboard-sidebar" [class.collapsed]="!sidebarOpen()">
        <div class="sidebar-header">
          <button
            class="sidebar-toggle min-w-[44px] min-h-[44px]"
            (click)="toggleSidebar()"
            [title]="sidebarOpen() ? 'Cerrar menú' : 'Abrir menú'"
          >
            <i [class]="sidebarOpen() ? 'pi pi-times' : 'pi pi-bars'"></i>
          </button>
        </div>
        <nav class="sidebar-nav">
          <button
            class="nav-item"
            [class.active]="activeSection() === 'executive'"
            (click)="selectSection('executive')"
            [title]="'Resumen'"
          >
            <i class="pi pi-chart-line"></i>
            <span [class.hidden]="!sidebarOpen()">Resumen</span>
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'financial'"
            (click)="selectSection('financial')"
            [title]="'Indicadores Financieros'"
          >
            <i class="pi pi-money-bill"></i>
            <span [class.hidden]="!sidebarOpen()">Indicadores Financieros</span>
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'management'"
            (click)="selectSection('management')"
            [title]="'Gestión de Personal'"
          >
            <i class="pi pi-user-plus"></i>
            <span [class.hidden]="!sidebarOpen()">Gestión de Personal</span>
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'structure'"
            (click)="selectSection('structure')"
            [title]="'Estructura Organizacional'"
          >
            <i class="pi pi-building"></i>
            <span [class.hidden]="!sidebarOpen()"
              >Estructura Organizacional</span
            >
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'charts'"
            (click)="selectSection('charts')"
            [title]="'Gráficos y Distribuciones'"
          >
            <i class="pi pi-chart-bar"></i>
            <span [class.hidden]="!sidebarOpen()"
              >Gráficos y Distribuciones</span
            >
          </button>
          <button
            class="nav-item"
            [class.active]="activeSection() === 'events'"
            (click)="selectSection('events')"
            [title]="'Eventos y Celebraciones'"
          >
            <i class="pi pi-calendar"></i>
            <span [class.hidden]="!sidebarOpen()">Eventos y Celebraciones</span>
          </button>
        </nav>
      </aside>

      <!-- Botón flotante para abrir sidebar en móvil -->
      <button
        class="mobile-sidebar-toggle"
        (click)="toggleSidebar()"
        [class.hidden]="sidebarOpen()"
        title="Abrir menú"
      >
        <i class="pi pi-bars"></i>
      </button>

      <main class="dashboard-container">
        <!-- Resumen Ejecutivo -->
        @if (activeSection() === 'executive') {
        <app-executive-section></app-executive-section>
        }

        <!-- Indicadores Financieros -->
        @if (activeSection() === 'financial') {
        <app-financial-section></app-financial-section>
        }

        <!-- Gestión de Personal -->
        @if (activeSection() === 'management') {
        <app-management-section></app-management-section>
        }

        <!-- Estructura Organizacional -->
        @if (activeSection() === 'structure') {
        <app-structure-section></app-structure-section>
        }

        <!-- Gráficos y Distribuciones -->
        @if (activeSection() === 'charts') {
        <app-charts-section></app-charts-section>
        }

        <!-- Eventos y Celebraciones -->
        @if (activeSection() === 'events') {
        <app-events-section></app-events-section>
        }
      </main>
    </div>
  `,
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  public state = inject(DashboardStore);
  public employees = inject(EmployeesStore);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);
  private homeData = inject(HomeDataService);
  public tardinessService = inject(TardinessCalculationService);

  // Inicializar sidebar como abierto en desktop, cerrado en móvil
  public sidebarOpen = signal(
    typeof window !== 'undefined' && window.innerWidth >= 769
  );
  public activeSection = signal('executive');

  // Computed para contar cumpleañeros del mes
  // Only calculate when executive or events section is active
  public monthlyBirthdaysCount = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      this.activeSection() !== 'events'
    ) {
      return 0;
    }
    return this.state.birthDates().length;
  });

  // Mapped birthdays list for dialog
  public birthdaysListMapped = computed<Birthday[]>(() => {
    return this.state.birthDates().map((x) => ({
      name: `${x.first_name || ''} ${x.father_name || ''}`.trim(),
      birth_date: x.birth_date
        ? new Date(x.birth_date).toISOString().split('T')[0]
        : undefined,
      branch_name: x.branch?.name,
    }));
  });

  // Calcular ingresos y salidas del mes
  // Only calculate when executive section is active
  public monthlyHiresAndExits = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { hires: 0, exits: 0 };
    }
    return this.homeData.monthlyHiresAndExits();
  });

  // Effect para verificar la respuesta de employeeSchedules
  constructor() {
    effect(() => {
      const schedules = this.homeData.employeeSchedulesResource.value();
      const error = this.homeData.employeeSchedulesResource.error();
      const isLoading = this.homeData.employeeSchedulesResource.isLoading();

      if (!isLoading && error) {
        console.error('[HomeComponent] employeeSchedules - Error:', error);
      }
    });
  }

  // Chart options are in config/chart-options.config.ts


  // Generate headcount trend by month/year (Moved to Service)
  public headcountChartData = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { labels: [], datasets: [] };
    }
    return this.homeData.headcountTrendData();
  });

  // Daily lates for current month (Moved to Service)
  public latesDailyChartData = computed(() => {
    return this.tardinessService.latesChartData();
  });

  public ageRanges = [
    { key: '18-25', label: '18-25 años' },
    { key: '26-35', label: '26-35 años' },
    { key: '36-45', label: '36-45 años' },
    { key: '46-55', label: '46-55 años' },
    { key: '56+', label: '56+ años' },
  ];

  public selectSection(sectionId: string): void {
    this.activeSection.set(sectionId);
    // Cerrar sidebar en móvil después de seleccionar una sección
    if (window.innerWidth < 769) {
      this.sidebarOpen.set(false);
    }
  }

  public toggleSidebar(): void {
    this.sidebarOpen.update((value) => !value);
  }

  public openBirthdaysDialog(): void {
    this.birthdaysDialogVisible.set(true);
  }

  public openHiresExitsDialog(): void {
    this.hiresExitsDialogVisible.set(true);
    this.hiresExitsTab.set('hires');
  }

  // Get monthly hires list
  // Only calculate when executive section is active or dialog is open
  public monthlyHiresList = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      !this.hiresExitsDialogVisible()
    ) {
      return [];
    }

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
        return (
          new Date(a.start_date).getTime() - new Date(b.start_date).getTime()
        );
      });
  });

  // Get monthly exits list
  // Only calculate when executive section is active or dialog is open
  // Get monthly exits list
  // Only calculate when executive section is active or dialog is open
  public monthlyExitsList = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      !this.hiresExitsDialogVisible()
    ) {
      return [];
    }

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

  public getBirthdayMonth(dateStr: string | Date | undefined): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date
      .toLocaleString('es-ES', { month: 'short' })
      .replace('.', '')
      .toUpperCase();
  }

  public getHireDate(date: Date | undefined): string {
    if (!date) return 'Sin fecha';
    const d = new Date(date);
    return `${d.getDate()} de ${this.getBirthdayMonth(date)}`;
  }

  public getExitDate(date: Date | string | undefined): string {
    if (!date) return 'Sin fecha';
    const d = new Date(date);
    return `${d.getDate()} de ${this.getBirthdayMonth(d)}`;
  }

  public openMonthHiresExitsDialog(
    monthLabel: string,
    monthIndex: number
  ): void {
    this.selectedMonthLabel.set(monthLabel);
    this.selectedMonthIndex.set(monthIndex);
    this.monthHiresExitsDialogVisible.set(true);
    this.monthHiresExitsTab.set('hires');
  }

  // Get hires list for selected month from headcount chart
  // Only calculate when executive section is active or dialog is open
  public selectedMonthHiresList = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      !this.monthHiresExitsDialogVisible()
    ) {
      return [];
    }

    const monthIndex = this.selectedMonthIndex();
    if (monthIndex < 0) return [];

    const data: any = this.homeData.headcountTrendData();
    const labels = data?.labels || [];
    if (monthIndex >= labels.length) return [];

    // Parse month/year from label (e.g., "Ene 2024")
    const label = labels[monthIndex];
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
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
        const startDate =
          startDateValue instanceof Date
            ? startDateValue
            : parseISO(startDateValue);
        return startDate >= monthStart && startDate <= monthEnd;
      })
      .map((x) => ({
        first_name: x.first_name,
        father_name: x.father_name,
        start_date: x.start_date,
        branch: x.branch,
        position: x.position,
      }))
      .sort((a, b) => {
        if (!a.start_date || !b.start_date) return 0;
        const aDate: Date | string = a.start_date as any;
        const bDate: Date | string = b.start_date as any;
        const aDateObj = aDate instanceof Date ? aDate : parseISO(aDate);
        const bDateObj = bDate instanceof Date ? bDate : parseISO(bDate);
        return aDateObj.getTime() - bDateObj.getTime();
      });
  });

  // Get exits list for selected month from headcount chart
  // Only calculate when executive section is active or dialog is open
  public selectedMonthExitsList = computed(() => {
    if (
      this.activeSection() !== 'executive' &&
      !this.monthHiresExitsDialogVisible()
    ) {
      return [];
    }

    const monthIndex = this.selectedMonthIndex();
    if (monthIndex < 0) return [];

    const data: any = this.homeData.headcountTrendData();
    const labels = data?.labels || [];
    if (monthIndex >= labels.length) return [];

    // Parse month/year from label (e.g., "Ene 2024")
    const label = labels[monthIndex];
    const monthNames = [
      'Ene',
      'Feb',
      'Mar',
      'Abr',
      'May',
      'Jun',
      'Jul',
      'Ago',
      'Sep',
      'Oct',
      'Nov',
      'Dic',
    ];
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
        const terminationDate =
          termDateValue instanceof Date
            ? termDateValue
            : parseISO(termDateValue);
        const termDateNormalized = new Date(
          terminationDate.getFullYear(),
          terminationDate.getMonth(),
          terminationDate.getDate()
        );
        const monthStartNormalized = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth(),
          monthStart.getDate()
        );
        const monthEndNormalized = new Date(
          monthEnd.getFullYear(),
          monthEnd.getMonth(),
          monthEnd.getDate()
        );
        return (
          termDateNormalized >= monthStartNormalized &&
          termDateNormalized <= monthEndNormalized
        );
      })
      .map((t) => ({
        date: t.date,
        reason: t.reason,
        employee: this.employees.entities().find((e) => e.id === t.employee_id),
      }))
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        const aDateValue: Date | string = a.date as any;
        const bDateValue: Date | string = b.date as any;
        const aDate =
          aDateValue instanceof Date ? aDateValue : parseISO(aDateValue);
        const bDate =
          bDateValue instanceof Date ? bDateValue : parseISO(bDateValue);
        return aDate.getTime() - bDate.getTime();
      });
  });

  // Mapped versions for dialog components
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

  public monthlyExitsListMapped = computed<HireExitRecord[]>(() => {
    return this.monthlyExitsList().map((x) => ({
      name: x.employee
        ? `${x.employee.first_name || ''} ${x.employee.father_name || ''}`.trim()
        : 'Sin nombre',
      branch_name: x.employee?.branch?.name,
      job_title: x.employee?.position?.name,
      date: x.date
        ? new Date(x.date).toISOString().split('T')[0]
        : undefined,
      reason: x.reason,
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

  public selectedMonthExitsListMapped = computed<HireExitRecord[]>(() => {
    return this.selectedMonthExitsList().map((x) => ({
      name: x.employee
        ? `${x.employee.first_name || ''} ${x.employee.father_name || ''}`.trim()
        : 'Sin nombre',
      branch_name: x.employee?.branch?.name,
      job_title: x.employee?.position?.name,
      date: x.date
        ? new Date(x.date).toISOString().split('T')[0]
        : undefined,
      reason: x.reason,
    }));
  });

  // Only calculate when structure section is active
  public branchLabels = computed(() => {
    if (this.activeSection() !== 'structure') {
      return [];
    }
    return this.state
      .employeesByBranch()
      .map((x) => x.branch?.name || 'Sin sucursal');
  });

  public branchData = computed(() => {
    if (this.activeSection() !== 'charts') {
      return [];
    }

    const counts = this.state.employeesByBranch().map((x) => x.count);
    const colors = this.generateCorporateColors(counts.length);
    return [
      {
        label: 'Empleados',
        data: counts,
        backgroundColor: colors.backgroundColor,
        borderColor: colors.borderColor,
        borderWidth: 2,
      },
    ];
  });

  public barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#18181b',
        titleColor: '#fbbf24',
        bodyColor: '#ffffff',
        borderColor: 'rgba(251, 191, 36, 0.5)',
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
          },
        },
        grid: {
          color: 'rgba(251, 191, 36, 0.1)',
        },
      },
      y: {
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
          font: {
            size: 12,
          },
        },
        grid: {
          color: 'rgba(251, 191, 36, 0.1)',
        },
      },
    },
  };

  // Computed signals for gender percentages
  public malePercentage = computed(() => {
    const total = this.state.headCount();
    if (total === 0) return 0;
    const count = this.state.countByGender()['M'] || 0;
    return Math.round((count / total) * 100);
  });

  public femalePercentage = computed(() => {
    const total = this.state.headCount();
    if (total === 0) return 0;
    const count = this.state.countByGender()['F'] || 0;
    return Math.round((count / total) * 100);
  });

  /**
   * Chart.js data for gender distribution donut chart
   * Returns data in Chart.js format with labels and datasets
   * Only calculate when executive section is active
   */
  public genderChartData = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { labels: [], datasets: [] };
    }

    const maleCount = this.state.countByGender()['M'] || 0;
    const femaleCount = this.state.countByGender()['F'] || 0;
    const total = maleCount + femaleCount;

    return {
      labels: ['Masculino', 'Femenino'],
      datasets: [
        {
          data: [maleCount, femaleCount],
          backgroundColor: ['#3b82f6', '#f472b6'],
          borderColor: ['#3b82f6', '#f472b6'],
          borderWidth: 0,
        },
      ],
    };
  });

  /**
   * Chart.js options for headcount trend chart
   */
  public headcountChartOptions = HEADCOUNT_CHART_OPTIONS;

  /**
   * Chart.js options for lates chart
   */
  public latesChartOptions = LATES_CHART_OPTIONS;

  /**
   * Chart.js options for semicircular donut chart
   * Configured to show only top half (semicircle)
   */
  public genderChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '85%',
    rotation: -90,
    circumference: 180,
    plugins: {
      legend: {
        display: false,
      },
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
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage =
              total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  /**
   * Chart.js data for hires/exits distribution donut chart
   * Returns data in Chart.js format with labels and datasets
   * Only calculate when executive section is active
   */
  public hiresExitsChartData = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { labels: [], datasets: [] };
    }

    const hires = this.monthlyHiresAndExits().hires;
    const exits = this.monthlyHiresAndExits().exits;

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

  /**
   * Chart.js options for semicircular donut chart (hires/exits)
   * Configured to show only top half (semicircle)
   */
  public hiresExitsChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '85%',
    rotation: -90,
    circumference: 180,
    plugins: {
      legend: {
        display: false,
      },
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
            const total = context.dataset.data.reduce(
              (a: number, b: number) => a + b,
              0
            );
            const percentage =
              total > 0 ? Math.round((value / total) * 100) : 0;
            return `${label}: ${context.raw} (${percentage}%)`;
          },
        },
      },
    },
  };

  // Helper methods for gender data
  public getGenderCount(gender: 'M' | 'F'): number {
    return this.state.countByGender()[gender] || 0;
  }

  public getGenderPercentage(gender: 'M' | 'F'): number {
    const maleCount = this.state.countByGender()['M'] || 0;
    const femaleCount = this.state.countByGender()['F'] || 0;
    const total = maleCount + femaleCount;

    if (total === 0) {
      return 0;
    }

    const count = gender === 'M' ? maleCount : femaleCount;
    return Math.round((count / total) * 100);
  }

  // Helper methods for hires/exits data
  public getHiresExitsCount(type: 'hires' | 'exits'): number {
    const data = this.monthlyHiresAndExits();
    return type === 'hires' ? data.hires : data.exits;
  }

  public getMonthlyLates(): number {
    return this.tardinessService.monthlyLatesCount();
  }

  // Calculate top employees with most lates
  public topLatesList = computed(() => {
    return this.tardinessService.topLatesList();
  });

  public topLatesListMapped = computed<TopLateRecord[]>(() =>
    this.topLatesList().map((item) => ({
      name: item.employeeName,
      count: item.lateCount,
    }))
  );

  public getTopLatesCount(): number {
    return this.tardinessService.topLatesCount();
  }

  public getTopLatesEmployeeName(): string {
    return this.tardinessService.topLatesEmployeeName();
  }

  public openTopLatesDialog(): void {
    this.topLatesDialogVisible.set(true);
  }

  // Calculate top employees with most absences
  public topAbsencesList = computed(() => {
    return this.tardinessService.topAbsencesList();
  });

  public getTopAbsencesCount(): number {
    const topList = this.tardinessService.topAbsencesList();
    return topList.length > 0 ? topList[0].count : 0;
  }

  public getTopAbsencesEmployeeName(): string {
    const topList = this.tardinessService.topAbsencesList();
    if (topList.length > 0) {
      const name = topList[0].employee_name;
      return name.length > 20 ? name.substring(0, 20) + '...' : name;
    }
    return 'Ninguno';
  }

  public openTopAbsencesDialog(): void {
    this.topAbsencesDialogVisible.set(true);
  }

  public getScheduleComplianceIndex(): number {
    // Placeholder: índice de cumplimiento de horario
    // En una implementación real, esto se calcularía basado en:
    // - Registros de entrada/salida vs horarios programados
    // - Tardanzas
    const lates = this.getMonthlyLates();
    const totalEmployees = this.state.headCount();

    if (totalEmployees === 0) return 100;

    // Cálculo aproximado: 100% menos tardanzas
    const latesPercentage = (lates / totalEmployees) * 100;
    const compliance = Math.max(0, 100 - latesPercentage);
    return Math.round(compliance);
  }

  public getWorkClimateIndex(): number {
    // Placeholder: índice de clima laboral
    // En una implementación real, esto vendría de encuestas de satisfacción
    // Por ahora, calculamos un índice basado en otros KPIs:
    const retention = this.state.retentionRate();
    const exits = this.monthlyHiresAndExits().exits;
    const totalEmployees = this.state.headCount();
    const absenteeism = totalEmployees > 0 ? (exits / totalEmployees) * 100 : 0;
    const turnover = this.state.monthlyTurnover();

    // Índice aproximado basado en retención alta, ausentismo bajo y rotación baja
    const baseIndex = retention;
    const absenteeismPenalty = absenteeism * 0.5; // Penalización por ausentismo
    const turnoverPenalty = turnover * 0.3; // Penalización por rotación

    const climateIndex = Math.max(
      0,
      Math.min(100, baseIndex - absenteeismPenalty - turnoverPenalty)
    );
    return Math.round(climateIndex);
  }

  public getAgeCount(range: string): number {
    const distribution = this.state.ageDistribution() as Record<string, number>;
    return distribution[range] || 0;
  }

  public getAgePercentage(range: string): number {
    const total = this.state.headCount();
    if (total === 0) return 0;
    const count = this.getAgeCount(range);
    return Math.round((count / total) * 100);
  }

  public getContractPercentage(type: 'fixed' | 'temporary'): number {
    const distribution = this.state.contractDistribution();
    const total = distribution.fixed + distribution.temporary;
    if (total === 0) return 0;
    return Math.round((distribution[type] / total) * 100);
  }

  public currentMonth = computed(() => {
    const months = [
      'enero',
      'febrero',
      'marzo',
      'abril',
      'mayo',
      'junio',
      'julio',
      'agosto',
      'septiembre',
      'octubre',
      'noviembre',
      'diciembre',
    ];
    return months[new Date().getMonth()];
  });

  public getBirthdayDay(date: Date | undefined): string {
    if (!date) return '??';
    return new Date(date).getDate().toString();
  }

  public hasBirthdayPassed(date: Date | undefined): boolean {
    if (!date) return false;
    const today = new Date();
    const birthDate = new Date(date);
    return (
      birthDate.getDate() < today.getDate() &&
      birthDate.getMonth() === today.getMonth()
    );
  }

  public isBirthdayToday(date: Date | undefined): boolean {
    if (!date) return false;
    const today = new Date();
    const birthDate = new Date(date);
    return (
      birthDate.getDate() === today.getDate() &&
      birthDate.getMonth() === today.getMonth()
    );
  }



  private generateCorporateColors(count: number): {
    backgroundColor: string[];
    borderColor: string[];
  } {
    const baseColors = [
      { bg: 'rgba(251, 191, 36, 0.2)', border: 'rgba(251, 191, 36, 0.8)' },
      { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.7)' },
      { bg: 'rgba(251, 191, 36, 0.1)', border: 'rgba(251, 191, 36, 0.6)' },
    ];

    const backgroundColor: string[] = [];
    const borderColor: string[] = [];

    for (let i = 0; i < count; i++) {
      const color = baseColors[i % baseColors.length];
      backgroundColor.push(color.bg);
      borderColor.push(color.border);
    }

    return { backgroundColor, borderColor };
  }

  // Late details dialog state
  public lateDialogVisible = signal(false);
  public lateDialogTitle = signal('Tardanzas');
  public lateDialogDetails = signal<
    {
      name: string;
      scheduledEntry?: string;
      actualEntry?: string;
      minutesLate?: number;
    }[]
  >([]);

  // Birthdays dialog state
  public birthdaysDialogVisible = signal(false);

  // Hires and Exits Dialog
  public hiresExitsDialogVisible = signal(false);
  public hiresExitsTab = signal<'hires' | 'exits'>('hires');

  // Month-specific Hires and Exits Dialog
  public monthHiresExitsDialogVisible = signal(false);
  public monthHiresExitsTab = signal<'hires' | 'exits'>('hires');
  public selectedMonthLabel = signal<string>('');
  public selectedMonthIndex = signal<number>(-1);

  // Top Lates Dialog
  public topLatesDialogVisible = signal(false);

  // Top Absences Dialog
  public topAbsencesDialogVisible = signal(false);

  public handleLatesChartClick(event: {
    event?: Event;
    active?: any[];
  }): void {
    const active = event?.active || [];
    if (active && active.length > 0) {
      const idx = active[0].index;
      const data: any = this.tardinessService.latesChartData();

      if (data && data.datasets && data.datasets.length > 0) {
        const ds: any = data.datasets[0];
        const details = (ds?.customDetails?.[idx] ?? []) as any[];

        const sortedDetails = [...details].sort((a, b) => {
          const aMinutes = a.minutesLate ?? 0;
          const bMinutes = b.minutesLate ?? 0;
          return bMinutes - aMinutes;
        });

        const dayNum = idx + 1;
        const { month } = getPanamaNowParts();
        const monthName = getMonthNameSpanish(month - 1);
        const title = `Tardanzas - Día ${dayNum} ${monthName}`;

        this.lateDialogTitle.set(title);
        this.lateDialogDetails.set(sortedDetails);
        this.lateDialogVisible.set(true);
      }
    }
  }

  public handleHeadcountChartClick(event: {
    event?: Event;
    active?: any[];
  }): void {
    const active = event?.active || [];
    if (active && active.length > 0) {
      const idx = active[0].index;
      const data: any = this.homeData.headcountTrendData();
      const labels = data?.labels || [];

      if (idx !== undefined && labels[idx]) {
        const label = labels[idx];
        this.openMonthHiresExitsDialog(label, idx);
      }
    }
  }
}
