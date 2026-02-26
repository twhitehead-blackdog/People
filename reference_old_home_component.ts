import { CommonModule, CurrencyPipe, TitleCasePipe } from '@angular/common';
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
import { BaseChartDirective } from 'ng2-charts';
import { ApiUrlService } from '../services/api-url.service';
import { DashboardStore } from '../stores/dashboard.store';
import { EmployeesStore } from '../stores/employees.store';
import { OrganizationService } from '../services/organization.service';

// New Components
import { HomeSidebarComponent } from './home/components/home-sidebar/home-sidebar.component';
import { ExecutiveSectionComponent } from './home/components/sections/executive-section.component';
import { FinancialSectionComponent } from './home/components/sections/financial-section.component';
import { StructureSectionComponent } from './home/components/sections/structure-section.component';
import { ChartsSectionComponent } from './home/components/sections/charts-section.component';
import { EventsSectionComponent } from './home/components/sections/events-section.component';
import { ManagementSectionComponent } from './home/components/sections/management-section.component';
import { BirthdaysDialogComponent } from './home/components/dialogs/birthdays-dialog.component';
import { HiresExitsDialogComponent } from './home/components/dialogs/hires-exits-dialog.component';
import { LateDetailsDialogComponent } from './home/components/dialogs/late-details-dialog.component';
import { TopLatesDialogComponent } from './home/components/dialogs/top-lates-dialog.component';
import { TopAbsencesDialogComponent } from './home/components/dialogs/top-absences-dialog.component';

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
    TopAbsencesDialogComponent
  ],
  template: `
    <div class="dashboard-wrapper">
      @if (sidebarOpen()) {
        <div class="sidebar-overlay md:hidden" (click)="toggleSidebar()"></div>
      }

      <pt-home-sidebar
        [isOpen]="sidebarOpen()"
        [activeSection]="activeSection()"
        (sectionChange)="selectSection($event)"
        (toggleSidebar)="toggleSidebar()"
      ></pt-home-sidebar>

      <button class="mobile-sidebar-toggle" (click)="toggleSidebar()" [class.hidden]="sidebarOpen()" title="Alternar menú">
        <i class="pi pi-bars"></i>
      </button>

      <main class="dashboard-container">
        @switch (activeSection()) {
          @case ('executive') {
            <pt-executive-section
              [headcountChartData]="headcountChartData()"
              [headcountChartOptions]="headcountChartOptions"
              [genderChartData]="genderChartData()"
              [genderChartOptions]="genderChartOptions"
              [genderCounts]="{ male: getGenderCount('M'), female: getGenderCount('F') }"
              [genderPercentages]="{ male: getGenderPercentage('M'), female: getGenderPercentage('F') }"
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
              [hiresExitsCounts]="{ hires: getHiresExitsCount('hires'), exits: getHiresExitsCount('exits') }"
              [workClimateIndex]="getWorkClimateIndex()"
              [scheduleComplianceIndex]="getScheduleComplianceIndex()"
              (openTopLates)="openTopLatesDialog()"
              (openTopAbsences)="openTopAbsencesDialog()"
              (openHiresExits)="openCurrentMonthHiresExitsDialog()"
              (openBirthdays)="openBirthdaysDialog()"
            ></pt-executive-section>
          }
          @case ('financial') {
            <pt-financial-section></pt-financial-section>
          }
          @case ('structure') {
            <pt-structure-section></pt-structure-section>
          }
          @case ('charts') {
            <pt-charts-section
              [branchData]="branchData()"
              [branchLabels]="branchLabels()"
              [barChartOptions]="barChartOptions"
              [ageRanges]="ageRanges"
            ></pt-charts-section>
          }
          @case ('events') {
            <pt-events-section [currentMonth]="currentMonth()"></pt-events-section>
          }
          @case ('management') {
            <pt-management-section></pt-management-section>
          }
        }

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
  styles: [`
    :host { display: block; height: 100vh; overflow: hidden; }
  `],
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
    const toPanama = `${year}-${this.pad2(month)}-${this.pad2(day)}T23:59:59-05:00`;
    const from = new Date(fromPanama).toISOString().split('.')[0] + 'Z';
    const to = new Date(toPanama).toISOString().split('.')[0] + 'Z';

    // Query timelogs for entry times (type = 'entry')
    // Build URL manually because we need multiple filters on created_at
    // Include 'type' field in select to ensure it's available in the response
    // IMPORTANTE: Usar limit=5000 para optimizar rendimiento (Supabase limita a 1000 por defecto)
    // El interceptor HTTP agregará el header Range automáticamente para peticiones a timelogs
    const companyId = this.organizationService.getCurrentCompanyId();
    let url = `${baseUrl}/rest/v1/timelogs?select=created_at,employee_id,type,employee:employees!inner(first_name,father_name,is_active)&type=eq.entry&created_at=gte.${from}&created_at=lte.${to}&order=created_at.asc&limit=5000`;

    // Filtrar solo empleados activos
    url += `&employee.is_active=eq.true`;

    // Agregar filtro por company_id
    if (companyId) {
      url += `&company_id=eq.${companyId}`;
    }

    // Debug logs solo en desarrollo
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
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

    let url = `${baseUrl}/rest/v1/employee_schedules?select=*,schedule:schedules(*),employee:employees!inner(id,company_id,is_active)`;
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
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log('[HomeComponent] employeeSchedules URL:', url);
      console.log('[HomeComponent] employeeSchedules - Company ID:', companyId);
      console.log('[HomeComponent] employeeSchedules - Month range:', monthStart, 'to', monthEnd);
      console.log('[HomeComponent] employeeSchedules - Estrategia: Filtrando a través de employee.company_id');
    }

    return {
      url,
      method: 'GET',
    };
  });

  private injector = inject(Injector);

  // Effect para verificar la respuesta de employeeSchedules
  constructor() {
    effect(() => {
      const schedules = this.employeeSchedules.value();
      const error = this.employeeSchedules.error();
      const isLoading = this.employeeSchedules.isLoading();
      const companyId = this.organizationService.getCurrentCompanyId();

      if (!isLoading) {
        if (error) {
          console.error('[HomeComponent] employeeSchedules - Error:', error);
        } else if (schedules) {
          if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
            // Solo log en desarrollo
            if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
              console.log('[HomeComponent] employeeSchedules - Respuesta recibida:', schedules.length, 'schedules');
              if (schedules.length === 0) {
                console.warn('[HomeComponent] employeeSchedules - No hay schedules. Verificar:');
                console.warn('  - Company ID:', companyId);
                // No mostrar URL completa en producción para evitar exponer información de la base de datos
              if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.warn('  - URL completa:', `${this.apiUrl.baseUrl}/rest/v1/employee_schedules?select=*,schedule:schedules(*)&start_date=lte.${format(endOfMonth(new Date()), 'yyyy-MM-dd')}&end_date=gte.${format(startOfMonth(new Date()), 'yyyy-MM-dd')}&company_id=eq.${companyId}`);
              }
                console.warn('  - Posibles causas:');
                console.warn('    1. No hay employee_schedules con este company_id');
                console.warn('    2. Los schedules no se solapan con el mes actual');
                console.warn('    3. Problema con políticas RLS en Supabase');
              } else {
                console.log('[HomeComponent] employeeSchedules - Muestra (primeros 3):',