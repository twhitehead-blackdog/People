import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollDeductionsComponent } from './payroll-deductions.component';

describe('PayrollDeductionsComponent', () => {
  let component: PayrollDeductionsComponent;
  let fixture: ComponentFixture<PayrollDeductionsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollDeductionsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollDeductionsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
