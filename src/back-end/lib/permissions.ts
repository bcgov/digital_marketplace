import {
  Connection,
  getOrgIdsForOwnerOrAdmin,
  hasCWUAttachmentPermission,
  hasFilePermission,
  isCWUOpportunityAuthor,
  isCWUProposalAuthorOrIsUserOwnerOrAdminOfOrg,
  isSWUOpportunityAuthor,
  isTWUOpportunityAuthor,
  isTWUOpportunityEvaluationPanelChair,
  isTWUOpportunityEvaluationPanelEvaluator,
  isTWUProposalAuthorOrIsUserOwnerOrAdminOfOrg,
  isUserOwnerOfOrg,
  isUserOwnerOrAdminOfOrg,
  userHasAcceptedCurrentTerms,
  userHasAcceptedPreviousTerms
} from "back-end/lib/db";
import {
  hasSWUAttachmentPermission,
  isSWUProposalAuthorOrIsUserOwnerOrAdminOfOrg
} from "back-end/lib/db/proposal/sprint-with-us";
import { Affiliation } from "shared/lib/resources/affiliation";
import {
  CWUOpportunity,
  CWUOpportunityStatus,
  doesCWUOpportunityStatusAllowGovToViewProposals
} from "shared/lib/resources/opportunity/code-with-us";
import {
  CreateSWUOpportunityStatus,
  doesSWUOpportunityStatusAllowGovToViewProposals,
  SWUOpportunity,
  SWUOpportunityStatus,
  SWUOpportunitySlim,
  doesSWUOpportunityStatusAllowGovToViewTeamQuestionResponseEvaluations
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  CreateTWUOpportunityStatus,
  doesTWUOpportunityStatusAllowGovToViewProposals,
  doesTWUOpportunityStatusAllowGovToViewResourceQuestionResponseEvaluations,
  TWUOpportunity,
  TWUOpportunitySlim,
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
  getCWUProponentOrganizationId,
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
import { Id } from "shared/lib/types";
import {
  isSWUOpportunityEvaluationPanelChair,
  isSWUOpportunityEvaluationPanelEvaluator
} from "./db/evaluations/sprint-with-us/team-questions";
import { SWUTeamQuestionResponseEvaluation } from "shared/lib/resources/evaluations/sprint-with-us/team-questions";
import { TWUResourceQuestionResponseEvaluation } from "shared/lib/resources/evaluations/team-with-us/resource-questions";

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

/**
 * Checks to see if the user is affiliated with any orgs as OWNER or ADMIN
 *
 * @param connection
 * @param session
 * @returns Promise<boolean> - true if no orgIds returned, false if null
 */
export async function isOrgOwnerOrAdmin(
  connection: Connection,
  session: Session
): Promise<boolean> {
  // sanity check
  if (!isSignedIn(session)) {
    return false;
  }
  // retrieve organizationIds for the current user who is either OWNER or ADMIN of
  const orgIds = await getOrgIdsForOwnerOrAdmin(connection, session.user.id);
  return !!orgIds;
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
  return (
    !!session &&
    [UserType.Admin, UserType.Government].includes(session.user.type)
  );
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
    (!!session &&
      (await isUserOwnerOrAdminOfOrg(connection, session.user, orgId)))
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
  opportunityId: string,
  status: CWUOpportunityStatus
): Promise<boolean> {
  return (
    (isAdmin(session) &&
      [CWUOpportunityStatus.Draft, CWUOpportunityStatus.UnderReview].includes(
        status
      )) ||
    (session &&
      isGovernment(session) &&
      status === CWUOpportunityStatus.Draft &&
      (await isCWUOpportunityAuthor(
        connection,
        session.user,
        opportunityId
      ))) ||
    false
  );
}

export function publishCWUOpportunity(session: Session): boolean {
  return isAdmin(session);
}

/**
 * Checks for authentication and specific roles. Admins can add addenda to
 * any opportunity (true) and Government users can only add to their own
 * (true). Returns false if either one of those two conditions are not met.
 *
 * @param connection
 * @param session
 * @param opportunity
 */
export async function addCWUAddendum(
  connection: Connection,
  session: Session,
  opportunity: Id
): Promise<boolean> {
  return !!(
    isAdmin(session) ||
    (session &&
      (await isCWUOpportunityAuthor(connection, session.user, opportunity)))
  );
}

export function cancelCWUOpportunity(session: Session): boolean {
  return isAdmin(session);
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
    // If a vendor, only proposals they or their org have authored will be returned (filtered at db layer)
    return (
      (session &&
        (await isCWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
          connection,
          session.user,
          proposal.id,
          getCWUProponentOrganizationId(proposal)
        ))) ||
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
  proposalStatus: CWUProposalStatus,
  orgId: Id | null | undefined
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
      (await isCWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposalId,
        orgId ?? null
      )) &&
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
  proposal: CWUProposal,
  opportunity: CWUOpportunity
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isCWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposal.id,
        getCWUProponentOrganizationId(proposal)
      )) &&
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
  proposal: CWUProposal
): Promise<boolean> {
  return (
    (session &&
      (await isCWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposal.id,
        getCWUProponentOrganizationId(proposal)
      )) &&
      (await hasAcceptedCurrentTerms(connection, session))) ||
    false
  );
}

