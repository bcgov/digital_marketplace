import {
  Connection,
  hasCWUAttachmentPermission,
  hasFilePermission,
  isCWUOpportunityAuthor,
  isCWUProposalAuthor,
  isSWUOpportunityAuthor,
  isTWUOpportunityAuthor,
  isTWUProposalAuthor,
  isUserOwnerOfOrg,
  isUserOwnerOrAdminOfOrg,
  userHasAcceptedCurrentTerms,
  userHasAcceptedPreviousTerms
} from "back-end/lib/db";
import {
  hasSWUAttachmentPermission,
  isSWUProposalAuthor
} from "back-end/lib/db/proposal/sprint-with-us";
import { Affiliation } from "shared/lib/resources/affiliation";
import {
  CWUOpportunity,
  doesCWUOpportunityStatusAllowGovToViewProposals
} from "shared/lib/resources/opportunity/code-with-us";
import {
  CreateSWUOpportunityStatus,
  doesSWUOpportunityStatusAllowGovToViewProposals,
  SWUOpportunity,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateTWUOpportunityStatus,
  doesTWUOpportunityStatusAllowGovToViewProposals,
  TWUOpportunity,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import {
  doesOrganizationMeetSWUQualification,
  doesOrganizationMeetTWUQualification,
  Organization
} from "shared/lib/resources/organization";
import {
  CWUProposal,
  CWUProposalStatus,
  isCWUProposalStatusVisibleToGovernment
} from "shared/lib/resources/proposal/code-with-us";
import {
  isSWUProposalStatusVisibleToGovernment,
  SWUProposal,
  SWUProposalStatus
} from "shared/lib/resources/proposal/sprint-with-us";
import {
  AuthenticatedSession,
  CURRENT_SESSION_ID,
  Session
} from "shared/lib/resources/session";
import { UserType } from "shared/lib/resources/user";
import {
  isTWUProposalStatusVisibleToGovernment,
  TWUProposal,
  TWUProposalStatus
} from "shared/lib/resources/proposal/team-with-us";

export const ERROR_MESSAGE =
  "You do not have permission to perform this action.";

export function isSignedIn(session: Session): session is AuthenticatedSession {
  return !!session;
}

export function isOwnAccount(session: Session, id: string): boolean {
  return !!session && session.user.id === id;
}

export function isCurrentSession(id: string): boolean {
  return id === CURRENT_SESSION_ID;
}

export function isOwnSession(session: Session, id: string): boolean {
  return session?.id === id;
}

export function isVendor(session: Session): boolean {
  return isSignedIn(session) && session?.user.type === UserType.Vendor;
}

export function isAdmin(session: Session): boolean {
  return !!session && session.user.type === UserType.Admin;
}

export function isGovernment(session: Session): boolean {
  return !!session && session.user.type === UserType.Government;
}

export async function hasAcceptedCurrentTerms(
  connection: Connection,
  session: Session
): Promise<boolean> {
  return (
    !!session &&
    (await userHasAcceptedCurrentTerms(connection, session?.user.id))
  );
}

export async function hasAcceptedPreviousTerms(
  connection: Connection,
  session: Session
): Promise<boolean> {
  return (
    !!session &&
    (await userHasAcceptedPreviousTerms(connection, session?.user.id))
  );
}

// Users.

export function readManyUsers(session: Session): boolean {
  return !!session && session.user.type === UserType.Admin;
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

export async function createOrganization(
  connection: Connection,
  session: Session
): Promise<boolean> {
  return (
    isVendor(session) && (await hasAcceptedPreviousTerms(connection, session))
  );
}

export async function readOneOrganization(
  connection: Connection,
  session: Session,
  orgId: string
): Promise<boolean> {
  if (!session) {
    return false;
  }
  return (
    isAdmin(session) ||
    (await isUserOwnerOrAdminOfOrg(connection, session.user, orgId))
  );
}

export async function updateOrganization(
  connection: Connection,
  session: Session,
  orgId: string
): Promise<boolean> {
  if (!session) {
    return false;
  }
  return (
    isAdmin(session) ||
    (await isUserOwnerOfOrg(connection, session.user, orgId))
  );
}

export async function deleteOrganization(
  connection: Connection,
  session: Session,
  orgId: string
): Promise<boolean> {
  if (!session) {
    return false;
  }
  return (
    isAdmin(session) ||
    (await isUserOwnerOfOrg(connection, session.user, orgId))
  );
}

// Owned Organizations.

export function readManyOwnedOrganizations(session: Session): boolean {
  return isVendor(session);
}

// Affiliations.

export function readManyAffiliations(session: Session): boolean {
  return isVendor(session);
}

export async function readManyAffiliationsForOrganization(
  connection: Connection,
  session: Session,
  orgId: string
): Promise<boolean> {
  // Membership lists for organizations can only be read by admins or organization owner
  return (
    isAdmin(session) ||
    (!!session &&
      (await isUserOwnerOrAdminOfOrg(connection, session.user, orgId)))
  );
}

export async function createAffiliation(
  connection: Connection,
  session: Session,
  orgId: string
): Promise<boolean> {
  // New affiliations can be created only by organization owners, or admins
  return (
    isAdmin(session) ||
    (!!session &&
      (await isUserOwnerOrAdminOfOrg(connection, session.user, orgId)))
  );
}

export function approveAffiliation(
  session: Session,
  affiliation: Affiliation
): boolean {
  // Affiliations can only be accepted by the invited user, or admins
  return (
    isAdmin(session) || (!!session && session.user.id === affiliation.user.id)
  );
}

export async function updateAffiliationAdminStatus(
  connection: Connection,
  session: Session,
  orgId: string
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (!!session && (await isUserOwnerOfOrg(connection, session.user, orgId)))
  );
}

export async function deleteAffiliation(
  connection: Connection,
  session: Session,
  affiliation: Affiliation
): Promise<boolean> {
  // Affiliations can be deleted by the user who owns them, an owner/admin of the org, or an admin
  return (
    isAdmin(session) ||
    (!!session && isOwnAccount(session, affiliation.user.id)) ||
    (!!session &&
      (await isUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        affiliation.organization.id
      )))
  );
}

