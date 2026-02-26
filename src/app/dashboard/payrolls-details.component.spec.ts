import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayrollsDetailsComponent } from './payrolls-details.component';

describe('PayrollsDetailsComponent', () => {
  let component: PayrollsDetailsComponent;
  let fixture: ComponentFixture<PayrollsDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PayrollsDetailsComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PayrollsDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
