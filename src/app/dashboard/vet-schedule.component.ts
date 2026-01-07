import { DatePipe, NgClass, registerLocaleData } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import esLocale from '@angular/common/locales/es';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
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
import { utils, writeFile } from 'xlsx';

// Registrar locale español para Angular
registerLocaleData(esLocale);

import { Branch, Employee, VetBranchAssignment } from '../models';
import { ApiUrlService } from '../services/api-url.service';
import { OrganizationService } from '../services/organization.service';
import { VetBranchAuditService } from '../services/vet-branch-audit.service';
import { DashboardStore } from '../stores/dashboard.store';
import { VetScheduleDataService } from './services/vet-schedule-data.service';
import { VetScheduleUtilsService } from './services/vet-schedule-utils.service';
import { VetBranchCellComponent } from './vet-branch-cell.component';
import { VetBranchSelectionDialogComponent } from './vet-branch-selection-dialog.component';

type VetWithAssignments = {
  employee: Employee;
  assignments: Map<string, VetBranchAssignment>; // date string -> assignment
};

@Component({
  selector: 'pt-vet-schedule',
  imports: [
    Card,
    TableModule,
    Button,
    NgClass,
    FormsModule,
    Tag,
    DatePipe,
    VetBranchCellComponent,
    VetBranchSelectionDialogComponent,
  ],
  providers: [DynamicDialogRef, DialogService],
  templateUrl: './vet-schedule.component.html',
  styles: [
    `
      .vet-schedule-header {
        @apply flex items-center justify-between w-full;
      }

      .vet-schedule-title {
        @apply m-0;
      }

      .vet-schedule-subtitle {
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
export class VetScheduleComponent {
  private store = inject(DashboardStore);
  private http = inject(HttpClient);
  private organizationService = inject(OrganizationService);
  private message = inject(MessageService);
  private dialogService = inject(DialogService);
  private apiUrl = inject(ApiUrlService);
  private auditService = inject(VetBranchAuditService);
  private dataService = inject(VetScheduleDataService);
  private utils = inject(VetScheduleUtilsService);
  private cdr = inject(ChangeDetectorRef);
  private ref = inject(DynamicDialogRef);

  // Estado del componente
  currentWeekStart = signal<Date>(startOfWeek(new Date(), { weekStartsOn: 0 })); // Domingo
  assignments = signal<VetBranchAssignment[]>([]);
  nonWorkingMap = signal<Record<string, string>>({});

  // Estado del diálogo
  dialogVisible = signal<boolean>(false);
  selectedEmployee = signal<Employee | undefined>(undefined);
  selectedDate = signal<Date | undefined>(undefined);
  selectedAssignment = signal<VetBranchAssignment | undefined>(undefined);

  // Computed signals
  branches = computed(() => this.store.branches.entities());

  daysOfWeek = computed(() => {
    const start = this.currentWeekStart();
    const end = endOfWeek(start, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  });

  vetEmployeesWithAssignments = computed((): VetWithAssignments[] => {
    const vets = this.store.employees
      .entities()
      .filter(
        (employee) => employee.is_active && this.utils.isVetPosition(employee)
      )
      .sort((a, b) => a.first_name.localeCompare(b.first_name));

    const assignmentsMap = new Map<string, VetBranchAssignment[]>();
    this.assignments().forEach((assignment) => {
      const key = assignment.employee_id;
      if (!assignmentsMap.has(key)) {
        assignmentsMap.set(key, []);
      }
      assignmentsMap.get(key)!.push(assignment);
    });

    return vets.map((employee) => {
      const employeeAssignments = assignmentsMap.get(employee.id) || [];
      const assignmentMap = new Map<string, VetBranchAssignment>();

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
  }

  // Cargar asignaciones desde la API
  private loadAssignments(): void {
    this.dataService.loadAssignments(this.currentWeekStart()).subscribe({
      next: (assignments: VetBranchAssignment[]) => {
        this.assignments.set(assignments);
        this.cdr.markForCheck();
      },
      error: (error: any) => {
        console.error('[VetSchedule] Error loading assignments:', error);
        this.message.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al cargar las asignaciones veterinarias',
        });
        this.assignments.set([]);
        this.cdr.markForCheck();
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

    const vetIds = this.store.employees
      .entities()
      .filter((e) => e.is_active && this.utils.isVetPosition(e))
      .map((e) => e.id);

    if (vetIds.length === 0) {
      this.nonWorkingMap.set({});
      return;
    }

    this.http
      .get<any[]>(
        this.apiUrl.build('rest/v1/employee_schedules', {
          start_date: `lte.${format(endDate, 'yyyy-MM-dd')}`,
          end_date: `gte.${format(startDate, 'yyyy-MM-dd')}`,
          employee_id: `in.(${vetIds.join(',')})`,
          ...(companyId ? { 'employee.company_id': `eq.${companyId}` } : {}),
          select:
            'employee_id,start_date,end_date,schedule:schedules(day_off,name),employee:employees(id,company_id)',
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
            const isNonWorking = this.utils.isNonWorkingSchedule(schedule);
            if (!isNonWorking) {
              continue;
            }

            const rowStart = this.utils.parseDateWithoutTimezone(
              row.start_date
            );
            const rowEnd = this.utils.parseDateWithoutTimezone(row.end_date);

            for (const d of days) {
              // Crear fechas solo con año/mes/día para comparación
              const dDate = new Date(
                d.getFullYear(),
                d.getMonth(),
                d.getDate()
              );
              const startDateOnly = new Date(
                rowStart.getFullYear(),
                rowStart.getMonth(),
                rowStart.getDate()
              );
              const endDateOnly = new Date(
                rowEnd.getFullYear(),
                rowEnd.getMonth(),
                rowEnd.getDate()
              );

              // Comparación inclusive usando solo fecha (sin hora)
              if (dDate >= startDateOnly && dDate <= endDateOnly) {
                const key = `${row.employee_id}|${format(d, 'yyyy-MM-dd')}`;
                // Si hay varias, deja la primera
                if (!map[key]) {
                  map[key] = this.utils.getScheduleLabel(schedule);
                }
              }
            }
          }

          this.nonWorkingMap.set(map);
          this.cdr.markForCheck();
        },
        error: (error: any) => {
          console.error('[VetSchedule] Error loading non-working days:', error);
          this.nonWorkingMap.set({});
          this.cdr.markForCheck();
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
  ): VetBranchAssignment | null {
    const dateKey = format(date, 'yyyy-MM-dd');
    const employeeAssignments = this.assignments().filter(
      (a) => a.employee_id === employee.id && this.dateKey(a.date) === dateKey
    );
    return employeeAssignments[0] || null;
  }

  // Asignar sucursal a empleado en fecha específica
  assignBranch(employee: Employee, date: Date, branch: Branch): void {
    if (!this.store.isAdmin()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo los administradores pueden asignar sucursales.',
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

    // Buscar asignación actual (para auditoría/UX)
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
    };

    this.dataService
      .assignBranch(employee.id, branch.id, date, currentEmployeeId)
      .subscribe({
        next: (resp: VetBranchAssignment[]) => {
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
          this.cdr.markForCheck(); // Forzar detección de cambios

          const wasUpdate =
            !!existingAssignment && existingAssignment.branch_id !== branch.id;

          this.message.add({
            severity: 'success',
            summary: wasUpdate ? 'Actualizado' : 'Asignado',
            detail: wasUpdate
              ? `Sucursal actualizada para ${employee.first_name} ${employee.father_name}`
              : `Sucursal asignada para ${employee.first_name} ${employee.father_name}`,
          });

          // Auditoría
          this.auditService.logChange({
            vetBranchAssignmentId: saved.id,
            changedBy: currentEmployeeId,
            action: wasUpdate ? 'updated' : 'assigned',
            oldBranchId: existingAssignment?.branch_id,
            newBranchId: branch.id,
            oldValue: existingAssignment
              ? { branch_id: existingAssignment.branch_id }
              : null,
            newValue: { ...assignmentData },
            comment: wasUpdate
              ? `Cambio de sucursal: ${
                  existingAssignment?.branch?.short_name || 'N/A'
                } → ${branch.short_name}`
              : `Asignación inicial de sucursal: ${branch.short_name}`,
          });
        },
        error: (error: any) => {
          console.error('[VetSchedule] Error upserting assignment:', error);
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
    if (!this.store.isAdmin()) {
      this.message.add({
        severity: 'warn',
        summary: 'Sin permisos',
        detail: 'Solo los administradores pueden remover asignaciones.',
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

    this.dataService.deleteAssignment(existingAssignment.id).subscribe({
      next: (): void => {
        // Remover del estado local
        const updatedAssignments = this.assignments().filter(
          (a) => a.id !== existingAssignment.id
        );
        this.assignments.set(updatedAssignments);
        this.cdr.markForCheck(); // Forzar detección de cambios

        this.message.add({
          severity: 'success',
          summary: 'Removido',
          detail: `Asignación removida para ${employee.first_name} ${employee.father_name}`,
        });

        // Registrar en auditoría
        this.auditService.logChange({
          vetBranchAssignmentId: existingAssignment.id,
          changedBy: currentEmployeeId,
          action: 'unassigned',
          oldBranchId: existingAssignment.branch_id,
          oldValue: {
            branch_id: existingAssignment.branch_id,
            date: existingAssignment.date,
          },
          comment: `Remoción de asignación de sucursal: ${
            existingAssignment.branch?.short_name || 'N/A'
          }`,
        });
      },
      error: (error: any) => {
        console.error('[VetSchedule] Error deleting assignment:', error);
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
    assignment: VetBranchAssignment;
    date: Date;
  }): void {
    // Abrir diálogo para cambiar sucursal
    this.selectedEmployee.set(event.assignment.employee);
    this.selectedDate.set(event.date);
    this.selectedAssignment.set(event.assignment);
    this.dialogVisible.set(true);
  }

  onDeleteAssignment(event: {
    assignment: VetBranchAssignment;
    date: Date;
  }): void {
    this.removeAssignment(event.assignment.employee!, event.date);
  }

  onAddAssignment(event: { employeeId: string; date: Date }): void {
    const employee = this.store.employees
      .entities()
      .find((e) => e.id === event.employeeId);
    if (employee) {
      // Abrir diálogo para seleccionar sucursal
      this.selectedEmployee.set(employee);
      this.selectedDate.set(event.date);
      this.selectedAssignment.set(undefined);
      this.dialogVisible.set(true);
    }
  }

  onViewAudit(event: { employeeId: string; date: Date }): void {
    this.message.add({
      severity: 'info',
      summary: 'Funcionalidad pendiente',
      detail: 'Vista de auditoría próximamente',
    });
  }

  // Manejadores del diálogo
  onDialogConfirm(selectedBranchId: string): void {
    const employee = this.selectedEmployee();
    const date = this.selectedDate();
    const assignment = this.selectedAssignment();

    if (employee && date) {
      const selectedBranch = this.store.branches
        .entities()
        .find((b) => b.id === selectedBranchId);
      if (selectedBranch) {
        this.assignBranch(employee, date, selectedBranch);
      }
    }

    this.closeDialog();
  }

  onDialogCancel(): void {
    this.closeDialog();
  }

  private closeDialog(): void {
    this.dialogVisible.set(false);
    this.selectedEmployee.set(undefined);
    this.selectedDate.set(undefined);
    this.selectedAssignment.set(undefined);
  }

  exportToExcel() {
    try {
      const startDate = this.currentWeekStart();
      const endDate = endOfWeek(startDate, { weekStartsOn: 0 }); // Domingo a sábado

      // Obtener todos los días de la semana
      const weekDays = eachDayOfInterval({ start: startDate, end: endDate });

      // Obtener todos los veterinarios únicos
      const vetEmployees = this.vetEmployeesWithAssignments().map(
        (v) => v.employee
      );

      // Crear la estructura de datos para Excel
      const excelData = vetEmployees.map((vet) => {
        const row: any = {
          'Médico Veterinario': `${vet.first_name} ${vet.father_name}`,
          Cargo: vet.position?.name || 'Médico Veterinario',
        };

        // Agregar una columna por día de la semana
        weekDays.forEach((day) => {
          const assignment = this.getAssignmentForDate(vet, day);
          const dayName = format(day, 'EEEE', { locale: es }); // Nombre del día en español
          const dateStr = format(day, 'dd/MM');

          // Verificar si es día no laborable
          const isNonWorking = this.isNonWorking(vet.id, day);
          const nonWorkingLabel = this.getNonWorkingLabel(vet.id, day);

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
        { wch: 25 }, // Médico Veterinario
        { wch: 20 }, // Cargo
        ...weekDays.map(() => ({ wch: 15 })), // Una columna por día
      ];
      ws['!cols'] = colWidths;

      // Crear el libro de trabajo
      const wb = utils.book_new();

      // Agregar información del reporte
      const reportInfo = [
        ['HORARIO EQUIPO MÉDICO VETERINARIO'],
        ['Fecha de generación:', format(new Date(), 'dd/MM/yyyy HH:mm')],
        ['Semana del:', format(startDate, 'dd/MM/yyyy')],
        ['Al:', format(endDate, 'dd/MM/yyyy')],
        ['Total de médicos:', vetEmployees.length],
        [''],
      ];

      const infoWs = utils.aoa_to_sheet(reportInfo);
      infoWs['!cols'] = [{ wch: 30 }, { wch: 30 }];

      // Agregar hojas al libro
      utils.book_append_sheet(wb, infoWs, 'Información');
      utils.book_append_sheet(wb, ws, 'Horario Veterinario');

      // Generar nombre del archivo
      const fileName = `HORARIO_VETERINARIO_${format(
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
    if (scheduleName.includes('vacaciones')) {
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
  trackByEmployeeId(index: number, item: VetWithAssignments): string {
    return item.employee.id;
  }

  // Getter para acceder a funcionalidades del store desde el template
  get isAdmin(): boolean {
    return this.store.isAdmin();
  }
}