export async function deleteCWUProposal(
  connection: Connection,
  session: Session,
  proposal: CWUProposal
): Promise<boolean> {
  return (
    (session &&
      (await isCWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposal.id,
        getCWUProponentOrganizationId(proposal)
      ))) ||
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

/**
 * Checks for authentication and specific roles. Admins can add addenda to
 * any opportunity (true) and Government users can only add to their own
 * (true). Returns false if either one of those two conditions are not met.
 *
 * @param connection
 * @param session
 * @param opportunity
 */
export async function addSWUAddendum(
  connection: Connection,
  session: Session,
  opportunity: Id
): Promise<boolean> {
  return !!(
    isAdmin(session) ||
    (session &&
      (await isSWUOpportunityAuthor(connection, session.user, opportunity)))
  );
}

export function cancelSWUOpportunity(session: Session): boolean {
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
      ((await isSWUOpportunityAuthor(
        connection,
        session.user,
        proposal.opportunity.id
      )) ||
        (await isSWUOpportunityEvaluationPanelEvaluator(
          connection,
          session,
          proposal.opportunity.id
        )) ||
        (await isSWUOpportunityEvaluationPanelChair(
          connection,
          session,
          proposal.opportunity.id
        ))))
  ) {
    // Only provide permission to admins/gov owners/panel members if
    // opportunity is not in draft/published and proposal is not in draft/submitted
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
    // If a vendor, only proposals they or their org have authored will be returned (filtered at db layer)
    return (
      (session &&
        (await isSWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
          connection,
          session.user,
          proposal.id,
          proposal.organization?.id ?? null
        ))) ||
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
  const panelMember = opportunity.evaluationPanel?.find(
    (member) => member.user.id === session?.user.id
  );
  if (
    isAdmin(session) ||
    (session &&
      (await isSWUOpportunityAuthor(
        connection,
        session.user,
        opportunity.id
      ))) ||
    panelMember
  ) {
    // Only provide permission to admins/gov owners/panel members if opportunity
    // is not in draft or published
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
  proposalId: string,
  orgId: Id | null
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
      (await isSWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposalId,
        orgId ?? null
      ))) ||
    false
  );
}

export async function readSWUProposalScore(
  connection: Connection,
  session: Session,
  opportunityId: string,
  proposalId: string,
  proposalStatus: SWUProposalStatus,
  orgId: Id | null
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
      (await isSWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposalId,
        orgId
      )) &&
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
    (await isUserOwnerOrAdminOfOrg(
      connection,
      session.user,
      organization.id
    )) &&
    doesOrganizationMeetSWUQualification(organization)
  );
}

export async function editSWUProposal(
  connection: Connection,
  session: Session,
  proposal: SWUProposal,
  opportunity: SWUOpportunity
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isSWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposal.id,
        proposal.organization?.id ?? null
      )) &&
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
  proposal: SWUProposal
): Promise<boolean> {
  return (
    (session &&
      (await isSWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposal.id,
        proposal.organization?.id ?? null
      ))) ||
    false
  );
}

// SWU Team Question Response Evaluations

export async function readOneSWUTeamQuestionResponseEvaluation(
  connection: Connection,
  session: Session,
  opportunity: SWUOpportunitySlim,
  evaluation: SWUTeamQuestionResponseEvaluation
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    (doesSWUOpportunityStatusAllowGovToViewTeamQuestionResponseEvaluations(
      opportunity.status
    ) ||
      evaluation.evaluationPanelMember === session.user.id ||
      (opportunity.status ===
        SWUOpportunityStatus.EvaluationTeamQuestionsConsensus &&
        (await isSWUOpportunityEvaluationPanelChair(
          connection,
          session,
          opportunity.id
        ))))
  );
}

