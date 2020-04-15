import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export const CURRENT_SESSION_ID = 'current';

export type Session = SessionRecord | null;

export type AuthenticatedSession = SessionRecord;

export interface SessionRecord {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  accessToken: string;
  user: User;
}

export function hasAcceptedTermsOrIsAnonymous(session?: Session): boolean {
  return session && session.user
    ? !!session.user.acceptedTerms
    : true;
}
