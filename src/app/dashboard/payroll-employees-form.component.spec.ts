import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollEmployeesFormComponent } from './payroll-employees-form.component';

describe('PayrollEmployeesFormComponent', () => {
  let component: PayrollEmployeesFormComponent;
  let fixture: ComponentFixture<PayrollEmployeesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollEmployeesFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollEmployeesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