export async function readOneSWUTeamQuestionResponseConsensus(
  session: Session,
  opportunity: SWUOpportunitySlim,
  evaluation: SWUTeamQuestionResponseEvaluation
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) ||
      (isGovernment(session) &&
        (doesSWUOpportunityStatusAllowGovToViewTeamQuestionResponseEvaluations(
          opportunity.status
        ) ||
          (opportunity.status ===
            SWUOpportunityStatus.EvaluationTeamQuestionsConsensus &&
            evaluation.evaluationPanelMember === session.user.id))))
  );
}

export async function readManySWUTeamQuestionResponseEvaluations(
  connection: Connection,
  session: Session,
  opportunity: SWUOpportunity
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    (doesSWUOpportunityStatusAllowGovToViewTeamQuestionResponseEvaluations(
      opportunity.status
    ) ||
      // Filtered to authored evaluations elsewhere
      (await isSWUOpportunityEvaluationPanelEvaluator(
        connection,
        session,
        opportunity.id
      )))
  );
}

export async function readManySWUTeamQuestionResponseConsensuses(
  connection: Connection,
  session: Session,
  opportunity: SWUOpportunity
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) ||
      (isGovernment(session) &&
        (doesSWUOpportunityStatusAllowGovToViewTeamQuestionResponseEvaluations(
          opportunity.status
        ) ||
          (await isSWUOpportunityEvaluationPanelEvaluator(
            connection,
            session,
            opportunity.id
          )) ||
          (await isSWUOpportunityEvaluationPanelChair(
            connection,
            session,
            opportunity.id
          )))))
  );
}

export async function readManySWUTeamQuestionResponseEvaluationsForConsensus(
  connection: Connection,
  session: Session,
  proposal: SWUProposal
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) ||
      (isGovernment(session) &&
        (doesSWUOpportunityStatusAllowGovToViewTeamQuestionResponseEvaluations(
          proposal.opportunity.status
        ) ||
          (proposal.opportunity.status ===
            SWUOpportunityStatus.EvaluationTeamQuestionsConsensus &&
            ((await isSWUOpportunityEvaluationPanelEvaluator(
              connection,
              session,
              proposal.opportunity.id
            )) ||
              (await isSWUOpportunityEvaluationPanelChair(
                connection,
                session,
                proposal.opportunity.id
              )))))))
  );
}

export async function createSWUTeamQuestionResponseConsensus(
  connection: Connection,
  session: Session,
  proposal: SWUProposal
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    proposal.opportunity.status ===
      SWUOpportunityStatus.EvaluationTeamQuestionsConsensus &&
    (await isSWUOpportunityEvaluationPanelChair(
      connection,
      session,
      proposal.opportunity.id
    ))
  );
}

export async function createSWUTeamQuestionResponseEvaluation(
  connection: Connection,
  session: Session,
  proposal: SWUProposal
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    proposal.opportunity.status ===
      SWUOpportunityStatus.EvaluationTeamQuestionsIndividual &&
    (await isSWUOpportunityEvaluationPanelEvaluator(
      connection,
      session,
      proposal.opportunity.id
    ))
  );
}

export function editSWUTeamQuestionResponseConsensus(
  session: AuthenticatedSession,
  opportunity: SWUOpportunitySlim,
  evaluation: SWUTeamQuestionResponseEvaluation
): boolean {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    evaluation.evaluationPanelMember === session.user.id &&
    opportunity.status === SWUOpportunityStatus.EvaluationTeamQuestionsConsensus
  );
}

export function editSWUTeamQuestionResponseEvaluation(
  session: AuthenticatedSession,
  opportunity: SWUOpportunitySlim,
  evaluation: SWUTeamQuestionResponseEvaluation
): boolean {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    evaluation.evaluationPanelMember === session.user.id &&
    opportunity.status ===
      SWUOpportunityStatus.EvaluationTeamQuestionsIndividual
  );
}

export function submitSWUTeamQuestionResponseConsensus(
  session: Session,
  opportunity: SWUOpportunitySlim,
  evaluation: SWUTeamQuestionResponseEvaluation
): boolean {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    evaluation.evaluationPanelMember === session.user.id &&
    opportunity.status === SWUOpportunityStatus.EvaluationTeamQuestionsConsensus
  );
}

