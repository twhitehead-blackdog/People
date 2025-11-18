import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeesTimetableComponent } from './employees-timetable.component';

describe('EmployeesTimetableComponent', () => {
  let component: EmployeesTimetableComponent;
  let fixture: ComponentFixture<EmployeesTimetableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeesTimetableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeesTimetableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
