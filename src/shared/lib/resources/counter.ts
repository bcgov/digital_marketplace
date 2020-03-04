import { BodyWithErrors } from 'shared/lib/types';

export interface UpdateValidationErrors extends BodyWithErrors {
  name?: string[];
}
