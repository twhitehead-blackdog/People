import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollsComponent } from './payrolls.component';

describe('PayrollsComponent', () => {
  let component: PayrollsComponent;
  let fixture: ComponentFixture<PayrollsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
