import { format, parseISO } from 'date-fns';
import {
  BranchHistoryEntry,
  Incidencia,
  MetaBranchView,
  MovementsSummary,
  PersonnelMovement,
} from '../models/personnel-movements.model';

/** Format an ISO yyyy-MM-dd (or empty) to DD/MM/YY for Excel display. */
function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '';
  try {
    return format(parseISO(iso), 'dd/MM/yy');
  } catch {
    return iso;
  }
}

const INCIDENCIA_LABELS: Record<Incidencia['type'], string> = {
  tardanza: 'Tardanza',
  salida_temprana: 'Salida Temprana',
  certificado_medico: 'Certificado Médico',
  ausencia_injustificada: 'Ausencia Injustificada',
};

export interface EmployeeMeta {
  documentId: string;
  positionName: string;
}

function lookup(map: Map<string, EmployeeMeta> | undefined, employeeId: string) {
  const meta = map?.get(employeeId);
  return {
    cedula: meta?.documentId ?? '',
    cargo: meta?.positionName ?? '',
  };
}

/**
 * Build + download the 5-sheet Excel workbook.
 * Uses dynamic import of xlsx-js-style to keep the module bundle small.
 */
export async function exportMovementsWorkbook(params: {
  summary: MovementsSummary;
  movements: PersonnelMovement[];
  history: BranchHistoryEntry[];
  incidencias: Incidencia[];
  metas: MetaBranchView[];
  periodLabel: string;
  moduleColor: string;
  employeeMeta?: Map<string, EmployeeMeta>;
}): Promise<void> {
  const xlsxModule = await import('xlsx-js-style');
  const XLSX = ((xlsxModule as unknown) as { default?: unknown }).default ?? xlsxModule;
  const XLSXTyped = XLSX as {
    utils: {
      json_to_sheet: (data: unknown[]) => unknown;
      aoa_to_sheet: (data: unknown[][]) => unknown;
      book_new: () => unknown;
      book_append_sheet: (wb: unknown, ws: unknown, name: string) => void;
      encode_cell: (a: { r: number; c: number }) => string;
      decode_range: (r: string) => { s: { r: number; c: number }; e: { r: number; c: number } };
    };
    writeFile: (wb: unknown, filename: string) => void;
  };

  const styleMod = await import('../../shared/utils/excel-style.utils');
  const { styleDataSheet, styleSummarySheet } = styleMod;

  const wb = XLSXTyped.utils.book_new();

  // --- Sheet 1: Resumen ---
  const summaryRows: (string | number)[][] = [
    ['Reporte de Movimientos de Personal'],
    ['Período', params.periodLabel],
    [],
    ['Total Movimientos', params.summary.totalMovements],
    ['Total Incidencias', params.summary.totalIncidencias],
    ['Colaboradores con movimientos', params.summary.employeesMoved],
    ['Sucursales con meta cumplida', params.summary.branchesWithMetaAchieved],
    [],
    ['Sucursal', 'Movimientos Salida', 'Movimientos Entrada', 'Incidencias', 'Personal'],
    ...params.summary.perBranch.map((b) => [
      b.branchName,
      b.movementsOut,
      b.movementsIn,
      b.incidencias,
      b.personnelCount,
    ]),
  ];
  const summaryWs = XLSXTyped.utils.aoa_to_sheet(summaryRows);
  styleSummarySheet(summaryWs, XLSXTyped.utils, params.moduleColor);
  XLSXTyped.utils.book_append_sheet(wb, summaryWs, 'Resumen');

  // --- Sheet 2: Movimientos (ordenado por Colaborador, luego fecha asc) ---
  const movementsSorted = [...params.movements].sort(
    (a, b) =>
      a.employeeName.localeCompare(b.employeeName) ||
      a.startDate.localeCompare(b.startDate),
  );
  const movementsData = movementsSorted.map((m) => {
    const { cedula, cargo } = lookup(params.employeeMeta, m.employeeId);
    return {
      Colaborador: m.employeeName,
      Cédula: cedula,
      Cargo: cargo,
      'Sucursal Origen': m.originBranchName ?? '',
      'Sucursal Destino': m.destinationBranchName,
      'Fecha Inicio': fmtDate(m.startDate),
      'Fecha Fin': fmtDate(m.endDate),
      Días: m.durationDays,
    };
  });
  const movementsWs = XLSXTyped.utils.json_to_sheet(movementsData);
  (movementsWs as { [k: string]: unknown })['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 8 },
  ];
  styleDataSheet(movementsWs, XLSXTyped.utils, params.moduleColor);
  XLSXTyped.utils.book_append_sheet(wb, movementsWs, 'Movimientos');

  // --- Sheet 3: Historial (ya viene ordenado por Colaborador + fecha asc) ---
  const historyData = params.history.map((h) => {
    const { cedula, cargo } = lookup(params.employeeMeta, h.employeeId);
    return {
      Colaborador: h.employeeName,
      Cédula: cedula,
      Cargo: cargo,
      Fecha: fmtDate(h.startDate),
      'Fecha Fin': fmtDate(h.endDate),
      Sucursal: h.branchName,
      'Tipo Movimiento': h.movementType === 'base' ? 'Base' : 'Movimiento',
      'Duración (días)': h.durationDays,
    };
  });
  const historyWs = XLSXTyped.utils.json_to_sheet(historyData);
  (historyWs as { [k: string]: unknown })['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 14 },
  ];
  styleDataSheet(historyWs, XLSXTyped.utils, params.moduleColor);
  XLSXTyped.utils.book_append_sheet(wb, historyWs, 'Historial');

  // --- Sheet 4: Incidencias (ordenado por Colaborador, luego fecha asc) ---
  const incidenciasSorted = [...params.incidencias].sort(
    (a, b) =>
      a.employeeName.localeCompare(b.employeeName) || a.date.localeCompare(b.date),
  );
  const incidenciasData = incidenciasSorted.map((i) => {
    const { cedula, cargo } = lookup(params.employeeMeta, i.employeeId);
    return {
      Colaborador: i.employeeName,
      Cédula: cedula,
      Cargo: cargo,
      Fecha: fmtDate(i.date),
      'Fecha Fin': fmtDate(i.endDate),
      Sucursal: i.branchName ?? '',
      Tipo: INCIDENCIA_LABELS[i.type],
      Detalle: i.detail,
    };
  });
  const incidenciasWs = XLSXTyped.utils.json_to_sheet(incidenciasData);
  (incidenciasWs as { [k: string]: unknown })['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 50 },
  ];
  styleDataSheet(incidenciasWs, XLSXTyped.utils, params.moduleColor);
  XLSXTyped.utils.book_append_sheet(wb, incidenciasWs, 'Incidencias');

  // --- Sheet 5: Metas ---
  const metasData = params.metas.map((m) => ({
    Tienda: m.branchName,
    'Cumplimiento %': m.topPercentage,
    'Nivel Alcanzado': m.achievedTier ? m.achievedTier.toUpperCase() : 'NINGUNO',
    Estado: m.estadoGeneral,
    'Ventas Actuales': m.ventasActuales,
    'Personal Asignado (cant.)': m.personnel.length,
    'Personal Asignado': m.personnel.map((p) => p.employeeName).join(', '),
    'Movimientos del Período': m.movementsCount,
  }));
  const metasWs = XLSXTyped.utils.json_to_sheet(metasData);
  (metasWs as { [k: string]: unknown })['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 12 }, { wch: 60 }, { wch: 14 },
  ];
  styleDataSheet(metasWs, XLSXTyped.utils, params.moduleColor);
  XLSXTyped.utils.book_append_sheet(wb, metasWs, 'Metas');

  // --- Sheet 6: Por Colaborador (timeline unificado: movs + incidencias) ---
  type UnifiedRow = {
    employeeId: string;
    employeeName: string;
    date: string;
    endDate: string | null;
    tipo: string;
    sucursal: string;
    detalle: string;
  };
  const unified: UnifiedRow[] = [];
  for (const m of params.movements) {
    unified.push({
      employeeId: m.employeeId,
      employeeName: m.employeeName,
      date: m.startDate,
      endDate: m.endDate,
      tipo: 'Movimiento',
      sucursal: `${m.originBranchName ?? '—'} → ${m.destinationBranchName}`,
      detalle: `${m.durationDays} día(s)`,
    });
  }
  for (const i of params.incidencias) {
    unified.push({
      employeeId: i.employeeId,
      employeeName: i.employeeName,
      date: i.date,
      endDate: i.endDate,
      tipo: INCIDENCIA_LABELS[i.type],
      sucursal: i.branchName ?? '',
      detalle: i.detail,
    });
  }
  unified.sort(
    (a, b) =>
      a.employeeName.localeCompare(b.employeeName) || a.date.localeCompare(b.date),
  );
  const unifiedData = unified.map((r) => {
    const { cedula, cargo } = lookup(params.employeeMeta, r.employeeId);
    return {
      Colaborador: r.employeeName,
      Cédula: cedula,
      Cargo: cargo,
      Fecha: fmtDate(r.date),
      'Fecha Fin': fmtDate(r.endDate),
      Tipo: r.tipo,
      Sucursal: r.sucursal,
      Detalle: r.detalle,
    };
  });
  const unifiedWs = XLSXTyped.utils.json_to_sheet(unifiedData);
  (unifiedWs as { [k: string]: unknown })['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 24 }, { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 36 }, { wch: 50 },
  ];
  styleDataSheet(unifiedWs, XLSXTyped.utils, params.moduleColor);
  XLSXTyped.utils.book_append_sheet(wb, unifiedWs, 'Por Colaborador');

  const filename = `Movimientos_Personal_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
  XLSXTyped.writeFile(wb, filename);
}
