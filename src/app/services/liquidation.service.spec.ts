import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { LiquidationService } from './liquidation.service';

describe('LiquidationService', () => {
  let service: LiquidationService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
      ],
    });
    service = TestBed.inject(LiquidationService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
