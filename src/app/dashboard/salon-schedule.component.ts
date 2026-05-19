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
  untracked,
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
import { ConfirmationService, MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Popover } from 'primeng/popover';
import { Card } from 'primeng/card';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
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
    ConfirmDialogModule,
    TableModule,
    Button,
    Popover,
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
  private confirmService = inject(ConfirmationService);
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

  /** G3: realtime sync con la grilla de Turnos. Cuando alguien marca/desmarca rotativo allá, refleja aquí. */
  private configChanges = this.realtime.subscribeToTable('groomer_employee_config');
  private realtimeReloadConfigs = effect(() => {
    const batch = this.configChanges();
    if (!batch) return;
    this.loadGroomerConfigs();
  });

  /** Carga el setting strictAssignmentMode una vez al iniciar */
  private loadStrictModeEffect = effect(() => {
    // Llama solo una vez (sin dependencias dinámicas)
    untracked(() => this.loadStrictMode());
  });

  private async loadStrictMode(): Promise<void> {
    try {
      const rows = await firstValueFrom(
        this.http.get<any[]>(this.apiUrl.build('rest/v1/settings', {
          key: 'eq.salon_strict_assignment',
          select: 'id,value',
        }))
      );
      if (rows && rows.length > 0) {
        this.strictSettingId.set(rows[0].id);
        this.strictAssignmentMode.set(rows[0].value === 'true');
      }
    } catch (e) {
      console.warn('[SalonSchedule] Could not load strict mode setting', e);
    }
  }

  async toggleStrictMode(value: boolean): Promise<void> {
    if (this.isReadOnly()) return;
    this.savingStrictMode.set(true);
    try {
      const id = this.strictSettingId();
      if (id) {
        await firstValueFrom(
          this.http.patch(
            this.apiUrl.build('rest/v1/settings', { id: `eq.${id}` }),
            { value: value ? 'true' : 'false' },
            { headers: { Prefer: 'return=representation' } }
          )
        );
      } else {
        const created = await firstValueFrom(
          this.http.post<any[]>(this.apiUrl.build('rest/v1/settings'), {
            key: 'salon_strict_assignment',
            value: value ? 'true' : 'false',
            description: 'Si true, gerentes solo pueden agregar horarios desde salon-schedule',
            category: 'schedules',
            is_encrypted: false,
          }, { headers: { Prefer: 'return=representation' } })
        );
        if (Array.isArray(created) && created[0]?.id) {
          this.strictSettingId.set(created[0].id);
        }
      }
      this.strictAssignmentMode.set(value);
      this.message.add({
        severity: 'success',
        summary: 'Configuración guardada',
        detail: value
          ? 'Gerentes ahora solo pueden agregar horarios con asignación previa'
          : 'Gerentes pueden agregar horarios libremente',
        life: 2500,
      });
    } catch (e) {
      console.error('[SalonSchedule] toggleStrictMode error', e);
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar' });
    } finally {
      this.savingStrictMode.set(false);
    }
  }

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
  /** Map "<employeeId>|YYYY-MM-DD" → "HH:mm-HH:mm" para días con horario laborable asignado */
  scheduleTimesMap = signal<Record<string, string>>({});
  /** Map "<employeeId>|YYYY-MM-DD" → schedule_id para pre-llenar el dialog */
  scheduleIdMap = signal<Record<string, string>>({});
  /** Modo estricto: si true, los gerentes solo pueden agregar horarios desde salon-schedule (en espera) */
  strictAssignmentMode = signal<boolean>(false);
  private strictSettingId = signal<string | null>(null);
  savingStrictMode = signal<boolean>(false);

  /** Map "<employeeId>|YYYY-MM-DD" → schedule pendiente (existe en Turnos pero no en Salon) */
  pendingSchedulesMap = signal<Record<string, {
    branch_id: string;
    branch_name: string;
    branch_short_name: string;
    schedule_name: string;
    times: string;
    is_presence_only?: boolean;
    actual_entry_time?: string;
    suggested_schedule_id?: string;
    suggested_schedule_name?: string;
  }>>({});

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

  /** Zona derivada automáticamente de la sucursal asignada del peluquero */
  getGroomerZone(employeeId: string): string {
    const emp = this.store.employees.entities().find(e => e.id === employeeId);
    return emp?.branch?.zone ?? '';
  }

  /** Zona asignada a una sucursal */
  getBranchZone(branchId: string): string {
    const branch = this.store.branches.entities().find(b => b.id === branchId);
    return branch?.zone ?? '';
  }

  async toggleRotating(employeeId: string): Promise<void> {
    const current = this.configMap().get(employeeId);
    await this.upsertConfig(employeeId, {
      is_rotating: !(current?.is_rotating ?? false),
      zone: current?.zone ?? null,
    });
  }

  /** Asigna zona a una sucursal (no a un empleado) */
  async setBranchZone(branchId: string, zone: string | null): Promise<void> {
    const url = this.apiUrl.build('rest/v1/branches', { id: `eq.${branchId}` });
    try {
      await firstValueFrom(
        this.http.patch(url, { zone: zone || null }, {
          headers: { Prefer: 'return=representation' },
        })
      );
      // Recargar branches y employees para reflejar la nueva zona en la UI
      this.store.branches.reloadItems();
      this.store.employees.reloadItems();
    } catch (e) {
      console.error('[SalonSchedule] Error guardando zona de sucursal:', e);
      this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo guardar la zona' });
    }
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

  /** Zonas únicas disponibles como opciones del dropdown (derivadas de sucursales) */
  availableZones = computed((): string[] => {
    const zones = new Set<string>();
    for (const b of this.store.branches.entities()) {
      if (b.zone) zones.add(b.zone);
    }
    return [...zones].sort();
  });

  /** Lista ordenada de zonas únicas (desde sucursales) */
  orderedZones = computed((): string[] => {
    const set = new Set<string>();
    for (const b of this.store.branches.entities()) {
      if (b.zone) set.add(b.zone);
    }
    return [...set].sort();
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
    | { type: 'branch-subheader'; branchId: string; branchName: string; shortName: string; color: string; collapseKey: string }
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
      | { type: 'branch-subheader'; branchId: string; branchName: string; shortName: string; color: string; collapseKey: string }
      | { type: 'groomer'; employee: Employee }
      | { type: 'rotating-header' }
      | { type: 'spacer' }
    > = [];

    // Helper: emite filas de groomer ordenadas por sucursal (sin sub-headers)
    const addByBranch = (emps: Employee[], _zonePrefix: string) => {
      const sorted = [...emps].sort((a, b) => {
        const ba = a.branch?.name ?? '';
        const bb = b.branch?.name ?? '';
        if (ba !== bb) return ba.localeCompare(bb);
        return a.first_name.localeCompare(b.first_name);
      });
      sorted.forEach(e => rows.push({ type: 'groomer', employee: e }));
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
        const inZone = nonRotating.filter(e => ((e.branch?.zone ?? '') ?? '') === zone);
        if (inZone.length === 0) continue;
        if (!first) addSpacer();
        first = false;
        rows.push({ type: 'zone-header', zoneName: zone, color: this.getZoneColor(zone) });
        addByBranch(inZone, zone);
      }
      // Sin zona (solo si no hay filtro de zona activa o la zona activa es nula)
      if (!activeZone) {
        const unzoned = nonRotating.filter(e => !(e.branch?.zone ?? ''));
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
    this.selectedAssignment.set(undefined);
    // Si es una marcación detectada, pre-llenar branch desde la marcación
    const key = `${employee.id}|${format(date, 'yyyy-MM-dd')}`;
    const pending = this.pendingSchedulesMap()[key];
    if (pending?.is_presence_only && pending.branch_id) {
      this.selectedBranchId.set(pending.branch_id);
    } else {
      this.selectedBranchId.set(undefined);
    }
    this.dialogVisible.set(true);
  }

  trackByBranchId(index: number, item: { branch: Branch }): string {
    return item.branch.id;
  }

  /** Modo de visualización: semana (Dom-Sáb) o quincena (1-15 / 16-fin)
   *  Para gerentes (isReadOnly) siempre fuerza quincena.
   */
  private _viewMode = signal<'week' | 'biweek'>(
    typeof localStorage !== 'undefined' && localStorage.getItem('salon-viewMode') === 'biweek'
      ? 'biweek' : 'week'
  );
  viewMode = computed((): 'week' | 'biweek' => {
    if (this.isReadOnly()) return 'biweek';
    return this._viewMode();
  });

  setViewMode(mode: 'week' | 'biweek'): void {
    if (this.isReadOnly()) return; // gerentes siempre quincena
    this._viewMode.set(mode);
    if (typeof localStorage !== 'undefined') localStorage.setItem('salon-viewMode', mode);
    // Re-snap al periodo actual
    const today = new Date();
    if (mode === 'week') {
      this.currentWeekStart.set(startOfWeek(today, { weekStartsOn: 0 }));
    } else {
      const d = getDate(today);
      const start = d <= 15
        ? new Date(getYear(today), getMonth(today), 1)
        : new Date(getYear(today), getMonth(today), 16);
      this.currentWeekStart.set(start);
    }
  }

  /** Fin del periodo según modo */
  private periodEnd = computed((): Date => {
    const s = this.currentWeekStart();
    if (this.viewMode() === 'week') return endOfWeek(s, { weekStartsOn: 0 });
    const day = getDate(s);
    if (day <= 15) return new Date(getYear(s), getMonth(s), 15);
    return new Date(getYear(s), getMonth(s) + 1, 0); // último día del mes
  });

  daysOfWeek = computed(() => {
    return eachDayOfInterval({ start: this.currentWeekStart(), end: this.periodEnd() });
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

  // Navegación de periodos (semana o quincena)
  goToPreviousWeek(): void {
    const s = this.currentWeekStart();
    if (this.viewMode() === 'week') {
      this.currentWeekStart.set(addDays(s, -7));
      return;
    }
    const day = getDate(s);
    if (day === 1) {
      this.currentWeekStart.set(new Date(getYear(s), getMonth(s) - 1, 16));
    } else {
      this.currentWeekStart.set(new Date(getYear(s), getMonth(s), 1));
    }
  }

  goToNextWeek(): void {
    const s = this.currentWeekStart();
    if (this.viewMode() === 'week') {
      this.currentWeekStart.set(addDays(s, 7));
      return;
    }
    const day = getDate(s);
    if (day === 1) {
      this.currentWeekStart.set(new Date(getYear(s), getMonth(s), 16));
    } else {
      this.currentWeekStart.set(new Date(getYear(s), getMonth(s) + 1, 1));
    }
  }

  goToCurrentWeek(): void {
    this.setViewMode(this.viewMode());
  }

  constructor() {
    // Effect para recargar datos cuando cambia la semana
    effect(() => {
      // Este effect se ejecuta cada vez que currentWeekStart cambia
      this.currentWeekStart(); // Leer el signal para activar el effect
      this.loadAssignments();
      this.loadNonWorkingDays();
      this.loadAttendance();
    });
    // Cargar configs de peluqueros al inicio (no dependen de la semana)
    this.loadGroomerConfigs();
    // Para gerentes: forzar quincena al inicio y ajustar fecha al período de quincena actual
    if (this.isReadOnly()) {
      const today = new Date();
      const d = getDate(today);
      const start = d <= 15
        ? new Date(getYear(today), getMonth(today), 1)
        : new Date(getYear(today), getMonth(today), 16);
      this.currentWeekStart.set(start);
    }
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
    const endDate = this.periodEnd();

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
    const endDate = this.periodEnd();

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
            'employee_id,branch_id,schedule_id,start_date,end_date,schedule:schedules(id,day_off,name,entry_time,exit_time),employee:employees!employee_schedule_employee_id_fkey(id,company_id)',
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
          const timesMap: Record<string, string> = {};
          const scheduleIdMapLocal: Record<string, string> = {};
          const pendingMap: Record<string, {
            branch_id: string;
            branch_name: string;
            branch_short_name: string;
            schedule_name: string;
            times: string;
          }> = {};
          const days = eachDayOfInterval({ start: startDate, end: endDate });

          // Set rápido de assignments existentes en Salon (employee|date)
          const assignmentKeys = new Set<string>();
          for (const a of this.assignments()) {
            assignmentKeys.add(`${a.employee_id}|${this.dateKey(a.date)}`);
          }

          for (const row of rows || []) {
            const schedule = row.schedule;
            const isNonWorking = this.isNonWorkingSchedule(schedule);

            const rowStart = this.parseDateWithoutTimezone(row.start_date);
            const rowEnd = this.parseDateWithoutTimezone(row.end_date);

            for (const d of days) {
              const dDate = startOfDay(d);
              const startDateOnly = startOfDay(rowStart);
              const endDateOnly = startOfDay(rowEnd);

              if (dDate >= startDateOnly && dDate <= endDateOnly) {
                const key = `${row.employee_id}|${format(d, 'yyyy-MM-dd')}`;
                if (isNonWorking) {
                  if (!map[key]) {
                    map[key] = this.getScheduleLabel(schedule);
                  }
                } else if (schedule?.entry_time && schedule?.exit_time) {
                  const fmt = (t: string) => (t ?? '').slice(0, 5);
                  const times = `${fmt(schedule.entry_time)}-${fmt(schedule.exit_time)}`;
                  if (!timesMap[key]) timesMap[key] = times;
                  if (!scheduleIdMapLocal[key] && (schedule.id || (row as any).schedule_id)) {
                    scheduleIdMapLocal[key] = schedule.id ?? (row as any).schedule_id;
                  }
                  // Si existe horario en Turnos con branch_id pero NO hay assignment en Salon → pending
                  const branchId = (row as any).branch_id as string | undefined;
                  if (branchId && !assignmentKeys.has(key) && !pendingMap[key]) {
                    const branch = this.store.branches.entities().find((b: any) => b.id === branchId);
                    if (branch) {
                      pendingMap[key] = {
                        branch_id: branchId,
                        branch_name: branch.name ?? '',
                        branch_short_name: branch.short_name ?? '',
                        schedule_name: schedule.name ?? '',
                        times,
                      };
                    }
                  }
                }
              }
            }
          }

          this.nonWorkingMap.set(map);
          this.scheduleTimesMap.set(timesMap);
          this.scheduleIdMap.set(scheduleIdMapLocal);
          this.pendingSchedulesMap.set(pendingMap);
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

  getScheduleTimes(employeeId: string, date: Date): string | null {
    const key = `${employeeId}|${format(date, 'yyyy-MM-dd')}`;
    return this.scheduleTimesMap()[key] ?? null;
  }

  getScheduleIdForDay(employeeId: string, date: Date): string | undefined {
    const key = `${employeeId}|${format(date, 'yyyy-MM-dd')}`;
    return this.scheduleIdMap()[key];
  }

  /** Hora real de la marcación cuando se abre dialog desde una "presencia detectada" */
  selectedActualEntryTime = computed((): string | undefined => {
    const emp = this.selectedEmployee();
    const date = this.selectedDate();
    if (!emp || !date) return undefined;
    const key = `${emp.id}|${format(date, 'yyyy-MM-dd')}`;
    const pending = this.pendingSchedulesMap()[key];
    return pending?.is_presence_only ? pending.actual_entry_time : undefined;
  });

  /** Schedule id seleccionado actualmente para el dialog (existente o sugerido) */
  selectedScheduleId = computed((): string | undefined => {
    const emp = this.selectedEmployee();
    const date = this.selectedDate();
    if (!emp || !date) return undefined;
    const existing = this.getScheduleIdForDay(emp.id, date);
    if (existing) return existing;
    // Si no hay horario asignado pero existe sugerencia desde marcación → usarla
    const key = `${emp.id}|${format(date, 'yyyy-MM-dd')}`;
    return this.pendingSchedulesMap()[key]?.suggested_schedule_id;
  });

  /** Devuelve el schedule pendiente (existe en Turnos sin assignment en Salon) */
  getPendingSchedule(employeeId: string, date: Date) {
    const key = `${employeeId}|${format(date, 'yyyy-MM-dd')}`;
    return this.pendingSchedulesMap()[key] ?? null;
  }

  /** Lista total de pendientes para batch-accept */
  pendingCount = computed(() => Object.keys(this.pendingSchedulesMap()).length);

  /** Acepta un pendiente: crea el groomer_branch_assignment a partir del schedule existente */
  async acceptPending(employeeId: string, date: Date): Promise<void> {
    const pending = this.getPendingSchedule(employeeId, date);
    if (!pending) return;
    if (this.isReadOnly()) return;
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return;
    try {
      const payload = {
        employee_id: employeeId,
        branch_id: pending.branch_id,
        date: format(date, 'yyyy-MM-dd'),
        company_id: companyId,
      };
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/groomer_branch_assignments'), payload, {
          headers: { Prefer: 'return=representation' },
        })
      );
      this.message.add({
        severity: 'success',
        summary: 'Aceptado',
        detail: `Asignación creada en ${pending.branch_short_name || pending.branch_name}`,
        life: 2000,
      });
      // Recargar
      this.loadAssignments();
      // pendingMap se reconstruye al recargar nonWorkingDays (depende de assignments)
      setTimeout(() => this.loadNonWorkingDays(), 200);
    } catch (e) {
      console.error('[SalonSchedule] acceptPending error', e);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo aceptar la asignación',
      });
    }
  }

  /** Acepta TODOS los pendientes en una sola pasada */
  async acceptAllPending(): Promise<void> {
    if (this.isReadOnly()) return;
    const companyId = this.organizationService.getCurrentCompanyId();
    if (!companyId) return;
    const pending = this.pendingSchedulesMap();
    const entries = Object.entries(pending);
    if (entries.length === 0) return;
    const payload = entries.map(([key, p]) => {
      const [employee_id, date] = key.split('|');
      return {
        employee_id,
        branch_id: p.branch_id,
        date,
        company_id: companyId,
      };
    });
    try {
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/groomer_branch_assignments'), payload, {
          headers: { Prefer: 'return=representation' },
        })
      );
      this.message.add({
        severity: 'success',
        summary: 'Aceptados',
        detail: `${payload.length} asignación(es) creadas desde Turnos`,
      });
      this.loadAssignments();
      setTimeout(() => this.loadNonWorkingDays(), 200);
    } catch (e) {
      console.error('[SalonSchedule] acceptAllPending error', e);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo aceptar el batch',
      });
    }
  }

  getNonWorkingLabel(employeeId: string, date: Date): string | null {
    const key = `${employeeId}|${format(date, 'yyyy-MM-dd')}`;
    return this.nonWorkingMap()[key] ?? null;
  }

  /**
   * Colores por tipo de ausencia: fondo neutro gris con borde y texto por tipo.
   * Diseñado para NO chocar con la paleta saturada de sucursales — las celdas de ausencia
   * se distinguen por su fondo gris uniforme + acento sutil en borde/texto.
   */
  getNonWorkingColors(label: string | null | undefined): { bg: string; text: string; border: string } {
    const l = (label ?? '').toLowerCase();
    const baseBg = 'rgba(38,38,38,0.85)'; // gris oscuro uniforme
    if (l.includes('vacaci')) return { bg: baseBg, text: '#fde68a', border: '#f59e0b' };       // ámbar
    if (l.includes('libre')) return { bg: baseBg, text: '#e5e7eb', border: '#9ca3af' };         // gris claro
    if (l.includes('feriado')) return { bg: baseBg, text: '#fbcfe8', border: '#ec4899' };       // rosa
    if (l.includes('incapac') || l.includes('reposo') || l.includes('enferm'))
      return { bg: baseBg, text: '#fecaca', border: '#dc2626' };                                 // rojo
    if (l.includes('injus')) return { bg: baseBg, text: '#fca5a5', border: '#b91c1c' };         // rojo oscuro
    if (l.includes('jus') || l.includes('permiso') || l.includes('licencia'))
      return { bg: baseBg, text: '#fed7aa', border: '#ea580c' };                                 // naranja
    return { bg: baseBg, text: '#d4d4d8', border: '#71717a' };                                   // gris default
  }

  // Obtener asignación para empleado y fecha específica
  private dateKey(value: Date | string): string {
    // Supabase para columnas DATE suele devolver 'YYYY-MM-DD' (string).
    if (typeof value === 'string') return value.slice(0, 10);
    return format(value, 'yyyy-MM-dd');
  }

  /** Devuelve true si la sucursal tiene al menos un peluquero asignado ese día (incluye pendientes desde Turnos) */
  branchHasGroomerOnDay(branchId: string, date: Date): boolean {
    const dateKey = format(date, 'yyyy-MM-dd');
    const hasAssignment = this.assignments().some(
      (a) => a.branch_id === branchId && this.dateKey(a.date) === dateKey
    );
    if (hasAssignment) return true;
    // Pendientes (horarios en Turnos sin assignment en Salon) también cuentan como cobertura
    const pending = this.pendingSchedulesMap();
    for (const key in pending) {
      if (key.endsWith(`|${dateKey}`) && pending[key].branch_id === branchId) return true;
    }
    return false;
  }

  /** Lista de tiendas + días sin ningún peluquero asignado (incluye pendientes desde Turnos como cobertura) */
  emptyBranchDays = computed((): Array<{ branch: Branch; date: Date }> => {
    const out: Array<{ branch: Branch; date: Date }> = [];
    const branches = this.branchesWithAssignments().map((b) => b.branch);
    const days = this.daysOfWeek();
    const assignmentsList = this.assignments();
    const setKey = new Set<string>();
    for (const a of assignmentsList) {
      setKey.add(`${a.branch_id}|${this.dateKey(a.date)}`);
    }
    // Pendientes (horarios en Turnos sin assignment en Salon) también cuentan
    const pending = this.pendingSchedulesMap();
    for (const key in pending) {
      const dateKey = key.split('|')[1];
      setKey.add(`${pending[key].branch_id}|${dateKey}`);
    }
    for (const branch of branches) {
      for (const day of days) {
        const key = `${branch.id}|${format(day, 'yyyy-MM-dd')}`;
        if (!setKey.has(key)) out.push({ branch, date: day });
      }
    }
    return out;
  });

  /** Día seleccionado para el popover de tiendas sin peluquero */
  selectedMissingDay = signal<Date | null>(null);

  /** Empleado que se está editando desde el popover (cambiar sucursal / rotativo) */
  editingEmployee = signal<Employee | null>(null);

  /** Setter usado por el HTML antes de abrir el popover */
  setEditingEmployee(employee: Employee): boolean {
    this.editingEmployee.set(employee);
    return true;
  }

  async changeEmployeeMainBranch(employeeId: string, newBranchId: string): Promise<void> {
    if (!newBranchId) return;
    if (this.isReadOnly()) return;
    const employee = this.store.employees.entities().find((e) => e.id === employeeId);
    if (!employee) return;
    if (employee.branch_id === newBranchId) return; // no cambio
    const oldBranchId = employee.branch_id;
    const newBranch = this.store.branches.entities().find((b) => b.id === newBranchId);

    // Verificar si hay asignaciones futuras con la sucursal vieja
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    let futureAssignments: any[] = [];
    let futureSchedules: any[] = [];
    try {
      futureAssignments = await firstValueFrom(
        this.http.get<any[]>(this.apiUrl.build('rest/v1/groomer_branch_assignments', {
          employee_id: `eq.${employeeId}`,
          branch_id: `eq.${oldBranchId}`,
          date: `gte.${todayStr}`,
          select: 'id',
        }))
      ) ?? [];
      futureSchedules = await firstValueFrom(
        this.http.get<any[]>(this.apiUrl.build('rest/v1/employee_schedules', {
          employee_id: `eq.${employeeId}`,
          branch_id: `eq.${oldBranchId}`,
          end_date: `gte.${todayStr}`,
          select: 'id',
        }))
      ) ?? [];
    } catch (e) {
      console.warn('[SalonSchedule] error verificando futuros', e);
    }

    const totalToOverwrite = futureAssignments.length + futureSchedules.length;

    const doMainBranchUpdate = async () => {
      try {
        await firstValueFrom(
          this.http.patch(
            this.apiUrl.build('rest/v1/employees', { id: `eq.${employeeId}` }),
            { branch_id: newBranchId },
            { headers: { Prefer: 'return=representation' } }
          )
        );
        this.message.add({
          severity: 'success',
          summary: 'Sucursal actualizada',
          detail: `${employee.first_name} ahora pertenece a ${newBranch?.short_name ?? newBranch?.name ?? 'la nueva sucursal'}`,
          life: 2500,
        });
        this.store.employees.reloadItems();
      } catch (e) {
        console.error('[SalonSchedule] changeEmployeeMainBranch error', e);
        this.message.add({ severity: 'error', summary: 'Error', detail: 'No se pudo cambiar la sucursal' });
      }
    };

    const overwriteFuture = async () => {
      try {
        if (futureAssignments.length > 0) {
          await firstValueFrom(
            this.http.patch(
              this.apiUrl.build('rest/v1/groomer_branch_assignments', {
                employee_id: `eq.${employeeId}`,
                branch_id: `eq.${oldBranchId}`,
                date: `gte.${todayStr}`,
              }),
              { branch_id: newBranchId }
            )
          );
        }
        if (futureSchedules.length > 0) {
          await firstValueFrom(
            this.http.patch(
              this.apiUrl.build('rest/v1/employee_schedules', {
                employee_id: `eq.${employeeId}`,
                branch_id: `eq.${oldBranchId}`,
                end_date: `gte.${todayStr}`,
              }),
              { branch_id: newBranchId }
            )
          );
        }
        this.loadAssignments();
        setTimeout(() => this.loadNonWorkingDays(), 200);
      } catch (e) {
        console.error('[SalonSchedule] overwriteFuture error', e);
        this.message.add({ severity: 'warn', summary: 'Aviso', detail: 'Sucursal cambiada pero hubo error actualizando turnos futuros' });
      }
    };

    if (totalToOverwrite === 0) {
      await doMainBranchUpdate();
      return;
    }

    this.confirmService.confirm({
      header: 'Sobreescribir turnos futuros',
      message: `${employee.first_name} tiene ${futureAssignments.length} asignación(es) y ${futureSchedules.length} horario(s) futuros con la sucursal anterior. ¿Actualizarlos a ${newBranch?.short_name ?? 'la nueva sucursal'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, actualizar todo',
      rejectLabel: 'Solo cambiar sucursal principal',
      acceptButtonProps: { severity: 'warn' as any, label: 'Sí, actualizar todo' } as any,
      rejectButtonProps: { severity: 'secondary', outlined: true, label: 'Solo cambiar sucursal principal' } as any,
      accept: async () => {
        await doMainBranchUpdate();
        await overwriteFuture();
      },
      reject: async () => {
        await doMainBranchUpdate();
      },
    });
  }

  // ========== Toggles de visualización de cumplimiento (días pasados) ==========
  showAttendance = signal<boolean>(false);
  showLateness = signal<boolean>(false);
  showAbsences = signal<boolean>(false);

  /** Map "<employeeId>|YYYY-MM-DD" → estado del día */
  attendanceMap = signal<Record<string, {
    status: 'on_time' | 'late' | 'absent' | 'justified';
    late_minutes?: number;
    justification?: string;
    worked_hours?: number;
    branch_id?: string;
  }>>({});

  private async loadAttendance(): Promise<void> {
    const startDate = this.currentWeekStart();
    const endDate = this.periodEnd();
    if (!this.showAttendance() && !this.showLateness() && !this.showAbsences()) {
      this.attendanceMap.set({});
      return;
    }
    try {
      const fromIso = startDate.toISOString();
      const toEnd = new Date(endDate);
      toEnd.setHours(23, 59, 59, 999);
      const toIso = toEnd.toISOString();
      // Cargar timelogs tipo entry del periodo (fuente de marcaciones reales actuales)
      const url = `${this.apiUrl.baseUrl}/rest/v1/timelogs?type=eq.entry&created_at=gte.${encodeURIComponent(fromIso)}&created_at=lte.${encodeURIComponent(toIso)}&select=employee_id,branch_id,created_at,type&order=created_at.asc&limit=5000`;
      const rows = await firstValueFrom(this.http.get<any[]>(url));
      const map: Record<string, any> = {};
      // Por empleado/día tomar la PRIMERA marcación tipo 'entry'
      for (const r of rows ?? []) {
        const d = new Date(r.created_at);
        const dateStr = format(d, 'yyyy-MM-dd');
        const key = `${r.employee_id}|${dateStr}`;
        if (map[key]) continue; // Ya tomamos la primera
        // Determinar status comparando con schedule del día (si existe)
        const scheduleId = this.scheduleIdMap()[key];
        let status: 'on_time' | 'late' | 'absent' | 'justified' = 'on_time';
        let lateMin = 0;
        if (scheduleId) {
          const schedule = (this.store.schedules.entities() ?? []).find((s: any) => s.id === scheduleId);
          if (schedule?.entry_time) {
            const [hh, mm] = (schedule.entry_time as string).split(':').map((x: string) => parseInt(x, 10));
            const expected = new Date(d);
            expected.setHours(hh, mm || 0, 0, 0);
            const tolerance = (schedule.minutes_tolerance ?? 0) * 60 * 1000;
            const diffMs = d.getTime() - expected.getTime();
            if (diffMs > tolerance) {
              status = 'late';
              lateMin = Math.round(diffMs / 60000);
            }
          }
        }
        map[key] = {
          status,
          late_minutes: lateMin,
          justification: '',
          worked_hours: undefined,
          branch_id: r.branch_id,
          entry_time_iso: r.created_at,
        };
      }
      // Detectar AUSENCIAS: días pasados con asignación o horario pero sin timelog
      const days = eachDayOfInterval({ start: startDate, end: endDate }).filter((d) => this.isPastDay(d));
      const groomerIds = this.groomerEmployees().map((e) => e.id);
      const assignmentSet = new Set<string>();
      for (const a of this.assignments()) {
        assignmentSet.add(`${a.employee_id}|${this.dateKey(a.date)}`);
      }
      for (const empId of groomerIds) {
        for (const day of days) {
          const dateStr = format(day, 'yyyy-MM-dd');
          const key = `${empId}|${dateStr}`;
          if (map[key]) continue; // ya tiene marcación
          const hasAssignment = assignmentSet.has(key);
          const hasSchedule = !!this.scheduleIdMap()[key];
          const isNonWork = !!this.nonWorkingMap()[key];
          if ((hasAssignment || hasSchedule) && !isNonWork) {
            map[key] = {
              status: 'absent',
              late_minutes: 0,
              justification: '',
              worked_hours: 0,
              branch_id: undefined,
              entry_time_iso: undefined,
            };
          }
        }
      }
      this.attendanceMap.set(map);
      try {
        this.mergePresencePending();
      } catch (err) {
        console.error('[SalonSchedule] mergePresencePending error', err);
      }
    } catch (e) {
      console.error('[SalonSchedule] loadAttendance error', e);
    }
  }

  /** Si un peluquero marcó entrada en una sucursal pero no hay assignment ni schedule en Turnos
   *  para ese día → lo agregamos a pendingSchedulesMap como "presencia detectada" para que
   *  RRHH lo apruebe.
   */
  private mergePresencePending(): void {
    const att = this.attendanceMap() as any;
    const existingPending = { ...this.pendingSchedulesMap() };
    const assignmentKeys = new Set<string>();
    for (const a of this.assignments()) {
      assignmentKeys.add(`${a.employee_id}|${this.dateKey(a.date)}`);
    }
    const schedules = (this.store.schedules.entities() ?? []).filter(
      (s: any) => !s.day_off && s.entry_time
    );
    let added = 0;
    for (const key in att) {
      const a = att[key];
      if (!a.branch_id) continue;
      if (a.status === 'absent') continue;
      if (assignmentKeys.has(key)) continue;
      if (existingPending[key] && !existingPending[key].is_presence_only) continue;
      const branch = this.store.branches.entities().find((b: any) => b.id === a.branch_id);
      if (!branch) continue;

      // Calcular schedule sugerido desde entry_time real
      const suggestion = this.suggestScheduleFromEntry(a.entry_time_iso, schedules);

      const entryHHMM = this.extractHHMM(a.entry_time_iso);
      existingPending[key] = {
        branch_id: a.branch_id,
        branch_name: branch.name,
        branch_short_name: branch.short_name ?? branch.name,
        schedule_name: suggestion?.name ?? 'Marcación sin asignación',
        times: entryHHMM ? `${entryHHMM} (marcó)` : '',
        is_presence_only: true,
        actual_entry_time: entryHHMM ?? undefined,
        suggested_schedule_id: suggestion?.id,
        suggested_schedule_name: suggestion?.name,
      };
      added++;
    }
    if (added > 0) this.pendingSchedulesMap.set(existingPending);
  }

  private extractHHMM(iso?: string | null): string | null {
    if (!iso) return null;
    try {
      const d = new Date(iso);
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      return `${hh}:${mm}`;
    } catch {
      return null;
    }
  }

  /** Encuentra el schedule cuyo entry_time esté más cerca del entry_time real */
  private suggestScheduleFromEntry(
    entryIso: string | null | undefined,
    schedules: any[]
  ): { id: string; name: string } | null {
    if (!entryIso || schedules.length === 0) return null;
    const d = new Date(entryIso);
    const actualMin = d.getHours() * 60 + d.getMinutes();
    let best: any = null;
    let bestDiff = Infinity;
    for (const s of schedules) {
      const t = (s.entry_time as string | null) ?? '';
      const [hh, mm] = t.split(':').map((x) => parseInt(x, 10));
      if (isNaN(hh)) continue;
      const sMin = hh * 60 + (mm || 0);
      const diff = Math.abs(sMin - actualMin);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = s;
      }
    }
    if (!best) return null;
    return { id: best.id, name: best.name };
  }

  toggleShowAttendance(value: boolean): void {
    this.showAttendance.set(value);
    this.loadAttendance();
  }
  toggleShowLateness(value: boolean): void {
    this.showLateness.set(value);
    this.loadAttendance();
  }
  toggleShowAbsences(value: boolean): void {
    this.showAbsences.set(value);
    this.loadAttendance();
  }

  isPastDay(date: Date): boolean {
    return startOfDay(date) < startOfDay(new Date());
  }

  getAttendanceStatus(employeeId: string, date: Date) {
    if (!this.isPastDay(date)) return null;
    const key = `${employeeId}|${format(date, 'yyyy-MM-dd')}`;
    return this.attendanceMap()[key] ?? null;
  }

  /** Lista de short_names de sucursales sin peluquero ese día */
  missingBranchesForDay = (date: Date): Branch[] => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return this.emptyBranchDays()
      .filter((e) => format(e.date, 'yyyy-MM-dd') === dateStr)
      .map((e) => e.branch);
  };

  /** True si algún branch no tiene peluquero asignado ese día */
  isDayMissingGroomers = (date: Date): boolean => {
    return this.emptyBranchDays().some(
      (e) => format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd')
    );
  };

  /** Resumen agrupado por día: cada día con la lista de tiendas vacías */
  emptyDaysSummary = computed((): Array<{ date: Date; branches: Branch[] }> => {
    const days = this.daysOfWeek();
    const empty = this.emptyBranchDays();
    return days
      .map((date) => ({
        date,
        branches: empty
          .filter((e) => format(e.date, 'yyyy-MM-dd') === format(date, 'yyyy-MM-dd'))
          .map((e) => e.branch),
      }))
      .filter((d) => d.branches.length > 0);
  });

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
    const end = this.periodEnd();
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
    this.selectedBranchId.set(event.assignment.branch_id); // Pre-fill con la sucursal actual
    this.dialogVisible.set(true);
  }

  // Manejadores del diálogo
  onDialogConfirm(result: GroomerBranchSelectionResult): void {
    // Si vienen ambos (schedule + branch) → crear schedule CON branch + crear groomer_branch_assignment
    if (result.scheduleId && result.branchId) {
      this.assignScheduleAndBranch(
        result.employeeId,
        result.scheduleId,
        result.branchId,
        result.startDate,
        result.endDate
      );
    } else if (result.scheduleId) {
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

  private async assignScheduleAndBranch(
    employeeId: string,
    scheduleId: string,
    branchId: string,
    startDate: Date,
    endDate: Date
  ): Promise<void> {
    const companyId = this.organizationService.getCurrentCompanyId();
    const currentEmployeeId = this.store.currentEmployee()?.id ?? null;
    const employee = this.store.employees.entities().find((e) => e.id === employeeId);
    const branch = this.store.branches.entities().find((b) => b.id === branchId);
    if (!employee || !branch) return;
    try {
      // 1) Crear el employee_schedule con branch_id
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/employee_schedules'), {
          employee_id: employeeId,
          schedule_id: scheduleId,
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          branch_id: branchId,
          approved: true,
          approved_by: currentEmployeeId,
          company_id: companyId,
        })
      );
      // 2) Crear los groomer_branch_assignments para cada día
      const dates = eachDayOfInterval({ start: startDate, end: endDate });
      const assignmentPayload = dates.map((d) => ({
        employee_id: employeeId,
        branch_id: branchId,
        date: format(d, 'yyyy-MM-dd'),
        company_id: companyId,
      }));
      await firstValueFrom(
        this.http.post(this.apiUrl.build('rest/v1/groomer_branch_assignments'), assignmentPayload)
      );
      this.message.add({
        severity: 'success',
        summary: 'Asignado',
        detail: `Horario y sucursal (${branch.short_name ?? branch.name}) asignados a ${employee.first_name}`,
        life: 2500,
      });
      this.loadAssignments();
      setTimeout(() => this.loadNonWorkingDays(), 200);
    } catch (e) {
      console.error('[SalonSchedule] assignScheduleAndBranch error', e);
      this.message.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo asignar horario + sucursal',
      });
    }
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
      const endDate = this.periodEnd();

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
