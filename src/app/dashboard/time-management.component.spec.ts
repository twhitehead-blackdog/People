import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TimeManagementComponent } from './time-management.component';

describe('TimeManagementComponent', () => {
  let component: TimeManagementComponent;
  let fixture: ComponentFixture<TimeManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeManagementComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
