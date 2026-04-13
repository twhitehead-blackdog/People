import { format } from 'date-fns';
import {
  BranchHistoryEntry,
  Incidencia,
  MetaBranchView,
  MovementsSummary,
  PersonnelMovement,
} from '../models/personnel-movements.model';

const INCIDENCIA_LABELS: Record<Incidencia['type'], string> = {
  tardanza: 'Tardanza',
  certificado_medico: 'Certificado Médico',
  ausencia_injustificada: 'Ausencia Injustificada',
};

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

  // --- Sheet 2: Movimientos ---
  const movementsData = params.movements.map((m) => ({
    Colaborador: m.employeeName,
    'Sucursal Origen': m.originBranchName ?? '',
    'Sucursal Destino': m.destinationBranchName,
    'Fecha Inicio': m.startDate,
    'Fecha Fin': m.endDate,
    Días: m.durationDays,
  }));
  const movementsWs = XLSXTyped.utils.json_to_sheet(movementsData);
  (movementsWs as { [k: string]: unknown })['!cols'] = [
    { wch: 30 }, { wch: 24 }, { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 8 },
  ];
  styleDataSheet(movementsWs, XLSXTyped.utils, params.moduleColor);
  XLSXTyped.utils.book_append_sheet(wb, movementsWs, 'Movimientos');

  // --- Sheet 3: Historial ---
  const historyData = params.history.map((h) => ({
    Colaborador: h.employeeName,
    Fecha: h.startDate,
    'Fecha Fin': h.endDate,
    Sucursal: h.branchName,
    'Tipo Movimiento': h.movementType === 'base' ? 'Base' : 'Movimiento',
    'Duración (días)': h.durationDays,
  }));
  const historyWs = XLSXTyped.utils.json_to_sheet(historyData);
  (historyWs as { [k: string]: unknown })['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 16 }, { wch: 14 },
  ];
  styleDataSheet(historyWs, XLSXTyped.utils, params.moduleColor);
  XLSXTyped.utils.book_append_sheet(wb, historyWs, 'Historial');

  // --- Sheet 4: Incidencias ---
  const incidenciasData = params.incidencias.map((i) => ({
    Colaborador: i.employeeName,
    Fecha: i.date,
    'Fecha Fin': i.endDate ?? '',
    Sucursal: i.branchName ?? '',
    Tipo: INCIDENCIA_LABELS[i.type],
    Detalle: i.detail,
  }));
  const incidenciasWs = XLSXTyped.utils.json_to_sheet(incidenciasData);
  (incidenciasWs as { [k: string]: unknown })['!cols'] = [
    { wch: 30 }, { wch: 14 }, { wch: 14 }, { wch: 24 }, { wch: 24 }, { wch: 50 },
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

  const filename = `Movimientos_Personal_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.xlsx`;
  XLSXTyped.writeFile(wb, filename);
}
