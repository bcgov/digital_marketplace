import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export const CURRENT_SESSION_ID = 'current';

export interface Session {
  id: Id;
  accessToken?: string;
  user?: User;
}
