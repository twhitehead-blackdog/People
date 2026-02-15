/**
 * Pure utility functions for parsing compensatory request data from notes.
 * Extracts type, quantity, dates, times, and reasons from CompensatoryRequest objects.
 */

import { format } from 'date-fns';
import { calculateDaysBetween } from './hr-status.utils';

/** Minimal shape needed by parsing functions. */
export interface CompensatoryRequestData {
  compensatory_type?: 'hours' | 'days';
  compensatory_amount?: number;
  date_from: string;
  date_to: string;
  hours?: number;
  reason?: string;
  notes?: string[] | string;
}

/** Helper to normalize notes to a string array. */
function toNotesArray(notes: string[] | string | undefined | null): string[] {
  if (!notes) return [];
  if (Array.isArray(notes)) return notes;
  if (typeof notes === 'string') return [notes];
  return [];
}

/** Calculate hours between two dates, rounded to 2 decimals. */
export function calculateHoursFromDates(
  dateFrom: Date | string,
  dateTo: Date | string
): number {
  const startDate = new Date(dateFrom);
  const endDate = new Date(dateTo);
  if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) return 0;
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffHours = diffTime / (1000 * 60 * 60);
  return Math.round(diffHours * 100) / 100;
}

/** Format an ISO date string as dd/MM/yyyy. */
export function formatDateDDMMYYYY(dateString: string): string {
  try {
    const date = new Date(dateString + 'T00:00:00');
    return format(date, 'dd/MM/yyyy');
  } catch {
    return dateString;
  }
}

/** Parse DD/MM/YYYY string to ISO yyyy-MM-dd. */
export function parseDDMMYYYYToISO(dateStr: string): string | null {
  const parts = String(dateStr).trim().split('/');
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts;
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (
    !Number.isFinite(day) ||
    !Number.isFinite(month) ||
    !Number.isFinite(year)
  )
    return null;
  if (day < 1 || day > 31 || month < 1 || month > 12 || year < 1900)
    return null;
  try {
    const d = new Date(year, month - 1, day);
    if (isNaN(d.getTime())) return null;
    return format(d, 'yyyy-MM-dd');
  } catch {
    return null;
  }
}

/** Determine if a compensatory request is in hours or days, and extract the amount. */
export function getCompensatoryQuantity(data: CompensatoryRequestData): {
  value: number;
  isDays: boolean;
} {
  let isDays = false;

  // 1. From compensatory_type field
  if (data.compensatory_type) {
    isDays = data.compensatory_type === 'days';
  }
  // 2. From notes
  else if (data.notes) {
    const notesArray = toNotesArray(data.notes);
    const tipoNote = notesArray.find(
      (note) => typeof note === 'string' && note.includes('Tipo:')
    );

    if (tipoNote) {
      isDays = tipoNote.includes('Días');
    } else if (data.date_from && data.date_to) {
      const dateFromStr = String(data.date_from);
      const dateToStr = String(data.date_to);
      const hasTimeInFrom =
        dateFromStr.includes(' ') && dateFromStr.includes(':');
      const hasTimeInTo = dateToStr.includes(' ') && dateToStr.includes(':');

      if (hasTimeInFrom && hasTimeInTo) {
        isDays = false;
      } else {
        const hours = calculateHoursFromDates(data.date_from, data.date_to);
        const days = hours / 24;
        isDays = days >= 1 && Math.abs(days - Math.round(days)) < 0.1;
      }
    }
  }
  // 3. From date format
  else if (data.date_from && data.date_to) {
    const dateFromStr = String(data.date_from);
    const dateToStr = String(data.date_to);
    const hasTimeInFrom =
      dateFromStr.includes(' ') && dateFromStr.includes(':');
    const hasTimeInTo = dateToStr.includes(' ') && dateToStr.includes(':');

    if (hasTimeInFrom && hasTimeInTo) {
      isDays = false;
    } else {
      const hours = calculateHoursFromDates(data.date_from, data.date_to);
      const days = hours / 24;
      isDays = days >= 1 && Math.abs(days - Math.round(days)) < 0.1;
    }
  }

  if (isDays === true) {
    let days = 0;
    if (data.compensatory_amount) {
      days = data.compensatory_amount;
    } else if (data.date_from && data.date_to) {
      days = calculateDaysBetween(data.date_from, data.date_to);
    }
    return { value: days > 0 ? days : 1, isDays: true };
  } else if (isDays === false) {
    let hours = 0;
    if (data.compensatory_amount) {
      hours = data.compensatory_amount;
    } else if (data.date_from && data.date_to) {
      hours = calculateHoursFromDates(data.date_from, data.date_to);
      if (hours >= 24 && hours % 24 < 0.1) {
        const daysVal = Math.round(hours / 24);
        return { value: daysVal, isDays: true };
      }
    } else if (data.hours) {
      hours = data.hours;
    }

    if (
      hours === 0 &&
      !data.date_from &&
      !data.date_to &&
      !data.hours &&
      !data.compensatory_amount
    ) {
      return { value: 0, isDays: false };
    }
    return { value: hours > 0 ? hours : 0, isDays: false };
  }

  const amount = data.compensatory_amount ?? 0;
  if (amount > 0) {
    return { value: amount, isDays: false };
  }
  return { value: 0, isDays: false };
}

