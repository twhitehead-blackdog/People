import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BanksFormComponent } from './banks-form.component';

describe('BanksFormComponent', () => {
  let component: BanksFormComponent;
  let fixture: ComponentFixture<BanksFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BanksFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(BanksFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
