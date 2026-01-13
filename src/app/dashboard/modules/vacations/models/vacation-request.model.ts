import {
  HrRequestBase,
  HrRequestWithDateRange,
} from '../../shared/models/hr-request-base.model';

/**
 * Vacation request model extending base HR request interface.
 */
export interface VacationRequest extends HrRequestBase, HrRequestWithDateRange {
  reason: string | null;
  document_url?: string | null;
  review_notes?: string;
}
