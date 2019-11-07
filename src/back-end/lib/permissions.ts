import { Session } from 'shared/lib/types';

const CURRENT_SESSION_ID = 'current';

export const ERROR_MESSAGE = 'You do not have permission to perform this action.';

export function isSignedIn(session: Session): boolean {
  return !!session.user;
}

export function isSignedOut(session: Session): boolean {
  return !isSignedIn(session);
}

export function isLibrarian(session: Session): boolean {
  return !!session.user && session.user.tag === 'librarian';
}

export function isUser(session: Session): boolean {
  return !!session.user && session.user.tag === 'user';
}

export function isOwnAccount(session: Session, id: string): boolean {
  return !!session.user && (isLibrarian(session) || (session.user.tag === 'user' && session.user.value.id === id));
}

export function isCurrentSession(id: string): boolean {
  return id === CURRENT_SESSION_ID;
}

export function isOwnSession(session: Session, id: string): boolean {
  return session.id === id;
}

// Users.

export function readManyUsers(session: Session): boolean {
  return isLibrarian(session);
}

// Sessions.

export function createLibrarianSession(session: Session): boolean {
  return isSignedOut(session);
}

export function readOneSession(session: Session, id: string): boolean {
  return isCurrentSession(id) || isOwnSession(session, id);
}

export function deleteSession(session: Session, id: string): boolean {
  return isCurrentSession(id) || isOwnSession(session, id);
}

// Authors.

export function createAuthor(session: Session): boolean {
  return isLibrarian(session);
}

export function readManyAuthors(session: Session): boolean {
  return isLibrarian(session);
}

// Books.

export function createBook(session: Session): boolean {
  return isLibrarian(session);
}

export function readManyBooks(): boolean {
  return true;
}

// Loans.

export function createLoan(session: Session): boolean {
  return isLibrarian(session);
}

export function deleteLoan(session: Session): boolean {
  return isLibrarian(session);
}

// Genres.

export function readManyGenres(): boolean {
  return true;
}

// Book Availability Subscriptions.

export function createBookAvailabilitySubscription(session: Session): boolean {
  return isUser(session);
}

export function deleteBookAvailabilitySubscription(session: Session): boolean {
  return isUser(session);
}

// Genre Subscriptions.

export function createGenreSubscription(session: Session): boolean {
  return isUser(session);
}

export function deleteGenreSubscription(session: Session): boolean {
  return isUser(session);
}
