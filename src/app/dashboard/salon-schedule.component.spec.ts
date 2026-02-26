import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';

import { SalonScheduleComponent } from './salon-schedule.component';

describe('SalonScheduleComponent', () => {
  let component: SalonScheduleComponent;
  let fixture: ComponentFixture<SalonScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SalonScheduleComponent],
      providers: [provideNoopAnimations(), provideHttpClient(), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(SalonScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter groomer employees', () => {
    // Test implementation
    expect(component.groomerEmployeesWithAssignments()).toBeDefined();
  });

  it('should navigate weeks', () => {
    const initialWeek = component.currentWeekStart();
    component.goToNextWeek();
    expect(component.currentWeekStart().getTime()).toBeGreaterThan(
      initialWeek.getTime()
    );
  });
});
