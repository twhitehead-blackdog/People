/**
 * Exportación profesional a PDF de marcaciones (timelogs).
 *
 * Usa pdfmake (carga dinámica para no inflar bundle). Diseñado para
 * imprimir o firmar — formato carta horizontal con header de marca,
 * tabla compacta, líneas de firma al final.
 *
 * Estructura:
 *  - Cover: título, período, alcance, empresa, KPIs.
 *  - Tabla detalle: una fila por DayLog filtrado.
 *  - Página final: resumen por empleado + líneas de firma.
 */
import { format, isEqual } from 'date-fns';
import { formatInTimeZone } from 'date-fns-tz';
import { DayLog } from '../../../models';
import { formatHours } from './alert.utils';
import { mapDayLogsToReportRows, TimelogReportRow } from './timelogs-report.utils';

export interface PdfExportContext {
  filteredDayLogs: DayLog[];
  start: Date;
  end: Date;
  timezone: string;
  scopeName: string;
  companyName?: string;
  generatedByEmail?: string;
}

const BRAND_DARK = '#0F172A';     // slate-900
const BRAND_ACCENT = '#D97706';   // amber-600
const GRAY_LIGHT = '#E4E4E7';
const GRAY_MUTED = '#71717A';

export async function exportTimelogsPdf(ctx: PdfExportContext): Promise<void> {
  const pdfMakeModule: any = await import('pdfmake/build/pdfmake');
  const fontsModule: any = await import('pdfmake/build/vfs_fonts');
  const pdfMake = pdfMakeModule.default ?? pdfMakeModule;
  pdfMake.vfs = (fontsModule.default ?? fontsModule).vfs ?? fontsModule.vfs;

  const startStr = formatInTimeZone(ctx.start, ctx.timezone, 'yyyy-MM-dd');
  const endStr = formatInTimeZone(ctx.end, ctx.timezone, 'yyyy-MM-dd');
  const rows: TimelogReportRow[] = mapDayLogsToReportRows(
    ctx.filteredDayLogs,
    startStr,
    endStr,
    ctx.timezone,
  );
  const kpis = computeAggregateTotals(ctx.filteredDayLogs);
  const employeeTotals = computeEmployeeTotals(ctx.filteredDayLogs);

  const generatedAt = formatInTimeZone(
    new Date(),
    ctx.timezone,
    "dd/MM/yyyy 'a las' HH:mm",
  );
  const rangeLabel = isEqual(ctx.start, ctx.end)
    ? formatInTimeZone(ctx.start, ctx.timezone, "EEEE dd 'de' MMMM yyyy")
    : `${formatInTimeZone(ctx.start, ctx.timezone, 'dd/MM/yyyy')} — ${formatInTimeZone(ctx.end, ctx.timezone, 'dd/MM/yyyy')}`;

  const docDefinition: any = {
    pageSize: 'LETTER',
    pageOrientation: 'landscape',
    pageMargins: [30, 60, 30, 50],
    defaultStyle: {
      fontSize: 9,
      color: '#27272A',
    },

    // Header en cada página
    header: (currentPage: number) =>
      currentPage === 1
        ? null
        : {
            margin: [30, 20, 30, 0],
            columns: [
              {
                text: ctx.companyName ?? '',
                style: 'headerCompany',
                width: '*',
              },
              {
                text: `Marcaciones — ${rangeLabel}`,
                style: 'headerTitle',
                width: 'auto',
                alignment: 'right',
              },
            ],
          },

    // Footer en cada página
    footer: (currentPage: number, pageCount: number) => ({
      margin: [30, 10, 30, 0],
      columns: [
        {
          text: `Generado: ${generatedAt}`,
          style: 'footerText',
          width: '*',
        },
        {
          text: `Página ${currentPage} de ${pageCount}`,
          style: 'footerText',
          width: 'auto',
          alignment: 'right',
        },
      ],
    }),

    content: [
      // ─── Cover ───
      { text: 'REPORTE DE MARCACIONES', style: 'coverTitle' },
      {
        canvas: [
          {
            type: 'line',
            x1: 0, y1: 0, x2: 730, y2: 0,
            lineWidth: 2,
            lineColor: BRAND_ACCENT,
          },
        ],
        margin: [0, 0, 0, 18],
      },
      {
        columns: [
          {
            width: 'auto',
            stack: [
              { text: ctx.companyName ?? '—', style: 'metaValue' },
              { text: 'Empresa', style: 'metaLabel' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: rangeLabel, style: 'metaValue' },
              { text: 'Período', style: 'metaLabel' },
            ],
            margin: [16, 0, 0, 0],
          },
          {
            width: 'auto',
            stack: [
              { text: ctx.scopeName, style: 'metaValue' },
              { text: 'Alcance', style: 'metaLabel' },
            ],
          },
        ],
        margin: [0, 0, 0, 16],
      },
      {
        columns: [
          {
            width: 'auto',
            stack: [
              { text: generatedAt, style: 'metaValueSm' },
              { text: 'Fecha de generación', style: 'metaLabel' },
            ],
          },
          {
            width: '*',
            stack: [
              { text: ctx.generatedByEmail ?? '—', style: 'metaValueSm' },
              { text: 'Generado por', style: 'metaLabel' },
            ],
            margin: [16, 0, 0, 0],
          },
        ],
        margin: [0, 0, 0, 24],
      },

      // KPIs
      { text: 'INDICADORES DEL PERÍODO', style: 'sectionTitle' },
      {
        columns: [
          kpiCard('Registros', `${ctx.filteredDayLogs.length}`),
          kpiCard('Con marcas', `${countWithMarks(ctx.filteredDayLogs)}`),
          kpiCard('Horas trabajadas', `${kpis.totalHours.toFixed(1)} h`),
          kpiCard('Horas extras', `${kpis.overtimeHours.toFixed(1)} h`),
        ],
        margin: [0, 8, 0, 12],
      },
      {
        columns: [
          kpiCard('Retraso', `${kpis.delayMinutes} min`),
          kpiCard('Almuerzo +60', `${kpis.lunchExceededMinutes} min`),
          kpiCard('Salidas temp.', `${kpis.earlyExitsCount}`),
          kpiCard('Errores horario', `${kpis.scheduleErrorCount}`),
        ],
      },

      // ─── Detalle ───
      { text: '', pageBreak: 'after' },
      { text: 'DETALLE DE MARCACIONES', style: 'sectionTitle', margin: [0, 0, 0, 8] },
      buildDetailTable(rows),

      // ─── Totales ───
      { text: '', pageBreak: 'after' },
      { text: 'TOTALES POR EMPLEADO', style: 'sectionTitle', margin: [0, 0, 0, 8] },
      buildTotalsTable(employeeTotals),

      // ─── Firmas ───
      { text: '', pageBreak: 'after' },
      { text: 'APROBACIONES', style: 'sectionTitle', margin: [0, 0, 0, 24] },
      {
        columns: [
          signatureBlock('Elaborado por', ctx.generatedByEmail ?? ''),
          signatureBlock('Revisado por', ''),
          signatureBlock('Aprobado por', ''),
        ],
        columnGap: 20,
      },
      {
        text:
          'Este documento contiene información confidencial. Su uso está restringido a personal autorizado.',
        style: 'confidential',
        margin: [0, 60, 0, 0],
        alignment: 'center',
      },
    ],

    styles: {
      coverTitle: {
        fontSize: 22,
        bold: true,
        color: BRAND_DARK,
        margin: [0, 0, 0, 4],
      },
      sectionTitle: {
        fontSize: 11,
        bold: true,
        color: '#FFFFFF',
        background: BRAND_DARK,
        margin: [0, 0, 0, 0],
      } as any,
      metaLabel: {
        fontSize: 8,
        color: GRAY_MUTED,
        bold: true,
      },
      metaValue: {
        fontSize: 13,
        color: BRAND_DARK,
        bold: true,
      },
      metaValueSm: {
        fontSize: 10,
        color: BRAND_DARK,
      },
      kpiLabel: {
        fontSize: 8,
        color: GRAY_MUTED,
        bold: true,
      },
      kpiValue: {
        fontSize: 14,
        color: BRAND_DARK,
        bold: true,
      },
      tableHeader: {
        bold: true,
        fontSize: 8,
        color: '#FFFFFF',
        fillColor: BRAND_DARK,
        margin: [0, 4, 0, 4],
      },
      tableCell: {
        fontSize: 8,
      },
      tableCellCenter: {
        fontSize: 8,
        alignment: 'center',
      },
      tableCellRight: {
        fontSize: 8,
        alignment: 'right',
      },
      headerCompany: {
        fontSize: 9,
        color: GRAY_MUTED,
        bold: true,
      },
      headerTitle: {
        fontSize: 9,
        color: BRAND_DARK,
      },
      footerText: {
        fontSize: 7,
        color: GRAY_MUTED,
      },
      confidential: {
        fontSize: 8,
        italics: true,
        color: GRAY_MUTED,
      },
    },
  };

  const safeName = ctx.scopeName.replace(/[^A-Za-z0-9_-]+/g, '_').toUpperCase();
  const startFile = formatInTimeZone(ctx.start, ctx.timezone, 'yyyyMMdd');
  const endFile = formatInTimeZone(ctx.end, ctx.timezone, 'yyyyMMdd');
  const fileName = `Marcaciones_${safeName}_${startFile}-${endFile}.pdf`;

  pdfMake.createPdf(docDefinition).download(fileName);
}

