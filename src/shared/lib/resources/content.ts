import { UserSlim } from 'shared/lib/resources/user';
import { BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

export interface Content {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: UserSlim | null;
  updatedBy?: UserSlim | null;
  slug: string;
  fixed: boolean;
  version: number;
  title: string;
  body: string;
}

export type ContentSlim = Pick<Content, 'id' | 'title' | 'slug' | 'fixed' | 'createdAt' | 'updatedAt'>;

export interface CreateRequestBody {
  slug: string;
  title: string;
  body: string;
}

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> & BodyWithErrors;

export type UpdateRequestBody = CreateRequestBody;

export interface UpdateValidationErrors extends ErrorTypeFrom<UpdateRequestBody>, BodyWithErrors {
  fixed?: string[];
}

export interface DeleteValidationErrors extends BodyWithErrors {
  fixed?: string[];
}
