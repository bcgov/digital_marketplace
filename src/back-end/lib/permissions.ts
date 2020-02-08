import { Connection, hasFilePermission, isCWUOpportunityAuthor, isCWUProposalAuthor, isUserOwnerOfOrg } from 'back-end/lib/db';
import { Affiliation } from 'shared/lib/resources/affiliation';
import { CURRENT_SESSION_ID, Session } from 'shared/lib/resources/session';
import { UserType } from 'shared/lib/resources/user';

export const ERROR_MESSAGE = 'You do not have permission to perform this action.';

export function isSignedIn(session: Session): boolean {
  return !!session.user;
}

export function isSignedOut(session: Session): boolean {
  return !isSignedIn(session);
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
  return isSignedIn(session) && session.user!.type === UserType.Vendor;
}

export function isAdmin(session: Session): boolean {
  return !!session.user && session.user.type === UserType.Admin;
}

export function isGovernment(session: Session): boolean {
  return !!session.user && session.user.type === UserType.Government;
}

// Users.

export function readManyUsers(session: Session): boolean {
  return !!session.user && session.user.type === UserType.Admin;
}

export function readOneUser(session: Session, userId: string): boolean {
  return isOwnAccount(session, userId) || isAdmin(session);
}

export function updateUser(session: Session, id: string): boolean {
  return isOwnAccount(session, id) || isAdmin(session);
}

export function deleteUser(session: Session, id: string): boolean {
  return isOwnAccount(session, id) || isAdmin(session);
}

export function acceptTerms(session: Session, id: string): boolean {
  return isOwnAccount(session, id);
}

export function reactivateUser(session: Session, id: string): boolean {
  return isAdmin(session) && !isOwnAccount(session, id);
}

export function updateAdminStatus(session: Session): boolean {
  return isAdmin(session);
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
  return isAdmin(session) || await isUserOwnerOfOrg(connection, session.user, orgId);
}

export async function updateOrganization(connection: Connection, session: Session, orgId: string): Promise<boolean> {
  if (!session.user) {
    return false;
  }
  return isAdmin(session) || await isUserOwnerOfOrg(connection, session.user, orgId);
}

export async function deleteOrganization(connection: Connection, session: Session, orgId: string): Promise<boolean> {
  if (!session.user) {
    return false;
  }
  return isAdmin(session) || await isUserOwnerOfOrg(connection, session.user, orgId);
}

// Affiliations.

export function readManyAffiliations(session: Session): boolean {
  return isVendor(session);
}

export async function createAffiliation(connection: Connection, session: Session, orgId: string): Promise<boolean> {
  // New affiliations can be created only by organization owners, or admins
  return isAdmin(session) || (!!session.user && await isUserOwnerOfOrg(connection, session.user, orgId));
}

export function updateAffiliation(session: Session, affiliation: Affiliation): boolean {
  // Affiliations can only be accepted by the invited user, or admins
  return isAdmin(session) || (!!session.user && session.user.id === affiliation.user.id);
}

export async function deleteAffiliation(connection: Connection, session: Session, affiliation: Affiliation): Promise<boolean> {
  // Affiliations can be deleted by the user who owns them, an owner of the org, or an admin
  return isAdmin(session) ||
    (!!session.user && isOwnAccount(session, affiliation.user.id)) ||
    (!!session.user && await isUserOwnerOfOrg(connection, session.user, affiliation.organization.id));
}

// Files.

export function createFile(session: Session): boolean {
  return isSignedIn(session);
}

export async function readOneFile(connection: Connection, session: Session, fileId: string): Promise<boolean> {
  return await hasFilePermission(connection, session, fileId);
}

// CWU Opportunities.

export function createCWUOpportunity(session: Session): boolean {
  return isAdmin(session) || isGovernment(session);
}

export async function editCWUOpportunity(connection: Connection, session: Session, opportunityId: string): Promise<boolean> {
  return isAdmin(session) || (session.user && isGovernment(session) && await isCWUOpportunityAuthor(connection, session.user, opportunityId)) || false;
}

export async function deleteCWUOpportunity(connection: Connection, session: Session, opportunityId: string): Promise<boolean> {
  return isAdmin(session) || (session.user && isGovernment(session) && await isCWUOpportunityAuthor(connection, session.user, opportunityId)) || false;
}

// CWU Proposals.

export async function readManyCWUProposals(connection: Connection, session: Session, opportunityId: string): Promise<boolean> {
  return isAdmin(session) || (session.user && isCWUOpportunityAuthor(connection, session.user, opportunityId)) || false;
}

export async function readOneCWUProposal(connection: Connection, session: Session, opportunityId: string, proposalId: string): Promise<boolean> {
  return isAdmin(session) ||
        (session.user && isCWUOpportunityAuthor(connection, session.user, opportunityId)) ||
        (session.user && isCWUProposalAuthor(connection, session.user, proposalId)) || false;
}

export function createCWUProposal(session: Session): boolean {
  return isVendor(session);
}

export async function editCWUProposal(connection: Connection, session: Session, proposalId: string): Promise<boolean> {
  return session.user && await isCWUProposalAuthor(connection, session.user, proposalId) || false;
}

export async function deleteCWUProposal(connection: Connection, session: Session, proposalId: string): Promise<boolean> {
  return session.user && await isCWUProposalAuthor(connection, session.user, proposalId) || false;
}
