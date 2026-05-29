/**
 * Exportación profesional a Excel de marcaciones (timelogs).
 *
 * Reemplaza la versión básica anterior (xlsx plano + json_to_sheet).
 * Usa xlsx-js-style + el helper compartido `excel-style.utils` para:
 *  - Hoja 1 "Información": encabezado de marca, KPIs del rango exportado.
 *  - Hoja 2 "Marcaciones": tabla principal con header coloreado, zebra,
 *    filas con errores destacadas, filtros automáticos, freeze pane.
 *  - Hoja 3 "Totales por empleado": agregados por empleado (horas, retrasos,
 *    extras, almuerzos excedidos) — útil para nómina y revisión rápida.
 *
 * Diseño cargado dinámicamente (`await import`) para no inflar el bundle
 * principal — solo cuando el usuario hace clic en "Exportar Excel".
 */
import { format, isEqual } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { DayLog } from '../../../models';
import { formatHours } from './alert.utils';
import { mapDayLogsToReportRows, TimelogReportRow } from './timelogs-report.utils';

export interface ExportContext {
  filteredDayLogs: DayLog[];
  start: Date;
  end: Date;
  timezone: string;
  /** Si exporta a un empleado específico, su nombre corto. 'GLOBAL' si no. */
  scopeName: string;
  /** Total de filas exportadas. */
  totalRows: number;
  /** Total de marcaciones reales (filas con al menos una marca). */
  totalRowsWithMarks: number;
  /** Empresa que aparece como contexto en la hoja Info. */
  companyName?: string;
  /** Email del usuario que genera el reporte (para auditoría). */
  generatedByEmail?: string;
}

interface EmployeeTotal {
  employeeNumber: string;
  name: string;
  daysWithMarks: number;
  totalHours: number;
  overtimeHours: number;
  delayMinutes: number;
  lunchExceededMinutes: number;
  earlyExitsCount: number;
  insufficientHoursCount: number;
  absencesCount: number;
}

/**
 * Color de marca del módulo Time Management (matching dashboard nav).
 * Negro corporativo con acento dorado en titulares.
 */
const BRAND_HEADER_COLOR = '0F172A'; // slate-900
const BRAND_ACCENT_COLOR = 'D97706'; // amber-600

const TIMEZONE_PANAMA = 'America/Panama';

/**
 * Punto de entrada: genera y descarga el archivo Excel completo.
 */
export async function exportTimelogsWorkbook(ctx: ExportContext): Promise<void> {
  const xlsxModule = await import('xlsx-js-style');
  const XLSX = (xlsxModule as any).default ?? xlsxModule;
  const utils = XLSX.utils;
  const writeFile = XLSX.writeFile;

  const wb = utils.book_new();

  // 1. Hoja "Información"
  const infoSheet = buildInfoSheet(utils, ctx);
  utils.book_append_sheet(wb, infoSheet, 'Información');

  // 2. Hoja "Marcaciones" (detalle día por día)
  const detailSheet = buildDetailSheet(utils, ctx);
  utils.book_append_sheet(wb, detailSheet, 'Marcaciones');

  // 3. Hoja "Totales por empleado"
  const totalsSheet = buildTotalsSheet(utils, ctx);
  utils.book_append_sheet(wb, totalsSheet, 'Totales');

  // Nombre de archivo seguro
  const startStr = formatInTimeZone(ctx.start, ctx.timezone, 'yyyyMMdd');
  const endStr = formatInTimeZone(ctx.end, ctx.timezone, 'yyyyMMdd');
  const safeName = ctx.scopeName.replace(/[^A-Za-z0-9_-]+/g, '_').toUpperCase();
  const fileName = `Marcaciones_${safeName}_${startStr}-${endStr}.xlsx`;

  writeFile(wb, fileName);
}

// ─── Hoja 1: Información / cover ─────────────────────────────────

