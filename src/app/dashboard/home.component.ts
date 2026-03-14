import { CommonModule } from '@angular/common';
import { httpResource } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  signal,
} from '@angular/core';
import {
  differenceInMinutes,
  eachMonthOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';

// New Components
import { BirthdaysDialogComponent } from './home/components/dialogs/birthdays-dialog.component';
import { HiresExitsDialogComponent } from './home/components/dialogs/hires-exits-dialog.component';
import { LateDetailsDialogComponent } from './home/components/dialogs/late-details-dialog.component';
import { TopAbsencesDialogComponent } from './home/components/dialogs/top-absences-dialog.component';
import { TopLatesDialogComponent } from './home/components/dialogs/top-lates-dialog.component';
import { HomeSidebarComponent } from './home/components/home-sidebar/home-sidebar.component';
import { ChartsSectionComponent } from './home/components/sections/charts-section.component';
import { EventsSectionComponent } from './home/components/sections/events-section.component';
import { ExecutiveSectionComponent } from './home/components/sections/executive-section.component';
import { FinancialSectionComponent } from './home/components/sections/financial-section.component';
import { ManagementSectionComponent } from './home/components/sections/management-section.component';
import { StructureSectionComponent } from './home/components/sections/structure-section.component';

@Component({
  selector: 'pt-home',
  standalone: true,
  imports: [
    CommonModule,
    HomeSidebarComponent,
    ExecutiveSectionComponent,
    FinancialSectionComponent,
    StructureSectionComponent,
    ChartsSectionComponent,
    EventsSectionComponent,
    ManagementSectionComponent,
    BirthdaysDialogComponent,
    HiresExitsDialogComponent,
    LateDetailsDialogComponent,
    TopLatesDialogComponent,
    TopAbsencesDialogComponent,
  ],
  template: ` <div class="dashboard-wrapper">
    @if (sidebarOpen()) {
    <div class="sidebar-overlay md:hidden" (click)="toggleSidebar()"></div>
    }

    <pt-home-sidebar
      [isOpen]="sidebarOpen()"
      [activeSection]="activeSection()"
      (sectionChange)="selectSection($event)"
      (toggleSidebar)="toggleSidebar()"
    ></pt-home-sidebar>

    <button
      class="mobile-sidebar-toggle"
      (click)="toggleSidebar()"
      [class.hidden]="sidebarOpen()"
      title="Alternar menú"
    >
      <i class="pi pi-bars"></i>
    </button>

    <main class="dashboard-container">
      @switch (activeSection()) { @case ('executive') {
      <pt-executive-section
        [headcountChartData]="headcountChartData()"
        [headcountChartOptions]="headcountChartOptions"
        [genderChartData]="genderChartData()"
        [genderChartOptions]="genderChartOptions"
        [genderCounts]="{
          male: getGenderCount('M'),
          female: getGenderCount('F')
        }"
        [genderPercentages]="{
          male: getGenderPercentage('M'),
          female: getGenderPercentage('F')
        }"
        [monthlyLates]="getMonthlyLates()"
        [latesDailyChartData]="latesDailyChartData()"
        [latesChartOptions]="latesChartOptions"
        [topLatesCount]="getTopLatesCount()"
        [topLatesEmployeeName]="getTopLatesEmployeeName()"
        [topAbsencesCount]="getTopAbsencesCount()"
        [topAbsencesEmployeeName]="getTopAbsencesEmployeeName()"
        [monthlyBirthdaysCount]="monthlyBirthdaysCount()"
        [hiresExitsChartData]="hiresExitsChartData()"
        [hiresExitsChartOptions]="hiresExitsChartOptions"
        [hiresExitsCounts]="{
          hires: getHiresExitsCount('hires'),
          exits: getHiresExitsCount('exits')
        }"
        [workClimateIndex]="getWorkClimateIndex()"
        [scheduleComplianceIndex]="getScheduleComplianceIndex()"
        (openTopLates)="openTopLatesDialog()"
        (openTopAbsences)="openTopAbsencesDialog()"
        (openHiresExits)="openCurrentMonthHiresExitsDialog()"
        (openBirthdays)="openBirthdaysDialog()"
      ></pt-executive-section>
      } @case ('financial') {
      <pt-financial-section></pt-financial-section>
      } @case ('structure') {
      <pt-structure-section></pt-structure-section>
      } @case ('charts') {
      <pt-charts-section
        [branchData]="branchData()"
        [branchLabels]="branchLabels()"
        [barChartOptions]="barChartOptions"
        [ageRanges]="ageRanges"
      ></pt-charts-section>
      } @case ('events') {
      <pt-events-section [currentMonth]="currentMonth()"></pt-events-section>
      } @case ('management') {
      <pt-management-section></pt-management-section>
      } }

      <!-- Dialogs -->
      <pt-birthdays-dialog
        [(visible)]="birthdaysDialogVisible"
        [birthDates]="state.birthDates()"
      ></pt-birthdays-dialog>

      <!-- Month Specific Hires/Exits (from chart click) -->
      <pt-hires-exits-dialog
        [(visible)]="monthHiresExitsDialogVisible"
        [hires]="selectedMonthHiresList()"
        [exits]="selectedMonthExitsList()"
        [headerTitle]="'Ingresos y Salidas - ' + selectedMonthLabel()"
      ></pt-hires-exits-dialog>

      <!-- General Hires/Exits (from widget click if any) -->
      <!-- Note: If home component logic doesn't distinguish, we bind both to same or different logic. Widget click in Executive actually emits openHiresExits which could trigger this generic one or openMonthDialog with current month? The logic will clarify. -->

      <pt-late-details-dialog
        [(visible)]="lateDialogVisible"
        [details]="lateDialogDetails()"
        [headerTitle]="lateDialogTitle()"
      ></pt-late-details-dialog>

      <pt-top-lates-dialog
        [(visible)]="topLatesDialogVisible"
        [list]="topLatesList()"
      ></pt-top-lates-dialog>

      <pt-top-absences-dialog
        [(visible)]="topAbsencesDialogVisible"
        [list]="topAbsencesList()"
      ></pt-top-absences-dialog>
    </main>
  </div>`,
  styles: [
    `
      :host {
        display: block;
        height: 100vh;
        overflow: hidden;
      }
    `,
  ],
  styleUrls: ['./home/home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent {
  private readonly TIMEZONE = 'America/Panama';

  private pad2(n: number): string {
    return String(n).padStart(2, '0');
  }

  private getPanamaNowParts(): { year: number; month: number; day: number } {
    const now = new Date();
    const year = parseInt(formatInTimeZone(now, this.TIMEZONE, 'yyyy'), 10);
    const month = parseInt(formatInTimeZone(now, this.TIMEZONE, 'MM'), 10); // 1-12
    const day = parseInt(formatInTimeZone(now, this.TIMEZONE, 'd'), 10);
    return { year, month, day };
  }

  private getDaysInMonth(year: number, month: number): number {
    // month: 1-12
    return new Date(Date.UTC(year, month, 0)).getUTCDate();
  }
  public state = inject(DashboardStore);
  public employees = inject(EmployeesStore);
  private apiUrl = inject(ApiUrlService);
  private organizationService = inject(OrganizationService);

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

  // API resource para obtener todas las terminaciones (necesario para cálculo histórico)
  public terminationsApi = httpResource<any[]>(() => {
    const baseUrl = this.apiUrl.baseUrl;
    // Obtener todas las terminaciones, no solo del mes actual
    const url = `${baseUrl}/rest/v1/terminations?select=date,reason,employee_id&order=date.asc`;
    return {
      url,
      method: 'GET',
    };
  });

  // Calcular ingresos y salidas del mes
  // Only calculate when executive section is active
  public monthlyHiresAndExits = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { hires: 0, exits: 0 };
    }

    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);

    // Empleados que ingresaron este mes (start_date en el mes actual)
    const hires = this.employees
      .entities()
      .filter(
        (x) =>
          x.start_date &&
          new Date(x.start_date) >= monthStart &&
          new Date(x.start_date) <= monthEnd
      ).length;

    // Empleados que salieron este mes - usar tabla terminations
    const terminations = this.terminationsApi.value() ?? [];
    const exits = terminations.filter((t) => {
      if (!t.date) return false;
      const terminationDate = new Date(t.date);
      return terminationDate >= monthStart && terminationDate <= monthEnd;
    }).length;

    return {
      hires,
      exits,
    };
  });

  // NOTA: Estas APIs usan vistas v_lates_daily y v_lates_daily_detail que dependen de attendance_sheets
  // Las vistas solo tienen datos hasta 2025-07-26 y no se están actualizando.
  // El código ahora usa latesFromTimelogs que consulta directamente timelogs en tiempo real.
  // Estas APIs se mantienen comentadas por si se necesitan en el futuro, pero NO se usan actualmente.

  // public latesDailyApi = httpResource<any[]>(() => {
  //   const baseUrl = process.env['ENV_SUPABASE_URL']!;
  //   const now = new Date();
  //   const from = format(startOfMonth(now), 'yyyy-MM-dd');
  //   const to = format(
  //     new Date(now.getFullYear(), now.getMonth() + 1, 0),
  //     'yyyy-MM-dd'
  //   );
  //   // PostgREST: use range operator for date filtering
  //   // Build URL with both filters manually since URLSearchParams doesn't handle duplicates well
  //   const url = `${baseUrl}/rest/v1/v_lates_daily?select=*&order=work_date.asc&work_date=gte.${from}&work_date=lte.${to}`;
  //   console.log(
  //     '[Tardanzas API] latesDailyApi URL:',
  //     url,
  //     'from:',
  //     from,
  //     'to:',
  //     to
  //   );
  //   return {
  //     url,
  //     method: 'GET',
  //   };
  // });

  // public latesNamesApi = httpResource<any[]>(() => {
  //   const baseUrl = process.env['ENV_SUPABASE_URL']!;
  //   const now = new Date();
  //   const from = format(startOfMonth(now), 'yyyy-MM-dd');
  //   const to = format(
  //     new Date(now.getFullYear(), now.getMonth() + 1, 0),
  //     'yyyy-MM-dd'
  //   );
  //   // PostgREST: build URL manually with both date filters
  //   const url = `${baseUrl}/rest/v1/v_lates_daily_detail?select=work_date,employee_name,minutes_late&order=work_date.asc,employee_name.asc&work_date=gte.${from}&work_date=lte.${to}`;
  //   console.log(
  //     '[Tardanzas API] latesNamesApi URL:',
  //     url,
  //     'from:',
  //     from,
  //     'to:',
  //     to
  //   );
  //   return {
  //     url,
  //     method: 'GET',
  //   };
  // });

  // Calculate tardiness from timelogs + schedules (real-time, no need for attendance_sheets)
  public latesFromTimelogs = httpResource<any[]>(() => {
    const baseUrl = this.apiUrl.baseUrl;
    // Rango en Panamá (no depende del timezone del dispositivo) y convertido a UTC ISO para PostgREST
    const { year, month, day } = this.getPanamaNowParts();
    const fromPanama = `${year}-${this.pad2(month)}-01T00:00:00-05:00`;
    const toPanama = `${year}-${this.pad2(month)}-${this.pad2(
      day
    )}T23:59:59-05:00`;
    const from = new Date(fromPanama).toISOString().split('.')[0] + 'Z';
    const to = new Date(toPanama).toISOString().split('.')[0] + 'Z';

    // Query timelogs for entry times (type = 'entry')
    // Build URL manually because we need multiple filters on created_at
    // Include 'type' field in select to ensure it's available in the response
    // IMPORTANTE: Usar limit=5000 para optimizar rendimiento (Supabase limita a 1000 por defecto)
    // El interceptor HTTP agregará el header Range automáticamente para peticiones a timelogs
    const companyId = this.organizationService.getCurrentCompanyId();
    let url = `${baseUrl}/rest/v1/timelogs?select=created_at,employee_id,type,employee:employees!timelogs_employee_id_fkey!inner(first_name,father_name,is_active)&type=eq.entry&created_at=gte.${from}&created_at=lte.${to}&order=created_at.asc&limit=5000`;

    // Filtrar solo empleados activos
    url += `&employee.is_active=eq.true`;

    // Agregar filtro por company_id
    if (companyId) {
      url += `&company_id=eq.${companyId}`;
    }

    // Debug logs solo en desarrollo
    if (
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      console.log('[HomeComponent] latesFromTimelogs URL:', url);
      console.log('[HomeComponent] Company ID:', companyId);
      console.log('[HomeComponent] Date range:', from, 'to', to);
    }

    return {
      url,
      method: 'GET',
    };
  });

  public employeeSchedules = httpResource<any[]>(() => {
    const baseUrl = this.apiUrl.baseUrl;
    // Mes actual en Panamá (date-only), para que el mes no cambie por timezone del dispositivo
    const { year, month } = this.getPanamaNowParts();
    const daysInMonth = this.getDaysInMonth(year, month);
    const monthStart = `${year}-${this.pad2(month)}-01`;
    const monthEnd = `${year}-${this.pad2(month)}-${this.pad2(daysInMonth)}`;

    // Query employee schedules that overlap with the current month
    // A schedule overlaps if: start_date <= month_end AND end_date >= month_start
    // Esto captura TODOS los horarios que se solapan con cualquier día del mes
    const companyId = this.organizationService.getCurrentCompanyId();

    // ESTRATEGIA: Filtrar employee_schedules por company_id de dos formas:
    // 1. Si employee_schedules tiene company_id, usar filtro directo
    // 2. Si no, filtrar a través de employees usando INNER JOIN (!inner)
    // Usaremos ambas estrategias: primero intentar con company_id directo,
    // y si no hay resultados, usar el filtro a través de employees

    let url = `${baseUrl}/rest/v1/employee_schedules?select=*,schedule:schedules(*),employee:employees!employee_schedule_employee_id_fkey!inner(id,company_id,is_active)`;
    url += `&start_date=lte.${monthEnd}&end_date=gte.${monthStart}`;

    // Filtrar solo empleados activos
    url += `&employee.is_active=eq.true`;

    // ESTRATEGIA: Filtrar a través de employees usando INNER JOIN
    // Esto funciona incluso si employee_schedules no tiene company_id asignado
    // PostgREST permite usar !inner para hacer INNER JOIN y filtrar por la relación
    // Sintaxis: employee:employees!inner(company_id=eq.xxx) hace un INNER JOIN y filtra
    if (companyId) {
      // Usar INNER JOIN para filtrar employee_schedules por el company_id del employee
      // Esto garantiza que solo retornemos employee_schedules donde el employee tenga el company_id correcto
      // Funciona incluso si employee_schedules no tiene company_id asignado directamente
      url += `&employee.company_id=eq.${companyId}`;

      // NOTA: También podríamos intentar con company_id directo si employee_schedules lo tiene
      // Pero PostgREST no soporta OR fácilmente, así que usamos el filtro a través de employees como principal
      // Si algunos employee_schedules tienen company_id y otros no, esta consulta los incluirá todos
      // siempre que el employee tenga el company_id correcto
    }

    // Debug logs solo en desarrollo
    if (
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      console.log('[HomeComponent] employeeSchedules URL:', url);
      console.log('[HomeComponent] employeeSchedules - Company ID:', companyId);
      console.log(
        '[HomeComponent] employeeSchedules - Month range:',
        monthStart,
        'to',
        monthEnd
      );
      console.log(
        '[HomeComponent] employeeSchedules - Estrategia: Filtrando a través de employee.company_id'
      );
    }

    return {
      url,
      method: 'GET',
    };
  });

  private injector = inject(Injector);

  // Effect para verificar la respuesta de employeeSchedules
  constructor() {
    effect(
      () => {
        const schedules = this.employeeSchedules.value();
        const error = this.employeeSchedules.error();
        const isLoading = this.employeeSchedules.isLoading();
        const companyId = this.organizationService.getCurrentCompanyId();

        if (!isLoading) {
          if (error) {
            console.error('[HomeComponent] employeeSchedules - Error:', error);
          } else if (schedules) {
            if (
              typeof window !== 'undefined' &&
              window.location.hostname === 'localhost'
            ) {
              // Solo log en desarrollo
              if (
                typeof window !== 'undefined' &&
                window.location.hostname === 'localhost'
              ) {
                console.log(
                  '[HomeComponent] employeeSchedules - Respuesta recibida:',
                  schedules.length,
                  'schedules'
                );
                if (schedules.length === 0) {
                  console.warn(
                    '[HomeComponent] employeeSchedules - No hay schedules. Verificar:'
                  );
                  console.warn('  - Company ID:', companyId);
                  // No mostrar URL completa en producción para evitar exponer información de la base de datos
                  if (
                    window.location.hostname === 'localhost' ||
                    window.location.hostname === '127.0.0.1'
                  ) {
                    console.warn(
                      '  - URL completa:',
                      `${
                        this.apiUrl.baseUrl
                      }/rest/v1/employee_schedules?select=*,schedule:schedules(*)&start_date=lte.${format(
                        endOfMonth(new Date()),
                        'yyyy-MM-dd'
                      )}&end_date=gte.${format(
                        startOfMonth(new Date()),
                        'yyyy-MM-dd'
                      )}&company_id=eq.${companyId}`
                    );
                  }
                  console.warn('  - Posibles causas:');
                  console.warn(
                    '    1. No hay employee_schedules con este company_id'
                  );
                  console.warn(
                    '    2. Los schedules no se solapan con el mes actual'
                  );
                  console.warn('    3. Problema con políticas RLS en Supabase');
                } else {
                  console.log(
                    '[HomeComponent] employeeSchedules - Muestra (primeros 3):',
                    schedules.slice(0, 3).map((s) => ({
                      id: s.id,
                      employee_id: s.employee_id,
                      company_id: s.company_id,
                      start_date: s.start_date,
                      end_date: s.end_date,
                      schedule: s.schedule
                        ? { id: s.schedule.id, name: s.schedule.name }
                        : null,
                    }))
                  );
                }
              }
            }
          }
        }
      },
      { injector: this.injector }
    );
  }

  // Chart options specifically for headcount chart (shows month/year)
  public get headcountChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#18181b',
          titleColor: '#fbbf24',
          bodyColor: '#ffffff',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx: any) => {
              const y = ctx.parsed?.y ?? ctx.parsed ?? 0;
              const label = ctx.dataset?.label || 'Empleados';
              return `${label}: ${y}`;
            },
            title: (ctx: any) => {
              // Show month/year from chart labels
              const chart = ctx[0]?.chart;
              if (chart && chart.data && chart.data.labels) {
                const index = ctx[0]?.dataIndex;
                if (index !== undefined && chart.data.labels[index]) {
                  return chart.data.labels[index];
                }
              }
              // Fallback: get from computed
              const data: any = this.headcountChartData();
              const labels = data?.labels || [];
              const index = ctx[0]?.dataIndex;
              if (index !== undefined && labels[index]) {
                return labels[index];
              }
              return '';
            },
          },
        },
      },
      scales: {
        x: {
          display: false,
          grid: { display: false },
        },
        y: {
          display: false,
          beginAtZero: false,
          grid: { display: false },
        },
      },
      elements: {
        line: {
          tension: 0.4,
          borderWidth: 3,
          borderJoinStyle: 'round',
          borderCapStyle: 'round',
        },
        point: {
          radius: 0,
          hoverRadius: 6,
          hitRadius: 10,
          hoverBorderWidth: 2,
        },
      },
      onClick: (evt: any, active: any[]) => {
        // Handle click on headcount chart to show hires/exits for that month
        if (active && active.length > 0) {
          const idx = active[0].index;
          const data: any = this.headcountChartData();
          const labels = data?.labels || [];

          if (idx !== undefined && labels[idx]) {
            // Parse the month/year from label (e.g., "Ene 2024")
            const label = labels[idx];
            this.openMonthHiresExitsDialog(label, idx);
          }
        }
      },
    };
  }

  // Chart options for Tardanzas del Mes - Same style as headcount chart
  public get latesChartOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#18181b',
          titleColor: '#fbbf24',
          bodyColor: '#ffffff',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx: any) => {
              const y = ctx.parsed?.y ?? ctx.parsed ?? 0;
              const label = ctx.dataset?.label || 'Tardanzas';
              return `${label}: ${y}`;
            },
            afterLabel: (ctx: any) => {
              const names: string[] | undefined = (ctx.dataset as any)
                ?.customNames?.[ctx.dataIndex];
              if (!names || names.length === 0) return '';
              return names.map((n) => ` ${n}`);
            },
            title: (ctx: any) => {
              const dayNum = ctx[0]?.dataIndex + 1;
              const { month } = this.getPanamaNowParts();
              const monthName = this.getMonthNameSpanish(month - 1);
              return `Día ${dayNum} ${monthName}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: false,
          grid: { display: false },
        },
        y: {
          display: false,
          beginAtZero: false,
          grid: { display: false },
        },
      },
      elements: {
        line: {
          tension: 0.4,
          borderWidth: 3,
          borderJoinStyle: 'round',
          borderCapStyle: 'round',
        },
        point: {
          radius: 0,
          hoverRadius: 6,
          hitRadius: 10,
          hoverBorderWidth: 2,
        },
      },
      onClick: (evt: any, active: any[]) => {
        if (active && active.length > 0) {
          const idx = active[0].index;
          const data: any = this.latesDailyChartData();

          if (data && data.datasets && data.datasets.length > 0) {
            const ds: any = data.datasets[0];
            const details = (ds?.customDetails?.[idx] ?? []) as any[];

            const sortedDetails = [...details].sort((a, b) => {
              const aMinutes = a.minutesLate ?? 0;
              const bMinutes = b.minutesLate ?? 0;
              return bMinutes - aMinutes;
            });

            const dayNum = idx + 1;
            const { month } = this.getPanamaNowParts();
            const monthName = this.getMonthNameSpanish(month - 1);
            const title = `Tardanzas - Día ${dayNum} ${monthName}`;

            this.lateDialogTitle.set(title);
            this.lateDialogDetails.set(sortedDetails);
            this.lateDialogVisible.set(true);
          }
        }
      },
    };
  }

  // Mini line chart options for KPI sparkline - Improved with better styling
  public get sparklineOptions(): any {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1000,
        easing: 'easeInOutQuart',
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: '#18181b',
          titleColor: '#fbbf24',
          bodyColor: '#ffffff',
          borderColor: 'rgba(251, 191, 36, 0.3)',
          borderWidth: 1,
          padding: 12,
          displayColors: false,
          callbacks: {
            label: (ctx: any) => {
              const y = ctx.parsed?.y ?? ctx.parsed ?? 0;
              const label = ctx.dataset?.label;
              return label ? `${label}: ${y}` : `${y}`;
            },
            afterLabel: (ctx: any) => {
              const names: string[] | undefined = (ctx.dataset as any)
                ?.customNames?.[ctx.dataIndex];
              if (!names || names.length === 0) return '';
              // Return full list (one name per line)
              return names.map((n) => ` ${n}`);
            },
            title: (ctx: any) => {
              // Show month/year in title for headcount chart
              const data: any = this.headcountChartData();
              const labels = data?.labels || [];
              const index = ctx[0]?.dataIndex;
              if (index !== undefined && labels[index]) {
                return labels[index];
              }
              // Fallback for other charts (like lates)
              const dayNum = ctx[0]?.dataIndex + 1;
              return `Día ${dayNum}`;
            },
          },
        },
      },
      scales: {
        x: {
          display: false,
          grid: { display: false },
        },
        y: {
          display: false,
          beginAtZero: false,
          grid: { display: false },
        },
      },
      elements: {
        line: {
          tension: 0.4,
          borderWidth: 3,
          borderJoinStyle: 'round',
          borderCapStyle: 'round',
        },
        point: {
          radius: 0,
          hoverRadius: 6,
          hitRadius: 10,
          hoverBorderWidth: 2,
        },
      },
      onClick: (evt: any, active: any[]) => {
        // Handle click directly in options
        if (active && active.length > 0) {
          const idx = active[0].index;
          const data: any = this.latesDailyChartData();

          if (data && data.datasets && data.datasets.length > 0) {
            const ds: any = data.datasets[0];
            const labels: any[] = data.labels || [];
            const details = (ds?.customDetails?.[idx] ?? []) as any[];

            // Sort details by minutesLate descending (highest first)
            const sortedDetails = [...details].sort((a, b) => {
              const aMinutes = a.minutesLate ?? 0;
              const bMinutes = b.minutesLate ?? 0;
              return bMinutes - aMinutes; // Descending order
            });

            // Format title: "Día 1 Nov"
            const dayNum = idx + 1;
            const { month } = this.getPanamaNowParts();
            const monthName = this.getMonthNameSpanish(month - 1);
            const title = `Tardanzas - Día ${dayNum} ${monthName}`;

            this.lateDialogTitle.set(title);
            this.lateDialogDetails.set(sortedDetails);
            this.lateDialogVisible.set(true);
          }
        }
      },
    };
  }

  // Generate headcount trend by month/year based on actual employee start dates
  // Only calculate when executive section is active
  public headcountChartData = computed(() => {
    if (this.activeSection() !== 'executive') {
      return { labels: [], datasets: [] };
    }

    const employees = this.employees.entities();
    const terminations = this.terminationsApi.value() ?? [];
    const now = new Date();
    const currentMonthStart = startOfMonth(now);

    // Get the start of the current month and go back 24 months
    const endDate = startOfMonth(now);
    const startDate = subMonths(endDate, 23);

    // Generate array of months
    const months = eachMonthOfInterval({ start: startDate, end: endDate });

    // Calculate headcount for each month
    const data: number[] = [];
    const labels: string[] = [];

    for (const month of months) {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthStartTimestamp = new Date(
        monthStart.getFullYear(),
        monthStart.getMonth(),
        monthStart.getDate(),
        0,
        0,
        0,
        0
      ).getTime();
      const monthEndTimestamp = new Date(
        monthEnd.getFullYear(),
        monthEnd.getMonth(),
        monthEnd.getDate(),
        23,
        59,
        59,
        999
      ).getTime();
      const isCurrentOrFutureMonth =
        month.getTime() >= currentMonthStart.getTime();

      // Count employees who were active at the end of this specific month/year
      const headcount = employees.filter((emp) => {
        // ============================================
        // CASE 1: CURRENT OR FUTURE MONTHS
        // ============================================
        // For current/future months, use is_active flag as source of truth
        // This ensures consistency with state.headCount()
        if (isCurrentOrFutureMonth) {
          // Only count employees who are currently active
          return emp.is_active === true;
        }

        // ============================================
        // CASE 2: PAST MONTHS
        // ============================================
        // For past months, calculate based on start_date and termination dates
        // An employee was active at the end of a past month if:
        // 1. They started on or before the last day of that month
        // 2. They were NOT terminated on or before the last day of that month

        // If employee has no start_date, we cannot determine if they were active in past months
        if (!emp.start_date) {
          return false;
        }

        // Parse start_date (handle both Date objects and ISO strings)
        let empStartDate: Date;
        try {
          const startDateValue: Date | string = emp.start_date as any;
          if (startDateValue instanceof Date) {
            empStartDate = startDateValue;
          } else if (typeof startDateValue === 'string') {
            empStartDate = parseISO(startDateValue);
          } else {
            return false; // Invalid start_date format
          }
        } catch (error) {
          return false; // Failed to parse start_date
        }

        // Normalize start_date to start of day for comparison
        const empStartTimestamp = new Date(
          empStartDate.getFullYear(),
          empStartDate.getMonth(),
          empStartDate.getDate(),
          0,
          0,
          0,
          0
        ).getTime();

        // Employee must have started on or before the last day of this month
        // If they started after this month, they cannot be counted
        if (empStartTimestamp > monthEndTimestamp) {
          return false;
        }

        // Now check if employee was terminated before or during this month
        // Check termination date from terminations table first
        const termination = terminations.find((t) => t.employee_id === emp.id);
        if (termination && termination.date) {
          try {
            const termDateValue: Date | string = termination.date as any;
            let termDate: Date | null = null;
            if (termDateValue instanceof Date) {
              termDate = termDateValue;
            } else if (typeof termDateValue === 'string') {
              termDate = parseISO(termDateValue);
            }

            if (termDate) {
              const termDateTimestamp = new Date(
                termDate.getFullYear(),
                termDate.getMonth(),
                termDate.getDate(),
                0,
                0,
                0,
                0
              ).getTime();

              // If terminated on or before the last day of this month, exclude
              if (termDateTimestamp <= monthEndTimestamp) {
                return false;
              }
            }
          } catch (error) {
            // Failed to parse termination date, continue to check end_date
          }
        }

        // Check end_date field (some employees may have end_date instead of termination record)
        if (emp.end_date) {
          try {
            const endDateValue: Date | string = emp.end_date as any;
            let empEndDate: Date;
            if (endDateValue instanceof Date) {
              empEndDate = endDateValue;
            } else if (typeof endDateValue === 'string') {
              empEndDate = parseISO(endDateValue);
            } else {
              // Invalid end_date format, assume employee was active
              // (if end_date is invalid, we can't determine termination)
              return true;
            }

            const empEndDateTimestamp = new Date(
              empEndDate.getFullYear(),
              empEndDate.getMonth(),
              empEndDate.getDate(),
              0,
              0,
              0,
              0
            ).getTime();

            // If end_date is on or before the last day of this month, exclude
            if (empEndDateTimestamp <= monthEndTimestamp) {
              return false;
            }
          } catch (error) {
            // Failed to parse end_date, assume employee was active
            // (if end_date is invalid, we can't determine termination)
          }
        }

        // Additional check: If employee is currently inactive and has no termination date,
        // they might have been terminated but the date wasn't recorded properly.
        // For past months, if they're inactive now and we can't find a termination date,
        // we should be conservative and exclude them if the month is recent (within last 12 months)
        // Otherwise, assume they were active if they passed all other checks
        const monthsAgo = Math.floor(
          (now.getTime() - monthEndTimestamp) / (1000 * 60 * 60 * 24 * 30)
        );
        if (!emp.is_active && monthsAgo <= 12) {
          // If employee is inactive and month is recent, and we couldn't find termination date,
          // they were likely terminated but date wasn't recorded - exclude them
          if (!termination && !emp.end_date) {
            return false;
          }
        }

        // Employee passed all checks:
        // - Started on or before the end of this month
        // - Was not terminated on or before the end of this month
        return true;
      }).length;

      data.push(headcount);

      // Format label as "Mes Año" (e.g., "Ene 2024")
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
      const monthName = monthNames[month.getMonth()];
      const year = format(month, 'yyyy');
      labels.push(`${monthName} ${year}`);
    }

    return {
      labels,
      datasets: [
        {
          data,
          label: 'Empleados',
          borderColor: '#FCD34D',
          backgroundColor: 'rgba(252, 211, 77, 0.25)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointBackgroundColor: '#FCD34D',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#FCD34D',
          pointHoverBorderColor: '#fff',
        },
      ],
    };
  });

  // Daily lates for current month (sparkline like headcount), using Supabase if available
  // Calculate always (not just when executive section is active) so getMonthlyLates() can use it
  public latesDailyChartData = computed(() => {
    // Removed the activeSection check so it always calculates
    // This allows getMonthlyLates() to work even if the section isn't active yet

    // Fecha actual en Panamá (para que el gráfico sea estable ante timezone del dispositivo)
    const { year, month, day } = this.getPanamaNowParts();
    const monthIndex = month - 1; // 0-11
    const daysInMonth = this.getDaysInMonth(year, month);
    const daysSoFar = day;

    // Labels: 1 .. daysInMonth (gráfico del 1 al día actual; los futuros van en 0)
    const labels = Array.from({ length: daysSoFar }, (_, i) => `${i + 1}`);

    // PRIMARY: Calculate from timelogs + schedules in real-time
    const totalsByDate = new Map<string, number>(); // Key: yyyy-MM-dd
    const namesByDate = new Map<string, string[]>();
    const timelogs = this.latesFromTimelogs.value() ?? [];
    const schedules = this.employeeSchedules.value() ?? [];

    // Debug logs
    console.log(
      '[HomeComponent] latesDailyChartData - Timelogs cargados:',
      timelogs.length
    );
    console.log(
      '[HomeComponent] latesDailyChartData - Schedules cargados:',
      schedules.length
    );
    console.log(
      '[HomeComponent] latesDailyChartData - Company ID:',
      this.organizationService.getCurrentCompanyId()
    );

    if (timelogs.length > 0) {
      console.log(
        '[HomeComponent] latesDailyChartData - Muestra de timelogs (primeros 3):',
        timelogs.slice(0, 3).map((log) => ({
          id: log.id,
          employee_id: log.employee_id,
          type: log.type,
          created_at: log.created_at,
          employee: log.employee
            ? `${log.employee.first_name} ${log.employee.father_name}`
            : 'N/A',
        }))
      );
    }

    if (schedules.length > 0) {
      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log(
          '[HomeComponent] latesDailyChartData - Muestra de schedules (primeros 3):',
          schedules.slice(0, 3).map((s) => ({
            id: s.id,
            employee_id: s.employee_id,
            start_date: s.start_date,
            end_date: s.end_date,
            schedule: s.schedule
              ? {
                  id: s.schedule.id,
                  name: s.schedule.name,
                  entry_time: s.schedule.entry_time,
                }
              : null,
          }))
        );
      }
    } else {
      // Solo mostrar warning si hay un error real, no cuando simplemente no hay datos todavía
      const schedulesError = this.employeeSchedules.error();
      const schedulesLoading = this.employeeSchedules.isLoading();

      if (schedulesError) {
        // Solo log en desarrollo
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.warn(
            '[HomeComponent] latesDailyChartData - Error al cargar schedules:'
          );
          console.warn(
            '  - Company ID:',
            this.organizationService.getCurrentCompanyId()
          );
          console.warn('  - Error en employeeSchedules:', schedulesError);
        }
      } else if (!schedulesLoading && schedules.length === 0) {
        // Solo mostrar warning si no están cargando y realmente no hay datos
        // (puede ser normal si no hay schedules para el mes actual)
        // console.warn('[HomeComponent] latesDailyChartData - No hay schedules disponibles');
      }
    }
    const detailsByDate = new Map<
      string,
      {
        name: string;
        scheduledEntry?: string;
        actualEntry?: string;
        minutesLate?: number;
      }[]
    >();

    if (timelogs.length > 0 && schedules.length > 0) {
      const entriesByEmployeeDay = new Map<string, any>();
      for (const log of timelogs) {
        // Solo considerar entradas (type === 'entry')
        if (log.type !== 'entry') {
          continue;
        }

        const entryTime = new Date(log.created_at);
        // Mes/año/día de la marcación en Panamá
        const entryYear = parseInt(
          formatInTimeZone(entryTime, this.TIMEZONE, 'yyyy'),
          10
        );
        const entryMonthIndex =
          parseInt(formatInTimeZone(entryTime, this.TIMEZONE, 'MM'), 10) - 1;

        if (entryMonthIndex !== monthIndex || entryYear !== year) {
          continue; // Skip entries outside current month
        }
        const entryDayStr = formatInTimeZone(
          entryTime,
          this.TIMEZONE,
          'yyyy-MM-dd'
        );
        const dayKey = `${log.employee_id}_${entryDayStr}`;
        if (!entriesByEmployeeDay.has(dayKey)) {
          entriesByEmployeeDay.set(dayKey, {
            employee_id: log.employee_id,
            employee_name: `${log.employee?.first_name ?? ''} ${
              log.employee?.father_name ?? ''
            }`.trim(),
            entry_time: entryTime,
            day: entryDayStr,
          });
        }
      }

      const entryDays = Array.from(entriesByEmployeeDay.values())
        .map((e) => e.day)
        .sort();
      const uniqueDays = Array.from(new Set(entryDays));

      for (const [, entry] of entriesByEmployeeDay) {
        // Buscar horarios que se solapen con el día de la entrada
        const matchingSchedules = schedules.filter(
          (s: any) => s.employee_id === entry.employee_id
        );

        const schedule = matchingSchedules.find(
          (s: any) => s.start_date <= entry.day && s.end_date >= entry.day
        );

        // Excluir si no hay schedule o no hay entry_time configurado
        if (!schedule || !schedule.schedule?.entry_time) {
          continue;
        }

        // Excluir feriados y días libres (IDs específicos) - misma lógica que timelogs
        const scheduleId = schedule.schedule.id;
        const isFeriado = scheduleId === '3d07f626-d58f-4203-bac5-f6e35557e0ad';
        const isDiaLibre =
          scheduleId === 'c01dff8f-ce0d-498f-a473-46418576e589';
        if (isFeriado || isDiaLibre || schedule.schedule?.day_off) {
          continue;
        }

        // Convertir ambos tiempos al mismo formato (24h) para comparar correctamente
        // entry_time puede venir como string "HH:mm:ss" o como Date object
        let scheduledEntry: string;
        if (schedule.schedule.entry_time instanceof Date) {
          scheduledEntry = formatInTimeZone(
            schedule.schedule.entry_time,
            this.TIMEZONE,
            'HH:mm:ss'
          );
        } else if (typeof schedule.schedule.entry_time === 'string') {
          // Asegurar formato HH:mm:ss (agregar segundos si faltan)
          const parts = schedule.schedule.entry_time.split(':');
          scheduledEntry =
            parts.length >= 2
              ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(
                  parts[2] || '00'
                ).padStart(2, '0')}`
              : schedule.schedule.entry_time;
        } else {
          continue; // Skip si no hay entry_time válido
        }
        const actualEntry = formatInTimeZone(
          entry.entry_time,
          this.TIMEZONE,
          'HH:mm:ss'
        ); // Formato 24h para comparar con scheduledEntry
        const minutesLate = this.calcTimeDiff(actualEntry, scheduledEntry);
        const tolerance = schedule.schedule.minutes_tolerance ?? 0;

        // Solo contar como tardanza si minutesLate > tolerance (misma lógica que timelogs)
        if (minutesLate > tolerance) {
          const dateKey = entry.day; // yyyy-MM-dd
          totalsByDate.set(dateKey, (totalsByDate.get(dateKey) ?? 0) + 1);
          const arr = namesByDate.get(dateKey) ?? [];
          if (entry.employee_name && !arr.includes(entry.employee_name))
            arr.push(entry.employee_name);
          namesByDate.set(dateKey, arr);
          const detArr = detailsByDate.get(dateKey) ?? [];
          detArr.push({
            name: entry.employee_name,
            scheduledEntry: scheduledEntry,
            actualEntry: actualEntry,
            minutesLate: minutesLate,
          });
          detailsByDate.set(dateKey, detArr);
        }
      }
    }

    // Build month-to-date data: 1..daysSoFar
    const data: number[] = [];
    const customNames: string[][] = [];
    const customDetails: any[] = [];

    for (let d = 1; d <= daysSoFar; d++) {
      const dateKey = `${year}-${this.pad2(month)}-${this.pad2(d)}`;
      const count = totalsByDate.get(dateKey) ?? 0;
      const names = namesByDate.get(dateKey) ?? [];
      const details = detailsByDate.get(dateKey) ?? [];

      data.push(count);
      customNames.push(names);
      customDetails.push(details);
    }

    return {
      labels,
      datasets: [
        {
          data,
          label: 'Tardanzas',
          borderColor: '#FCD34D',
          backgroundColor: 'rgba(252, 211, 77, 0.25)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          // Puntos solo donde hay tardanzas (más fácil de hoverear sin ensuciar el gráfico)
          pointRadius: (ctx: any) => ((ctx?.parsed?.y ?? 0) > 0 ? 3 : 0),
          pointHoverRadius: (ctx: any) => ((ctx?.parsed?.y ?? 0) > 0 ? 8 : 0),
          pointHitRadius: (ctx: any) => ((ctx?.parsed?.y ?? 0) > 0 ? 12 : 0),
          pointBackgroundColor: '#FCD34D',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointHoverBackgroundColor: '#FCD34D',
          pointHoverBorderColor: '#fff',
          customNames,
          customDetails,
        },
      ],
    };
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

    const terminations = this.terminationsApi.value() ?? [];
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

  public openCurrentMonthHiresExitsDialog(): void {
    this.openMonthHiresExitsDialog(this.currentMonth(), new Date().getMonth());
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

    const data: any = this.headcountChartData();
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

    const data: any = this.headcountChartData();
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

    const terminations = this.terminationsApi.value() ?? [];
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
            return `${label}: ${value} (${percentage}%)`;
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
    // PRIMARY: Usar directamente el total del gráfico (misma fuente que muestra el gráfico)
    // El gráfico ya excluye casos sin horario o con errores
    // NOTA: latesDailyChartData solo se calcula cuando activeSection === 'executive'
    // pero getMonthlyLates() se llama desde el template, así que necesitamos calcularlo siempre
    const chartData = this.latesDailyChartData();
    if (
      chartData &&
      chartData.datasets &&
      chartData.datasets[0] &&
      chartData.datasets[0].data &&
      chartData.datasets[0].data.length > 0
    ) {
      const totalFromChart = chartData.datasets[0].data.reduce(
        (sum: number, val: number) => sum + val,
        0
      );
      if (totalFromChart > 0) {
        return totalFromChart;
      }
    }

    // FALLBACK: Calculate from timelogs + schedules in real-time (misma lógica que el gráfico)
    // Este cálculo excluye casos sin horario o con errores
    const timelogs = this.latesFromTimelogs.value() ?? [];
    const schedules = this.employeeSchedules.value() ?? [];
    const timelogsLoading = this.latesFromTimelogs.isLoading();
    const schedulesLoading = this.employeeSchedules.isLoading();
    const timelogsError = this.latesFromTimelogs.error();
    const schedulesError = this.employeeSchedules.error();

    // Solo mostrar logs de debug si hay datos o errores, no durante la carga inicial (solo en desarrollo)
    if (
      (timelogs.length > 0 ||
        schedules.length > 0 ||
        timelogsError ||
        schedulesError) &&
      typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ) {
      console.log(
        '[HomeComponent] getMonthlyLates - Timelogs cargados:',
        timelogs.length
      );
      console.log(
        '[HomeComponent] getMonthlyLates - Schedules cargados:',
        schedules.length
      );
      console.log(
        '[HomeComponent] getMonthlyLates - Company ID:',
        this.organizationService.getCurrentCompanyId()
      );
      console.log(
        '[HomeComponent] getMonthlyLates - activeSection:',
        this.activeSection()
      );
      console.log(
        '[HomeComponent] getMonthlyLates - Chart data available:',
        !!chartData
      );
    }

    // Si los datos están cargando, retornar 0 sin mostrar warnings
    if (timelogsLoading || schedulesLoading) {
      return 0;
    }

    if (timelogs.length > 0 && schedules.length > 0) {
      let lateCount = 0;
      const { year, month } = this.getPanamaNowParts();
      const timelogsCurrentMonthIndex = month - 1;
      const timelogsCurrentYear = year;

      // Group timelogs by employee and day (first entry of the day)
      const entriesByEmployeeDay = new Map<string, any>();

      for (const log of timelogs) {
        // Solo considerar entradas (type === 'entry')
        if (log.type !== 'entry') {
          continue;
        }

        const entryTime = new Date(log.created_at);
        const logYear = parseInt(
          formatInTimeZone(entryTime, this.TIMEZONE, 'yyyy'),
          10
        );
        const logMonthIndex =
          parseInt(formatInTimeZone(entryTime, this.TIMEZONE, 'MM'), 10) - 1;

        if (
          logMonthIndex !== timelogsCurrentMonthIndex ||
          logYear !== timelogsCurrentYear
        ) {
          continue; // Skip dates outside current month
        }

        const entryDayStr = formatInTimeZone(
          entryTime,
          this.TIMEZONE,
          'yyyy-MM-dd'
        );
        const dayKey = `${log.employee_id}_${entryDayStr}`;

        // Keep only the first entry of the day
        if (!entriesByEmployeeDay.has(dayKey)) {
          entriesByEmployeeDay.set(dayKey, {
            employee_id: log.employee_id,
            employee_name: `${log.employee?.first_name ?? ''} ${
              log.employee?.father_name ?? ''
            }`.trim(),
            entry_time: entryTime,
            day: entryDayStr,
          });
        }
      }

      let entriesWithoutSchedule = 0;
      let entriesWithScheduleErrors = 0;
      let entriesProcessed = 0;

      // Check each entry against schedule
      for (const [_, entry] of entriesByEmployeeDay) {
        // Find schedule for this employee on this day
        const schedule = schedules.find(
          (s: any) =>
            s.employee_id === entry.employee_id &&
            s.start_date <= entry.day &&
            s.end_date >= entry.day
        );

        // Excluir si no hay schedule o no hay entry_time configurado
        if (!schedule || !schedule.schedule?.entry_time) {
          entriesWithoutSchedule++;
          continue; // No schedule or no entry time defined
        }

        // Excluir feriados y días libres (IDs específicos)
        const scheduleId = schedule.schedule.id;
        const isFeriado = scheduleId === '3d07f626-d58f-4203-bac5-f6e35557e0ad';
        const isDiaLibre =
          scheduleId === 'c01dff8f-ce0d-498f-a473-46418576e589';
        if (isFeriado || isDiaLibre || schedule.schedule?.day_off) {
          entriesWithScheduleErrors++;
          continue; // Excluir feriados, días libres y días sin horario válido
        }

        entriesProcessed++;

        // Convertir ambos tiempos al mismo formato (24h) para comparar correctamente
        // entry_time puede venir como string "HH:mm:ss" o como Date object
        let scheduledEntry: string;
        if (schedule.schedule.entry_time instanceof Date) {
          scheduledEntry = formatInTimeZone(
            schedule.schedule.entry_time,
            this.TIMEZONE,
            'HH:mm:ss'
          );
        } else if (typeof schedule.schedule.entry_time === 'string') {
          // Asegurar formato HH:mm:ss (agregar segundos si faltan)
          const parts = schedule.schedule.entry_time.split(':');
          scheduledEntry =
            parts.length >= 2
              ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(
                  parts[2] || '00'
                ).padStart(2, '0')}`
              : schedule.schedule.entry_time;
        } else {
          continue; // Skip si no hay entry_time válido
        }
        const actualEntry = formatInTimeZone(
          entry.entry_time,
          this.TIMEZONE,
          'HH:mm:ss'
        ); // Formato 24h para comparar con scheduledEntry
        const minutesLate = this.calcTimeDiff(actualEntry, scheduledEntry);
        const tolerance = schedule.schedule.minutes_tolerance ?? 0;

        if (minutesLate > tolerance) {
          lateCount++;
        }
      }

      if (
        typeof window !== 'undefined' &&
        window.location.hostname === 'localhost'
      ) {
        console.log(
          '[HomeComponent] getMonthlyLates - Tardanzas calculadas:',
          lateCount
        );
        console.log(
          '[HomeComponent] getMonthlyLates - Entradas sin schedule:',
          entriesWithoutSchedule
        );
        console.log(
          '[HomeComponent] getMonthlyLates - Entradas con errores de schedule:',
          entriesWithScheduleErrors
        );
        console.log(
          '[HomeComponent] getMonthlyLates - Entradas procesadas:',
          entriesProcessed
        );
      }
      return lateCount;
    } else {
      // Solo mostrar warnings si hay errores reales, no cuando simplemente no hay datos
      // (puede ser que no haya timelogs o schedules para el mes actual, lo cual es válido)
      if (timelogsError || schedulesError) {
        // Solo log en desarrollo
        if (
          typeof window !== 'undefined' &&
          window.location.hostname === 'localhost'
        ) {
          console.warn(
            '[HomeComponent] getMonthlyLates - Error al cargar datos para calcular tardanzas:'
          );
          if (timelogsError) {
            console.warn('  - Error en latesFromTimelogs:', timelogsError);
          }
          if (schedulesError) {
            console.warn('  - Error en employeeSchedules:', schedulesError);
          }
        }
      } else if (timelogs.length === 0 && schedules.length === 0) {
        // Solo mostrar warning si no hay datos Y no están cargando (datos realmente vacíos)
        // Esto es silencioso porque puede ser normal (no hay timelogs o schedules para el mes actual)
        // console.warn('[HomeComponent] getMonthlyLates - No hay datos disponibles para calcular tardanzas');
      }
    }

    return 0;
  }

  // Calculate top employees with most lates
  public topLatesList = computed(() => {
    const timelogs = this.latesFromTimelogs.value() ?? [];
    const schedules = this.employeeSchedules.value() ?? [];

    if (timelogs.length === 0 || schedules.length === 0) {
      return [];
    }

    const { year, month } = this.getPanamaNowParts();
    const currentMonthIndex = month - 1;
    const currentYear = year;

    // Group timelogs by employee and day (first entry of the day)
    const entriesByEmployeeDay = new Map<string, any>();

    for (const log of timelogs) {
      if (log.type !== 'entry') {
        continue;
      }

      const entryTime = new Date(log.created_at);
      const logYear = parseInt(
        formatInTimeZone(entryTime, this.TIMEZONE, 'yyyy'),
        10
      );
      const logMonthIndex =
        parseInt(formatInTimeZone(entryTime, this.TIMEZONE, 'MM'), 10) - 1;

      if (logMonthIndex !== currentMonthIndex || logYear !== currentYear) {
        continue;
      }

      const entryDayStr = formatInTimeZone(
        entryTime,
        this.TIMEZONE,
        'yyyy-MM-dd'
      );
      const dayKey = `${log.employee_id}_${entryDayStr}`;

      if (!entriesByEmployeeDay.has(dayKey)) {
        entriesByEmployeeDay.set(dayKey, {
          employee_id: log.employee_id,
          employee_name: `${log.employee?.first_name ?? ''} ${
            log.employee?.father_name ?? ''
          }`.trim(),
          entry_time: entryTime,
          day: entryDayStr,
        });
      }
    }

    // Count lates per employee
    const latesByEmployee = new Map<
      string,
      { employee_name: string; count: number }
    >();

    for (const [_, entry] of entriesByEmployeeDay) {
      const schedule = schedules.find(
        (s: any) =>
          s.employee_id === entry.employee_id &&
          s.start_date <= entry.day &&
          s.end_date >= entry.day
      );

      if (!schedule || !schedule.schedule?.entry_time) {
        continue;
      }

      const scheduleId = schedule.schedule.id;
      const isFeriado = scheduleId === '3d07f626-d58f-4203-bac5-f6e35557e0ad';
      const isDiaLibre = scheduleId === 'c01dff8f-ce0d-498f-a473-46418576e589';
      if (isFeriado || isDiaLibre || schedule.schedule?.day_off) {
        continue;
      }

      let scheduledEntry: string;
      if (schedule.schedule.entry_time instanceof Date) {
        scheduledEntry = formatInTimeZone(
          schedule.schedule.entry_time,
          this.TIMEZONE,
          'HH:mm:ss'
        );
      } else if (typeof schedule.schedule.entry_time === 'string') {
        const parts = schedule.schedule.entry_time.split(':');
        scheduledEntry =
          parts.length >= 2
            ? `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${(
                parts[2] || '00'
              ).padStart(2, '0')}`
            : schedule.schedule.entry_time;
      } else {
        continue;
      }

      const actualEntry = formatInTimeZone(
        entry.entry_time,
        this.TIMEZONE,
        'HH:mm:ss'
      );
      const minutesLate = this.calcTimeDiff(actualEntry, scheduledEntry);
      const tolerance = schedule.schedule.minutes_tolerance ?? 0;

      if (minutesLate > tolerance) {
        const employeeId = entry.employee_id;
        if (!latesByEmployee.has(employeeId)) {
          latesByEmployee.set(employeeId, {
            employee_name: entry.employee_name,
            count: 0,
          });
        }
        const current = latesByEmployee.get(employeeId)!;
        current.count++;
      }
    }

    // Convert to array and sort by count descending
    return Array.from(latesByEmployee.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20
  });

  public getTopLatesCount(): number {
    const topList = this.topLatesList();
    return topList.length > 0 ? topList[0].count : 0;
  }

  public getTopLatesEmployeeName(): string {
    const topList = this.topLatesList();
    if (topList.length > 0) {
      const name = topList[0].employee_name;
      return name.length > 20 ? name.substring(0, 20) + '...' : name;
    }
    return 'Ninguno';
  }

  public openTopLatesDialog(): void {
    this.topLatesDialogVisible.set(true);
  }

  // Calculate top employees with most absences
  // An absence is when an employee has a schedule but no entry timelog for that day
  public topAbsencesList = computed(() => {
    const timelogs = this.latesFromTimelogs.value() ?? [];
    const schedules = this.employeeSchedules.value() ?? [];

    if (schedules.length === 0) {
      return [];
    }

    const { year, month } = this.getPanamaNowParts();
    const currentMonthIndex = month - 1;
    const currentYear = year;
    const daysInMonth = this.getDaysInMonth(year, month);
    const daysSoFar = new Date().getDate();

    // Get all entry timelogs for current month grouped by employee and day
    const entriesByEmployeeDay = new Map<string, boolean>();

    for (const log of timelogs) {
      if (log.type !== 'entry') {
        continue;
      }

      const entryTime = new Date(log.created_at);
      const logYear = parseInt(
        formatInTimeZone(entryTime, this.TIMEZONE, 'yyyy'),
        10
      );
      const logMonthIndex =
        parseInt(formatInTimeZone(entryTime, this.TIMEZONE, 'MM'), 10) - 1;

      if (logMonthIndex !== currentMonthIndex || logYear !== currentYear) {
        continue;
      }

      const entryDayStr = formatInTimeZone(
        entryTime,
        this.TIMEZONE,
        'yyyy-MM-dd'
      );
      const dayKey = `${log.employee_id}_${entryDayStr}`;
      entriesByEmployeeDay.set(dayKey, true);
    }

    // Count absences per employee
    const absencesByEmployee = new Map<
      string,
      { employee_name: string; count: number }
    >();

    // For each day of the month so far, check if employee had schedule but no entry
    for (let day = 1; day <= daysSoFar; day++) {
      const checkDate = new Date(year, currentMonthIndex, day);
      const checkDateStr = formatInTimeZone(
        checkDate,
        this.TIMEZONE,
        'yyyy-MM-dd'
      );

      // Get all employees who should have worked this day (have a schedule)
      const employeesWithSchedule = schedules.filter((s: any) => {
        if (s.start_date > checkDateStr || s.end_date < checkDateStr) {
          return false;
        }

        // Exclude holidays and days off
        const scheduleId = s.schedule?.id;
        const isFeriado = scheduleId === '3d07f626-d58f-4203-bac5-f6e35557e0ad';
        const isDiaLibre =
          scheduleId === 'c01dff8f-ce0d-498f-a473-46418576e589';
        if (isFeriado || isDiaLibre || s.schedule?.day_off) {
          return false;
        }

        // Check if it's a work day (not Sunday by default, but could be configured)
        const dayOfWeek = checkDate.getDay();
        // You might want to add logic here to check if the schedule applies to this day of week
        // For now, we'll assume schedules apply to all weekdays

        return s.schedule?.entry_time != null;
      });

      // For each employee with schedule, check if they have an entry
      for (const schedule of employeesWithSchedule) {
        const dayKey = `${schedule.employee_id}_${checkDateStr}`;
        const hasEntry = entriesByEmployeeDay.has(dayKey);

        if (!hasEntry) {
          // This is an absence
          const employeeId = schedule.employee_id;
          if (!absencesByEmployee.has(employeeId)) {
            // Get employee name from employees store (more reliable)
            let employeeName = 'Empleado desconocido';
            const employees = this.employees.entities();
            const employee = employees.find((e) => e.id === employeeId);
            if (employee) {
              employeeName = `${employee.first_name ?? ''} ${
                employee.father_name ?? ''
              }`.trim();
            } else if (schedule.employee) {
              // Fallback: try from schedule if available
              employeeName = `${schedule.employee.first_name ?? ''} ${
                schedule.employee.father_name ?? ''
              }`.trim();
            }
            if (!employeeName || employeeName === '') {
              employeeName = 'Empleado desconocido';
            }
            absencesByEmployee.set(employeeId, {
              employee_name: employeeName,
              count: 0,
            });
          }
          const current = absencesByEmployee.get(employeeId)!;
          current.count++;
        }
      }
    }

    // Convert to array and sort by count descending
    return Array.from(absencesByEmployee.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 20); // Top 20
  });

  public getTopAbsencesCount(): number {
    const topList = this.topAbsencesList();
    return topList.length > 0 ? topList[0].count : 0;
  }

  public getTopAbsencesEmployeeName(): string {
    const topList = this.topAbsencesList();
    if (topList.length > 0) {
      const name = topList[0].employee_name;
      return name.length > 20 ? name.substring(0, 20) + '...' : name;
    }
    return 'Ninguno';
  }

  public openTopAbsencesDialog(): void {
    this.topAbsencesDialogVisible.set(true);
  }

  // Helper function to calculate time difference in minutes
  // Returns positive minutes if actualTime is later than scheduledTime (person is late)
  // Returns negative minutes if actualTime is earlier than scheduledTime (person is early)
  private calcTimeDiff(actualTime: string, scheduledTime: string): number {
    if (!actualTime || !scheduledTime) return 0;
    const actual = new Date();
    const scheduled = new Date();
    const actualParts = actualTime.split(':');
    const scheduledParts = scheduledTime.split(':');

    if (actualParts.length < 2 || scheduledParts.length < 2) return 0;

    actual.setHours(+actualParts[0], +actualParts[1], 0, 0);
    scheduled.setHours(+scheduledParts[0], +scheduledParts[1], 0, 0);

    // Return actual - scheduled: positive if late, negative if early
    return differenceInMinutes(actual, scheduled);
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

  public getBirthdayMonth(date: Date | undefined): string {
    if (!date) return '???';
    const months = [
      'ENE',
      'FEB',
      'MAR',
      'ABR',
      'MAY',
      'JUN',
      'JUL',
      'AGO',
      'SEP',
      'OCT',
      'NOV',
      'DIC',
    ];
    return months[new Date(date).getMonth()];
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

  public getSortedBirthdays() {
    const birthdays = [...this.state.birthDates()];
    const today = new Date();
    const currentDay = today.getDate();

    return birthdays.sort((a, b) => {
      if (!a.birth_date || !b.birth_date) return 0;

      const dayA = new Date(a.birth_date).getDate();
      const dayB = new Date(b.birth_date).getDate();

      // Los de hoy primero
      const isTodayA = dayA === currentDay;
      const isTodayB = dayB === currentDay;
      if (isTodayA && !isTodayB) return -1;
      if (!isTodayA && isTodayB) return 1;

      // Luego los que vienen (día mayor al actual)
      const isUpcomingA = dayA > currentDay;
      const isUpcomingB = dayB > currentDay;
      if (isUpcomingA && !isUpcomingB) return -1;
      if (!isUpcomingA && isUpcomingB) return 1;

      // Dentro de cada grupo, ordenar por día
      return dayA - dayB;
    });
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

  // Helper to get month name in Spanish (mes 0-11)
  private getMonthNameSpanish(monthIndex: number): string {
    const months = [
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
    return months[monthIndex] ?? '';
  }

  public onLatesChartClick(evt: any) {
    // Chart.js click event structure: { event: MouseEvent, active: Array }
    const activePoints = evt?.active;
    if (!activePoints || activePoints.length === 0) {
      return;
    }

    const firstPoint = activePoints[0];
    const idx = firstPoint?.index;

    if (idx == null || idx < 0) {
      return;
    }

    const data: any = this.latesDailyChartData();

    if (!data || !data.datasets || data.datasets.length === 0) {
      return;
    }

    const ds: any = data.datasets[0];
    const labels: any[] = data.labels || [];
    const details = (ds?.customDetails?.[idx] ?? []) as any[];

    // Sort details by minutesLate descending (highest first)
    const sortedDetails = [...details].sort((a, b) => {
      const aMinutes = a.minutesLate ?? 0;
      const bMinutes = b.minutesLate ?? 0;
      return bMinutes - aMinutes; // Descending order
    });

    // Format title: "Día 1 Nov"
    const dayNum = idx + 1;
    const { month } = this.getPanamaNowParts();
    const monthName = this.getMonthNameSpanish(month - 1);
    const title = `Tardanzas - Día ${dayNum} ${monthName}`;

    this.lateDialogTitle.set(title);
    this.lateDialogDetails.set(sortedDetails);
    this.lateDialogVisible.set(true);
  }
}
