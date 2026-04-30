import { DatePipe, SlicePipe, registerLocaleData } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import esLocale from '@angular/common/locales/es';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  addDays,
  eachDayOfInterval,
  endOfWeek,
  format,
  getDate,
  getYear,
  getMonth,
  startOfDay,
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DialogModule } from 'primeng/dialog';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { SelectModule } from 'primeng/select';
import { firstValueFrom } from 'rxjs';
// Registrar locale español para Angular
registerLocaleData(esLocale);

import { Branch, Employee, GroomerBranchAssignment, GroomerEmployeeConfig } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { PermissionsService } from '../services/permissions.service';
import { SupabaseRealtimeService } from '../services/supabase-realtime.service';
import { TestModeService } from '../services/test-mode.service';
import { isStoreManagerRole } from '../utils/permission.utils';
import { DashboardStore } from '../stores/dashboard.store';
import { GroomerScheduleUtilsService } from './services/groomer-schedule-utils.service';
import { GroomerBranchSelectionDialogComponent, GroomerBranchSelectionResult } from './groomer-branch-selection-dialog.component';
import { SalonTopComponent } from './salon-top/salon-top.component';

type GroomerWithAssignments = {
  employee: Employee;
  assignments: Map<string, GroomerBranchAssignment>; // date string -> assignment
};

