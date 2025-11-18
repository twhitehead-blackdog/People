import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'time',
  standalone: true,
})
export class TimePipe implements PipeTransform {
  transform(value: string, includeSeconds?: boolean): string {
    if (!value) return '-';
    const [hours, minutes, seconds] = value.split(':').map(Number);

    if (hours <= 12) {
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(
        2,
        '0'
      )}${includeSeconds ? ':' + String(seconds ?? 0).padStart(2, '0') : ''} ${
        hours === 12 ? 'PM' : 'AM'
      }`;
    }
    return `${String(hours - 12).padStart(2, '0')}:${String(minutes).padStart(
      2,
      '0'
    )}${includeSeconds ? ':' + String(seconds ?? 0).padStart(2, '0') : ''} PM`;
  }
}
