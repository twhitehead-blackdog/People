import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { PayrollLiquidationFormComponent } from './payroll-liquidation-form.component';

describe('PayrollLiquidationFormComponent', () => {
  let component: PayrollLiquidationFormComponent;
  let fixture: ComponentFixture<PayrollLiquidationFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        MessageService,
      ],
      imports: [PayrollLiquidationFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollLiquidationFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
