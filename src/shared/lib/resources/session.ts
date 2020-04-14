import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export const CURRENT_SESSION_ID = 'current';

const EMPTY_SESSION_ID = '@@EMPTY_SESSION@@';

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

export function createEmptySession(): Session {
  return { id: EMPTY_SESSION_ID };
}

export function isEmptySession(session: Session): boolean {
  return isEmptySessionId(session.id);
}

export function isEmptySessionId(sessionId: Id): boolean {
  return sessionId === EMPTY_SESSION_ID;
}
