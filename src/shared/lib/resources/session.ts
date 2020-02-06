import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export const CURRENT_SESSION_ID = 'current';

export interface Session {
  id: Id;
  accessToken?: string;
  user?: User;
}

export interface AuthenticatedSession extends Omit<Session, 'user'> {
  user: User;
}

export function hasAcceptedTermsOrIsAnonymous(session?: Session): boolean {
  return session && session.user
    ? !!session.user.acceptedTerms
    : true;
}

export function emptySession(id: Id): Session {
  return { id };
}
