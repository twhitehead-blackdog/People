import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollPaymentsDetailsComponent } from './payroll-payments-details.component';

describe('PayrollPaymentsDetailsComponent', () => {
  let component: PayrollPaymentsDetailsComponent;
  let fixture: ComponentFixture<PayrollPaymentsDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollPaymentsDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollPaymentsDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
