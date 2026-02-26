import { Pipe, PipeTransform } from '@angular/core';
import { differenceInYears } from 'date-fns';

@Pipe({
  name: 'age',
  standalone: true,
  pure: true,
})
export class AgePipe implements PipeTransform {
  transform(date: Date | undefined): number {
    return differenceInYears(new Date(), date ?? new Date());
  }
}