// ─── Componentes reutilizables del doc ───────────────────────────

function kpiCard(label: string, value: string): any {
  return {
    width: '*',
    margin: [0, 0, 8, 0],
    table: {
      widths: ['*'],
      body: [[{
        stack: [
          { text: value, style: 'kpiValue' },
          { text: label, style: 'kpiLabel', margin: [0, 2, 0, 0] },
        ],
        fillColor: '#F4F4F5',
        margin: [10, 8, 10, 8],
        border: [false, false, false, false],
      }]],
    },
    layout: 'noBorders',
  };
}

function buildDetailTable(rows: TimelogReportRow[]): any {
  const headers = [
    { text: 'Empleado', style: 'tableHeader' },
    { text: 'Día', style: 'tableHeader' },
    { text: 'Horario', style: 'tableHeader' },
    { text: 'Entrada', style: 'tableHeader' },
    { text: 'Inicio Alm.', style: 'tableHeader' },
    { text: 'Fin Alm.', style: 'tableHeader' },
    { text: 'Salida', style: 'tableHeader' },
    { text: 'Horas', style: 'tableHeader' },
    { text: 'Extras', style: 'tableHeader' },
    { text: 'Alertas', style: 'tableHeader' },
  ];

  const body: any[] = [headers];
  for (const row of rows) {
    const errors = row['Errores/Alertas'];
    const isCritical = /Ausencia|Sin Horario|Sin Marca/.test(errors);
    const isWarning = !isCritical && errors !== 'Ninguno';
    const fill = isCritical ? '#FEE2E2' : isWarning ? '#FEF3C7' : undefined;

    body.push([
      { text: row['Empleado'], style: 'tableCell', fillColor: fill },
      { text: row['Día'], style: 'tableCellCenter', fillColor: fill },
      { text: row['Horario'], style: 'tableCellCenter', fillColor: fill },
      { text: row['Entrada'], style: 'tableCellCenter', fillColor: fill },
      { text: row['Inicio de almuerzo'], style: 'tableCellCenter', fillColor: fill },
      { text: row['Fin de almuerzo'], style: 'tableCellCenter', fillColor: fill },
      { text: row['Salida'], style: 'tableCellCenter', fillColor: fill },
      { text: row['Horas Trabajadas'], style: 'tableCellRight', fillColor: fill },
      { text: row['Horas Extras'], style: 'tableCellRight', fillColor: fill },
      {
        text: errors,
        style: 'tableCell',
        fillColor: fill,
        color: isCritical ? '#991B1B' : isWarning ? '#B45309' : undefined,
        bold: errors !== 'Ninguno',
      },
    ]);
  }

  return {
    table: {
      headerRows: 1,
      dontBreakRows: true,
      widths: [70, 45, 50, 60, 55, 55, 60, 35, 35, 80],
      body,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => GRAY_LIGHT,
      vLineColor: () => GRAY_LIGHT,
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 2,
      paddingBottom: () => 2,
    },
  };
}