export function submitSWUTeamQuestionResponseEvaluation(
  session: Session,
  opportunity: SWUOpportunitySlim,
  evaluation: SWUTeamQuestionResponseEvaluation
): boolean {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    evaluation.evaluationPanelMember === session.user.id &&
    opportunity.status ===
      SWUOpportunityStatus.EvaluationTeamQuestionsIndividual
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

/**
 * Checks for authentication and specific roles. Admins can add addenda to
 * any opportunity (true) and Government users can only add to their own
 * (true). Returns false if either one of those two conditions are not met.
 *
 * @param connection
 * @param session
 * @param opportunity
 */
export async function addTWUAddendum(
  connection: Connection,
  session: Session,
  opportunity: Id
): Promise<boolean> {
  return !!(
    isAdmin(session) ||
    (session &&
      (await isTWUOpportunityAuthor(connection, session.user, opportunity)))
  );
}

export function cancelTWUOpportunity(session: Session): boolean {
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
  proposal: TWUProposal,
  opportunity: TWUOpportunity
): Promise<boolean> {
  return (
    isAdmin(session) ||
    (session &&
      (await isTWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposal.id,
        proposal.organization?.id ?? null
      )) &&
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
      ((await isTWUOpportunityAuthor(
        connection,
        session.user,
        proposal.opportunity.id
      )) ||
        (await isTWUOpportunityEvaluationPanelEvaluator(
          connection,
          session,
          proposal.opportunity.id
        )) ||
        (await isTWUOpportunityEvaluationPanelChair(
          connection,
          session,
          proposal.opportunity.id
        ))))
  ) {
    // Only provide permission to admins/gov owners/panel members if
    // opportunity is not in draft/published and proposal is not in draft/submitted
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
    // If a vendor, only proposals they or their org have authored will be returned (filtered at db layer)
    return (
      (session &&
        (await isTWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
          connection,
          session.user,
          proposal.id,
          proposal.organization?.id ?? null
        ))) ||
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
  const panelMember = opportunity.evaluationPanel?.find(
    (member) => member.user.id === session?.user.id
  );
  if (
    isAdmin(session) ||
    (session &&
      (await isTWUOpportunityAuthor(
        connection,
        session.user,
        opportunity.id
      ))) ||
    panelMember
  ) {
    // Only provide permission to admins/gov owners/panel members if opportunity
    // is not in draft or published
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
  proposalId: string,
  orgId: Id | null
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
      (await isTWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposalId,
        orgId
      ))) ||
    false
  );
}

export async function readTWUProposalScore(
  connection: Connection,
  session: Session,
  opportunityId: string,
  proposalId: string,
  proposalStatus: TWUProposalStatus,
  orgId: Id | null
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
      (await isTWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposalId,
        orgId
      )) &&
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
    (await isUserOwnerOrAdminOfOrg(
      connection,
      session.user,
      organization.id
    )) &&
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
  proposal: TWUProposal
): Promise<boolean> {
  return (
    (session &&
      (await isTWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
        connection,
        session.user,
        proposal.id,
        proposal.organization?.id ?? null
      ))) ||
    false
  );
}

// TWU Resource Question Response Evaluations

export async function readOneTWUResourceQuestionResponseEvaluation(
  connection: Connection,
  session: Session,
  opportunity: TWUOpportunitySlim,
  evaluation: TWUResourceQuestionResponseEvaluation
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    (doesTWUOpportunityStatusAllowGovToViewResourceQuestionResponseEvaluations(
      opportunity.status
    ) ||
      evaluation.evaluationPanelMember === session.user.id ||
      (opportunity.status ===
        TWUOpportunityStatus.EvaluationResourceQuestionsConsensus &&
        (await isTWUOpportunityEvaluationPanelChair(
          connection,
          session,
          opportunity.id
        ))))
  );
}

export async function readOneTWUResourceQuestionResponseConsensus(
  session: Session,
  opportunity: TWUOpportunitySlim,
  evaluation: TWUResourceQuestionResponseEvaluation
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) ||
      (isGovernment(session) &&
        (doesTWUOpportunityStatusAllowGovToViewResourceQuestionResponseEvaluations(
          opportunity.status
        ) ||
          (opportunity.status ===
            TWUOpportunityStatus.EvaluationResourceQuestionsConsensus &&
            evaluation.evaluationPanelMember === session.user.id))))
  );
}

