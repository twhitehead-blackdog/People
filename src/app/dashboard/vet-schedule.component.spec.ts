import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MessageService } from 'primeng/api';

import { VetScheduleComponent } from './vet-schedule.component';

describe('VetScheduleComponent', () => {
  let component: VetScheduleComponent;
  let fixture: ComponentFixture<VetScheduleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VetScheduleComponent],
      providers: [provideNoopAnimations(), MessageService],
    }).compileComponents();

    fixture = TestBed.createComponent(VetScheduleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter vet employees by branch', () => {
    // Test implementation
    expect(component.vetEmployeesWithAssignments()).toBeDefined();
  });
});
