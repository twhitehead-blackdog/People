import { Pipe, PipeTransform } from '@angular/core';
import { addYears, differenceInMonths, differenceInYears } from 'date-fns';

@Pipe({
  name: 'seniority',
  standalone: true,
})
export class SeniorityPipe implements PipeTransform {
  transform(date: Date | string): string {
    const parsed = typeof date === 'string' ? new Date(date) : date;
    const years = differenceInYears(new Date(), parsed);
    const months = differenceInMonths(new Date(), addYears(parsed, years));
    if (years > 0) {
      return `${years} año(s) y ${months} mes(es)`;
    }
    return `${months} mes(es)`;
  }
}
