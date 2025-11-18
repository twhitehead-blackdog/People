import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollsFormComponent } from './payrolls-form.component';

describe('PayrollsFormComponent', () => {
  let component: PayrollsFormComponent;
  let fixture: ComponentFixture<PayrollsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollsFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
