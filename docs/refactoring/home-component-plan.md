# Plan de Refactorización: home.component.ts

## Estado Actual

- **Archivo**: `src/app/dashboard/home.component.ts`
- **Líneas totales**: 6,625
- **Límite recomendado**: <300 líneas
- **Factor de exceso**: 22x

### Distribución actual
| Sección | Líneas | Porcentaje |
|---------|--------|------------|
| Imports | ~30 | 0.5% |
| Template inline | ~1,494 | 22.5% |
| Styles inline | ~2,780 | 42% |
| Clase componente | ~2,318 | 35% |

---

## Fase 1: Extraer Estilos (Prioridad Alta)

### Acción
Mover los ~2,780 líneas de CSS inline a un archivo separado.

### Archivos a crear
```
src/app/dashboard/home.component.scss
```

### Resultado esperado
- Reducción de ~2,780 líneas
- Mejor mantenibilidad de estilos
- Aprovechamiento de SCSS features

---

## Fase 2: Extraer Utilidades de Fecha (Prioridad Alta)

### Funciones a extraer
```typescript
// src/app/utils/date.utils.ts

export function getPanamaNowParts(): { year: number; month: number; day: number }
export function getDaysInMonth(year: number, month: number): number
export function calcTimeDiff(actualTime: string, scheduledTime: string): number
export function getMonthNameSpanish(monthIndex: number): string
export function formatHoursMinutes(minutes: number): string // si no existe
```

### Constantes a extraer
```typescript
export const TIMEZONE = 'America/Panama';
export const MONTH_NAMES_ES = ['Enero', 'Febrero', ...];
```

### Resultado esperado
- Funciones reutilizables en todo el proyecto
- Centralización de lógica de fechas
- Reducción de ~100 líneas en componente

---

## Fase 3: Extraer Servicio de Datos del Dashboard (Prioridad Alta)

### Servicio a crear
```typescript
// src/app/dashboard/services/home-data.service.ts

@Injectable({ providedIn: 'root' })
export class HomeDataService {
  private apiUrl = inject(ApiUrlService);

  // Mover httpResource calls
  getTerminations(companyId: string, startDate: string, endDate: string)
  getLatesFromTimelogs(companyId: string, dates: string[])
  getEmployeeSchedules(companyId: string)
  getUpcomingBirthdays(companyId: string)
  getUpcomingAnniversaries(companyId: string)
}
```

### httpResource a migrar
1. `terminationsApi` - Terminaciones de empleados
2. `latesFromTimelogs` - Tardanzas desde timelogs
3. `employeeSchedules` - Horarios de empleados
4. `birthdaysApi` (si existe)
5. `anniversariesApi` (si existe)

### Resultado esperado
- Separación de concerns (datos vs presentación)
- Servicios testeables unitariamente
- Reducción de ~200 líneas en componente

---

## Fase 4: Extraer Servicio de Cálculos de Tardanza (Prioridad Media)

### Servicio a crear
```typescript
// src/app/dashboard/services/tardiness-calculation.service.ts

@Injectable({ providedIn: 'root' })
export class TardinessCalculationService {

  calculateDailyLates(timelogs: Timelog[], schedules: Schedule[]): DailyLatesResult
  calculateTopLateEmployees(timelogs: Timelog[], limit: number): EmployeeLatesSummary[]
  calculateTopAbsences(employees: Employee[], timelogs: Timelog[]): EmployeeAbsencesSummary[]
  calculateScheduleComplianceIndex(timelogs: Timelog[], schedules: Schedule[]): number
  calculateWorkClimateIndex(/* params */): number
}
```

### Lógica a migrar
- `getMonthlyLates()`
- `getScheduleComplianceIndex()`
- `getWorkClimateIndex()`
- Cálculos de `topLatesList`
- Cálculos de `topAbsencesList`

### Resultado esperado
- Lógica de negocio testeable
- Reutilizable en otros componentes (branch-manager, etc.)
- Reducción de ~300 líneas en componente

---

## Fase 5: Extraer Componentes de KPI Cards (Prioridad Media)

### Componentes a crear

