import { addDays, startOfDay } from 'date-fns';
import { toDate } from 'date-fns-tz';

export const TZ = 'America/Panama';

export function normalizeRange(start: Date, end: Date, maxDays = 365) {
  const s = startOfDay(toDate(start, { timeZone: TZ }));
  let e = startOfDay(toDate(end, { timeZone: TZ }));
  if (e < s) e = s;
  const cap = addDays(s, maxDays);
  if (e > cap) e = cap;
  return { start: s, end: e };
}
