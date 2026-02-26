import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PaymentItemFormComponent } from './payment-item-form.component';

describe('PaymentItemFormComponent', () => {
  let component: PaymentItemFormComponent;
  let fixture: ComponentFixture<PaymentItemFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PaymentItemFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(PaymentItemFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
