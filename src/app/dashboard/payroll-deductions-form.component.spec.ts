import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollDeductionsFormComponent } from './payroll-deductions-form.component';

describe('PayrollDeductionsFormComponent', () => {
  let component: PayrollDeductionsFormComponent;
  let fixture: ComponentFixture<PayrollDeductionsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollDeductionsFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollDeductionsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
