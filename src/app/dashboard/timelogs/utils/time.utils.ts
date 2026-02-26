import { differenceInMinutes, set } from 'date-fns';

export function calcTimeDiff(time1: string, time2: string): number {
  if (!time1 || !time2) {
    return 0;
  }

  if (!time1.includes(':') || !time2.includes(':')) {
    return 0;
  }

  const valueStart = time1.split(':');
  const valueEnd = time2.split(':');

  if (valueStart.length < 2 || valueEnd.length < 2) {
    return 0;
  }

  const hours1 = parseInt(valueStart[0], 10);
  const minutes1 = parseInt(valueStart[1], 10);
  const hours2 = parseInt(valueEnd[0], 10);
  const minutes2 = parseInt(valueEnd[1], 10);

  if (
    isNaN(hours1) ||
    isNaN(minutes1) ||
    isNaN(hours2) ||
    isNaN(minutes2) ||
    hours1 < 0 ||
    hours1 > 23 ||
    minutes1 < 0 ||
    minutes1 > 59 ||
    hours2 < 0 ||
    hours2 > 23 ||
    minutes2 < 0 ||
    minutes2 > 59
  ) {
    return 0;
  }

  const timeStart = set(new Date(), { hours: hours1, minutes: minutes1, seconds: 0, milliseconds: 0 });
  const timeEnd = set(new Date(), { hours: hours2, minutes: minutes2, seconds: 0, milliseconds: 0 });

  return differenceInMinutes(timeStart, timeEnd);
}
