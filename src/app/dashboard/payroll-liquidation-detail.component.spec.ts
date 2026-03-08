import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MessageService } from 'primeng/api';
import { PayrollLiquidationDetailComponent } from './payroll-liquidation-detail.component';

describe('PayrollLiquidationDetailComponent', () => {
  let component: PayrollLiquidationDetailComponent;
  let fixture: ComponentFixture<PayrollLiquidationDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideRouter([]),
        MessageService,
      ],
      imports: [PayrollLiquidationDetailComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollLiquidationDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
