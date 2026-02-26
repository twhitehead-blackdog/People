import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { SchedulesStore } from '../stores/schedules.store';
import { SchedulesFormComponent } from './schedules-form.component';

describe('SchedulesFormComponent', () => {
  let component: SchedulesFormComponent;
  let fixture: ComponentFixture<SchedulesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        SchedulesStore,
        MessageService,
        ConfirmationService,
        DynamicDialogRef,
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
      imports: [SchedulesFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SchedulesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
