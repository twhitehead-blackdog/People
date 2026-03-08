import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { PayrollVacationsComponent } from './payroll-vacations.component';

describe('PayrollVacationsComponent', () => {
  let component: PayrollVacationsComponent;
  let fixture: ComponentFixture<PayrollVacationsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        ConfirmationService,
        MessageService,
      ],
      imports: [PayrollVacationsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollVacationsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
