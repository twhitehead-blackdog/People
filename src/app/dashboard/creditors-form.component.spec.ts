import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreditorsFormComponent } from './creditors-form.component';

describe('CreditorsFormComponent', () => {
  let component: CreditorsFormComponent;
  let fixture: ComponentFixture<CreditorsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreditorsFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CreditorsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