// Files.

export function createFile(session: Session): boolean {
  return isSignedIn(session);
}

export async function readOneFile(
  connection: Connection,
  session: Session | null,
  fileId: string
): Promise<boolean> {
  return (
    (session && isAdmin(session)) ||
    (await hasFilePermission(connection, session, fileId)) ||
    (await hasCWUAttachmentPermission(connection, session, fileId)) ||
    (await hasSWUAttachmentPermission(connection, session, fileId))
  );
}

// CWU Opportunities.

export function createCWUOpportunity(session: Session): boolean {
  return isAdmin(session) || isGovernment(session);
}

export async function editCWUOpportunity(
  connection: Connection,
  session: Session,
  opportunityId: string
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      isGovernment(session) &&
      (await isCWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    false
  );
}

export async function deleteCWUOpportunity(
  connection: Connection,
  session: Session,
  opportunityId: string
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      isGovernment(session) &&
      (await isCWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    false
  );
}

// CWU Proposals.

export async function readManyCWUProposals(
  connection: Connection,
  session: Session,
  opportunity: CWUOpportunity
): Promise<boolean> {
  if (
    isAdmin(session) ||
    (session &&
      (await isCWUOpportunityAuthor(connection, session.user, opportunity.id)))
  ) {
    // Only provide permission to admins/gov owners if opportunity is not in draft or published
    return doesCWUOpportunityStatusAllowGovToViewProposals(opportunity.status);
  } else if (isVendor(session)) {
    // If a vendor, only proposals they have authored will be returned (filtered at db layer)
    return true;
  }
  return false;
}

export function readOwnProposals(session: Session): boolean {
  return isVendor(session);
}

export async function readOneCWUProposal(
  connection: Connection,
  session: Session,
  proposal: CWUProposal
): Promise<boolean> {
  if (
    isAdmin(session) ||
    (session &&
      (await isCWUOpportunityAuthor(
        connection,
        session.user,
        proposal.opportunity.id
      )))
  ) {
    // Only provide permission to admins/gov owners if opportunity is not in draft/published
    // And proposal is not in draft/submitted
    return (
      isSignedIn(session) &&
      doesCWUOpportunityStatusAllowGovToViewProposals(
        proposal.opportunity.status
      ) &&
      isCWUProposalStatusVisibleToGovernment(
        proposal.status,
        session.user.type as UserType.Admin | UserType.Government
      )
    );
  } else if (isVendor(session)) {
    // If a vendor, only proposals they have authored will be returned (filtered at db layer)
    return (
      (session &&
        (await isCWUProposalAuthor(connection, session.user, proposal.id))) ||
      false
    );
  }
  return false;
}

