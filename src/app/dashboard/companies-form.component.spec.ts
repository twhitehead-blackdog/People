import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationService, MessageService } from 'primeng/api';
import { DynamicDialogConfig, DynamicDialogRef } from 'primeng/dynamicdialog';
import { CompaniesStore } from '../stores/companies.store';
import { CompaniesFormComponent } from './companies-form.component';

describe('CompaniesFormComponent', () => {
  let component: CompaniesFormComponent;
  let fixture: ComponentFixture<CompaniesFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        CompaniesStore,
        MessageService,
        ConfirmationService,
        DynamicDialogRef,
        { provide: DynamicDialogConfig, useValue: { data: {} } },
      ],
      imports: [CompaniesFormComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CompaniesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