function buildInfoSheet(utils: any, ctx: ExportContext): any {
  const rangeLabel = isEqual(ctx.start, ctx.end)
    ? formatInTimeZone(ctx.start, ctx.timezone, "EEEE dd 'de' MMMM yyyy")
    : `${formatInTimeZone(ctx.start, ctx.timezone, 'dd/MM/yyyy')} — ${formatInTimeZone(ctx.end, ctx.timezone, 'dd/MM/yyyy')}`;

  const generatedAt = formatInTimeZone(new Date(), ctx.timezone, "dd/MM/yyyy 'a las' HH:mm");

  const totals = computeAggregateTotals(ctx.filteredDayLogs);

  const rows: (string | number)[][] = [
    ['REPORTE DE MARCACIONES'],
    [],
    ['Período', rangeLabel],
    ['Alcance', ctx.scopeName === 'GLOBAL' ? 'Todos los empleados del filtro actual' : ctx.scopeName],
    ['Empresa', ctx.companyName ?? '—'],
    ['Generado', generatedAt],
    ['Generado por', ctx.generatedByEmail ?? '—'],
    [],
    ['INDICADORES DEL PERÍODO'],
    [],
    ['Total registros', ctx.totalRows],
    ['Registros con marcaciones', ctx.totalRowsWithMarks],
    ['Total horas trabajadas', `${totals.totalHours.toFixed(2)} h`],
    ['Total horas extras', `${totals.overtimeHours.toFixed(2)} h`],
    ['Total minutos de retraso', `${totals.delayMinutes} min`],
    ['Total minutos exceso almuerzo', `${totals.lunchExceededMinutes} min`],
    ['Días con salida temprana', totals.earlyExitsCount],
    ['Días con horas insuficientes', totals.insufficientHoursCount],
    ['Días con error de horario', totals.scheduleErrorCount],
    [],
    ['Confidencial — Para uso interno únicamente'],
  ];

  const ws = utils.aoa_to_sheet(rows);

  // Anchos
  ws['!cols'] = [
    { wch: 32 },
    { wch: 50 },
  ];

  // Merge para el título y el separador de "Indicadores"
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },   // Título
    { s: { r: 8, c: 0 }, e: { r: 8, c: 1 } },   // Subtítulo INDICADORES
  ];

  // Estilos
  styleInfoSheet(ws, utils, rows.length);

  return ws;
}

function styleInfoSheet(ws: any, utils: any, totalRows: number): void {
  // Título principal (A1)
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND_HEADER_COLOR } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }
  // Altura del título
  ws['!rows'] = [{ hpt: 36 }];

  // Filas de metadata: labels bold, values normales
  for (let r = 2; r <= 6; r++) {
    const labelAddr = utils.encode_cell({ r, c: 0 });
    const valueAddr = utils.encode_cell({ r, c: 1 });
    if (ws[labelAddr]) {
      ws[labelAddr].s = {
        font: { bold: true, sz: 11, color: { rgb: '3F3F46' }, name: 'Calibri' },
        alignment: { vertical: 'center' },
      };
    }
    if (ws[valueAddr]) {
      ws[valueAddr].s = {
        font: { sz: 11, color: { rgb: '18181B' }, name: 'Calibri' },
        alignment: { vertical: 'center' },
      };
    }
  }

  // Subtítulo "INDICADORES" (A9)
  if (ws['A9']) {
    ws['A9'].s = {
      font: { bold: true, sz: 13, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND_ACCENT_COLOR } },
      alignment: { horizontal: 'center', vertical: 'center' },
    };
  }

  // Filas de KPIs (10 a 18)
  for (let r = 10; r <= 18; r++) {
    const labelAddr = utils.encode_cell({ r, c: 0 });
    const valueAddr = utils.encode_cell({ r, c: 1 });
    if (ws[labelAddr]) {
      ws[labelAddr].s = {
        font: { bold: true, sz: 11, color: { rgb: '3F3F46' }, name: 'Calibri' },
        fill: { patternType: 'solid', fgColor: { rgb: 'F4F4F5' } },
        alignment: { vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E4E4E7' } },
          bottom: { style: 'thin', color: { rgb: 'E4E4E7' } },
        },
      };
    }
    if (ws[valueAddr]) {
      ws[valueAddr].s = {
        font: { bold: true, sz: 12, color: { rgb: BRAND_HEADER_COLOR }, name: 'Calibri' },
        alignment: { horizontal: 'right', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: 'E4E4E7' } },
          bottom: { style: 'thin', color: { rgb: 'E4E4E7' } },
        },
      };
    }
  }

  // Footer (última fila)
  const footerR = totalRows - 1;
  const footerAddr = utils.encode_cell({ r: footerR, c: 0 });
  if (ws[footerAddr]) {
    ws[footerAddr].s = {
      font: { italic: true, sz: 9, color: { rgb: '71717A' }, name: 'Calibri' },
      alignment: { horizontal: 'left', vertical: 'center' },
    };
  }
}

