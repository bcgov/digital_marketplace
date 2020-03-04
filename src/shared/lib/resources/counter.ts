import { BodyWithErrors } from 'shared/lib/types';

export interface Counter {
  name: string;
  count: number;
}

export type UpdateRequestBody = null;
export interface UpdateValidationErrors extends BodyWithErrors {
  name?: string[];
}
