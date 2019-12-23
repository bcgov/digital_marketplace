import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export interface Session {
  id: Id;
  accessToken?: string;
  user?: User;
}