export async function readCWUProposalScore(
  connection: Connection,
  session: Session,
  opportunityId: string,
  proposalId: string,
  proposalStatus: CWUProposalStatus
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isCWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    (session &&
      (await isCWUProposalAuthor(connection, session.user, proposalId)) &&
      (proposalStatus === CWUProposalStatus.Awarded ||
        proposalStatus === CWUProposalStatus.NotAwarded)) ||
    false
  );
}

export async function readCWUProposalHistory(
  connection: Connection,
  session: Session,
  opportunityId: string
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isCWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    false
  );
}

export async function createCWUProposal(
  connection: Connection,
  session: Session
): Promise<boolean> {
  return (
    isVendor(session) && (await hasAcceptedPreviousTerms(connection, session))
  );
}

export async function editCWUProposal(
  connection: Connection,
  session: Session,
  proposalId: string,
  opportunity: CWUOpportunity
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isCWUProposalAuthor(connection, session.user, proposalId)) &&
      (await hasAcceptedPreviousTerms(connection, session))) ||
    (session &&
      (await isCWUOpportunityAuthor(
        connection,
        session.user,
        opportunity.id
      )) &&
      doesCWUOpportunityStatusAllowGovToViewProposals(opportunity.status)) ||
    false
  );
}

export async function submitCWUProposal(
  connection: Connection,
  session: Session,
  proposalId: string
): Promise<boolean> {
  return (
    (session &&
      (await isCWUProposalAuthor(connection, session.user, proposalId)) &&
      (await hasAcceptedCurrentTerms(connection, session))) ||
    false
  );
}

export async function deleteCWUProposal(
  connection: Connection,
  session: Session,
  proposalId: string
): Promise<boolean> {
  return (
    (session &&
      (await isCWUProposalAuthor(connection, session.user, proposalId))) ||
    false
  );
}

// SWU Opportunities.
export function createSWUOpportunity(
  session: Session,
  createStatus: CreateSWUOpportunityStatus
): boolean {
  return (
    isAdmin(session) ||
    (isGovernment(session) && createStatus !== SWUOpportunityStatus.Published)
  );
}

export async function editSWUOpportunity(
  connection: Connection,
  session: Session,
  opportunityId: string
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      isGovernment(session) &&
      (await isSWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    false
  );
}

export function publishSWUOpportunity(session: Session): boolean {
  return isAdmin(session);
}

export async function deleteSWUOpportunity(
  connection: Connection,
  session: Session,
  opportunityId: string,
  status: SWUOpportunityStatus
): Promise<boolean> {
  return (
    (isAdmin(session) &&
      [SWUOpportunityStatus.Draft, SWUOpportunityStatus.UnderReview].includes(
        status
      )) ||
    (isSignedIn(session) &&
      isGovernment(session) &&
      (await isSWUOpportunityAuthor(connection, session.user, opportunityId)) &&
      status === SWUOpportunityStatus.Draft) ||
    false
  );
}

export function addSWUAddendum(session: Session): boolean {
  return isAdmin(session);
}

export function cancelSWUOpportunity(session: Session): boolean {
  return isAdmin(session);
}

export function suspendSWUOpportunity(session: Session): boolean {
  return isAdmin(session);
}

// SWU Proposals.

export async function readOneSWUProposal(
  connection: Connection,
  session: Session,
  proposal: SWUProposal
): Promise<boolean> {
  if (
    isAdmin(session) ||
    (session &&
      (await isSWUOpportunityAuthor(
        connection,
        session.user,
        proposal.opportunity.id
      )))
  ) {
    // Only provide permission to admins/gov owners if opportunity is not in draft/published
    // And proposal is not in draft/submitted
    return (
      isSignedIn(session) &&
      doesSWUOpportunityStatusAllowGovToViewProposals(
        proposal.opportunity.status
      ) &&
      isSWUProposalStatusVisibleToGovernment(
        proposal.status,
        session.user.type as UserType.Government | UserType.Admin
      )
    );
  } else if (isVendor(session)) {
    // If a vendor, only proposals they have authored will be returned (filtered at db layer)
    return (
      (session &&
        (await isSWUProposalAuthor(connection, session.user, proposal.id))) ||
      false
    );
  }
  return false;
}

