import { Id } from 'shared/lib/types';

export interface CreateRequestBody {
  book: Id;
  user: Id;
  dueAt: string; // Expects date in format: "YYYY-MM-DD"
}

export interface CreateValidationErrors {
  permissions?: string[];
  book?: string[];
  user?: string[];
  dueAt?: string[];
}
