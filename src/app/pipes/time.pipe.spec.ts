import { TimePipe } from './time.pipe';

describe('TimePipe', () => {
  it('create an instance', () => {
    const pipe = new TimePipe();
    expect(pipe).toBeTruthy();
  });

  it('should transform 13:00 to 01:00 PM', () => {
    const pipe = new TimePipe();
    expect(pipe.transform('13:00')).toBe('01:00 PM');
  });
});
