import { UserSlim } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export interface Note {
  id: Id;
  createdAt: Date;
  createdBy?: UserSlim;
  description: string;
}