export async function readManySWUProposals(
  connection: Connection,
  session: Session,
  opportunity: SWUOpportunity
): Promise<boolean> {
  if (
    isAdmin(session) ||
    (session &&
      (await isSWUOpportunityAuthor(connection, session.user, opportunity.id)))
  ) {
    // Only provide permission to admins/gov owners if opportunity is not in draft or published
    return doesSWUOpportunityStatusAllowGovToViewProposals(opportunity.status);
  } else if (isVendor(session)) {
    // If a vendor, only proposals they have authored will be returned (filtered at db layer)
    return true;
  }
  return false;
}

export function readOwnSWUProposals(session: Session): boolean {
  return isVendor(session);
}

export async function readSWUProposalHistory(
  connection: Connection,
  session: Session,
  opportunityId: string,
  proposalId: string
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isSWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    (session &&
      (await isSWUProposalAuthor(connection, session.user, proposalId))) ||
    false
  );
}

export async function readSWUProposalScore(
  connection: Connection,
  session: Session,
  opportunityId: string,
  proposalId: string,
  proposalStatus: SWUProposalStatus
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isSWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    (session &&
      (await isSWUProposalAuthor(connection, session.user, proposalId)) &&
      (proposalStatus === SWUProposalStatus.Awarded ||
        proposalStatus === SWUProposalStatus.NotAwarded)) ||
    false
  );
}

export async function createSWUProposal(
  connection: Connection,
  session: Session
): Promise<boolean> {
  return (
    isVendor(session) && (await hasAcceptedPreviousTerms(connection, session))
  );
}

export async function submitSWUProposal(
  connection: Connection,
  session: Session,
  organization: Organization
): Promise<boolean> {
  return (
    !!session &&
    isVendor(session) &&
    (await hasAcceptedCurrentTerms(connection, session)) &&
    (await isUserOwnerOfOrg(connection, session.user, organization.id)) &&
    doesOrganizationMeetSWUQualification(organization)
  );
}

export async function editSWUProposal(
  connection: Connection,
  session: Session,
  proposalId: string,
  opportunity: SWUOpportunity
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isSWUProposalAuthor(connection, session.user, proposalId)) &&
      (await hasAcceptedPreviousTerms(connection, session))) ||
    (session &&
      (await isSWUOpportunityAuthor(
        connection,
        session.user,
        opportunity.id
      )) &&
      doesSWUOpportunityStatusAllowGovToViewProposals(opportunity.status)) ||
    false
  );
}

export async function deleteSWUProposal(
  connection: Connection,
  session: Session,
  proposalId: string
): Promise<boolean> {
  return (
    (session &&
      (await isSWUProposalAuthor(connection, session.user, proposalId))) ||
    false
  );
}

// TWU Opportunities

export function createTWUOpportunity(
  session: Session,
  createStatus: CreateTWUOpportunityStatus
): boolean {
  return (
    isAdmin(session) ||
    (isGovernment(session) && createStatus !== TWUOpportunityStatus.Published)
  );
}

export async function editTWUOpportunity(
  connection: Connection,
  session: Session,
  opportunityId: string
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      isGovernment(session) &&
      (await isTWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    false
  );
}

/**
 * Checks for authentication and specific roles. Admins can delete any
 * opportunity (true) and Government users can delete only their own (true).
 * Returns false if either one of those two conditions are not met.
 *
 * @see {@link delete_} in 'src/back-end/lib/resources/opportunity/team-with-us.ts'
 *
 * @param connection
 * @param session
 * @param opportunityId
 * @returns boolean
 */
export async function deleteTWUOpportunity(
  connection: Connection,
  session: Session,
  opportunityId: string
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      isGovernment(session) &&
      (await isTWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    false
  );
}

export function addTWUAddendum(session: Session): boolean {
  return isAdmin(session);
}

export function cancelTWUOpportunity(session: Session): boolean {
  return isAdmin(session);
}

export function suspendTWUOpportunity(session: Session): boolean {
  return isAdmin(session);
}

// TWU Proposals

/**
 * Admins and proposal authors can edit Proposals, so long as they are in a
 * certain state
 *
 * @param connection
 * @param session
 * @param proposalId
 * @param opportunity
 */
