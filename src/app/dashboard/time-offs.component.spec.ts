import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { EmployeesStore } from '../stores/employees.store';
import { TimeOffsComponent } from './time-offs.component';

describe('TimeOffsComponent', () => {
  let component: TimeOffsComponent;
  let fixture: ComponentFixture<TimeOffsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        EmployeesStore,
        ConfirmationService,
        MessageService,
        DynamicDialogRef,
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
      imports: [TimeOffsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeOffsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
