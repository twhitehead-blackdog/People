import { Pipe, PipeTransform } from '@angular/core';
import { addYears, differenceInMonths, differenceInYears } from 'date-fns';

@Pipe({
  name: 'seniority',
  standalone: true,
})
export class SeniorityPipe implements PipeTransform {
  transform(date: Date): string {
    const years = differenceInYears(new Date(), date);
    const months = differenceInMonths(new Date(), addYears(date, years));
    if (years > 0) {
      return `${years} año(s) y ${months} mes(es)`;
    }
    return `${months} mes(es)`;
  }
}
