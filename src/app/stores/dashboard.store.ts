import { computed, inject } from '@angular/core';
import {
  patchState,
  signalStore,
  withComputed,
  withMethods,
  withProps,
  withState,
} from '@ngrx/signals';
import {
  differenceInMonths,
  differenceInYears,
  endOfMonth,
  getMonth,
  startOfMonth,
  subMonths,
} from 'date-fns';
import { Branch, Department, Position } from '../models';
import { AuthStore } from './auth.store';
import { BanksStore } from './banks.store';
import { BranchesStore } from './branches.store';
import { CompaniesStore } from './companies.store';
import { DepartmentsStore } from './departments.store';
import { EmployeesStore } from './employees.store';
import { PayrollsStore } from './payrolls.store';
import { PositionsStore } from './positions.store';
import { SchedulesStore } from './schedules.store';

type State = {
  selectedCompanyId: string | null;
  currentEmployeeId?: string | null;
};

const initialState: State = {
  selectedCompanyId: null,
  currentEmployeeId: null,
};

export const DashboardStore = signalStore(
  withState(initialState),
  withProps(() => ({
    companies: inject(CompaniesStore),
    employees: inject(EmployeesStore),
    branches: inject(BranchesStore),
    positions: inject(PositionsStore),
    departments: inject(DepartmentsStore),
    schedules: inject(SchedulesStore),
    auth: inject(AuthStore),
    banks: inject(BanksStore),
    payrolls: inject(PayrollsStore),
  })),
  withComputed(
    ({ employees, branches, companies, selectedCompanyId, auth }) => {
      const headCount = computed(() => {
        const allEmployees = employees.entities();
        const activeEmployees = allEmployees.filter((x) => x.is_active);
        return activeEmployees.length;
      });

      const currentEmployee = computed(() => {
        const employeeId = auth.currentEmployeeId();
        const allEmployees = employees.entities();
        return allEmployees.find((x) => x.id === employeeId);
      });

      const monthlyBudget = computed(() => {
        const MAX_SALARY = 999999999; // Límite máximo para evitar overflow
        const total = employees
          .employeesList()
          .filter((x) => x.is_active)
          .reduce((acc, current) => {
            const salary = current.monthly_salary || 0;
            // Validar que el salario no exceda el límite y que sea un número válido
            if (isNaN(salary) || salary < 0 || salary > MAX_SALARY) {
              return acc; // Ignorar salarios inválidos
            }
            const newTotal = acc + salary;
            // Validar que la suma no exceda el límite
            if (newTotal > MAX_SALARY) {
              return MAX_SALARY; // Retornar el límite máximo
            }
            return newTotal;
          }, 0);
        return total;
      });

      // Lista de correos con acceso completo (super admins)
      const superAdminEmails = ['mercadeo@blackdogpanama.com', 'soporte2@blackdogpanama.com'];

      const isAdmin = computed(() => {
        const employee = currentEmployee();
        
        // Verificar si es super admin por correo
        if (
          employee?.work_email &&
          superAdminEmails.includes(employee.work_email.toLowerCase())
        ) {
          return true;
        }
        // Si el empleado solo tiene acceso al portal, no es admin
        if (employee?.has_portal_access && !employee?.position?.admin) {
          return false;
        }
        // Verificar si es admin por posición
        return employee?.position?.admin || false;
      });

      // Lista de cargos que solo tienen acceso al portal (no al reloj de marcaciones)
      const portalOnlyPositions = [
        'Piso de venta',
        'Veterinario',
        'Peluquero',
        'Asistente de veterinario',
        'Asistente de peluquería',
      ];

      const hasPortalAccessOnly = computed(() => {
        const employee = currentEmployee();
        const positionName = employee?.position?.name || '';

        // Verificar si el cargo está en la lista de cargos que solo tienen acceso al portal
        const isPortalOnlyPosition = portalOnlyPositions.some((pos) =>
          positionName.toLowerCase().includes(pos.toLowerCase())
        );

        // Si tiene uno de estos cargos, solo acceso al portal
        if (isPortalOnlyPosition) {
          return true;
        }

        // Si tiene dashboard_access = true, NO es solo portal access
        if (employee?.position?.dashboard_access === true) {
          return false;
        }

        // Verificación original: si tiene has_portal_access y no es admin
        return (
          employee?.has_portal_access === true && !employee?.position?.admin
        );
      });
      const isScheduleAdmin = computed(
        () => currentEmployee()?.position?.schedule_admin
      );

      // Lista de cargos que tienen acceso especial a gestión de tiempo y reloj de marcaciones
      const timeManagementAccessPositions = [
        'gerente de tienda',
      ];

      const hasTimeManagementAccess = computed(() => {
        const employee = currentEmployee();
        const positionName = employee?.position?.name || '';
        return timeManagementAccessPositions.some(
          (pos) => positionName.toLowerCase().includes(pos.toLowerCase())
        );
      });
      
      const hasDashboardAccess = computed(() => {
        const employee = currentEmployee();
        const dashboardAccess = employee?.position?.dashboard_access;
        // Si dashboard_access es null/undefined, permitir acceso (compatibilidad con datos antiguos)
        // Solo denegar si es explícitamente false
        return dashboardAccess !== false;
      });
      
      const isScheduleApprover = computed(
        () => currentEmployee()?.position?.schedule_approver
      );

      const currentBranch = computed(() => currentEmployee()?.branch);

      const branchesCount = computed(
        () => branches.entities().filter((x) => x.is_active).length
      );

      const selectedCompany = computed(() =>
        companies.entities().find((x) => x.id === selectedCompanyId())
      );

      const employeesByGender = computed(() =>
        employees.entities().reduce<
          {
            gender: string;
            count: number;
          }[]
        >((acc, item) => {
          const index = acc.findIndex((x) => x.gender === item.gender);
          if (index !== -1) {
            acc[index].count++;
          } else {
            acc.push({ gender: item.gender, count: 1 });
          }
          return acc;
        }, [])
      );

      const countByGender = computed(() =>
        employees
          .entities()
          .filter((x) => x.is_active)
          .reduce((acc, item) => {
            acc[item.gender] = (acc[item.gender] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
      );

      const birthDates = computed(() =>
        employees
          .entities()
          .filter((x) => x.is_active)
          .filter(
            (x) =>
              x.birth_date &&
              (x.birth_date as unknown as string) !== '1970-01-01'
          )
          .filter((x) => getMonth(x.birth_date!) === getMonth(new Date()))
          .sort(
            (a, b) =>
              new Date(a.birth_date!).getDate() -
              new Date(b.birth_date!).getDate()
          )
          .map(({ first_name, father_name, birth_date, branch }) => ({
            first_name,
            father_name,
            birth_date,
            branch,
          }))
      );

      const employeesByBranch = computed(() =>
        employees
          .employeesList()
          .filter((x) => x.is_active)
          .reduce<
            {
              branch: Branch | undefined;
              count: number;
            }[]
          >((acc, item) => {
            const itemIndex = acc.findIndex(
              (x) => x.branch?.id === item.branch_id
            );
            if (itemIndex !== -1) {
              acc[itemIndex].count++;
            } else {
              acc.push({ branch: item.branch, count: 1 });
            }
            return acc;
          }, [])
      );

      const employeesList = computed(() =>
        employees.entities().map((item) => ({
          ...item,
          full_name: `${item.first_name} ${item.middle_name} ${item.father_name} ${item.mother_name}`,
          short_name: `${item.first_name} ${item.father_name}`,
          months: differenceInMonths(new Date(), item.start_date ?? new Date()),
          probatory:
            differenceInMonths(new Date(), item.start_date ?? new Date()) < 3,
        }))
      );

      // Rotación de personal
      const monthlyTurnover = computed(() => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const activeEmployees = employees.entities().filter((x) => x.is_active);
        const totalEmployees = activeEmployees.length;

        if (totalEmployees === 0) return 0;

        const terminatedThisMonth = employees
          .entities()
          .filter(
            (x) =>
              x.end_date &&
              new Date(x.end_date) >= monthStart &&
              new Date(x.end_date) <= monthEnd
          ).length;

        return totalEmployees > 0
          ? Math.round((terminatedThisMonth / totalEmployees) * 100 * 100) / 100
          : 0;
      });

      const annualTurnover = computed(() => {
        const now = new Date();
        const yearStart = startOfMonth(subMonths(now, 11));
        const yearEnd = endOfMonth(now);
        const activeEmployees = employees.entities().filter((x) => x.is_active);
        const totalEmployees = activeEmployees.length;

        if (totalEmployees === 0) return 0;

        const terminatedThisYear = employees
          .entities()
          .filter(
            (x) =>
              x.end_date &&
              new Date(x.end_date) >= yearStart &&
              new Date(x.end_date) <= yearEnd
          ).length;

        return totalEmployees > 0
          ? Math.round((terminatedThisYear / totalEmployees) * 100 * 100) / 100
          : 0;
      });

      // Antigüedad promedio
      const averageTenure = computed(() => {
        const activeEmployees = employees
          .entities()
          .filter((x) => x.is_active && x.start_date);

        if (activeEmployees.length === 0) return 0;

        const totalYears = activeEmployees.reduce((acc, emp) => {
          const years = differenceInYears(
            new Date(),
            new Date(emp.start_date!)
          );
          return acc + years;
        }, 0);

        return Math.round((totalYears / activeEmployees.length) * 10) / 10;
      });

      const averageTenureByBranch = computed(() =>
        employeesByBranch().map((item) => {
          const branchEmployees = employees
            .employeesList()
            .filter(
              (x) =>
                x.is_active && x.branch_id === item.branch?.id && x.start_date
            );

          if (branchEmployees.length === 0) {
            return { branch: item.branch, averageTenure: 0 };
          }

          const totalYears = branchEmployees.reduce((acc, emp) => {
            const years = differenceInYears(
              new Date(),
              new Date(emp.start_date!)
            );
            return acc + years;
          }, 0);

          return {
            branch: item.branch,
            averageTenure:
              Math.round((totalYears / branchEmployees.length) * 10) / 10,
          };
        })
      );

      // Ausentismo basado en AttendanceSheet
      // Nota: El cálculo real se hace en el componente usando httpResource
      // porque httpResource no puede estar dentro de withComputed
      const monthlyAbsenteeism = computed(() => {
        const activeEmployees = employees.entities().filter((x) => x.is_active);
        const totalEmployees = activeEmployees.length;

        if (totalEmployees === 0) return { percentage: 0, totalDays: 0 };

        // Por ahora retornar 0 hasta que se calcule en el componente
        // El componente home.component.ts calculará esto usando httpResource
        return {
          percentage: 0,
          totalDays: 0,
        };
      });

      const mainAbsenceReasons = computed(() => {
        // Placeholder - en producción debería venir de AttendanceSheet.justification_cause
        return [
          { reason: 'Enfermedad', count: 12 },
          { reason: 'Personal', count: 8 },
          { reason: 'Vacaciones', count: 5 },
        ];
      });

      // Distribución por tipo de contrato
      const contractDistribution = computed(() => {
        const activeEmployees = employees.entities().filter((x) => x.is_active);
        const now = new Date();

        const fixed = activeEmployees.filter(
          (x) => !x.end_date || new Date(x.end_date) > now
        ).length;

        const temporary = activeEmployees.filter(
          (x) => x.end_date && new Date(x.end_date) <= now
        ).length;

        return {
          fixed,
          temporary,
          total: activeEmployees.length,
        };
      });

      // Promedio salarial por sucursal
      const averageSalaryByBranch = computed(() =>
        employeesByBranch().map((item) => {
          const branchEmployees = employees
            .employeesList()
            .filter((x) => x.is_active && x.branch_id === item.branch?.id);

          if (branchEmployees.length === 0) {
            return { branch: item.branch, averageSalary: 0 };
          }

          const totalSalary = branchEmployees.reduce(
            (acc, emp) => acc + (emp.monthly_salary || 0),
            0
          );

          return {
            branch: item.branch,
            averageSalary: Math.round(totalSalary / branchEmployees.length),
          };
        })
      );

      // Promedio salarial general
      const averageSalary = computed(() => {
        const activeEmployees = employees
          .employeesList()
          .filter((x) => x.is_active);

        if (activeEmployees.length === 0) return 0;

        const totalSalary = activeEmployees.reduce(
          (acc, emp) => acc + (emp.monthly_salary || 0),
          0
        );

        return Math.round(totalSalary / activeEmployees.length);
      });

      // People Efficiency Ratio (Ingresos / Empleado)
      // Placeholder: usando planilla mensual como proxy
      // En producción debería usar ingresos reales de la empresa
      const peopleEfficiencyRatio = computed(() => {
        const activeEmployees = employees.entities().filter((x) => x.is_active);
        const totalEmployees = activeEmployees.length;

        if (totalEmployees === 0) return 0;

        // Placeholder: asumiendo que los ingresos son 3x la planilla (margen típico)
        const estimatedRevenue = monthlyBudget() * 3;

        return Math.round(estimatedRevenue / totalEmployees);
      });

      // Tasa de contratación (Hiring Rate)
      const monthlyHiringRate = computed(() => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);
        const activeEmployees = employees.entities().filter((x) => x.is_active);
        const totalEmployees = activeEmployees.length;

        if (totalEmployees === 0) return 0;

        const hiredThisMonth = employees
          .entities()
          .filter(
            (x) =>
              x.start_date &&
              new Date(x.start_date) >= monthStart &&
              new Date(x.start_date) <= monthEnd &&
              x.is_active
          ).length;

        return totalEmployees > 0
          ? Math.round((hiredThisMonth / totalEmployees) * 100 * 100) / 100
          : 0;
      });

      const newEmployeesThisMonth = computed(() => {
        const now = new Date();
        const monthStart = startOfMonth(now);
        const monthEnd = endOfMonth(now);

        return employees
          .entities()
          .filter(
            (x) =>
              x.start_date &&
              new Date(x.start_date) >= monthStart &&
              new Date(x.start_date) <= monthEnd &&
              x.is_active
          ).length;
      });

      // Empleados en período de prueba
      const probatoryEmployees = computed(() => {
        return employees
          .entities()
          .filter(
            (x) =>
              x.is_active &&
              x.start_date &&
              differenceInMonths(new Date(), new Date(x.start_date)) < 3
          ).length;
      });

      // Tasa de retención
      const retentionRate = computed(() => {
        const now = new Date();
        const yearStart = startOfMonth(subMonths(now, 11));

        // Empleados que estaban activos al inicio del período (empezaron antes del inicio del año)
        const employeesAtYearStart = employees
          .entities()
          .filter(
            (x) =>
              x.start_date &&
              new Date(x.start_date) <= yearStart &&
              (!x.end_date || new Date(x.end_date) >= yearStart)
          ).length;

        if (employeesAtYearStart === 0) return 0;

        // Empleados que estaban al inicio y siguen activos actualmente
        const employeesStillActive = employees
          .entities()
          .filter(
            (x) =>
              x.is_active &&
              x.start_date &&
              new Date(x.start_date) <= yearStart &&
              (!x.end_date || new Date(x.end_date) > now)
          ).length;

        const rate = (employeesStillActive / employeesAtYearStart) * 100;
        return Math.round(rate * 100) / 100;
      });

      // Distribución por departamento
      const employeesByDepartment = computed(() =>
        employees
          .employeesList()
          .filter((x) => x.is_active)
          .reduce<
            {
              department: Department | undefined;
              count: number;
            }[]
          >((acc, item) => {
            const itemIndex = acc.findIndex(
              (x) => x.department?.id === item.department_id
            );
            if (itemIndex !== -1) {
              acc[itemIndex].count++;
            } else {
              acc.push({ department: item.department, count: 1 });
            }
            return acc;
          }, [])
      );

      // Distribución por posición
      const employeesByPosition = computed(() =>
        employees
          .employeesList()
          .filter((x) => x.is_active)
          .reduce<
            {
              position: Position | undefined;
              count: number;
            }[]
          >((acc, item) => {
            const itemIndex = acc.findIndex(
              (x) => x.position?.id === item.position_id
            );
            if (itemIndex !== -1) {
              acc[itemIndex].count++;
            } else {
              acc.push({ position: item.position, count: 1 });
            }
            return acc;
          }, [])
      );

      // Promedio de edad
      const averageAge = computed(() => {
        const activeEmployees = employees
          .entities()
          .filter(
            (x) =>
              x.is_active &&
              x.birth_date &&
              (x.birth_date as unknown as string) !== '1970-01-01'
          );

        if (activeEmployees.length === 0) return 0;

        const now = new Date();
        const totalAge = activeEmployees.reduce((acc, emp) => {
          const birthDate = new Date(emp.birth_date!);
          const age = now.getFullYear() - birthDate.getFullYear();
          const monthDiff = now.getMonth() - birthDate.getMonth();
          const adjustedAge =
            monthDiff < 0 ||
            (monthDiff === 0 && now.getDate() < birthDate.getDate())
              ? age - 1
              : age;
          return acc + adjustedAge;
        }, 0);

        return Math.round((totalAge / activeEmployees.length) * 10) / 10;
      });

      // Distribución etaria
      const ageDistribution = computed(() => {
        const activeEmployees = employees
          .entities()
          .filter(
            (x) =>
              x.is_active &&
              x.birth_date &&
              (x.birth_date as unknown as string) !== '1970-01-01'
          );

        const now = new Date();
        const distribution = {
          '18-25': 0,
          '26-35': 0,
          '36-45': 0,
          '46-55': 0,
          '56+': 0,
        };

        activeEmployees.forEach((emp) => {
          const birthDate = new Date(emp.birth_date!);
          const age = now.getFullYear() - birthDate.getFullYear();
          const monthDiff = now.getMonth() - birthDate.getMonth();
          const adjustedAge =
            monthDiff < 0 ||
            (monthDiff === 0 && now.getDate() < birthDate.getDate())
              ? age - 1
              : age;

          if (adjustedAge >= 18 && adjustedAge <= 25) distribution['18-25']++;
          else if (adjustedAge >= 26 && adjustedAge <= 35)
            distribution['26-35']++;
          else if (adjustedAge >= 36 && adjustedAge <= 45)
            distribution['36-45']++;
          else if (adjustedAge >= 46 && adjustedAge <= 55)
            distribution['46-55']++;
          else if (adjustedAge >= 56) distribution['56+']++;
        });

        return distribution;
      });

      // Empleados con deudas pendientes
      const employeesWithDebts = computed(() => {
        return employees
          .entities()
          .filter(
            (x) =>
              x.is_active &&
              x.debts &&
              x.debts.length > 0 &&
              x.debts.some((d) => d.balance > 0)
          ).length;
      });

      const totalDebtAmount = computed(() => {
        return employees
          .entities()
          .filter((x) => x.is_active && x.debts && x.debts.length > 0)
          .reduce((acc, emp) => {
            const employeeDebt = emp.debts!.reduce(
              (sum, debt) => sum + (debt.balance || 0),
              0
            );
            return acc + employeeDebt;
          }, 0);
      });

      // Costo por empleado
      const costPerEmployee = computed(() => {
        const activeEmployees = employees.entities().filter((x) => x.is_active);
        const totalEmployees = activeEmployees.length;

        if (totalEmployees === 0) return 0;

        return Math.round(monthlyBudget() / totalEmployees);
      });

      // Ratio de supervisión (empleados por supervisor/admin)
      const supervisionRatio = computed(() => {
        const activeEmployees = employees.entities().filter((x) => x.is_active);
        const supervisors = activeEmployees.filter(
          (x) => x.position?.admin || x.position?.schedule_admin
        ).length;

        if (supervisors === 0) return 0;

        return Math.round((activeEmployees.length / supervisors) * 10) / 10;
      });

      // Aniversarios de trabajo (próximos 30 días)
      const upcomingAnniversaries = computed(() => {
        const now = new Date();
        const thirtyDaysFromNow = new Date(now);
        thirtyDaysFromNow.setDate(now.getDate() + 30);

        return employees
          .entities()
          .filter((x) => x.is_active && x.start_date)
          .map((emp) => {
            const startDate = new Date(emp.start_date!);
            const thisYearAnniversary = new Date(
              now.getFullYear(),
              startDate.getMonth(),
              startDate.getDate()
            );
            const nextYearAnniversary = new Date(
              now.getFullYear() + 1,
              startDate.getMonth(),
              startDate.getDate()
            );

            let anniversaryDate = thisYearAnniversary;
            if (thisYearAnniversary < now) {
              anniversaryDate = nextYearAnniversary;
            }

            const years = differenceInYears(anniversaryDate, startDate);

            return {
              employee: emp,
              anniversaryDate,
              years,
            };
          })
          .filter(
            (item) =>
              item.anniversaryDate >= now &&
              item.anniversaryDate <= thirtyDaysFromNow
          )
          .sort(
            (a, b) => a.anniversaryDate.getTime() - b.anniversaryDate.getTime()
          )
          .slice(0, 10); // Top 10 próximos aniversarios
      });

      // Tasa de crecimiento de personal
      const growthRate = computed(() => {
        const now = new Date();
        const lastMonth = subMonths(now, 1);
        const lastMonthStart = startOfMonth(lastMonth);
        const lastMonthEnd = endOfMonth(lastMonth);

        const employeesLastMonth = employees
          .entities()
          .filter(
            (x) =>
              x.start_date &&
              new Date(x.start_date) <= lastMonthEnd &&
              (x.is_active ||
                (x.end_date && new Date(x.end_date) > lastMonthEnd))
          ).length;

        const currentEmployees = employees
          .entities()
          .filter((x) => x.is_active).length;

        if (employeesLastMonth === 0) return 0;

        return (
          Math.round(
            ((currentEmployees - employeesLastMonth) / employeesLastMonth) *
              100 *
              100
          ) / 100
        );
      });

      // Mujeres en licencia
      const womenOnLeave = computed(() => {
        const now = new Date();
        const today = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate()
        );

        return employees.entities().filter(
          (x) =>
            x.is_active &&
            x.gender === 'F' &&
            x.timeoffs &&
            x.timeoffs.length > 0 &&
            x.timeoffs.some((timeoff) => {
              const fromDate = new Date(timeoff.date_from);
              const toDate = new Date(timeoff.date_to);
              const from = new Date(
                fromDate.getFullYear(),
                fromDate.getMonth(),
                fromDate.getDate()
              );
              const to = new Date(
                toDate.getFullYear(),
                toDate.getMonth(),
                toDate.getDate()
              );
              return today >= from && today <= to && timeoff.is_approved;
            })
        ).length;
      });

      return {
        headCount,
        employeesList,
        branchesCount,
        employeesByBranch,
        employeesByGender,
        birthDates,
        selectedCompany,
        currentEmployee,
        isAdmin,
        hasPortalAccessOnly,
        isScheduleAdmin,
        isScheduleApprover,
        hasTimeManagementAccess,
        hasDashboardAccess,
        currentBranch,
        monthlyBudget,
        countByGender,
        monthlyTurnover,
        annualTurnover,
        averageTenure,
        averageTenureByBranch,
        monthlyAbsenteeism,
        mainAbsenceReasons,
        contractDistribution,
        averageSalaryByBranch,
        averageSalary,
        peopleEfficiencyRatio,
        monthlyHiringRate,
        newEmployeesThisMonth,
        probatoryEmployees,
        retentionRate,
        employeesByDepartment,
        employeesByPosition,
        averageAge,
        ageDistribution,
        employeesWithDebts,
        totalDebtAmount,
        costPerEmployee,
        supervisionRatio,
        upcomingAnniversaries,
        growthRate,
        womenOnLeave,
      };
    }
  ),
  withMethods((state) => ({
    toggleCompany: (id: string | null) =>
      patchState(state, { selectedCompanyId: id }),
  }))
);