// ─── Hoja 2: Detalle de marcaciones ───────────────────────────────

function buildDetailSheet(utils: any, ctx: ExportContext): any {
  const startStr = formatInTimeZone(ctx.start, ctx.timezone, 'yyyy-MM-dd');
  const endStr = formatInTimeZone(ctx.end, ctx.timezone, 'yyyy-MM-dd');
  const rows: TimelogReportRow[] = mapDayLogsToReportRows(
    ctx.filteredDayLogs,
    startStr,
    endStr,
    ctx.timezone,
  );

  // Convertir a AoA para tener control de estilos por celda
  const headers = [
    'Empleado',
    'Día',
    'Horario',
    'Entrada',
    'Inicio de almuerzo',
    'Fin de almuerzo',
    'Salida',
    'Horas Trabajadas',
    'Horas Extras',
    'Errores/Alertas',
  ];

  const aoa: (string | number)[][] = [headers];
  for (const row of rows) {
    aoa.push([
      row['Empleado'],
      row['Día'],
      row['Horario'],
      row['Entrada'],
      row['Inicio de almuerzo'],
      row['Fin de almuerzo'],
      row['Salida'],
      row['Horas Trabajadas'],
      row['Horas Extras'],
      row['Errores/Alertas'],
    ]);
  }

  const ws = utils.aoa_to_sheet(aoa);

  // Anchos por columna (proporcionales al contenido típico)
  ws['!cols'] = [
    { wch: 28 }, // Empleado
    { wch: 13 }, // Día
    { wch: 18 }, // Horario
    { wch: 26 }, // Entrada
    { wch: 22 }, // Inicio almuerzo
    { wch: 22 }, // Fin almuerzo
    { wch: 26 }, // Salida
    { wch: 14 }, // Horas
    { wch: 14 }, // Extras
    { wch: 38 }, // Errores
  ];

  // Freeze pane: primera fila (header) y primera columna (Empleado)
  ws['!freeze'] = { xSplit: 1, ySplit: 1 };

  // Filtros automáticos en todo el rango
  if (rows.length > 0) {
    const lastCol = String.fromCharCode(64 + headers.length);
    ws['!autofilter'] = { ref: `A1:${lastCol}${rows.length + 1}` };
  }

  styleDetailSheet(ws, utils, headers.length, rows);

  return ws;
}

function styleDetailSheet(
  ws: any,
  utils: any,
  numCols: number,
  rows: TimelogReportRow[],
): void {
  // Header
  for (let c = 0; c < numCols; c++) {
    const addr = utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND_HEADER_COLOR } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'medium', color: { rgb: BRAND_ACCENT_COLOR } },
        bottom: { style: 'medium', color: { rgb: BRAND_ACCENT_COLOR } },
        left: { style: 'thin', color: { rgb: '3F3F46' } },
        right: { style: 'thin', color: { rgb: '3F3F46' } },
      },
    };
  }
  // Altura del header
  ws['!rows'] = [{ hpt: 30 }];

  // Filas de datos
  for (let i = 0; i < rows.length; i++) {
    const r = i + 1;
    const row = rows[i];
    const hasError = row['Errores/Alertas'] !== 'Ninguno';
    const errorText = row['Errores/Alertas'];

    // Detectar severidad por contenido de la alerta
    const isCritical = /Ausencia|Sin Horario|Sin Marca/.test(errorText);
    const isWarning = !isCritical && hasError;

    let bgColor: string | null = null;
    if (isCritical) bgColor = 'FEE2E2';      // rojo claro
    else if (isWarning) bgColor = 'FEF3C7';  // amarillo claro
    else if (r % 2 === 0) bgColor = 'F4F4F5'; // zebra

    for (let c = 0; c < numCols; c++) {
      const addr = utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: '', t: 's' };

      const style: any = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '27272A' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E4E4E7' } },
          bottom: { style: 'thin', color: { rgb: 'E4E4E7' } },
          left: { style: 'thin', color: { rgb: 'E4E4E7' } },
          right: { style: 'thin', color: { rgb: 'E4E4E7' } },
        },
        alignment: {
          vertical: 'center',
          horizontal: c >= 3 && c <= 8 ? 'center' : 'left',  // tiempos y horas centrados
          wrapText: c === 0 || c === numCols - 1,
        },
      };
      if (bgColor) {
        style.fill = { patternType: 'solid', fgColor: { rgb: bgColor } };
      }
      // Columna de errores en color de alerta correspondiente
      if (c === numCols - 1 && hasError) {
        style.font = {
          ...style.font,
          bold: true,
          color: { rgb: isCritical ? '991B1B' : 'B45309' },
        };
      }
      ws[addr].s = style;
    }
  }
}