/** Extract compensatory type from notes or field. */
export function getCompensatoryTypeFromNotes(
  data: CompensatoryRequestData
): 'days' | 'hours' | null {
  if (data.compensatory_type) return data.compensatory_type;

  if (data.notes) {
    const notesArray = toNotesArray(data.notes);
    const tipoNote = notesArray.find(
      (note) => typeof note === 'string' && note.includes('Tipo:')
    );
    if (tipoNote) {
      const match = tipoNote.match(/Tipo:\s*(hours|days)/);
      if (match?.[1]) return match[1] as 'hours' | 'days';
    }
  }

  if (data.date_from && data.date_to) {
    const dateFromStr = String(data.date_from);
    const dateToStr = String(data.date_to);
    const hasTimeInFrom =
      dateFromStr.includes(' ') && dateFromStr.includes(':');
    const hasTimeInTo = dateToStr.includes(' ') && dateToStr.includes(':');
    return hasTimeInFrom && hasTimeInTo ? 'hours' : 'days';
  }

  return null;
}

/** Extract reason from reason field or notes. */
export function getCompensatoryReasonFromNotes(
  data: CompensatoryRequestData
): string | null {
  if (data.reason) return data.reason;

  if (data.notes) {
    const notesArray = toNotesArray(data.notes);
    const technicalPatterns = [
      /^Tipo:\s*/,
      /^Cantidad solicitada:\s*/,
      /^Fecha compensatorio:\s*/,
      /^Hora inicio:\s*/,
      /^Hora fin:\s*/,
      /^Fechas horas extra:\s*/,
    ];

    for (const note of notesArray) {
      if (typeof note === 'string' && note.trim().length > 0) {
        const isTechnical = technicalPatterns.some((pattern) =>
          pattern.test(note)
        );
        if (!isTechnical) {
          if (note.includes('Motivo:')) {
            const match = note.match(/Motivo:\s*(.+)/);
            return match?.[1]
              ? match[1].trim()
              : note.replace('Motivo:', '').trim();
          }
          return note.trim();
        }
      }
    }
  }

  return null;
}

/** Extract compensatory date from notes. */
export function getCompensatoryDateFromNotes(
  data: CompensatoryRequestData
): string | null {
  if (data.notes) {
    const notesArray = toNotesArray(data.notes);
    const dateNote = notesArray.find(
      (note) =>
        typeof note === 'string' && note.includes('Fecha compensatorio:')
    );
    if (dateNote) {
      const match = dateNote.match(/Fecha compensatorio:\s*(.+)/);
      return match?.[1] ? match[1].trim() : null;
    }
  }
  return null;
}