#### 5.1 KPI Card Genérico
```typescript
// src/app/shared/components/pt-kpi-card/pt-kpi-card.component.ts

@Component({
  selector: 'pt-kpi-card',
  template: `...`,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PtKpiCardComponent {
  title = input.required<string>();
  value = input.required<number | string>();
  icon = input<string>();
  trend = input<'up' | 'down' | 'neutral'>();
  trendValue = input<string>();
  color = input<'primary' | 'success' | 'warning' | 'danger'>();
}
```

#### 5.2 KPI Cards específicos (opcionales)
- `pt-headcount-card` - Resumen de plantilla
- `pt-attendance-card` - Resumen de asistencia
- `pt-overtime-card` - Resumen de horas extra

### Resultado esperado
- Cards reutilizables
- Reducción de ~200 líneas de template

---

## Fase 6: Extraer Componentes de Gráficos (Prioridad Media)

### Componentes a crear

```typescript
// src/app/dashboard/components/headcount-chart/headcount-chart.component.ts
// src/app/dashboard/components/lates-chart/lates-chart.component.ts
// src/app/dashboard/components/department-distribution-chart/...
// src/app/dashboard/components/gender-distribution-chart/...
```

### Template a migrar
Cada gráfico con su configuración de PrimeNG Chart.

### Resultado esperado
- Gráficos encapsulados y reutilizables
- Reducción de ~400 líneas de template

---

## Fase 7: Extraer Componentes de Diálogos (Prioridad Baja)

### Componentes a crear
```typescript
// src/app/dashboard/components/employee-detail-dialog/...
// src/app/dashboard/components/terminations-dialog/...
// src/app/dashboard/components/birthdays-dialog/...
```

### Resultado esperado
- Diálogos reutilizables
- Reducción de ~300 líneas de template

---

## Fase 8: Extraer Secciones del Dashboard (Prioridad Baja)

### Componentes a crear
```typescript
// src/app/dashboard/sections/executive-summary/executive-summary.component.ts
// src/app/dashboard/sections/financial-summary/financial-summary.component.ts
// src/app/dashboard/sections/management-kpis/management-kpis.component.ts
// src/app/dashboard/sections/organization-structure/organization-structure.component.ts
// src/app/dashboard/sections/events-section/events-section.component.ts
```

### Resultado esperado
- Template principal limpio (~50 líneas)
- Secciones mantenibles independientemente

---

## Orden de Implementación Recomendado

```
Fase 1: Estilos → ~3,800 líneas restantes
Fase 2: Utils fecha → ~3,700 líneas restantes
Fase 3: HomeDataService → ~3,500 líneas restantes
Fase 4: TardinessService → ~3,200 líneas restantes
Fase 5: KPI Cards → ~3,000 líneas restantes
Fase 6: Gráficos → ~2,600 líneas restantes
Fase 7: Diálogos → ~2,300 líneas restantes
Fase 8: Secciones → ~300 líneas restantes ✓
```

---

## Estructura Final Propuesta

```
src/app/dashboard/
├── home.component.ts          (~300 líneas)
├── home.component.html        (template externo, ~200 líneas)
├── home.component.scss        (~2,780 líneas)
├── services/
│   ├── home-data.service.ts
│   └── tardiness-calculation.service.ts
├── components/
│   ├── headcount-chart/
│   ├── lates-chart/
│   ├── department-chart/
│   ├── employee-detail-dialog/
│   └── ...
└── sections/
    ├── executive-summary/
    ├── financial-summary/
    ├── management-kpis/
    ├── organization-structure/
    └── events-section/

src/app/shared/components/
└── pt-kpi-card/

src/app/utils/
└── date.utils.ts
```

---

## Notas Importantes

1. **Mantener comportamiento**: Cada fase debe preservar la funcionalidad existente
2. **Tests**: Agregar tests unitarios para servicios nuevos
3. **Commits incrementales**: Un commit por fase completada
4. **No romper**: Verificar que el dashboard funcione después de cada fase

---

## Dependencias Identificadas

- `DashboardStore` - Ya existe, seguir usando
- `EmployeesStore` - Ya existe, seguir usando
- `ApiUrlService` - Patrón obligatorio, usar en servicios nuevos
- `date-fns` - Usar en utils de fecha
- PrimeNG Charts - Mantener en componentes de gráficos