// ─── Hoja 3: Totales por empleado ─────────────────────────────────

function buildTotalsSheet(utils: any, ctx: ExportContext): any {
  const totals = computeEmployeeTotals(ctx.filteredDayLogs);

  const headers = [
    'Núm.',
    'Empleado',
    'Días marcados',
    'Horas trabajadas',
    'Horas extras',
    'Retraso (min)',
    'Exceso almuerzo (min)',
    'Salidas temp.',
    'Horas insuf.',
    'Ausencias',
  ];

  const aoa: (string | number)[][] = [headers];
  for (const t of totals) {
    aoa.push([
      t.employeeNumber,
      t.name,
      t.daysWithMarks,
      Number(t.totalHours.toFixed(2)),
      Number(t.overtimeHours.toFixed(2)),
      t.delayMinutes,
      t.lunchExceededMinutes,
      t.earlyExitsCount,
      t.insufficientHoursCount,
      t.absencesCount,
    ]);
  }
  // Fila de gran total
  if (totals.length > 0) {
    aoa.push([
      'TOTAL',
      `${totals.length} empleados`,
      sum(totals, (t) => t.daysWithMarks),
      Number(sum(totals, (t) => t.totalHours).toFixed(2)),
      Number(sum(totals, (t) => t.overtimeHours).toFixed(2)),
      sum(totals, (t) => t.delayMinutes),
      sum(totals, (t) => t.lunchExceededMinutes),
      sum(totals, (t) => t.earlyExitsCount),
      sum(totals, (t) => t.insufficientHoursCount),
      sum(totals, (t) => t.absencesCount),
    ]);
  }

  const ws = utils.aoa_to_sheet(aoa);

  ws['!cols'] = [
    { wch: 8 },   // Núm.
    { wch: 28 },  // Empleado
    { wch: 14 },
    { wch: 16 },
    { wch: 14 },
    { wch: 14 },
    { wch: 20 },
    { wch: 14 },
    { wch: 14 },
    { wch: 12 },
  ];

  if (totals.length > 0) {
    const lastCol = String.fromCharCode(64 + headers.length);
    ws['!autofilter'] = { ref: `A1:${lastCol}${totals.length + 1}` };
  }
  ws['!freeze'] = { xSplit: 2, ySplit: 1 };

  styleTotalsSheet(ws, utils, headers.length, totals.length);

  return ws;
}

