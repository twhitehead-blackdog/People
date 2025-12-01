import { signalStore, withHooks } from '@ngrx/signals';
import { JobApplication } from '../models';
import { withCustomEntities } from './entities.feature';

export const JobApplicationsStore = signalStore(
  withCustomEntities<JobApplication>({
    name: 'job_applications',
    query: 'id,first_name,last_name,email,phone_number,province,corregimiento,currently_working,salary_expectation,position_id,position_name,resume_url,resume_filename,additional_info,status,interview_date,notes,created_at,updated_at,position:positions(id,name)',
    order: 'created_at.desc',
  }),
  withHooks({
    // No cargar automáticamente, se cargará cuando se necesite
  })
);

