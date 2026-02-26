import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollPaymentsFormComponent } from './payroll-payments-form.component';

describe('PayrollPaymentsFormComponent', () => {
  let component: PayrollPaymentsFormComponent;
  let fixture: ComponentFixture<PayrollPaymentsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollPaymentsFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollPaymentsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
