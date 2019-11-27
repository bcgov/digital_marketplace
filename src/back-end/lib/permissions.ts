import { Session } from 'shared/lib/resources/session';
import { UserType } from 'shared/lib/resources/user';

const CURRENT_SESSION_ID = 'current';

export const ERROR_MESSAGE = 'You do not have permission to perform this action.';

export function isSignedIn(session: Session): boolean {
  return !!session.user;
}

export function isSignedOut(session: Session): boolean {
  return !isSignedIn(session);
}

export function isUser(session: Session): boolean {
  return !!session.user;
}

export function isOwnAccount(session: Session, id: string): boolean {
  return !!session.user && session.user.id === id;
}

export function isCurrentSession(id: string): boolean {
  return id === CURRENT_SESSION_ID;
}

export function isOwnSession(session: Session, id: string): boolean {
  return session.id === id;
}

// Users.

export function readManyUsers(session: Session): boolean {
  return !!session.user && session.user.type === UserType.Admin;
}

// Sessions.

export function readOneSession(session: Session, id: string): boolean {
  return isCurrentSession(id) || isOwnSession(session, id);
}

export function deleteSession(session: Session, id: string): boolean {
  return isCurrentSession(id) || isOwnSession(session, id);
}
