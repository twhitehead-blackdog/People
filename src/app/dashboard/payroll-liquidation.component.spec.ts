import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PayrollLiquidationComponent } from './payroll-liquidation.component';

describe('PayrollLiquidationComponent', () => {
  let component: PayrollLiquidationComponent;
  let fixture: ComponentFixture<PayrollLiquidationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        ConfirmationService,
        MessageService,
      ],
      imports: [PayrollLiquidationComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollLiquidationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
