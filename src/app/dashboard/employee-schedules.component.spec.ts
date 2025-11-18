import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmployeeSchedulesComponent } from './employee-schedules.component';

describe('EmployeeSchedulesComponent', () => {
  let component: EmployeeSchedulesComponent;
  let fixture: ComponentFixture<EmployeeSchedulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [provideHttpClient(), MessageService, ConfirmationService],
      imports: [EmployeeSchedulesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeSchedulesComponent);
    fixture.componentRef.setInput('employeeId', '1');
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
