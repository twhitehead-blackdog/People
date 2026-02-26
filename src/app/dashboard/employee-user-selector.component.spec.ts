import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EmployeeUserSelectorComponent } from './employee-user-selector.component';

describe('EmployeeUserSelectorComponent', () => {
  let component: EmployeeUserSelectorComponent;
  let fixture: ComponentFixture<EmployeeUserSelectorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EmployeeUserSelectorComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(EmployeeUserSelectorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
