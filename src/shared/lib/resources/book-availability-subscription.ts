import { Id } from 'shared/lib/types';

export interface CreateRequestBody {
  book: Id;
}

export interface CreateValidationErrors {
  permissions?: string[];
  book?: string[];
}
