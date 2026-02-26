import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SchedulesStore } from '../stores/schedules.store';
import { SchedulesComponent } from './schedules.component';

describe('SchedulesComponent', () => {
  let component: SchedulesComponent;
  let fixture: ComponentFixture<SchedulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        MessageService,
        ConfirmationService,
        SchedulesStore,
        provideHttpClient(),
      ],
      imports: [SchedulesComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
