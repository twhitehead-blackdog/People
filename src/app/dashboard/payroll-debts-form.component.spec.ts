import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollDebtsFormComponent } from './payroll-debts-form.component';

describe('PayrollDebtsFormComponent', () => {
  let component: PayrollDebtsFormComponent;
  let fixture: ComponentFixture<PayrollDebtsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollDebtsFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollDebtsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