@Component({
  selector: 'pt-salon-schedule',
  imports: [
    Card,
    TableModule,
    Button,
    FormsModule,
    DatePipe,
    SlicePipe,
    TooltipModule,
    DialogModule,
    ToggleSwitch,
    SelectModule,
    GroomerBranchSelectionDialogComponent,
    SalonTopComponent,
  ],
  providers: [DynamicDialogRef, DialogService],
  templateUrl: './salon-schedule.component.html',
  styles: [
    `
      :host ::ng-deep .p-card {
        padding: 0 !important;
      }
      :host ::ng-deep .p-card .p-card-body {
        padding: 0.5rem !important;
      }
      :host ::ng-deep .p-card .p-card-title {
        padding: 0.5rem 0.5rem 0 0.5rem !important;
        margin-bottom: 0.5rem !important;
      }
      :host ::ng-deep .p-card .p-card-content {
        padding: 0 !important;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SalonScheduleComponent {
  private store = inject(DashboardStore);
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);
  private message = inject(MessageService);
  private dialogService = inject(DialogService);
  private apiUrl = inject(ApiUrlService);
  private ref = inject(DynamicDialogRef);
  private permissionsService = inject(PermissionsService);
  private testMode = inject(TestModeService);
  private realtime = inject(SupabaseRealtimeService);

  /** Realtime: recarga asignaciones cuando otro usuario cambia la tabla. */
  private assignmentsChanges = this.realtime.subscribeToTable('groomer_branch_assignments');
  private realtimeReload = effect(() => {
    const batch = this.assignmentsChanges();
    if (!batch) return;
    this.loadAssignments();
  });

  /** Realtime: recarga días no-laborables si cambian los employee_schedules. */
  private employeeSchedulesChanges = this.realtime.subscribeToTable('employee_schedules');
  private realtimeReloadSchedules = effect(() => {
    const batch = this.employeeSchedulesChanges();
    if (!batch) return;
    this.loadNonWorkingDays();
  });

  canViewTop = computed(() =>
    this.permissionsService.canAccessSubModule('time_management', 'salon_top')
  );

  /**
   * Modo solo lectura para gerentes/subgerentes de tienda.
   * Admin no es read-only. Empleados sin schedule_admin tampoco pueden gestionar
   * (ya bloqueado arriba). Soporte en modo gerente también cae aquí.
   */
  isReadOnly = computed(() => {
    if (this.store.isAdmin()) return false;
    const employee = this.store.currentEmployee();
    const isSupportGerente =
      !!employee?.work_email &&
      this.testMode.isSupportUser(employee.work_email) &&
      this.testMode.currentMode === 'gerente';
    if (isSupportGerente) return true;
    if (isStoreManagerRole(
      this.store.isScheduleAdmin(),
      this.store.isAdmin(),
      employee?.position?.name ?? ''
    )) return true;
    // Sin permisos de gestión → también read-only
    return !this.store.canManageSchedules();
  });

  /** ¿El usuario actual puede eliminar esta asignación? Solo el creador o admin */
  canRemoveAssignment(assignment: GroomerBranchAssignment | null | undefined): boolean {
    if (!assignment) return false;
    if (this.isReadOnly()) return false;
    if (this.store.isAdmin()) return true;
    const me = this.store.currentEmployee()?.id;
    return !!me && assignment.created_by === me;
  }

  // Estado del componente
  currentWeekStart = signal<Date>(startOfWeek(new Date(), { weekStartsOn: 0 })); // Domingo
  assignments = signal<GroomerBranchAssignment[]>([]);
  nonWorkingMap = signal<Record<string, string>>({});

  private groomerUtils = inject(GroomerScheduleUtilsService);

  // Estado del diálogo de asignación
  dialogVisible = signal<boolean>(false);
  selectedEmployee = signal<Employee | undefined>(undefined);
  selectedDate = signal<Date | undefined>(undefined);
  selectedAssignment = signal<GroomerBranchAssignment | undefined>(undefined);
  selectedBranchId = signal<string | undefined>(undefined);

  // Estado del panel de configuración
  settingsVisible = signal<boolean>(false);

  // UX: búsqueda, zona activa y secciones colapsables
  nameFilter = signal<string>('');
  activeZone = signal<string | null>(
    typeof localStorage !== 'undefined' ? (localStorage.getItem('salon-activeZone') ?? null) : null
  );
  collapsedBranches = signal<Set<string>>(new Set());

  setActiveZone(zone: string | null): void {
    this.activeZone.set(zone);
    if (typeof localStorage !== 'undefined') {
      if (zone) localStorage.setItem('salon-activeZone', zone);
      else localStorage.removeItem('salon-activeZone');
    }
  }

  isBranchCollapsed(key: string): boolean {
    return this.collapsedBranches().has(key);
  }

  toggleBranch(key: string): void {
    const s = new Set(this.collapsedBranches());
    if (s.has(key)) s.delete(key); else s.add(key);
    this.collapsedBranches.set(s);
  }

  expandAll(): void { this.collapsedBranches.set(new Set()); }
  collapseAll(): void {
    const keys = new Set<string>();
    for (const row of this.tableRows()) {
      if (row.type === 'branch-subheader') keys.add(row.collapseKey);
    }
    this.collapsedBranches.set(keys);
  }

  filteredGroomerCount = computed(() =>
    this.tableRows().filter(r => r.type === 'groomer').length
  );

  // Configuración de peluqueros: cargada desde Supabase
  groomerConfigs = signal<GroomerEmployeeConfig[]>([]);
  savingConfig = signal<boolean>(false);

  // Map rápido employeeId → config
  private configMap = computed((): Map<string, GroomerEmployeeConfig> => {
    const map = new Map<string, GroomerEmployeeConfig>();
    for (const cfg of this.groomerConfigs()) map.set(cfg.employee_id, cfg);
    return map;
  });

  isRotating(employeeId: string): boolean {
    return this.configMap().get(employeeId)?.is_rotating ?? false;
  }

  getGroomerZone(employeeId: string): string {
    return this.configMap().get(employeeId)?.zone ?? '';
  }

  async toggleRotating(employeeId: string): Promise<void> {
    const current = this.configMap().get(employeeId);
    await this.upsertConfig(employeeId, {
      is_rotating: !(current?.is_rotating ?? false),
      zone: current?.zone ?? null,
    });
  }

  async setGroomerZone(employeeId: string, zone: string | null): Promise<void> {
    const current = this.configMap().get(employeeId);
    await this.upsertConfig(employeeId, {
      is_rotating: current?.is_rotating ?? false,
      zone: zone || null,
    });
  }

  private async upsertConfig(employeeId: string, data: { is_rotating: boolean; zone: string | null }): Promise<void> {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return;

    const url = this.apiUrl.build('rest/v1/groomer_employee_config', {
      on_conflict: 'company_id,employee_id',
    });

    const payload = {
      company_id: companyId,
      employee_id: employeeId,
      is_rotating: data.is_rotating,
      zone: data.zone,
    };

    try {
      await firstValueFrom(
        this.http.post(url, payload, {
          headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
        })
      );
      // Actualizar señal local
      const existing = this.groomerConfigs();
      const idx = existing.findIndex(c => c.employee_id === employeeId);
      const updated = { ...payload } as GroomerEmployeeConfig;
      if (idx >= 0) {
        this.groomerConfigs.set([...existing.slice(0, idx), updated, ...existing.slice(idx + 1)]);
      } else {
        this.groomerConfigs.set([...existing, updated]);
      }
    } catch (e) {
      console.error('[SalonSchedule] Error guardando config:', e);
    }
  }

  private readonly zoneColorPalette = [
    '#0f766e', '#1d4ed8', '#7e22ce', '#b45309',
    '#be123c', '#0e7490', '#15803d', '#c2410c',
    '#4f46e5', '#b91c1c', '#0369a1', '#065f46',
    '#92400e', '#6b21a8', '#0c4a6e', '#134e4a',
  ];

  /** Mapa zona → color único por índice (sin repeticiones mientras haya colores disponibles) */
  private zoneColorAssignment = computed((): Map<string, string> => {
    const zones = this.orderedZones();
    const map = new Map<string, string>();
    zones.forEach((zone, i) => {
      map.set(zone, this.zoneColorPalette[i % this.zoneColorPalette.length]);
    });
    return map;
  });

  getZoneColor(zoneName: string): string {
    if (!zoneName) return '#374151';
    return this.zoneColorAssignment().get(zoneName) ?? this.zoneColorPalette[0];
  }

  /** Zonas únicas disponibles como opciones del dropdown */
  availableZones = computed((): string[] => {
    const zones = new Set<string>();
    for (const cfg of this.groomerConfigs()) {
      if (cfg.zone) zones.add(cfg.zone);
    }
    return [...zones].sort();
  });

  /** Lista ordenada de zonas únicas */
  orderedZones = computed((): string[] => {
    const map = new Map<string, true>();
    for (const cfg of this.groomerConfigs()) {
      if (cfg.zone) map.set(cfg.zone, true);
    }
    return [...map.keys()].sort();
  });

  // Computed signals
  branches = computed(() => this.store.branches.entities());

  branchesWithAssignments = computed(() => {
    const branches = this.store.branches.entities().filter(
      (b) =>
        b.is_active &&
        b.name !== 'Bodega Dos Caminos' &&
        b.id !== '7862b9be-890d-4432-8a2f-9329a15a2853'
    );
    return branches.map((branch) => ({ branch }));
  });

  /** Groomers agrupados por estado (día libre, A. Injus, A. Jus) por día */
  groomersByStatusAndDay = computed(() => {
    const map = this.nonWorkingMap();
    const groomers = this.groomerEmployees();
    const days = this.daysOfWeek();
    const result: Record<string, { diaLibre: Employee[]; injustificada: Employee[]; justificada: Employee[]; other: Employee[] }> = {};
    for (const day of days) {
      const dateKey = format(day, 'yyyy-MM-dd');
      result[dateKey] = { diaLibre: [], injustificada: [], justificada: [], other: [] };
      for (const groomer of groomers) {
        const label = map[`${groomer.id}|${dateKey}`];
        if (!label) continue;
        const l = label.toLowerCase();
        if (l.includes('libre')) result[dateKey].diaLibre.push(groomer);
        else if (l.includes('injus')) result[dateKey].injustificada.push(groomer);
        else if (l.includes('jus') || l.includes('permiso') || l.includes('licencia')) result[dateKey].justificada.push(groomer);
        else result[dateKey].other.push(groomer);
      }
    }
    return result;
  });

  /** Filas de la tabla: encabezados de zona + groomers */
  tableRows = computed((): Array<
    | { type: 'zone-header'; zoneName: string; color: string }
    | { type: 'branch-subheader'; branchName: string; shortName: string; color: string; collapseKey: string }
    | { type: 'groomer'; employee: Employee }
    | { type: 'rotating-header' }
    | { type: 'spacer' }
  > => {
    const employees = this.groomerEmployees();
    const configMap = this.configMap();
    const zones = this.orderedZones();
    const filter = this.nameFilter().toLowerCase().trim();
    const activeZone = this.activeZone();

    // Aplicar filtro de nombre
    const matchesFilter = (e: Employee) =>
      !filter || `${e.first_name} ${e.father_name ?? ''}`.toLowerCase().includes(filter);

    // Separar rotativos del resto
    const rotating = employees.filter(e => configMap.get(e.id)?.is_rotating && matchesFilter(e));
    const nonRotating = employees.filter(e => !configMap.get(e.id)?.is_rotating && matchesFilter(e));

    const rows: Array<
      | { type: 'zone-header'; zoneName: string; color: string }
      | { type: 'branch-subheader'; branchName: string; shortName: string; color: string; collapseKey: string }
      | { type: 'groomer'; employee: Employee }
      | { type: 'rotating-header' }
      | { type: 'spacer' }
    > = [];

    // Helper: agrupa employees por sucursal y emite sub-headers + filas
    const addByBranch = (emps: Employee[], zonePrefix: string) => {
      const branchMap = new Map<string, { branch: Employee['branch']; employees: Employee[] }>();
      const noBranch: Employee[] = [];
      for (const emp of emps) {
        if (emp.branch) {
          if (!branchMap.has(emp.branch_id)) branchMap.set(emp.branch_id, { branch: emp.branch, employees: [] });
          branchMap.get(emp.branch_id)!.employees.push(emp);
        } else {
          noBranch.push(emp);
        }
      }
      const sorted = [...branchMap.values()].sort((a, b) => (a.branch?.name ?? '').localeCompare(b.branch?.name ?? ''));
      for (const group of sorted) {
        const collapseKey = `${zonePrefix}::${group.branch?.id ?? 'none'}`;
        rows.push({
          type: 'branch-subheader',
          branchName: group.branch?.name ?? '',
          shortName: group.branch?.short_name ?? '',
          color: this.getBranchColor(group.branch?.short_name ?? ''),
          collapseKey,
        });
        if (!this.collapsedBranches().has(collapseKey)) {
          group.employees.forEach(e => rows.push({ type: 'groomer', employee: e }));
        }
      }
      noBranch.forEach(e => rows.push({ type: 'groomer', employee: e }));
    };

    const addSpacer = () => rows.push({ type: 'spacer' as const });

    if (zones.length === 0) {
      // Sin zonas: solo agrupación por sucursal
      addByBranch(nonRotating, 'root');
    } else {
      let first = true;
      for (const zone of zones) {
        // Filtrar por zona activa
        if (activeZone && zone !== activeZone) continue;
        const inZone = nonRotating.filter(e => (configMap.get(e.id)?.zone ?? '') === zone);
        if (inZone.length === 0) continue;
        if (!first) addSpacer();
        first = false;
        rows.push({ type: 'zone-header', zoneName: zone, color: this.getZoneColor(zone) });
        addByBranch(inZone, zone);
      }
      // Sin zona (solo si no hay filtro de zona activa o la zona activa es nula)
      if (!activeZone) {
        const unzoned = nonRotating.filter(e => !configMap.get(e.id)?.zone);
        if (unzoned.length > 0) {
          if (!first) addSpacer();
          rows.push({ type: 'zone-header', zoneName: 'Sin zona', color: '#374151' });
          addByBranch(unzoned, '__unzoned__');
        }
      }
    }

    // Rotativos al final — sin sub-encabezados de sucursal (a menos que haya filtro de zona)
    if (rotating.length > 0 && !activeZone) {
      addSpacer();
      rows.push({ type: 'rotating-header' });
      rotating.forEach(e => rows.push({ type: 'groomer', employee: e }));
    }

    return rows;
  });

  getGroomersWithStatus(category: 'diaLibre' | 'injustificada' | 'justificada', day: Date): Employee[] {
    const dateKey = format(day, 'yyyy-MM-dd');
    return this.groomersByStatusAndDay()[dateKey]?.[category] ?? [];
  }

  groomerEmployees = computed((): Employee[] => {
    return this.store.employees
      .entities()
      .filter(
        (employee) => employee.is_active && this.groomerUtils.isGroomerPosition(employee)
      )
      .sort((a, b) => a.first_name.localeCompare(b.first_name));
  });


  private readonly branchColorPalette = [
    '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B',
    '#EF4444', '#06B6D4', '#EC4899', '#84CC16',
    '#F97316', '#14B8A6', '#A855F7', '#EAB308',
    '#22C55E', '#E11D48', '#0EA5E9', '#D946EF',
    '#6366F1', '#78716C', '#64748B', '#0D9488',
  ];

  /** Mapa sucursal short_name → color único por índice */
  private branchColorAssignment = computed((): Map<string, string> => {
    const branches = this.store.branches.entities()
      .filter(b => b.short_name)
      .sort((a, b) => (a.short_name ?? '').localeCompare(b.short_name ?? ''));
    const map = new Map<string, string>();
    branches.forEach((b, i) => {
      map.set(b.short_name!, this.branchColorPalette[i % this.branchColorPalette.length]);
    });
    return map;
  });

  getBranchColor(shortName: string): string {
    if (!shortName) return '#6B7280';
    return this.branchColorAssignment().get(shortName) ?? '#6B7280';
  }

  getAssignmentsForBranchDate(branchId: string, date: Date): GroomerBranchAssignment[] {
    const dateKey = format(date, 'yyyy-MM-dd');
    return this.assignments().filter(
      (a) => a.branch_id === branchId && this.dateKey(a.date) === dateKey
    );
  }

  onRemoveAssignment(event: { assignment: GroomerBranchAssignment }): void {
    // Parsear la fecha sin problemas de timezone (UTC midnight → día incorrecto en Panama UTC-5)
    const dateStr = typeof event.assignment.date === 'string'
      ? event.assignment.date.slice(0, 10)
      : format(event.assignment.date as Date, 'yyyy-MM-dd');
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d, 12, 0, 0, 0);

    if (event.assignment.employee) {
      this.removeAssignment(event.assignment.employee, date);
    } else {
      const employee = this.store.employees.entities().find((e) => e.id === event.assignment.employee_id);
      if (employee) {
        this.removeAssignment(employee, date);
      }
    }
  }

  onOpenAssignDialog(event: { branchId: string; date: Date }): void {
    this.selectedBranchId.set(event.branchId || undefined);
    this.selectedDate.set(event.date);
    this.selectedAssignment.set(undefined);
    this.dialogVisible.set(true);
  }

  openGroomerAssignDialog(employee: Employee, date: Date): void {
    this.selectedEmployee.set(employee);
    this.selectedDate.set(date);
    this.selectedBranchId.set(undefined);
    this.selectedAssignment.set(undefined);
    this.dialogVisible.set(true);
  }

  trackByBranchId(index: number, item: { branch: Branch }): string {
    return item.branch.id;
  }

  daysOfWeek = computed(() => {
    const start = this.currentWeekStart();
    const end = endOfWeek(start, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  });

  groomerEmployeesWithAssignments = computed((): GroomerWithAssignments[] => {
    const groomers = this.store.employees
      .entities()
      .filter(
        (employee) => employee.is_active && this.groomerUtils.isGroomerPosition(employee)
      )
      .sort((a, b) => a.first_name.localeCompare(b.first_name));

    const assignmentsMap = new Map<string, GroomerBranchAssignment[]>();
    this.assignments().forEach((assignment) => {
      const key = assignment.employee_id;
      if (!assignmentsMap.has(key)) {
        assignmentsMap.set(key, []);
      }
      assignmentsMap.get(key)!.push(assignment);
    });

    return groomers.map((employee) => {
      const employeeAssignments = assignmentsMap.get(employee.id) || [];
      const assignmentMap = new Map<string, GroomerBranchAssignment>();

      employeeAssignments.forEach((assignment) => {
        const dateKey = format(assignment.date, 'yyyy-MM-dd');
        assignmentMap.set(dateKey, assignment);
      });

      return {
        employee,
        assignments: assignmentMap,
      };
    });
  });

  // Navegación de semanas
  goToPreviousWeek(): void {
    this.currentWeekStart.set(addDays(this.currentWeekStart(), -7));
  }

  goToNextWeek(): void {
    this.currentWeekStart.set(addDays(this.currentWeekStart(), 7));
  }

  goToCurrentWeek(): void {
    this.currentWeekStart.set(startOfWeek(new Date(), { weekStartsOn: 0 }));
  }

  constructor() {
    // Effect para recargar datos cuando cambia la semana
    effect(() => {
      // Este effect se ejecuta cada vez que currentWeekStart cambia
      this.currentWeekStart(); // Leer el signal para activar el effect
      this.loadAssignments();
      this.loadNonWorkingDays();
    });
    // Cargar configs de peluqueros al inicio (no dependen de la semana)
    this.loadGroomerConfigs();
  }

  private loadGroomerConfigs(): void {
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return;
    const url = this.apiUrl.build('rest/v1/groomer_employee_config', {
      company_id: `eq.${companyId}`,
      select: '*',
    });
    this.http.get<GroomerEmployeeConfig[]>(url).subscribe({
      next: (configs) => this.groomerConfigs.set(configs),
      error: (e) => console.error('[SalonSchedule] Error cargando configs:', e),
    });
  }

  // Cargar asignaciones desde la API
  private loadAssignments(): void {
    const startDate = this.currentWeekStart();
    const endDate = endOfWeek(startDate, { weekStartsOn: 0 });

    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la compañía.',
      });
      return;
    }

    this.http
      .get<GroomerBranchAssignment[]>(
        this.apiUrl.build('rest/v1/groomer_branch_assignments', {
          and: `(date.gte.${format(startDate, 'yyyy-MM-dd')},date.lte.${format(
            endDate,
            'yyyy-MM-dd'
          )})`,
          company_id: `eq.${companyId}`,
          select:
            '*,branch:branches(id,name,short_name),employee:employees!groomer_branch_assignments_employee_id_fkey(id,first_name,father_name,position:positions(name))',
        }),
        {}
      )
      .subscribe({
        next: (assignments: GroomerBranchAssignment[]) => {
          this.assignments.set(assignments);
        },
        error: (error: any) => {
          console.error('[SalonSchedule] Error loading assignments:', error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al cargar las asignaciones de peluquería',
          });
          this.assignments.set([]);
        },
      });
  }

  /**
   * Cargar días no laborables desde Turnos:
   * employee_schedules donde schedule.day_off = true y el rango intersecta la semana actual.
   * Bloquea asignación de sucursal en esos días.
   */
  private loadNonWorkingDays(): void {
    const startDate = this.currentWeekStart();
    const endDate = endOfWeek(startDate, { weekStartsOn: 0 });

    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      this.nonWorkingMap.set({});
      return;
    }

    const groomerIds = this.store.employees
      .entities()
      .filter((e) => e.is_active && this.groomerUtils.isGroomerPosition(e))
      .map((e) => e.id);

    if (groomerIds.length === 0) {
      this.nonWorkingMap.set({});
      return;
    }

    this.http
      .get<any[]>(
        this.apiUrl.build('rest/v1/employee_schedules', {
          start_date: `lte.${format(endDate, 'yyyy-MM-dd')}`,
          end_date: `gte.${format(startDate, 'yyyy-MM-dd')}`,
          employee_id: `in.(${groomerIds.join(',')})`,
          ...(companyId ? { 'employee.company_id': `eq.${companyId}` } : {}),
          select:
            'employee_id,start_date,end_date,schedule:schedules(day_off,name),employee:employees!employee_schedule_employee_id_fkey(id,company_id)',
        }),
        {}
      )
      .subscribe({
        next: (
          rows: {
            employee_id: string;
            start_date: string;
            end_date: string;
            schedule: any;
          }[]
        ) => {
          const map: Record<string, string> = {};
          const days = eachDayOfInterval({ start: startDate, end: endDate });

          for (const row of rows || []) {
            const schedule = row.schedule;

            // Verificar si es un schedule no laborable
            const isNonWorking = this.isNonWorkingSchedule(schedule);
            if (!isNonWorking) {
              continue;
            }

            const rowStart = this.parseDateWithoutTimezone(row.start_date);
            const rowEnd = this.parseDateWithoutTimezone(row.end_date);

            for (const d of days) {
              // Crear fechas solo con año/mes/día para comparación
              const dDate = startOfDay(d);
              const startDateOnly = startOfDay(rowStart);
              const endDateOnly = startOfDay(rowEnd);

              // Comparación inclusive usando solo fecha (sin hora)
              if (dDate >= startDateOnly && dDate <= endDateOnly) {
                const key = `${row.employee_id}|${format(d, 'yyyy-MM-dd')}`;
                // Si hay varias, deja la primera
                if (!map[key]) {
                  map[key] = this.getScheduleLabel(schedule);
                }
              }
            }
          }

          this.nonWorkingMap.set(map);
        },
        error: (error: any) => {
          console.error(
            '[SalonSchedule] Error loading non-working days:',
            error
          );
          this.nonWorkingMap.set({});
        },
      });
  }

  isNonWorking(employeeId: string, date: Date): boolean {
    const key = `${employeeId}|${format(date, 'yyyy-MM-dd')}`;
    return !!this.nonWorkingMap()[key];
  }

  getNonWorkingLabel(employeeId: string, date: Date): string | null {
    const key = `${employeeId}|${format(date, 'yyyy-MM-dd')}`;
    return this.nonWorkingMap()[key] ?? null;
  }

  // Obtener asignación para empleado y fecha específica
  private dateKey(value: Date | string): string {
    // Supabase para columnas DATE suele devolver 'YYYY-MM-DD' (string).
    if (typeof value === 'string') return value.slice(0, 10);
    return format(value, 'yyyy-MM-dd');
  }

  getAssignmentForDate(
    employee: Employee,
    date: Date
  ): GroomerBranchAssignment | null {
    const dateKey = format(date, 'yyyy-MM-dd');
    const employeeAssignments = this.assignments().filter(
      (a) => a.employee_id === employee.id && this.dateKey(a.date) === dateKey
    );
    return employeeAssignments[0] || null;
  }

  // Asignar sucursal a empleado en fecha específica
  assignBranch(employee: Employee, date: Date, branch: Branch): void {
    if (this.isReadOnly()) {
      this.message.add({
        severity: 'warn',
        summary: 'Solo lectura',
        detail: 'Los gerentes de tienda solo pueden visualizar el horario.',
      });
      return;
    }
    if (!this.store.canManageSchedules()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'No tienes permisos para asignar sucursales.',
      });
      return;
    }

    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la compañía.',
      });
      return;
    }
    const currentEmployeeId = this.store.currentEmployee()?.id;

    if (!currentEmployeeId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar la compañía o el usuario actual.',
      });
      return;
    }

    // Buscar asignación actual (para UX)
    const existingAssignment = this.assignments().find(
      (a) =>
        a.employee_id === employee.id &&
        this.dateKey(a.date) === format(date, 'yyyy-MM-dd')
    );

    const assignmentData = {
      employee_id: employee.id,
      branch_id: branch.id,
      date: format(date, 'yyyy-MM-dd'),
      company_id: companyId,
      created_by: currentEmployeeId,
    };

    // UPSERT para evitar 409 (unique: company_id, employee_id, date)
    // PostgREST: on_conflict y Prefer: resolution=merge-duplicates
    this.http
      .post(
        this.apiUrl.build('rest/v1/groomer_branch_assignments', {
          on_conflict: 'company_id,employee_id,date',
          select:
            '*,branch:branches(id,name,short_name),employee:employees!groomer_branch_assignments_employee_id_fkey(id,first_name,father_name,position:positions(name))',
        }),
        assignmentData,
        {
          headers: {
            'Content-Type': 'application/json',
            Prefer: 'resolution=merge-duplicates,return=representation',
          },
        }
      )
      .subscribe({
        next: (resp: any) => {
          const saved = Array.isArray(resp) ? resp[0] : resp;
          if (!saved?.id) {
            // Fallback: recargar
            this.loadAssignments();
            return;
          }

          // Actualizar estado local: reemplazar si existe, si no agregar
          const withoutOld = this.assignments().filter(
            (a) => a.id !== saved.id
          );
          this.assignments.set([...withoutOld, saved]);

          const wasUpdate =
            !!existingAssignment && existingAssignment.branch_id !== branch.id;

          this.message.add({
            severity: 'success',
            summary: wasUpdate ? 'Actualizado' : 'Asignado',
            detail: wasUpdate
              ? `Sucursal actualizada para ${employee.first_name} ${employee.father_name}`
              : `Sucursal asignada para ${employee.first_name} ${employee.father_name}`,
          });
        },
        error: (error: any) => {
          console.error('[SalonSchedule] Error upserting assignment:', error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al guardar la asignación',
          });
        },
      });
  }

  // Remover asignación
  removeAssignment(employee: Employee, date: Date): void {
    if (this.isReadOnly()) {
      this.message.add({
        severity: 'warn',
        summary: 'Solo lectura',
        detail: 'Los gerentes de tienda solo pueden visualizar el horario.',
      });
      return;
    }

    const currentEmployeeId = this.store.currentEmployee()?.id;
    if (!currentEmployeeId) {
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo identificar el usuario actual.',
      });
      return;
    }

    // Buscar la asignación existente
    const existingAssignment = this.assignments().find(
      (a) =>
        a.employee_id === employee.id &&
        this.dateKey(a.date) === format(date, 'yyyy-MM-dd')
    );

    if (!existingAssignment) {
      this.message.add({
        severity: 'warn',
        summary: 'No encontrado',
        detail: 'No se encontró una asignación para remover.',
      });
      return;
    }

    // Eliminar la asignación
    this.http
      .delete(
        this.apiUrl.build('rest/v1/groomer_branch_assignments', {
          id: `eq.${existingAssignment.id}`,
        }),
        {}
      )
      .subscribe({
        next: () => {
          // Remover del estado local
          const updatedAssignments = this.assignments().filter(
            (a) => a.id !== existingAssignment.id
          );
          this.assignments.set(updatedAssignments);

          this.message.add({
            severity: 'success',
            summary: 'Removido',
            detail: `Asignación removida para ${employee.first_name} ${employee.father_name}`,
          });
        },
        error: (error: any) => {
          console.error('[SalonSchedule] Error deleting assignment:', error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Error al remover la asignación',
          });
        },
      });
  }

  // Formatear nombre completo del empleado
  getEmployeeFullName(employee: Employee): string {
    return `${employee.first_name} ${employee.father_name}`;
  }

  // Obtener semana actual formateada
  getCurrentWeekLabel(): string {
    const start = this.currentWeekStart();
    const end = endOfWeek(start, { weekStartsOn: 0 });
    const startStr = format(start, 'dd MMM', { locale: es });
    const endStr = format(end, 'dd MMM yyyy', { locale: es });
    return `${startStr} - ${endStr}`;
  }

  // Manejadores de eventos del componente de celda
  onEditAssignment(event: {
    assignment: GroomerBranchAssignment;
    date: Date;
  }): void {
    const employee =
      event.assignment.employee ||
      this.store.employees.entities().find((e) => e.id === event.assignment.employee_id);
    this.selectedEmployee.set(employee);
    this.selectedDate.set(event.date);
    this.selectedAssignment.set(event.assignment);
    this.selectedBranchId.set(undefined); // Permitir cambiar sucursal en edición
    this.dialogVisible.set(true);
  }

  // Manejadores del diálogo
  onDialogConfirm(result: GroomerBranchSelectionResult): void {
    if (result.scheduleId) {
      this.assignSchedule(result.employeeId, result.scheduleId, result.startDate, result.endDate);
    } else if (result.branchId) {
      const employee = this.store.employees.entities().find((e) => e.id === result.employeeId);
      const branch = this.store.branches.entities().find((b) => b.id === result.branchId);
      if (employee && branch) {
        const datesToAssign = eachDayOfInterval({ start: result.startDate, end: result.endDate });
        datesToAssign.forEach((date) => {
          this.assignBranch(employee, date, branch);
        });
      }
    }
    this.closeDialog();
  }

  private assignSchedule(employeeId: string, scheduleId: string, startDate: Date, endDate: Date): void {
    const companyId = this.organizationService.getCurrentCompanyId();
    const currentEmployeeId = this.store.currentEmployee()?.id ?? null;
    const payload: any = {
      employee_id: employeeId,
      schedule_id: scheduleId,
      start_date: format(startDate, 'yyyy-MM-dd'),
      end_date: format(endDate, 'yyyy-MM-dd'),
      branch_id: null,
      approved: true,
      approved_by: currentEmployeeId,
      company_id: companyId,
    };

    this.http
      .post(this.apiUrl.build('rest/v1/employee_schedules'), payload)
      .subscribe({
        next: () => {
          const scheduleName =
            this.store.schedules.entities().find((s: any) => s.id === scheduleId)?.name ?? 'Horario';
          this.message.add({
            severity: 'success',
            summary: 'Horario asignado',
            detail: `${scheduleName} asignado correctamente`,
          });
          this.loadNonWorkingDays();
        },
        error: (err: any) => {
          console.error('[SalonSchedule] Error asignando horario:', err);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No se pudo asignar el horario',
          });
        },
      });
  }

  onDialogCancel(): void {
    this.closeDialog();
  }

  private closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedEmployee.set(undefined);
    this.selectedDate.set(undefined);
    this.selectedAssignment.set(undefined);
    this.selectedBranchId.set(undefined);
  }

  /** Vista activa: horario semanal o top peluquería (subcomponente) */
  activeView = signal<'schedule' | 'top'>('schedule');

  setActiveView(view: 'schedule' | 'top'): void {
    this.activeView.set(view);
  }

  async exportToExcel() {
    try {
      const { utils, writeFile } = await import('xlsx');
      const startDate = this.currentWeekStart();
      const endDate = endOfWeek(startDate, { weekStartsOn: 0 }); // Domingo a sábado

      // Obtener todos los días de la semana
      const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

      // Obtener todos los peluqueros únicos
      const groomerEmployees = this.groomerEmployeesWithAssignments().map(
        (g) => g.employee
      );

      // Crear la estructura de datos para Excel
      const excelData = groomerEmployees.map((groomer) => {
        const row: any = {
          Peluquero: `${groomer.first_name} ${groomer.father_name}`,
          Cargo: groomer.position?.name || 'Peluquero',
        };

        // Agregar una columna por día de la semana
        weekDays.forEach((day) => {
          const assignment = this.getAssignmentForDate(groomer, day);
          const dayName = format(day, 'EEEE', { locale: es }); // Nombre del día en español
          const dateStr = format(day, 'dd/MM');

          // Verificar si es día no laborable
          const isNonWorking = this.isNonWorking(groomer.id, day);
          const nonWorkingLabel = this.getNonWorkingLabel(groomer.id, day);

          if (isNonWorking) {
            row[`${dayName} ${dateStr}`] = nonWorkingLabel;
          } else if (assignment) {
            row[`${dayName} ${dateStr}`] =
              assignment.branch?.short_name || 'N/A';
          } else {
            row[`${dayName} ${dateStr}`] = 'SIN ASIGNAR';
          }
        });

        return row;
      });

      // Crear la hoja de cálculo
      const ws = utils.json_to_sheet(excelData);

      // Configurar ancho de columnas
      const colWidths = [
        { wch: 25 }, // Peluquero
        { wch: 20 }, // Cargo
        ...weekDays.map(() => ({ wch: 15 })), // Una columna por día
      ];
      ws['!cols'] = colWidths;

      // Crear el libro de trabajo
      const wb = utils.book_new();

      // Agregar información del reporte
      const reportInfo = [
        ['HORARIO EQUIPO PELUQUERÍA'],
        ['Fecha de generación:', format(new Date(), 'dd/MM/yyyy HH:mm')],
        ['Semana del:', format(startDate, 'dd/MM/yyyy')],
        ['Al:', format(endDate, 'dd/MM/yyyy')],
        ['Total de peluqueros:', groomerEmployees.length],
        [''],
      ];

      const infoWs = utils.aoa_to_sheet(reportInfo);
      infoWs['!cols'] = [{ wch: 30 }, { wch: 30 }];

      // Agregar hojas al libro
      utils.book_append_sheet(wb, infoWs, 'Información');
      utils.book_append_sheet(wb, ws, 'Horario Peluquería');

      // Generar nombre del archivo
      const fileName = `HORARIO_PELUQUERIA_${format(
        startDate,
        'yyyyMMdd'
      )}_${format(endDate, 'yyyyMMdd')}.xlsx`;

      // Descargar el archivo
      writeFile(wb, fileName);

      this.message.add({
        severity: 'success',
        summary: 'Exportación exitosa',
        detail: `El archivo ${fileName} se ha descargado correctamente`,
      });
    } catch (error) {
      console.error('Error exportando a Excel:', error);
      this.message.add({
        severity: 'error',
        summary: 'Error en exportación',
        detail: 'Ocurrió un error al generar el archivo Excel',
      });
    }
  }

  // Helper para determinar si un schedule es considerado no laborable
  private isNonWorkingSchedule(schedule: any): boolean {
    if (!schedule) return false;

    // Schedule específico de feriados por ID
    if (schedule.id === '3d07f626-d58f-4203-bac5-f6e35557e0ad') return true;

    // Schedules con nombres que indican días no laborables
    const nonWorkingNames = [
      'feriado',
      'incapacidad',
      'vacaciones',
      'ausencia justificada',
      'a. justificada',
      'dia libre',
      'día libre',
      'd.l.',
      'dl',
      'permiso',
      'licencia',
      'reposo',
      'enfermedad',
      'ausencia',
      'baja',
      'suspensión',
      // Variaciones con años
      'vacaciones 202',
      'ausencia 202',
      // Abreviaturas comunes
      'vac',
      'incap',
      'dl',
      'd.l',
    ];

    const scheduleName = schedule.name?.toLowerCase() || '';
    return nonWorkingNames.some((name) => scheduleName.includes(name));
  }

  // Helper para parsear fechas sin problemas de zona horaria
  private parseDateWithoutTimezone(dateStr: string): Date {
    // Crear fecha a las 12:00:00 del día para evitar problemas de zona horaria
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day, 12, 0, 0, 0);
  }

  // Helper para obtener la etiqueta apropiada para un schedule no laborable
  private getScheduleLabel(schedule: any): string {
    if (!schedule) return 'NO LABORA';

    // Etiquetas específicas para ciertos tipos
    const scheduleName = schedule.name?.toLowerCase() || '';

    if (
      scheduleName.includes('feriado') ||
      schedule.id === '3d07f626-d58f-4203-bac5-f6e35557e0ad'
    ) {
      return 'Feriado';
    }
    if (scheduleName.includes('incapacidad')) {
      return 'Incapacidad';
    }
    if (scheduleName.includes('vacaci') || scheduleName.includes('vacione')) {
      return 'Vacaciones';
    }
    if (
      scheduleName.includes('ausencia justificada') ||
      scheduleName.includes('a. justificada')
    ) {
      return 'Ausencia Justificada';
    }
    if (
      scheduleName.includes('dia libre') ||
      scheduleName.includes('día libre')
    ) {
      return 'Día Libre';
    }

    // Para otros casos, usar el nombre del schedule o "NO LABORA"
    return schedule.name || 'NO LABORA';
  }

  // Función de track para optimizar el rendimiento de la tabla
  trackByEmployeeId(index: number, item: GroomerWithAssignments): string {
    return item.employee.id;
  }

  // Getter para acceder a funcionalidades del store desde el template
  get isAdmin(): boolean {
    return this.store.isAdmin();
  }
}
