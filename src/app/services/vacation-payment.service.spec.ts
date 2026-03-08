import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { VacationPaymentService } from './vacation-payment.service';

describe('VacationPaymentService', () => {
  let service: VacationPaymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
      ],
    });
    service = TestBed.inject(VacationPaymentService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
