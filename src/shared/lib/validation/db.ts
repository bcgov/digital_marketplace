import { ADT } from 'shared/lib/types';
import { Validation } from 'shared/lib/validation';

export type DatabaseError
  = ADT<'databaseError'>;

export type DatabaseValidation<Valid, Invalid = DatabaseError>
  = Validation<Valid, Invalid>;
