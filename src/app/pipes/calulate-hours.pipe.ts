import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'calulateHours',
})
export class CalulateHoursPipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return null;
  }
}
