import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export interface Addendum {
  id: Id;
  createdAt: Date;
  createdBy?: User;
  description: string;
}
