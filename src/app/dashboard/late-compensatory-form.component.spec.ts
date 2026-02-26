import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LateCompensatoryFormComponent } from './late-compensatory-form.component';

describe('LateCompensatoryFormComponent', () => {
  let component: LateCompensatoryFormComponent;
  let fixture: ComponentFixture<LateCompensatoryFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LateCompensatoryFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LateCompensatoryFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
