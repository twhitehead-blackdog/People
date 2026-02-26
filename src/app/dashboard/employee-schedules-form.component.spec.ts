import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { BranchesStore } from '../stores/branches.store';
import { EmployeesStore } from '../stores/employees.store';
import { SchedulesStore } from '../stores/schedules.store';
import { EmployeeSchedulesFormComponent } from './employee-schedules-form.component';

describe('EmployeeSchedulesFormComponent', () => {
  let component: EmployeeSchedulesFormComponent;
  let fixture: ComponentFixture<EmployeeSchedulesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        BranchesStore,
        SchedulesStore,
        EmployeesStore,
        MessageService,
        ConfirmationService,
        DynamicDialogRef,
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
      imports: [EmployeeSchedulesFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeSchedulesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