interface EmployeeTotalPDF {
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

function buildTotalsTable(totals: EmployeeTotalPDF[]): any {
  const headers = [
    { text: 'Núm.', style: 'tableHeader' },
    { text: 'Empleado', style: 'tableHeader' },
    { text: 'Días', style: 'tableHeader' },
    { text: 'Horas', style: 'tableHeader' },
    { text: 'Extras', style: 'tableHeader' },
    { text: 'Retraso', style: 'tableHeader' },
    { text: 'Exc. alm.', style: 'tableHeader' },
    { text: 'Sal. temp.', style: 'tableHeader' },
    { text: 'Horas insuf.', style: 'tableHeader' },
    { text: 'Ausencias', style: 'tableHeader' },
  ];
  const body: any[] = [headers];

  for (const t of totals) {
    body.push([
      { text: t.employeeNumber, style: 'tableCellCenter' },
      { text: t.name, style: 'tableCell' },
      { text: t.daysWithMarks, style: 'tableCellCenter' },
      { text: formatHours(t.totalHours), style: 'tableCellRight' },
      { text: formatHours(t.overtimeHours), style: 'tableCellRight' },
      { text: t.delayMinutes, style: 'tableCellRight' },
      { text: t.lunchExceededMinutes, style: 'tableCellRight' },
      { text: t.earlyExitsCount, style: 'tableCellCenter' },
      { text: t.insufficientHoursCount, style: 'tableCellCenter' },
      { text: t.absencesCount, style: 'tableCellCenter' },
    ]);
  }

  // Fila TOTAL
  if (totals.length > 0) {
    body.push([
      { text: 'TOTAL', bold: true, fillColor: BRAND_ACCENT, color: '#FFF', fontSize: 9 },
      {
        text: `${totals.length} empleados`,
        bold: true,
        fillColor: BRAND_ACCENT,
        color: '#FFF',
        fontSize: 9,
      },
      {
        text: sum(totals, (t) => t.daysWithMarks),
        bold: true,
        fillColor: BRAND_ACCENT,
        color: '#FFF',
        alignment: 'center',
        fontSize: 9,
      },
      {
        text: formatHours(sum(totals, (t) => t.totalHours)),
        bold: true,
        fillColor: BRAND_ACCENT,
        color: '#FFF',
        alignment: 'right',
        fontSize: 9,
      },
      {
        text: formatHours(sum(totals, (t) => t.overtimeHours)),
        bold: true,
        fillColor: BRAND_ACCENT,
        color: '#FFF',
        alignment: 'right',
        fontSize: 9,
      },
      {
        text: sum(totals, (t) => t.delayMinutes),
        bold: true,
        fillColor: BRAND_ACCENT,
        color: '#FFF',
        alignment: 'right',
        fontSize: 9,
      },
      {
        text: sum(totals, (t) => t.lunchExceededMinutes),
        bold: true,
        fillColor: BRAND_ACCENT,
        color: '#FFF',
        alignment: 'right',
        fontSize: 9,
      },
      {
        text: sum(totals, (t) => t.earlyExitsCount),
        bold: true,
        fillColor: BRAND_ACCENT,
        color: '#FFF',
        alignment: 'center',
        fontSize: 9,
      },
      {
        text: sum(totals, (t) => t.insufficientHoursCount),
        bold: true,
        fillColor: BRAND_ACCENT,
        color: '#FFF',
        alignment: 'center',
        fontSize: 9,
      },
      {
        text: sum(totals, (t) => t.absencesCount),
        bold: true,
        fillColor: BRAND_ACCENT,
        color: '#FFF',
        alignment: 'center',
        fontSize: 9,
      },
    ]);
  }

  return {
    table: {
      headerRows: 1,
      widths: [30, 100, 35, 40, 40, 45, 50, 45, 50, 50],
      body,
    },
    layout: {
      hLineWidth: () => 0.5,
      vLineWidth: () => 0.5,
      hLineColor: () => GRAY_LIGHT,
      vLineColor: () => GRAY_LIGHT,
      paddingLeft: () => 4,
      paddingRight: () => 4,
      paddingTop: () => 3,
      paddingBottom: () => 3,
    },
  };
}

function signatureBlock(label: string, prefilled: string): any {
  return {
    width: '*',
    stack: [
      {
        canvas: [
          {
            type: 'line',
            x1: 0, y1: 0, x2: 220, y2: 0,
            lineWidth: 0.7,
            lineColor: BRAND_DARK,
          },
        ],
        margin: [0, 0, 0, 4],
      },
      { text: label, style: 'metaLabel', margin: [0, 2, 0, 2] },
      {
        text: prefilled || '_________________________',
        style: 'metaValueSm',
        margin: [0, 0, 0, 0],
      },
    ],
  };
}

// ─── Helpers de agregación (mismos que excel-export) ──────────────

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

function countWithMarks(dayLogs: DayLog[]): number {
  let c = 0;
  for (const dl of dayLogs) if (dl.entry || dl.lunch_start || dl.exit) c++;
  return c;
}

function computeEmployeeTotals(dayLogs: DayLog[]): EmployeeTotalPDF[] {
  const byEmployee = new Map<string, EmployeeTotalPDF>();
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
    if (!hasMarks && dl.schedule?.schedule && !dl.schedule.schedule.day_off) {
      bucket.absencesCount++;
    }
  }
  return [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function sum<T>(arr: T[], f: (x: T) => number): number {
  return arr.reduce((acc, x) => acc + f(x), 0);
}

// Helper para formatear el filename
export { format };