export async function readManyTWUResourceQuestionResponseEvaluations(
  connection: Connection,
  session: Session,
  opportunity: TWUOpportunity
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    (doesTWUOpportunityStatusAllowGovToViewResourceQuestionResponseEvaluations(
      opportunity.status
    ) ||
      // Filtered to authored evaluations elsewhere
      (await isTWUOpportunityEvaluationPanelEvaluator(
        connection,
        session,
        opportunity.id
      )))
  );
}

export async function readManyTWUResourceQuestionResponseConsensuses(
  connection: Connection,
  session: Session,
  opportunity: TWUOpportunity
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) ||
      (isGovernment(session) &&
        (doesTWUOpportunityStatusAllowGovToViewResourceQuestionResponseEvaluations(
          opportunity.status
        ) ||
          (await isTWUOpportunityEvaluationPanelEvaluator(
            connection,
            session,
            opportunity.id
          )) ||
          (await isTWUOpportunityEvaluationPanelChair(
            connection,
            session,
            opportunity.id
          )))))
  );
}

export async function readManyTWUResourceQuestionResponseEvaluationsForConsensus(
  connection: Connection,
  session: Session,
  proposal: TWUProposal
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) ||
      (isGovernment(session) &&
        (doesTWUOpportunityStatusAllowGovToViewResourceQuestionResponseEvaluations(
          proposal.opportunity.status
        ) ||
          (proposal.opportunity.status ===
            TWUOpportunityStatus.EvaluationResourceQuestionsConsensus &&
            ((await isTWUOpportunityEvaluationPanelEvaluator(
              connection,
              session,
              proposal.opportunity.id
            )) ||
              (await isTWUOpportunityEvaluationPanelChair(
                connection,
                session,
                proposal.opportunity.id
              )))))))
  );
}

export async function createTWUResourceQuestionResponseConsensus(
  connection: Connection,
  session: Session,
  proposal: TWUProposal
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    proposal.opportunity.status ===
      TWUOpportunityStatus.EvaluationResourceQuestionsConsensus &&
    (await isTWUOpportunityEvaluationPanelChair(
      connection,
      session,
      proposal.opportunity.id
    ))
  );
}

export async function createTWUResourceQuestionResponseEvaluation(
  connection: Connection,
  session: Session,
  proposal: TWUProposal
): Promise<boolean> {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    proposal.opportunity.status ===
      TWUOpportunityStatus.EvaluationResourceQuestionsIndividual &&
    (await isTWUOpportunityEvaluationPanelEvaluator(
      connection,
      session,
      proposal.opportunity.id
    ))
  );
}

export function editTWUResourceQuestionResponseConsensus(
  session: AuthenticatedSession,
  opportunity: TWUOpportunitySlim,
  evaluation: TWUResourceQuestionResponseEvaluation
): boolean {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    evaluation.evaluationPanelMember === session.user.id &&
    opportunity.status ===
      TWUOpportunityStatus.EvaluationResourceQuestionsConsensus
  );
}

export function editTWUResourceQuestionResponseEvaluation(
  session: AuthenticatedSession,
  opportunity: TWUOpportunitySlim,
  evaluation: TWUResourceQuestionResponseEvaluation
): boolean {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    evaluation.evaluationPanelMember === session.user.id &&
    opportunity.status ===
      TWUOpportunityStatus.EvaluationResourceQuestionsIndividual
  );
}

export function submitTWUResourceQuestionResponseConsensus(
  session: Session,
  opportunity: TWUOpportunitySlim,
  evaluation: TWUResourceQuestionResponseEvaluation
): boolean {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    evaluation.evaluationPanelMember === session.user.id &&
    opportunity.status ===
      TWUOpportunityStatus.EvaluationResourceQuestionsConsensus
  );
}

export function submitTWUResourceQuestionResponseEvaluation(
  session: Session,
  opportunity: TWUOpportunitySlim,
  evaluation: TWUResourceQuestionResponseEvaluation
): boolean {
  return (
    !!session &&
    (isAdmin(session) || isGovernment(session)) &&
    evaluation.evaluationPanelMember === session.user.id &&
    opportunity.status ===
      TWUOpportunityStatus.EvaluationResourceQuestionsIndividual
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
