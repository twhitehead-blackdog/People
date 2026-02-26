import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MessageService } from 'primeng/api';
import { TimeclockComponent } from './timeclock.component';

describe('TimeclockComponent', () => {
  let component: TimeclockComponent;
  let fixture: ComponentFixture<TimeclockComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [MessageService, provideHttpClient()],
      imports: [TimeclockComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TimeclockComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
