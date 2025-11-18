import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollDebtsComponent } from './payroll-debts.component';

describe('PayrollDebtsComponent', () => {
  let component: PayrollDebtsComponent;
  let fixture: ComponentFixture<PayrollDebtsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollDebtsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollDebtsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
