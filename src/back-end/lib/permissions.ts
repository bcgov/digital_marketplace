import { Connection, isUserOwnerOfOrg } from 'back-end/lib/db';
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

export function isVendor(session: Session): boolean {
  return isUser(session) && session.user!.type === UserType.Vendor;
}

export function isAdmin(session: Session): boolean {
  return isUser(session) && session.user!.type === UserType.Admin;
}

// Users.

export function readManyUsers(session: Session): boolean {
  return !!session.user && session.user.type === UserType.Admin;
}

export function updateUser(session: Session, id: string): boolean {
  return isOwnAccount(session, id) || isAdmin(session);
}

export function deleteUser(session: Session, id: string): boolean {
  return isOwnAccount(session, id) || (!!session.user && session.user.type === UserType.Admin);
}

// Sessions.

export function readOneSession(session: Session, id: string): boolean {
  return isCurrentSession(id) || isOwnSession(session, id);
}

export function deleteSession(session: Session, id: string): boolean {
  return isCurrentSession(id) || isOwnSession(session, id);
}

// Organizations.

export function createOrganization(session: Session): boolean {
  return isVendor(session);
}

export async function readOneOrganization(connection: Connection, session: Session, orgId: string): Promise<boolean> {
  if (!session.user) {
    return false;
  }
  return await isUserOwnerOfOrg(connection, session.user, orgId) || isAdmin(session);
}

export async function updateOrganization(connection: Connection, session: Session, orgId: string): Promise<boolean> {
  if (!session.user) {
    return false;
  }
  return await isUserOwnerOfOrg(connection, session.user, orgId) || isAdmin(session);
}

export async function deleteOrganization(connection: Connection, session: Session, orgId: string): Promise<boolean> {
  if (!session.user) {
    return false;
  }
  return await isUserOwnerOfOrg(connection, session.user, orgId) || isAdmin(session);
}

// Affiliations.

export function readManyAffiliations(session: Session): boolean {
  return isVendor(session);
}

export function createAffiliation(session: Session, userId: string): boolean {
  // New affiliations can be created by vendors for themselves, or by admins
  return (isVendor(session) && isOwnAccount(session, userId)) || isAdmin(session);
}

export async function updateAffiliation(connection: Connection, session: Session, orgId: string): Promise<boolean> {
  // Updates can be performed by owners of the organization in question, or by admins
  if (!session.user) {
    return false;
  }
  return await isUserOwnerOfOrg(connection, session.user, orgId) || isAdmin(session);
}

export async function deleteAffiliation(connection: Connection, session: Session, userId: string, orgId: string): Promise<boolean> {
  // Affiliations can be deleted by the user who owns them, an owner of the org, or an admin
  if (!session.user) {
    return false;
  }
  return isOwnAccount(session, userId) || await isUserOwnerOfOrg(connection, session.user, orgId) || isAdmin(session);
}
