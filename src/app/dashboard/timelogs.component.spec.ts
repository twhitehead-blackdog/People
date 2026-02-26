import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { EmployeesStore } from '../stores/employees.store';
import { TimelogsComponent } from './timelogs.component';

describe('TimelogsComponent', () => {
  let component: TimelogsComponent;
  let fixture: ComponentFixture<TimelogsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        EmployeesStore,
        ConfirmationService,
        MessageService,
      ],
      imports: [TimelogsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimelogsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