/** Extract start/end times from notes. */
export function getCompensatoryTimeFromNotes(data: CompensatoryRequestData): {
  start: string | null;
  end: string | null;
} {
  const result = { start: null as string | null, end: null as string | null };

  if (data.notes) {
    const notesArray = toNotesArray(data.notes);
    const startNote = notesArray.find(
      (note) => typeof note === 'string' && note.includes('Hora inicio:')
    );
    const endNote = notesArray.find(
      (note) => typeof note === 'string' && note.includes('Hora fin:')
    );

    if (startNote) {
      const match = startNote.match(/Hora inicio:\s*(.+)/);
      result.start = match?.[1] ? match[1].trim() : null;
    }
    if (endNote) {
      const match = endNote.match(/Hora fin:\s*(.+)/);
      result.end = match?.[1] ? match[1].trim() : null;
    }
  }

  return result;
}

/** Extract overtime dates array from notes. */
export function getCompensatoryOvertimeDatesFromNotes(
  data: CompensatoryRequestData
): string[] {
  if (data.notes) {
    const notesArray = toNotesArray(data.notes);
    const datesNote = notesArray.find(
      (note) =>
        typeof note === 'string' && note.includes('Fechas horas extra:')
    );
    if (datesNote) {
      const match = datesNote.match(/Fechas horas extra:\s*(.+)/);
      if (match?.[1]) {
        return match[1]
          .split(',')
          .map((date) => date.trim())
          .filter((date) => date.length > 0);
      }
    }
  }
  return [];
}

/** Extract requested amount from notes. */
export function getCompensatoryRequestedAmountFromNotes(
  data: CompensatoryRequestData
): number | null {
  if (data.notes) {
    const notesArray = toNotesArray(data.notes);
    const amountNote = notesArray.find(
      (note) =>
        typeof note === 'string' && note.includes('Cantidad solicitada:')
    );
    if (amountNote) {
      const match = amountNote.match(/Cantidad solicitada:\s*(\d+)/);
      return match?.[1] ? parseInt(match[1], 10) : null;
    }
  }
  return null;
}

export interface OvertimeDayDetail {
  date: string;
  entryTime: string;
  exitTime: string;
  totalHours: string;
  lunchDuration: string;
  delayHours: string;
  overtimeHours: string;
}

