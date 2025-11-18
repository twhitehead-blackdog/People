import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterModule } from '@angular/router';
import { randomUUID } from 'crypto';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TabViewModule } from 'primeng/tabview';
import { EmployeesStore } from '../stores/employees.store';
import { EmployeeDetailComponent } from './employee-detail.component';
window.ResizeObserver =
  window.ResizeObserver ||
  jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    observe: jest.fn(),
    unobserve: jest.fn(),
  }));

describe('EmployeeDetailComponent', () => {
  let component: EmployeeDetailComponent;
  let fixture: ComponentFixture<EmployeeDetailComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        EmployeesStore,
        MessageService,
        ConfirmationService,
      ],
      imports: [
        EmployeeDetailComponent,
        TabViewModule,
        RouterModule.forRoot([]),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeDetailComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('employee_id', randomUUID());
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
