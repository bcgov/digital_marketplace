import { ADT, BodyWithErrors } from 'shared/lib/types';

export type CreateRequestBody = ADT<'updateTerms'>;

type CreateADTErrors
  = ADT<'updateTerms', string[]>
  | ADT<'parseFailure'>;

export interface CreateValidationErrors extends BodyWithErrors {
  emailNotification?: CreateADTErrors;
}