export async function editTWUProposal(
  connection: Connection,
  session: Session,
  proposalId: string,
  opportunity: TWUOpportunity
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isTWUProposalAuthor(connection, session.user, proposalId)) &&
      (await hasAcceptedPreviousTerms(connection, session))) ||
    (session &&
      (await isTWUOpportunityAuthor(
        connection,
        session.user,
        opportunity.id
      )) &&
      doesTWUOpportunityStatusAllowGovToViewProposals(opportunity.status)) ||
    false
  );
}

export async function readOneTWUProposal(
  connection: Connection,
  session: Session,
  proposal: TWUProposal
): Promise<boolean> {
  if (
    isAdmin(session) ||
    (session &&
      (await isTWUOpportunityAuthor(
        connection,
        session.user,
        proposal.opportunity.id
      )))
  ) {
    // Only provide permission to admins/gov owners if opportunity is not in draft/published
    // And proposal is not in draft/submitted
    return (
      isSignedIn(session) &&
      doesTWUOpportunityStatusAllowGovToViewProposals(
        proposal.opportunity.status
      ) &&
      isTWUProposalStatusVisibleToGovernment(
        proposal.status,
        session.user.type as UserType.Government | UserType.Admin
      )
    );
  } else if (isVendor(session)) {
    // If a vendor, only proposals they have authored will be returned (filtered at db layer)
    return (
      (session &&
        (await isTWUProposalAuthor(connection, session.user, proposal.id))) ||
      false
    );
  }
  return false;
}

export async function readManyTWUProposals(
  connection: Connection,
  session: Session,
  opportunity: TWUOpportunity
): Promise<boolean> {
  if (
    isAdmin(session) ||
    (session &&
      (await isTWUOpportunityAuthor(connection, session.user, opportunity.id)))
  ) {
    // Only provide permission to admins/gov owners if opportunity is not in draft or published
    return doesTWUOpportunityStatusAllowGovToViewProposals(opportunity.status);
  } else if (isVendor(session)) {
    // If a vendor, only proposals they have authored will be returned (filtered at db layer)
    return true;
  }
  return false;
}

export async function readTWUProposalHistory(
  connection: Connection,
  session: Session,
  opportunityId: string,
  proposalId: string
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isTWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    (session &&
      (await isTWUProposalAuthor(connection, session.user, proposalId))) ||
    false
  );
}

export async function readTWUProposalScore(
  connection: Connection,
  session: Session,
  opportunityId: string,
  proposalId: string,
  proposalStatus: TWUProposalStatus
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isTWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    (session &&
      (await isTWUProposalAuthor(connection, session.user, proposalId)) &&
      (proposalStatus === TWUProposalStatus.Awarded ||
        proposalStatus === TWUProposalStatus.NotAwarded)) ||
    false
  );
}
export function publishTWUOpportunity(session: Session): boolean {
  return isAdmin(session);
}

export async function createTWUProposal(
  connection: Connection,
  session: Session
): Promise<boolean> {
  return (
    isVendor(session) && (await hasAcceptedPreviousTerms(connection, session))
  );
}

export async function submitTWUProposal(
  connection: Connection,
  session: Session,
  organization: Organization
): Promise<boolean> {
  return (
    !!session &&
    isVendor(session) &&
    (await hasAcceptedCurrentTerms(connection, session)) &&
    (await isUserOwnerOfOrg(connection, session.user, organization.id)) &&
    doesOrganizationMeetTWUQualification(organization)
  );
}

/**
 * Only authors of the proposal can delete the proposal
 *
 * @param connection
 * @param session
 * @param proposalId
 */
export async function deleteTWUProposal(
  connection: Connection,
  session: Session,
  proposalId: string
): Promise<boolean> {
  return (
    (session &&
      (await isTWUProposalAuthor(connection, session.user, proposalId))) ||
    false
  );
}

// Metrics.

export function readAllCounters(session: Session): boolean {
  return isAdmin(session);
}

export function readManyCounters(session: Session): boolean {
  return isAdmin(session) || isGovernment(session);
}

// Content

export function readManyContent(session: Session): boolean {
  return isAdmin(session);
}

export function createContent(session: Session): boolean {
  return isAdmin(session);
}

export function editContent(session: Session): boolean {
  return isAdmin(session);
}

export function deleteContent(session: Session): boolean {
  return isAdmin(session);
}

// Email Notifications.

export function updateTermsNotification(session: Session): boolean {
  return isAdmin(session);
}