/** Parse structured overtime day details from notes. */
export function getOvertimeDaysFromNotes(
  request: CompensatoryRequestData
): OvertimeDayDetail[] | null {
  if (!request.notes) return null;

  const notesArray = toNotesArray(request.notes);

  const startIndex = notesArray.findIndex(
    (note) =>
      typeof note === 'string' &&
      note.includes('--- Fechas donde trabajó horas extra ---')
  );
  if (startIndex === -1) return null;

  const detailStartIndex = notesArray.findIndex(
    (note, idx) =>
      idx > startIndex &&
      typeof note === 'string' &&
      note.includes('Detalle por fecha:')
  );
  if (detailStartIndex === -1) return null;

  const overtimeDays: OvertimeDayDetail[] = [];

  for (let i = detailStartIndex + 1; i < notesArray.length; i++) {
    const note = notesArray[i];
    if (typeof note !== 'string') continue;

    // Format with delay
    const matchWithDelay = note.match(
      /(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h[^|]*\|\s+Almuerzo:\s+([\d.]+)h(?:\s+\|\s+Retraso:\s+([\d.]+)h)?\s+\|\s+Extra:\s+([\d.]+)h/
    );

    if (matchWithDelay) {
      overtimeDays.push({
        date: matchWithDelay[1],
        entryTime: matchWithDelay[2],
        exitTime: matchWithDelay[3],
        totalHours: matchWithDelay[4],
        lunchDuration: matchWithDelay[5],
        delayHours: matchWithDelay[6] || '0.00',
        overtimeHours: matchWithDelay[7],
      });
    } else {
      // Format with lunch but no delay
      const matchWithLunch = note.match(
        /(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h\s+\|\s+Almuerzo:\s+([\d.]+)h\s+\|\s+Extra:\s+([\d.]+)h/
      );
      if (matchWithLunch) {
        overtimeDays.push({
          date: matchWithLunch[1],
          entryTime: matchWithLunch[2],
          exitTime: matchWithLunch[3],
          totalHours: matchWithLunch[4],
          lunchDuration: matchWithLunch[5],
          delayHours: '0.00',
          overtimeHours: matchWithLunch[6],
        });
      } else {
        // Legacy format without lunch
        const oldMatch = note.match(
          /(\d{2}\/\d{2}\/\d{4}):\s*Entrada\s+(\d{2}:\d{2})\s+-\s+Salida\s+(\d{2}:\d{2})\s+\|\s+Total:\s+([\d.]+)h\s+\|\s+Extra:\s+([\d.]+)h/
        );
        if (oldMatch) {
          overtimeDays.push({
            date: oldMatch[1],
            entryTime: oldMatch[2],
            exitTime: oldMatch[3],
            totalHours: oldMatch[4],
            lunchDuration: '0.00',
            delayHours: '0.00',
            overtimeHours: oldMatch[5],
          });
        }
      }
    }
  }

  return overtimeDays.length > 0 ? overtimeDays : null;
}

/** Extract time range for hourly compensatory from notes or date_from/date_to. */
export function getCompensatoryTimeRange(request: CompensatoryRequestData): {
  startTime: string;
  endTime: string;
} | null {
  if (request.compensatory_type !== 'hours') return null;

  if (request.notes) {
    const notesArray = toNotesArray(request.notes);
    const timeRangeNote = notesArray.find(
      (note) => typeof note === 'string' && note.includes('Rango de horas:')
    );
    if (timeRangeNote) {
      const match = timeRangeNote.match(
        /Rango de horas:\s*(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/
      );
      if (match) return { startTime: match[1], endTime: match[2] };
    }
  }

  if (request.date_from && request.date_to) {
    const dateFromStr = String(request.date_from);
    const dateToStr = String(request.date_to);
    if (
      dateFromStr.includes(' ') &&
      dateFromStr.includes(':') &&
      dateToStr.includes(' ') &&
      dateToStr.includes(':')
    ) {
      try {
        const fromDate = new Date(request.date_from);
        const toDate = new Date(request.date_to);
        return {
          startTime: format(fromDate, 'HH:mm'),
          endTime: format(toDate, 'HH:mm'),
        };
      } catch {
        // Fall through
      }
    }
  }

  return null;
}

/** Extract manually entered overtime dates from notes. */
export function getManualOvertimeDates(
  request: CompensatoryRequestData
): string[] {
  if (!request.notes) return [];

  let notesArray: string[] = [];
  if (Array.isArray(request.notes)) {
    notesArray = request.notes;
  } else if (typeof request.notes === 'string') {
    try {
      const parsed = JSON.parse(request.notes);
      notesArray = Array.isArray(parsed) ? parsed : [request.notes];
    } catch {
      notesArray = [request.notes];
    }
  } else {
    return [];
  }

  const startIndex = notesArray.findIndex(
    (note) =>
      typeof note === 'string' &&
      note.includes(
        '--- Fechas donde trabajó horas extra (ingresadas manualmente) ---'
      )
  );

  if (startIndex === -1) return [];

  const dates: string[] = [];
  for (let i = startIndex + 1; i < notesArray.length; i++) {
    const note = notesArray[i];
    if (typeof note === 'string') {
      const match = note.match(/^\s*-\s*(\d{2}\/\d{2}\/\d{4})/);
      if (match) {
        dates.push(match[1]);
      } else if (note.includes('RRHH revisará')) {
        break;
      }
    }
  }

  return dates;
}

/** Check if a delay hours value represents an actual delay. */
export function hasDelay(delayHours: string | undefined): boolean {
  if (!delayHours) return false;
  const delay = parseFloat(delayHours);
  return !isNaN(delay) && delay > 0;
}
