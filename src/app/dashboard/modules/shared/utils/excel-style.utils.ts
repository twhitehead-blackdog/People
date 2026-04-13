/**
 * Excel styling utilities for HR dashboard exports.
 * Uses xlsx-js-style cell style objects.
 * Colors match the dashboard tab theme colors.
 */

// Hex colors matching dashboard tab gradients (darker shade for contrast on white text)
export const MODULE_COLORS: Record<string, string> = {
  disabilities: '0891B2',       // cyan-600
  compensatory: '0E7490',       // cyan-700
  documents: '0891B2',          // cyan-600
  vacations: '0891B2',          // cyan-600
  timelog_correction: 'EA580C', // orange-600
  uniform_request: '0D9488',    // teal-600
  work_permits: 'D97706',       // amber-600
  personnel_movements: '8B5CF6', // violet-500
  general: '1E293B',            // slate-800
};

const BORDER_THIN = {
  top: { style: 'thin', color: { rgb: 'D4D4D8' } },
  bottom: { style: 'thin', color: { rgb: 'D4D4D8' } },
  left: { style: 'thin', color: { rgb: 'D4D4D8' } },
  right: { style: 'thin', color: { rgb: 'D4D4D8' } },
};

const BORDER_HEADER = {
  top: { style: 'thin', color: { rgb: '404040' } },
  bottom: { style: 'medium', color: { rgb: '404040' } },
  left: { style: 'thin', color: { rgb: '404040' } },
  right: { style: 'thin', color: { rgb: '404040' } },
};

/**
 * Apply styles to a data worksheet: colored header, bordered rows, alternating stripes.
 */
export function styleDataSheet(ws: any, utils: any, headerColor: string): void {
  const ref = ws['!ref'];
  if (!ref) return;
  const range = utils.decode_range(ref);

  for (let c = range.s.c; c <= range.e.c; c++) {
    const addr = utils.encode_cell({ r: 0, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: headerColor } },
      alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      border: BORDER_HEADER,
    };
  }

  for (let r = 1; r <= range.e.r; r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const addr = utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: '', t: 's' };
      ws[addr].s = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '27272A' } },
        border: BORDER_THIN,
        alignment: { vertical: 'center' },
        ...(r % 2 === 0 ? { fill: { patternType: 'solid', fgColor: { rgb: 'F4F4F5' } } } : {}),
      };
    }
  }
}

/**
 * Apply styles to a summary/stats worksheet.
 */
export function styleSummarySheet(ws: any, utils: any, accentColor: string): void {
  // Title row A1
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 14, color: { rgb: accentColor }, name: 'Calibri' },
    };
  }
  // Date row A2
  if (ws['A2']) {
    ws['A2'].s = { font: { bold: true, sz: 10, name: 'Calibri', color: { rgb: '52525B' } } };
  }
  if (ws['B2']) {
    ws['B2'].s = { font: { sz: 10, name: 'Calibri', color: { rgb: '52525B' } } };
  }
  // Stat labels (rows 3-6 typically: Total, Pendientes, Aprobadas, Rechazadas)
  for (let r = 2; r <= 8; r++) {
    const labelAddr = utils.encode_cell({ r, c: 0 });
    const valueAddr = utils.encode_cell({ r, c: 1 });
    if (ws[labelAddr]) {
      ws[labelAddr].s = { font: { bold: true, sz: 10, name: 'Calibri', color: { rgb: '3F3F46' } } };
    }
    if (ws[valueAddr]) {
      ws[valueAddr].s = { font: { sz: 10, name: 'Calibri', color: { rgb: '18181B' } } };
    }
  }
}

/**
 * Style the general report summary sheet with per-module colors.
 */
export function styleGeneralSummary(ws: any, utils: any, moduleColors: string[]): void {
  const ref = ws['!ref'];
  if (!ref) return;
  const range = utils.decode_range(ref);

  // Row 0: Title
  if (ws['A1']) {
    ws['A1'].s = {
      font: { bold: true, sz: 16, color: { rgb: '0F172A' }, name: 'Calibri' },
    };
  }
  // Row 1: Date
  if (ws['A2']) {
    ws['A2'].s = { font: { bold: true, sz: 10, name: 'Calibri', color: { rgb: '64748B' } } };
  }
  if (ws['B2']) {
    ws['B2'].s = { font: { sz: 10, name: 'Calibri', color: { rgb: '64748B' } } };
  }

  // Row 3 (index 3): Header row
  const headerRow = 3;
  for (let c = 0; c <= 4; c++) {
    const addr = utils.encode_cell({ r: headerRow, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: '1E293B' } },
      alignment: { horizontal: 'center', vertical: 'center' },
      border: BORDER_HEADER,
    };
  }

  // Data rows (row 4 to 4+moduleColors.length-1)
  for (let i = 0; i < moduleColors.length; i++) {
    const r = 4 + i;
    const color = moduleColors[i];
    // Module name cell - colored with the module's accent
    const nameAddr = utils.encode_cell({ r, c: 0 });
    if (ws[nameAddr]) {
      ws[nameAddr].s = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 10, name: 'Calibri' },
        fill: { patternType: 'solid', fgColor: { rgb: color } },
        border: BORDER_THIN,
        alignment: { vertical: 'center' },
      };
    }
    // Number cells
    for (let c = 1; c <= 4; c++) {
      const addr = utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: 0, t: 'n' };
      ws[addr].s = {
        font: { sz: 10, name: 'Calibri', color: { rgb: '27272A' } },
        border: BORDER_THIN,
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { patternType: 'solid', fgColor: { rgb: lightenColor(color) } },
      };
    }
  }

  // Totals row (after empty row)
  const totalsRow = 4 + moduleColors.length + 1;
  for (let c = 0; c <= 4; c++) {
    const addr = utils.encode_cell({ r: totalsRow, c });
    if (!ws[addr]) continue;
    ws[addr].s = {
      font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11, name: 'Calibri' },
      fill: { patternType: 'solid', fgColor: { rgb: '0F172A' } },
      alignment: { horizontal: c === 0 ? 'left' : 'center', vertical: 'center' },
      border: BORDER_HEADER,
    };
  }
}

/**
 * Create a very light tint of a hex color (for row backgrounds).
 */
function lightenColor(hex: string): string {
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  // Mix with white at 90%
  const lr = Math.round(r + (255 - r) * 0.88);
  const lg = Math.round(g + (255 - g) * 0.88);
  const lb = Math.round(b + (255 - b) * 0.88);
  return lr.toString(16).padStart(2, '0') + lg.toString(16).padStart(2, '0') + lb.toString(16).padStart(2, '0');
}