function styleTotalsSheet(
  ws: any,
  utils: any,
  numCols: number,
  numEmployees: number,
): void {
  // Header
  for (let c = 0; c < numCols; c++) {
    const addr = utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND_HEADER_COLOR } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: {
        top: { style: 'medium', color: { rgb: BRAND_ACCENT_COLOR } },
        bottom: { style: 'medium', color: { rgb: BRAND_ACCENT_COLOR } },
        left: { style: 'thin', color: { rgb: '3F3F46' } },
        right: { style: 'thin', color: { rgb: '3F3F46' } },
      },
    };
  }
  ws['!rows'] = [{ hpt: 30 }];

  // Filas de empleados
  for (let i = 0; i < numEmployees; i++) {
    const r = i + 1;
    for (let c = 0; c < numCols; c++) {
      const addr = utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: '', t: 's' };
      ws[addr].s = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '27272A' } },
        border: {
          top: { style: 'thin', color: { rgb: 'E4E4E7' } },
          bottom: { style: 'thin', color: { rgb: 'E4E4E7' } },
          left: { style: 'thin', color: { rgb: 'E4E4E7' } },
          right: { style: 'thin', color: { rgb: 'E4E4E7' } },
        },
        alignment: {
          vertical: 'center',
          horizontal: c === 1 ? 'left' : 'center',
        },
        ...(r % 2 === 0 ? { fill: { patternType: 'solid', fgColor: { rgb: 'F4F4F5' } } } : {}),
      };
    }
  }

  // Fila de gran total
  const totalR = numEmployees + 1;
  for (let c = 0; c < numCols; c++) {
    const addr = utils.encode_cell({ r: totalR, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' }, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: BRAND_ACCENT_COLOR } },
      alignment: {
        horizontal: c <= 1 ? 'left' : 'center',
        vertical: 'center',
      },
      border: {
        top: { style: 'medium', color: { rgb: BRAND_HEADER_COLOR } },
        bottom: { style: 'medium', color: { rgb: BRAND_HEADER_COLOR } },
      },
    };
  }
}

// ─── Helpers de agregación ────────────────────────────────────────

function computeAggregateTotals(dayLogs: DayLog[]) {
  let totalHours = 0;
  let overtimeHours = 0;
  let delayMinutes = 0;
  let lunchExceededMinutes = 0;
  let earlyExitsCount = 0;
  let insufficientHoursCount = 0;
  let scheduleErrorCount = 0;

  for (const dl of dayLogs) {
    if (dl.totalHours) totalHours += dl.totalHours;
    if (dl.overtimeHours) overtimeHours += dl.overtimeHours;
    if (typeof dl.delay === 'number') delayMinutes += dl.delay;
    if (dl.lunchExceeded && dl.lunchMinutes && dl.lunchMinutes > 60) {
      lunchExceededMinutes += dl.lunchMinutes - 60;
    }
    if (dl.earlyExit) earlyExitsCount++;
    if (dl.insufficientHours) insufficientHoursCount++;
    if (dl.scheduleError) scheduleErrorCount++;
  }

  return {
    totalHours,
    overtimeHours,
    delayMinutes,
    lunchExceededMinutes,
    earlyExitsCount,
    insufficientHoursCount,
    scheduleErrorCount,
  };
}

function computeEmployeeTotals(dayLogs: DayLog[]): EmployeeTotal[] {
  const byEmployee = new Map<string, EmployeeTotal>();

  for (const dl of dayLogs) {
    const empId = dl.employee?.id;
    if (!empId) continue;

    let bucket = byEmployee.get(empId);
    if (!bucket) {
      bucket = {
        employeeNumber: (dl.employee as any)?.employee_number ?? '',
        name: `${dl.employee.first_name ?? ''} ${dl.employee.father_name ?? ''}`.trim() || '—',
        daysWithMarks: 0,
        totalHours: 0,
        overtimeHours: 0,
        delayMinutes: 0,
        lunchExceededMinutes: 0,
        earlyExitsCount: 0,
        insufficientHoursCount: 0,
        absencesCount: 0,
      };
      byEmployee.set(empId, bucket);
    }

    const hasMarks = !!(dl.entry || dl.lunch_start || dl.exit);
    if (hasMarks) bucket.daysWithMarks++;
    if (dl.totalHours) bucket.totalHours += dl.totalHours;
    if (dl.overtimeHours) bucket.overtimeHours += dl.overtimeHours;
    if (typeof dl.delay === 'number') bucket.delayMinutes += dl.delay;
    if (dl.lunchExceeded && dl.lunchMinutes && dl.lunchMinutes > 60) {
      bucket.lunchExceededMinutes += dl.lunchMinutes - 60;
    }
    if (dl.earlyExit) bucket.earlyExitsCount++;
    if (dl.insufficientHours) bucket.insufficientHoursCount++;
    // Ausencia: día con horario asignado pero sin marcaciones
    if (!hasMarks && dl.schedule?.schedule && !dl.schedule.schedule.day_off) {
      bucket.absencesCount++;
    }
  }

  return [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function sum<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((acc, x) => acc + f(x), 0);
}

// Export utilidad de fechas
export { formatHours };
