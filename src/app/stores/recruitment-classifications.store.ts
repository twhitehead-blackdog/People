import { signalStore } from '@ngrx/signals';
import { RecruitmentClassification } from '../models';
import { withCustomEntities } from './entities.feature';

export const RecruitmentClassificationsStore = signalStore({ providedIn: 'root' },
  withCustomEntities<RecruitmentClassification>({
    name: 'recruitment_classifications',
    query: 'id,job_application_id,company_id,recommended_role,scores,matched_rules,extraction_status,extraction_error,classified_at,classified_by',
    order: 'classified_at.desc',
  })
);
