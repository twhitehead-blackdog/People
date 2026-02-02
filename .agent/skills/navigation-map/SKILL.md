---
name: navigation-map
description: Mapa jerárquico de navegación y rutas del proyecto People. Úsala para entender la estructura de módulos y actualizarla cuando haya cambios en el routing o los componentes de navegación.
---

# Mapa de Navegación del Proyecto People

Este documento contiene la estructura jerárquica de la aplicación, mapeando las rutas a sus respectivos archivos de lógica y vistas.

## Estructura Jerárquica

- **Raíz (`app.routes.ts`)**
  - `/login`: [login.component.ts](file:///c:/Users/Diegu/People/src/app/login/login.component.ts)
  - `/employee-portal`: [employee-portal.routes.ts](file:///c:/Users/Diegu/People/src/app/employee-portal/employee-portal.routes.ts) (Portal de autoservicio)
  - `/`: [dashboard.routes.ts](file:///c:/Users/Diegu/People/src/app/dashboard/dashboard.routes.ts) (Panel Principal)
    - **Main Nav (`dashboard.component.ts`)**
      - `/home`: [home.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/home.component.ts) (Inicio)
      - **Administración (`admin.component.ts`)**
        - `/employees`: [employee-list.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/employee-list.component.ts)
        - `/organigrama`: [organigrama.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/organigrama.component.ts)
        - `/companies`: [companies.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/companies.component.ts)
        - `/departments`: [departments.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/departments.component.ts)
        - `/positions`: [positions.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/positions.component.ts)
        - `/branches`: [branches.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/branches.component.ts)
        - `/settings`: [settings.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/settings.component.ts)
        - `/user-management`: [user-management.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/user-management.component.ts)
        - `/permissions`: [permissions-management.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/pt-permissions/permissions-management.component.ts)
        - `/complaints-inbox`: [complaints-inbox.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/complaints-inbox.component.ts)
        - `/job-applications`: [job-applications-list.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/job-applications-list.component.ts)
        - `/hr`: (Agrupador de RRHH)
          - `/time-dashboard`: [hr-time-dashboard.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/hr-time-dashboard.component.ts)
          - `/disabilities`: [hr-disabilities.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/hr-disabilities.component.ts)
        - `/audit-tasks`: [audit-tasks.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/audit-tasks.component.ts)
        - `/performance`: [performance-360.routes.ts](file:///c:/Users/Diegu/People/src/app/dashboard/performance-360/performance-360.routes.ts)
      - **Gestión de Tiempo (`time-management.component.ts`)**
        - `/timelogs`: [timelogs.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/timelogs.component.ts)
        - `/timetables`: [employees-timetable.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/employees-timetable.component.ts)
        - `/schedules`: [schedules.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/schedules.component.ts)
        - `/vet-schedule`: [vet-schedule.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/vet-schedule.component.ts)
        - `/salon-schedule`: [salon-schedule.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/salon-schedule.component.ts)
        - `/shifts`: [shifts.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/shifts.component.ts)
      - **Nómina (`payroll.component.ts`)**
        - `/payrolls`: [payrolls.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/payrolls.component.ts)
        - `/creditors`: [creditors.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/creditors.component.ts)
        - `/banks`: [banks.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/banks.component.ts)
      - `/timeclock`: [timeclock.component.ts](file:///c:/Users/Diegu/People/src/app/timeclock.component.ts)
      - **Branch Manager**: [branch-manager.component.ts](file:///c:/Users/Diegu/People/src/app/dashboard/branch-manager.component.ts)

## Regla de Mantenimiento

> [!IMPORTANT]
> Cada vez que se cree un nuevo módulo, submódulo, o se modifique el archivo `dashboard.routes.ts` o `app.routes.ts`, es **obligatorio** actualizar este archivo `SKILL.md` para reflejar la estructura actual de navegación. Esto asegura que la IA y los desarrolladores siempre tengan un mapa preciso de la aplicación.
