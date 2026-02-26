import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import {
  addDays,
  format,
  isSameDay,
  subDays,
} from 'date-fns';
import { toDate } from 'date-fns-tz';
import { es } from 'date-fns/locale';
import { ConfirmationService, MessageService } from 'primeng/api';
import { catchError, EMPTY, forkJoin } from 'rxjs';
import { v4 } from 'uuid';
import { EmployeeSchedule } from '../../models';
import { ApiUrlService } from '../../services/api-url.service';
import { OrganizationService } from '../../services/organization.service';
import { ScheduleAuditService } from '../../services/schedule-audit.service';

export interface ScheduleActionContext {
  currentEmployeeId: string | undefined;
  schedules: Array<{ id: string; name?: string }>;
  employees: Array<{ id: string; first_name: string; father_name: string }>;
  branches: Array<{ id: string; name: string }>;
}

@Injectable()
export class TimetableScheduleActionsService {
  private http = inject(HttpClient);
  private apiUrl = inject(ApiUrlService);
  private confirm = inject(ConfirmationService);
  private message = inject(MessageService);
  private organizationService = inject(OrganizationService);
  private auditService = inject(ScheduleAuditService);

  /**
   * Delete a schedule (or a single day from a multi-day range).
   * Returns an observable that callers can subscribe to for reload.
   */
  deleteSchedule(
    employeeSchedule: EmployeeSchedule,
    date: Date | undefined,
    context: ScheduleActionContext,
    onSuccess: () => void
  ): void {
    const message = date
      ? '¿Estás seguro de eliminar el horario de este día específico?'
      : '¿Estás seguro de eliminar este horario?';

    this.confirm.confirm({
      header: 'Eliminar horario',
      message,
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Eliminar',
        severity: 'danger',
      },
      accept: async () => {
        const companyId = this.organizationService.getCurrentCompanyId();

        if (date && employeeSchedule) {
          const startDateObj = toDate(employeeSchedule.start_date, {
            timeZone: 'America/Panama',
          });
          const endDateObj = toDate(employeeSchedule.end_date, {
            timeZone: 'America/Panama',
          });
          const dateObj = toDate(date, { timeZone: 'America/Panama' });
          const isSingleDay = isSameDay(startDateObj, endDateObj);
          const dateIsInRange =
            dateObj >= startDateObj && dateObj <= endDateObj;

          if (!isSingleDay && dateIsInRange) {
            this.deleteSingleDayFromRange(
              employeeSchedule,
              dateObj,
              companyId,
              context,
              onSuccess
            );
            return;
          }
        }

        const params: any = { id: `eq.${employeeSchedule.id}` };
        if (companyId) {
          params.company_id = `eq.${companyId}`;
        }

        // Log audit BEFORE deleting (CASCADE issues)
        if (context.currentEmployeeId) {
          await this.logDeleteAudit(employeeSchedule, date, context);
        }

        this.http
          .delete(this.apiUrl.build('rest/v1/employee_schedules'), { params })
          .pipe(
            catchError((error) => {
              console.error(error);
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al eliminar el horario',
              });
              return EMPTY;
            })
          )
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario eliminado correctamente',
              });
              onSuccess();
            },
          });
      },
    });
  }

  /**
   * Approve a single schedule.
   */
  approveSchedule(
    id: string,
    shifts: any[],
    context: ScheduleActionContext,
    onSuccess: () => void
  ): void {
    this.confirm.confirm({
      header: 'Confirma horario?',
      message: '¿Estás seguro de aprobar este horario?',
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Aprobar',
        severity: 'success',
      },
      accept: async () => {
        const companyId = this.organizationService.getCurrentCompanyId();
        const params: any = { id: `eq.${id}` };
        if (companyId) {
          params.company_id = `eq.${companyId}`;
        }

        const scheduleToApprove = shifts.find((s) => s.id === id);

        if (context.currentEmployeeId && scheduleToApprove) {
          await this.logApproveAudit(id, scheduleToApprove, context);
        }

        this.http
          .patch(
            this.apiUrl.build('rest/v1/employee_schedules'),
            { approved: true },
            { params }
          )
          .pipe(
            catchError((error) => {
              console.error('Error en aprobación:', error);
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al aprobar el horario',
              });
              return EMPTY;
            })
          )
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: 'Horario aprobado correctamente',
              });
              onSuccess();
            },
          });
      },
    });
  }

  /**
   * Batch-approve multiple schedules.
   */
  batchApproveSchedules(
    ids: string[],
    visualCount: number,
    shifts: any[],
    context: ScheduleActionContext,
    onSuccess: () => void
  ): void {
    if (ids.length === 0) return;

    this.confirm.confirm({
      header: 'Aprobar múltiples horarios?',
      message: `¿Estás seguro de aprobar ${visualCount} turno${
        visualCount > 1 ? 's' : ''
      } (correspondientes a ${ids.length} registro${
        ids.length > 1 ? 's' : ''
      } de horario)?`,
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Aprobar todos',
        severity: 'success',
      },
      accept: async () => {
        const companyId = this.organizationService.getCurrentCompanyId();

        // Audit each change
        for (const id of ids) {
          const scheduleToApprove = shifts.find((s) => s.id === id);
          if (context.currentEmployeeId && scheduleToApprove) {
            const schedule = context.schedules.find(
              (s) => s.id === scheduleToApprove.schedule_id
            );
            const employee = context.employees.find(
              (e) => e.id === scheduleToApprove.employee_id
            );

            const startDateFormatted = format(
              toDate(scheduleToApprove.start_date, {
                timeZone: 'America/Panama',
              }),
              'dd/MM/yyyy'
            );

            await this.auditService.logChange({
              employeeScheduleId: id,
              changedBy: context.currentEmployeeId,
              action: 'approved',
              oldStatus: scheduleToApprove.approved || false,
              newStatus: true,
              oldValue: { approved: false },
              newValue: { approved: true },
              comment: `Aprobación masiva: "${
                schedule?.name || 'Desconocido'
              }" para ${
                employee
                  ? `${employee.first_name} ${employee.father_name}`
                  : 'empleado'
              } (${startDateFormatted})`,
            });
          }
        }

        // Batch approve - build query string manually for PostgREST
        const url = this.apiUrl.build('rest/v1/employee_schedules');
        const queryParams = [];
        queryParams.push(`id=in.(${ids.join(',')})`);
        if (companyId) {
          queryParams.push(`company_id=eq.${companyId}`);
        }
        const fullUrl = `${url}?${queryParams.join('&')}`;

        this.http
          .patch(fullUrl, { approved: true })
          .pipe(
            catchError((error) => {
              console.error('Error en aprobación masiva:', error);
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al aprobar los horarios',
              });
              return EMPTY;
            })
          )
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `${ids.length} registro(s) aprobado(s) correctamente`,
              });
              onSuccess();
            },
          });
      },
    });
  }

  /**
   * Confirm (approve) all pending schedules for an employee's week.
   */
  confirmEmployeeWeek(
    employee: any,
    context: ScheduleActionContext,
    onSuccess: () => void
  ): void {
    const pendingShifts = employee.days
      .filter((d: any) => d.shift && !d.shift.approved)
      .map((d: any) => d.shift);

    if (pendingShifts.length === 0) return;

    this.confirm.confirm({
      header: 'Confirmar semana?',
      message: `¿Estás seguro de aprobar todos los horarios (${pendingShifts.length}) de ${employee.first_name} para esta semana?`,
      icon: 'pi pi-info-circle',
      rejectButtonProps: {
        label: 'Cancelar',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Aprobar todo',
        severity: 'success',
      },
      accept: async () => {
        const companyId = this.organizationService.getCurrentCompanyId();
        const shiftIds = pendingShifts.map((s: any) => s.id);

        if (context.currentEmployeeId) {
          for (const shiftToApprove of pendingShifts) {
            const schedule = context.schedules.find(
              (s) => s.id === shiftToApprove.schedule_id
            );
            const employeeData = context.employees.find(
              (e) => e.id === shiftToApprove.employee_id
            );
            const branch = context.branches.find(
              (b) => b.id === shiftToApprove.branch_id
            );

            const startDateFormatted = format(
              toDate(shiftToApprove.start_date, { timeZone: 'America/Panama' }),
              'dd/MM/yyyy'
            );
            const endDateFormatted = format(
              toDate(shiftToApprove.end_date, { timeZone: 'America/Panama' }),
              'dd/MM/yyyy'
            );

            await this.auditService.logChange({
              employeeScheduleId: shiftToApprove.id,
              changedBy: context.currentEmployeeId,
              action: 'approved',
              oldStatus: false,
              newStatus: true,
              comment: `Aprobación masiva semanal: Horario "${
                schedule?.name || 'Desconocido'
              }" aprobado para ${
                employeeData
                  ? `${employeeData.first_name} ${employeeData.father_name}`
                  : 'empleado'
              } (${startDateFormatted} - ${endDateFormatted})`,
            });
          }
        }

        const params: any = { id: `in.(${shiftIds.join(',')})` };
        if (companyId) params.company_id = `eq.${companyId}`;

        this.http
          .patch(
            this.apiUrl.build('rest/v1/employee_schedules'),
            { approved: true },
            { params }
          )
          .pipe(
            catchError((error) => {
              console.error('Error aprobando semana:', error);
              this.message.add({
                severity: 'error',
                summary: 'Error',
                detail: 'Ha ocurrido un error al aprobar los horarios',
              });
              return EMPTY;
            })
          )
          .subscribe({
            next: () => {
              this.message.add({
                severity: 'success',
                summary: 'Éxito',
                detail: `Se han aprobado ${pendingShifts.length} horarios correctamente`,
              });
              onSuccess();
            },
          });
      },
    });
  }

  // ========== Private Helpers ==========

  private deleteSingleDayFromRange(
    schedule: EmployeeSchedule,
    dateToDelete: Date,
    companyId: string | null,
    context: ScheduleActionContext,
    onSuccess: () => void
  ): void {
    const startDateObj = toDate(schedule.start_date, {
      timeZone: 'America/Panama',
    });
    const endDateObj = toDate(schedule.end_date, {
      timeZone: 'America/Panama',
    });
    const requests: any[] = [];

    if (isSameDay(startDateObj, dateToDelete)) {
      if (addDays(dateToDelete, 1) <= endDateObj) {
        const updateData: any = {
          start_date: format(addDays(dateToDelete, 1), 'yyyy-MM-dd'),
          end_date: format(endDateObj, 'yyyy-MM-dd'),
          schedule_id: schedule.schedule_id,
          branch_id: schedule.branch_id,
          approved: schedule.approved,
        };
        if (companyId) updateData.company_id = companyId;
        requests.push(
          this.http.patch(
            this.apiUrl.build('rest/v1/employee_schedules'),
            updateData,
            {
              params: {
                id: `eq.${schedule.id}`,
                ...(companyId ? { company_id: `eq.${companyId}` } : {}),
              },
            }
          )
        );
      } else {
        const params: any = { id: `eq.${schedule.id}` };
        if (companyId) params.company_id = `eq.${companyId}`;
        requests.push(
          this.http.delete(this.apiUrl.build('rest/v1/employee_schedules'), {
            params,
          })
        );
      }
    } else if (isSameDay(endDateObj, dateToDelete)) {
      if (subDays(dateToDelete, 1) >= startDateObj) {
        const updateData: any = {
          start_date: format(startDateObj, 'yyyy-MM-dd'),
          end_date: format(subDays(dateToDelete, 1), 'yyyy-MM-dd'),
          schedule_id: schedule.schedule_id,
          branch_id: schedule.branch_id,
          approved: schedule.approved,
        };
        if (companyId) updateData.company_id = companyId;
        requests.push(
          this.http.patch(
            this.apiUrl.build('rest/v1/employee_schedules'),
            updateData,
            {
              params: {
                id: `eq.${schedule.id}`,
                ...(companyId ? { company_id: `eq.${companyId}` } : {}),
              },
            }
          )
        );
      } else {
        const params: any = { id: `eq.${schedule.id}` };
        if (companyId) params.company_id = `eq.${companyId}`;
        requests.push(
          this.http.delete(this.apiUrl.build('rest/v1/employee_schedules'), {
            params,
          })
        );
      }
    } else {
      // Day is in the middle - split into two ranges
      const updateData1: any = {
        start_date: format(startDateObj, 'yyyy-MM-dd'),
        end_date: format(subDays(dateToDelete, 1), 'yyyy-MM-dd'),
        schedule_id: schedule.schedule_id,
        branch_id: schedule.branch_id,
        approved: schedule.approved,
      };
      if (companyId) updateData1.company_id = companyId;
      requests.push(
        this.http.patch(
          this.apiUrl.build('rest/v1/employee_schedules'),
          updateData1,
          {
            params: {
              id: `eq.${schedule.id}`,
              ...(companyId ? { company_id: `eq.${companyId}` } : {}),
            },
          }
        )
      );

      if (addDays(dateToDelete, 1) <= endDateObj) {
        const createData2: any = {
          id: v4(),
          employee_id: schedule.employee_id,
          schedule_id: schedule.schedule_id,
          branch_id: schedule.branch_id,
          start_date: format(addDays(dateToDelete, 1), 'yyyy-MM-dd'),
          end_date: format(endDateObj, 'yyyy-MM-dd'),
          approved: schedule.approved,
        };
        if (companyId) createData2.company_id = companyId;
        requests.push(
          this.http.post(
            this.apiUrl.build('rest/v1/employee_schedules'),
            createData2
          )
        );
      }
    }

    forkJoin(requests)
      .pipe(
        catchError((error) => {
          console.error(error);
          this.message.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Ha ocurrido un error al eliminar el horario',
          });
          return EMPTY;
        })
      )
      .subscribe({
        next: async () => {
          if (context.currentEmployeeId) {
            await this.logSplitRangeAudit(
              schedule,
              dateToDelete,
              context
            );
          }

          this.message.add({
            severity: 'success',
            summary: 'Éxito',
            detail: 'Horario eliminado correctamente',
          });
          onSuccess();
        },
      });
  }

  private async logDeleteAudit(
    employeeSchedule: EmployeeSchedule,
    date: Date | undefined,
    context: ScheduleActionContext
  ): Promise<void> {
    const schedule = context.schedules.find(
      (s) => s.id === employeeSchedule.schedule_id
    );
    const employee = context.employees.find(
      (e) => e.id === employeeSchedule.employee_id
    );
    const branch = context.branches.find(
      (b) => b.id === employeeSchedule.branch_id
    );

    const startDateFormatted = format(
      toDate(employeeSchedule.start_date, { timeZone: 'America/Panama' }),
      'dd/MM/yyyy'
    );
    const endDateFormatted = format(
      toDate(employeeSchedule.end_date, { timeZone: 'America/Panama' }),
      'dd/MM/yyyy'
    );
    const isSingleDay = isSameDay(
      toDate(employeeSchedule.start_date, { timeZone: 'America/Panama' }),
      toDate(employeeSchedule.end_date, { timeZone: 'America/Panama' })
    );

    await this.auditService.logChange({
      employeeScheduleId: employeeSchedule.id,
      changedBy: context.currentEmployeeId!,
      action: 'deleted',
      oldStatus: employeeSchedule.approved,
      newStatus: false,
      oldValue: {
        employee_id: employeeSchedule.employee_id,
        employee_name: employee
          ? `${employee.first_name} ${employee.father_name}`
          : 'Desconocido',
        schedule_id: employeeSchedule.schedule_id,
        schedule_name: schedule?.name || 'Desconocido',
        branch_id: employeeSchedule.branch_id,
        branch_name: branch?.name || 'Desconocido',
        start_date: employeeSchedule.start_date,
        end_date: employeeSchedule.end_date,
        start_date_formatted: startDateFormatted,
        end_date_formatted: endDateFormatted,
        is_single_day: isSingleDay,
        approved: employeeSchedule.approved,
      },
      newValue: null,
      comment: date
        ? `Día ${format(date, 'dd/MM/yyyy')} eliminado del horario "${
            schedule?.name || 'Desconocido'
          }" para ${
            employee
              ? `${employee.first_name} ${employee.father_name}`
              : 'empleado'
          }${branch ? ` en sucursal ${branch.name}` : ''} (rango original: ${startDateFormatted} - ${endDateFormatted})`
        : `Horario "${
            schedule?.name || 'Desconocido'
          }" eliminado completamente para ${
            employee
              ? `${employee.first_name} ${employee.father_name}`
              : 'empleado'
          }${
            isSingleDay
              ? ` el día ${startDateFormatted}`
              : ` del ${startDateFormatted} al ${endDateFormatted}`
          }${branch ? ` en sucursal ${branch.name}` : ''}`,
    });
  }

  private async logApproveAudit(
    id: string,
    scheduleToApprove: any,
    context: ScheduleActionContext
  ): Promise<void> {
    const schedule = context.schedules.find(
      (s) => s.id === scheduleToApprove.schedule_id
    );
    const employee = context.employees.find(
      (e) => e.id === scheduleToApprove.employee_id
    );
    const branch = context.branches.find(
      (b) => b.id === scheduleToApprove.branch_id
    );

    const startDateFormatted = format(
      toDate(scheduleToApprove.start_date, { timeZone: 'America/Panama' }),
      'dd/MM/yyyy'
    );
    const endDateFormatted = format(
      toDate(scheduleToApprove.end_date, { timeZone: 'America/Panama' }),
      'dd/MM/yyyy'
    );
    const isSingleDay = isSameDay(
      toDate(scheduleToApprove.start_date, { timeZone: 'America/Panama' }),
      toDate(scheduleToApprove.end_date, { timeZone: 'America/Panama' })
    );

    await this.auditService.logChange({
      employeeScheduleId: id,
      changedBy: context.currentEmployeeId!,
      action: 'approved',
      oldStatus: scheduleToApprove.approved || false,
      newStatus: true,
      oldValue: {
        employee_id: scheduleToApprove.employee_id,
        employee_name: employee
          ? `${employee.first_name} ${employee.father_name}`
          : 'Desconocido',
        schedule_id: scheduleToApprove.schedule_id,
        schedule_name: schedule?.name || 'Desconocido',
        branch_id: scheduleToApprove.branch_id,
        branch_name: branch?.name || 'Desconocido',
        start_date: scheduleToApprove.start_date,
        end_date: scheduleToApprove.end_date,
        start_date_formatted: startDateFormatted,
        end_date_formatted: endDateFormatted,
        is_single_day: isSingleDay,
        approved: scheduleToApprove.approved || false,
      },
      newValue: {
        employee_id: scheduleToApprove.employee_id,
        employee_name: employee
          ? `${employee.first_name} ${employee.father_name}`
          : 'Desconocido',
        schedule_id: scheduleToApprove.schedule_id,
        schedule_name: schedule?.name || 'Desconocido',
        branch_id: scheduleToApprove.branch_id,
        branch_name: branch?.name || 'Desconocido',
        start_date: scheduleToApprove.start_date,
        end_date: scheduleToApprove.end_date,
        start_date_formatted: startDateFormatted,
        end_date_formatted: endDateFormatted,
        is_single_day: isSingleDay,
        approved: true,
      },
      comment: `Horario "${
        schedule?.name || 'Desconocido'
      }" aprobado para ${
        employee
          ? `${employee.first_name} ${employee.father_name}`
          : 'empleado'
      }${
        isSingleDay
          ? ` el día ${startDateFormatted}`
          : ` del ${startDateFormatted} al ${endDateFormatted}`
      }${branch ? ` en sucursal ${branch.name}` : ''}`,
    });
  }

  private async logSplitRangeAudit(
    schedule: EmployeeSchedule,
    dateToDelete: Date,
    context: ScheduleActionContext
  ): Promise<void> {
    const scheduleType = context.schedules.find(
      (s) => s.id === schedule.schedule_id
    );
    const employee = context.employees.find(
      (e) => e.id === schedule.employee_id
    );
    const branch = context.branches.find(
      (b) => b.id === schedule.branch_id
    );

    const dateStr = format(dateToDelete, 'yyyy-MM-dd');
    const dateFormatted = format(dateToDelete, 'dd/MM/yyyy');
    const dayName = format(dateToDelete, 'EEEE', { locale: es });
    const originalStartFormatted = format(
      toDate(schedule.start_date, { timeZone: 'America/Panama' }),
      'dd/MM/yyyy'
    );
    const originalEndFormatted = format(
      toDate(schedule.end_date, { timeZone: 'America/Panama' }),
      'dd/MM/yyyy'
    );

    await this.auditService.logChange({
      employeeScheduleId: schedule.id,
      changedBy: context.currentEmployeeId!,
      action: 'split_range',
      oldStatus: schedule.approved,
      newStatus: schedule.approved,
      oldValue: {
        employee_id: schedule.employee_id,
        employee_name: employee
          ? `${employee.first_name} ${employee.father_name}`
          : 'Desconocido',
        schedule_id: schedule.schedule_id,
        schedule_name: scheduleType?.name || 'Desconocido',
        branch_id: schedule.branch_id,
        branch_name: branch?.name || 'Desconocido',
        start_date: schedule.start_date,
        end_date: schedule.end_date,
        start_date_formatted: originalStartFormatted,
        end_date_formatted: originalEndFormatted,
        approved: schedule.approved,
      },
      newValue: {
        date_removed: dateStr,
        date_removed_formatted: dateFormatted,
        day_name: dayName,
        operation: 'day_deleted_from_range',
        original_range: {
          start_date: schedule.start_date,
          end_date: schedule.end_date,
          start_date_formatted: originalStartFormatted,
          end_date_formatted: originalEndFormatted,
        },
      },
      comment: `Día ${dayName} ${dateFormatted} eliminado del horario "${
        scheduleType?.name || 'Desconocido'
      }" para ${
        employee
          ? `${employee.first_name} ${employee.father_name}`
          : 'empleado'
      }${
        branch ? ` en sucursal ${branch.name}` : ''
      } (rango original: ${originalStartFormatted} - ${originalEndFormatted})`,
    });
  }
}
