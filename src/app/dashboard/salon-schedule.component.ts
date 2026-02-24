import { DatePipe, registerLocaleData } from '@angular/common';
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
  startOfWeek,
} from 'date-fns';
import { es } from 'date-fns/locale';
import { MessageService } from 'primeng/api';
import { Button } from 'primeng/button';
import { Card } from 'primeng/card';
import { DialogService, DynamicDialogRef } from 'primeng/dynamicdialog';
import { TableModule } from 'primeng/table';
import { Tag } from 'primeng/tag';
// Registrar locale español para Angular
registerLocaleData(esLocale);

import { Branch, Employee, GroomerBranchAssignment } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { DashboardStore } from '../stores/dashboard.store';
import { GroomerScheduleUtilsService } from './services/groomer-schedule-utils.service';
import { GroomerBranchCellComponent } from './groomer-branch-cell.component';
import { GroomerBranchSelectionDialogComponent } from './groomer-branch-selection-dialog.component';

type BranchWithAssignments = {
  branch: Branch;
  assignments: Map<string, GroomerBranchAssignment[]>; // dateKey → assignments
};

@Component({
  selector: 'pt-salon-schedule',
  imports: [
    Card,
    TableModule,
    Button,
    FormsModule,
    Tag,
    DatePipe,
    GroomerBranchCellComponent,
    GroomerBranchSelectionDialogComponent,
  ],
  providers: [DynamicDialogRef, DialogService],
  templateUrl: './salon-schedule.component.html',
  styles: [
    `
      .groomer-schedule-header {
        @apply flex items-center justify-between w-full;
      }

      .groomer-schedule-title {
        @apply m-0;
      }

      .groomer-schedule-subtitle {
        @apply text-sm text-gray-400 m-0 mt-1;
      }

      .week-navigation {
        @apply flex items-center gap-2;
      }

      .branch-cell {
        @apply text-center min-w-[80px] max-w-[80px] p-1;
      }

      .branch-tag {
        @apply text-xs font-bold;
      }

      .empty-state {
        @apply text-center py-12;
      }

      .empty-state-icon {
        @apply text-4xl text-gray-400 mb-4;
      }

      .empty-state-text {
        @apply text-gray-400 text-lg;
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
  private groomerUtils = inject(GroomerScheduleUtilsService);

  // Mapa de colores por sucursal
  readonly branchColors: Record<string, string> = {
    ' AF': '#6AA84F',
    ' BV': '#D5A6BD',
    ' CV': '#F1C232',
    ' PE': '#8E7CC3',
    ' SM': '#FCE5CD',
    VZ: '#CFE2F3',
    ' OM': '#F28E86',
    ' C50': '#B6D7A8',
    ' BM': '#CBAB7F',
    BN: '#10B981',
    ' CDR': '#3B82F6',
    CM: '#8B5CF6',
    DVD: '#EF4444',
    OF: '#F59E0B',
    'BO-DC': '#EC4899',
    'VS ': '#06B6D4',
    NZ: '#84CC16',
  };

  // Estado del componente
  currentWeekStart = signal<Date>(startOfWeek(new Date(), { weekStartsOn: 0 }));
  assignments = signal<GroomerBranchAssignment[]>([]);
  nonWorkingMap = signal<Record<string, string>>({});

  // Estado del diálogo
  dialogVisible = signal<boolean>(false);
  selectedBranchId = signal<string | undefined>(undefined);
  selectedDate = signal<Date | undefined>(undefined);
  selectedAssignment = signal<GroomerBranchAssignment | undefined>(undefined);

  // Computed: días de la semana
  daysOfWeek = computed(() => {
    const start = this.currentWeekStart();
    const end = endOfWeek(start, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  });

  // Lista de groomers activos para los dropdowns
  groomerEmployees = computed(() => {
    return this.store.employees
      .entities()
      .filter((e) => e.is_active && this.groomerUtils.isGroomerPosition(e))
      .sort((a, b) => a.first_name.localeCompare(b.first_name));
  });

  // Sucursales activas (excluyendo Bodega y Oficina)
  activeBranches = computed(() => {
    return this.store.branches
      .entities()
      .filter(
        (b) =>
          b.is_active &&
          b.name !== 'Bodega Dos Caminos' &&
          b.id !== '7862b9be-890d-4432-8a2f-9329a15a2853'
      );
  });

  // Map: dateKey → Set de employee_ids ya asignados ese día
  assignedEmployeeIdsForDate = computed(() => {
    const map = new Map<string, Set<string>>();
    for (const a of this.assignments()) {
      const dateKey = this.dateKey(a.date);
      if (!map.has(dateKey)) map.set(dateKey, new Set());
      map.get(dateKey)!.add(a.employee_id);
    }
    return map;
  });

  // GRILLA INVERTIDA: filas = sucursales
  branchesWithAssignments = computed((): BranchWithAssignments[] => {
    const branches = this.activeBranches();
    const allAssignments = this.assignments();

    const byBranch = new Map<string, Map<string, GroomerBranchAssignment[]>>();
    for (const a of allAssignments) {
      if (!byBranch.has(a.branch_id)) byBranch.set(a.branch_id, new Map());
      const dateKey = this.dateKey(a.date);
      const dateMap = byBranch.get(a.branch_id)!;
      if (!dateMap.has(dateKey)) dateMap.set(dateKey, []);
      dateMap.get(dateKey)!.push(a);
    }

    return branches.map((branch) => ({
      branch,
      assignments: byBranch.get(branch.id) || new Map(),
    }));
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
    effect(() => {
      this.currentWeekStart();
      this.loadAssignments();
      this.loadNonWorkingDays();
    });
  }

  // Cargar asignaciones
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
          and: `(date.gte.${format(startDate, 'yyyy-MM-dd')},date.lte.${format(endDate, 'yyyy-MM-dd')})`,
          company_id: `eq.${companyId}`,
          select:
            '*,branch:branches(id,name,short_name),employee:employees(id,first_name,father_name,position:positions(name))',
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

  // Cargar días no laborables
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
            'employee_id,start_date,end_date,schedule:schedules(day_off,name),employee:employees(id,company_id)',
        }),
        {}
      )
      .subscribe({
        next: (rows: { employee_id: string; start_date: string; end_date: string; schedule: any }[]) => {
          const map: Record<string, string> = {};
          const days = eachDayOfInterval({ start: startDate, end: endDate });

          for (const row of rows || []) {
            const schedule = row.schedule;
            if (!this.groomerUtils.isNonWorkingSchedule(schedule)) continue;

            const rowStart = this.groomerUtils.parseDateWithoutTimezone(row.start_date);
            const rowEnd = this.groomerUtils.parseDateWithoutTimezone(row.end_date);

            for (const d of days) {
              const dDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());
              const startDateOnly = new Date(rowStart.getFullYear(), rowStart.getMonth(), rowStart.getDate());
              const endDateOnly = new Date(rowEnd.getFullYear(), rowEnd.getMonth(), rowEnd.getDate());

              if (dDate >= startDateOnly && dDate <= endDateOnly) {
                const key = `${row.employee_id}|${format(d, 'yyyy-MM-dd')}`;
                if (!map[key]) map[key] = this.groomerUtils.getScheduleLabel(schedule);
              }
            }
          }

          this.nonWorkingMap.set(map);
        },
        error: (error: any) => {
          console.error('[SalonSchedule] Error loading non-working days:', error);
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

  private dateKey(value: Date | string): string {
    if (typeof value === 'string') return value.slice(0, 10);
    return format(value, 'yyyy-MM-dd');
  }

  // Obtener asignaciones para una sucursal y fecha
  getAssignmentsForBranchDate(branchId: string, date: Date): GroomerBranchAssignment[] {
    const dateKey = format(date, 'yyyy-MM-dd');
    return this.assignments().filter(
      (a) => a.branch_id === branchId && this.dateKey(a.date) === dateKey
    );
  }

  // Obtener empleados disponibles para un día
  getAvailableGroomersForDate(date: Date): Employee[] {
    const dateKey = format(date, 'yyyy-MM-dd');
    const assignedIds = this.assignedEmployeeIdsForDate().get(dateKey) || new Set();
    const nonWorking = this.nonWorkingMap();

    return this.groomerEmployees().filter((e) => {
      if (assignedIds.has(e.id)) return false;
      const nwKey = `${e.id}|${dateKey}`;
      if (nonWorking[nwKey]) return false;
      return true;
    });
  }

  // Asignar groomer a sucursal en fecha
  assignGroomerToBranch(branchId: string, date: Date, employeeId: string): void {
    if (!this.store.isAdmin()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo los administradores pueden asignar peluqueros.',
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

    const employee = this.store.employees.entities().find((e) => e.id === employeeId);

    const assignmentData = {
      employee_id: employeeId,
      branch_id: branchId,
      date: format(date, 'yyyy-MM-dd'),
      company_id: companyId,
    };

    this.http
      .post(
        this.apiUrl.build('rest/v1/groomer_branch_assignments', {
          on_conflict: 'company_id,employee_id,date',
          select:
            '*,branch:branches(id,name,short_name),employee:employees(id,first_name,father_name,position:positions(name))',
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
            this.loadAssignments();
            return;
          }

          const withoutOld = this.assignments().filter((a) => a.id !== saved.id);
          this.assignments.set([...withoutOld, saved]);

          this.message.add({
            severity: 'success',
            summary: 'Asignado',
            detail: `${employee?.first_name || 'Peluquero'} asignado correctamente`,
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
  removeAssignment(assignmentId: string): void {
    if (!this.store.isAdmin()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo los administradores pueden remover asignaciones.',
      });
      return;
    }

    this.http
      .delete(
        this.apiUrl.build('rest/v1/groomer_branch_assignments', {
          id: `eq.${assignmentId}`,
        }),
        {}
      )
      .subscribe({
        next: () => {
          const updated = this.assignments().filter((a) => a.id !== assignmentId);
          this.assignments.set(updated);

          this.message.add({
            severity: 'success',
            summary: 'Removido',
            detail: 'Asignación removida correctamente',
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

  getBranchColor(shortName: string): string {
    return this.branchColors[shortName] || '#6B7280';
  }

  getCurrentWeekLabel(): string {
    const start = this.currentWeekStart();
    const end = endOfWeek(start, { weekStartsOn: 0 });
    const startStr = format(start, 'dd MMM', { locale: es });
    const endStr = format(end, 'dd MMM yyyy', { locale: es });
    return `${startStr} - ${endStr}`;
  }

  // Eventos desde celda
  onAssignGroomer(event: { branchId: string; date: Date; employeeId: string }): void {
    this.assignGroomerToBranch(event.branchId, event.date, event.employeeId);
  }

  onRemoveAssignment(event: { assignment: GroomerBranchAssignment }): void {
    this.removeAssignment(event.assignment.id);
  }

  onOpenBulkAssign(event: { branchId: string; date: Date }): void {
    this.selectedBranchId.set(event.branchId);
    this.selectedDate.set(event.date);
    this.selectedAssignment.set(undefined);
    this.dialogVisible.set(true);
  }

  // Diálogo
  onDialogConfirm(result: any): void {
    const branchId = this.selectedBranchId();
    let employeeId: string;
    let startDate: Date;
    let endDate: Date;

    if (typeof result === 'string') {
      employeeId = result;
      startDate = this.selectedDate()!;
      endDate = this.selectedDate()!;
    } else {
      employeeId = result.employeeId;
      startDate = result.startDate;
      endDate = result.endDate;
    }

    if (branchId && employeeId) {
      const datesToAssign = eachDayOfInterval({ start: startDate, end: endDate });
      datesToAssign.forEach((date) => {
        this.assignGroomerToBranch(branchId, date, employeeId);
      });
    }

    this.closeDialog();
  }

  onDialogCancel(): void {
    this.closeDialog();
  }

  private closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedBranchId.set(undefined);
    this.selectedDate.set(undefined);
    this.selectedAssignment.set(undefined);
  }

  async exportToExcel() {
    try {
      const { utils, writeFile } = await import('xlsx');
      const startDate = this.currentWeekStart();
      const endDate = endOfWeek(startDate, { weekStartsOn: 0 });
      const weekDays = eachDayOfInterval({ start: startDate, end: endDate });
      const branches = this.branchesWithAssignments();

      const excelData = branches.map((branchData) => {
        const row: any = {
          Sucursal: branchData.branch.name,
        };

        weekDays.forEach((day) => {
          const dateKey = format(day, 'yyyy-MM-dd');
          const dayAssignments = branchData.assignments.get(dateKey) || [];
          const dayName = format(day, 'EEEE', { locale: es });
          const dateStr = format(day, 'dd/MM');

          if (dayAssignments.length > 0) {
            row[`${dayName} ${dateStr}`] = dayAssignments
              .map(
                (a) =>
                  `${a.employee?.first_name || ''} ${a.employee?.father_name || ''}`
              )
              .join(', ');
          } else {
            row[`${dayName} ${dateStr}`] = '';
          }
        });

        return row;
      });

      const ws = utils.json_to_sheet(excelData);
      const colWidths = [
        { wch: 25 },
        ...weekDays.map(() => ({ wch: 30 })),
      ];
      ws['!cols'] = colWidths;

      const wb = utils.book_new();
      const reportInfo = [
        ['HORARIO EQUIPO PELUQUERÍA'],
        ['Fecha de generación:', format(new Date(), 'dd/MM/yyyy HH:mm')],
        ['Semana del:', format(startDate, 'dd/MM/yyyy')],
        ['Al:', format(endDate, 'dd/MM/yyyy')],
        ['Total de sucursales:', branches.length],
        [''],
      ];

      const infoWs = utils.aoa_to_sheet(reportInfo);
      infoWs['!cols'] = [{ wch: 30 }, { wch: 30 }];

      utils.book_append_sheet(wb, infoWs, 'Información');
      utils.book_append_sheet(wb, ws, 'Horario Peluquería');

      const fileName = `HORARIO_PELUQUERIA_${format(startDate, 'yyyyMMdd')}_${format(endDate, 'yyyyMMdd')}.xlsx`;
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

  trackByBranchId(index: number, item: BranchWithAssignments): string {
    return item.branch.id;
  }

  get isAdmin(): boolean {
    return this.store.isAdmin();
  }
}
