import { Id } from 'shared/lib/types';

export interface CreateRequestBody {
  title: string;
  description: string;
  authors: Id[];
  genre: string;
}

export interface CreateValidationErrors {
  permissions?: string[];
  title?: string[];
  description?: string[];
  authors?: string[][];
  genre?: string[];
}
