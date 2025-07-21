import { generateUuid } from "back-end/lib";
import {
  Connection,
  getOrgIdsForOwnerOrAdmin,
  Transaction,
  isUserOwnerOrAdminOfOrg,
  tryDb,
  readOneSWUTeamQuestionResponseEvaluation
} from "back-end/lib/db";
import { readOneFileById } from "back-end/lib/db/file";
import {
  generateSWUOpportunityQuery,
  RawSWUEvaluationPanelMember,
  RawSWUOpportunity,
  RawSWUOpportunitySlim,
  readManyTeamQuestions,
  readOneSWUOpportunitySlim,
  updateSWUOpportunityStatus
} from "back-end/lib/db/opportunity/sprint-with-us";
import { readOneOrganizationSlim } from "back-end/lib/db/organization";
import {
  RawUser,
  rawUserToUser,
  readOneUser,
  readOneUserSlim
} from "back-end/lib/db/user";
import {
  isSignedIn,
  readOneSWUProposal as hasReadPermissionSWUProposal,
  readSWUProposalHistory,
  readSWUProposalScore
} from "back-end/lib/permissions";
import { MembershipStatus } from "shared/lib/resources/affiliation";
import { FileRecord } from "shared/lib/resources/file";
import {
  doesSWUOpportunityStatusAllowGovToViewFullProposal,
  privateOpportunityStatuses,
  publicOpportunityStatuses,
  SWUOpportunityStatus
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  calculateProposalTeamQuestionScore,
  CreateRequestBody,
  CreateSWUProposalPhaseBody,
  CreateSWUProposalReferenceBody,
  CreateSWUProposalStatus,
  CreateSWUProposalTeamQuestionResponseBody,
  isSWUProposalStatusVisibleToGovernment,
  rankableSWUProposalStatuses,
  SWUProposal,
  SWUProposalEvent,
  SWUProposalHistoryRecord,
  SWUProposalPhase,
  SWUProposalPhaseType,
  SWUProposalReference,
  SWUProposalSlim,
  SWUProposalStatus,
  SWUProposalTeamMember,
  SWUProposalTeamQuestionResponse,
  UpdateEditRequestBody
} from "shared/lib/resources/proposal/sprint-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { User, userToUserSlim, UserType } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { getValidValue, isInvalid, valid } from "shared/lib/validation";

export interface CreateSWUProposalParams
  extends Omit<CreateRequestBody, "attachments" | "status"> {
  attachments: FileRecord[];
  status: CreateSWUProposalStatus;
}

interface UpdateSWUProposalParams
  extends Omit<
    UpdateEditRequestBody,
    "opportunity" | "attachments" | "status"
  > {
  id: Id;
  attachments: FileRecord[];
}

interface SWUProposalStatusRecord {
  id: Id;
  opportunity: Id;
  createdAt: Date;
  createdBy: Id;
  status: SWUProposalStatus;
  note: string;
}

export interface RawSWUProposal
  extends Omit<
    SWUProposal,
    | "createdBy"
    | "updatedBy"
    | "opportunity"
    | "organization"
    | "inceptionPhase"
    | "prototypePhase"
    | "implementationPhase"
    | "references"
    | "attachments"
    | "teamQuestionResponses"
  > {
  createdBy?: Id;
  updatedBy?: Id;
  opportunity: Id;
  organization: Id | null;
  inceptionPhase?: Id;
  prototypePhase?: Id;
  implementationPhase: Id;
  attachments: Id[];
  anonymousProponentName: string;
  teamQuestionResponses: RawSWUProposalTeamQuestionResponse[];
}

export type RawSWUProposalTeamQuestionResponse =
  SWUProposal["teamQuestionResponses"][number] & {
    proposal: Id;
  };

interface RawSWUProposalSlim
  extends Omit<
    SWUProposalSlim,
    "createdBy" | "updatedBy" | "organization" | "opportunity"
  > {
  createdBy?: Id;
  updatedBy?: Id;
  organization: Id;
  opportunity: Id;
}

interface RawHistoryRecord
  extends Omit<SWUProposalHistoryRecord, "id" | "createdBy" | "type"> {
  createdBy: Id | null;
  status?: SWUProposalStatus;
  event?: SWUProposalEvent;
}

interface RawProposalPhase extends Omit<SWUProposalPhase, "members"> {
  id: Id;
}

interface RawProposalTeamMember
  extends Omit<SWUProposalTeamMember, "member" | "idpUsername"> {
  member: Id;
}

async function rawHistoryRecordToHistoryRecord(
  connection: Connection,
  raw: RawHistoryRecord
): Promise<SWUProposalHistoryRecord> {
  const { createdBy: createdById, status, event, ...restOfRaw } = raw;
  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), null)
    : null;

  if (!status && !event) {
    throw new Error("unable to process proposal status record");
  }

  return {
    ...restOfRaw,
    createdBy,
    type: status
      ? adt("status", status as SWUProposalStatus)
      : adt("event", event as SWUProposalEvent)
  };
}

async function rawSWUProposalPhaseToSWUProposalPhase(
  connection: Connection,
  raw: RawProposalPhase
): Promise<SWUProposalPhase> {
  const members = getValidValue(
    await readManyTeamMembersByPhaseId(connection, raw.id),
    undefined
  );
  if (!members) {
    throw new Error("unable to process proposal phase");
  }

  return {
    ...raw,
    members
  };
}

async function rawProposalTeamMemberToProposalTeamMember(
  connection: Connection,
  raw: RawProposalTeamMember
): Promise<SWUProposalTeamMember> {
  const { member: memberId, ...restOfRaw } = raw;
  const user = getValidValue(
    await readOneUser(connection, memberId),
    undefined
  );
  if (!user) {
    throw new Error("unable to process proposal team member");
  }
  return {
    ...restOfRaw,
    idpUsername: user.idpUsername,
    member: userToUserSlim(user)
  };
}

async function rawSWUProposalToSWUProposal(
  connection: Connection,
  session: Session,
  raw: RawSWUProposal
): Promise<SWUProposal> {
  // If the user if gov/admin and the opportunity status is anything before EvaluationCodeChallenge, keep the proposal anonymous
  const { opportunity: opportunityId } = raw;
  const opportunity = getValidValue(
    await readOneSWUOpportunitySlim(connection, opportunityId, session),
    null
  );
  if (!opportunity) {
    throw new Error("unable to process proposal");
  }

  const teamQuestionResponses = raw.teamQuestionResponses.map(
    ({ proposal, ...teamQuestionResponses }) => teamQuestionResponses
  );
  if (
    session?.user.type !== UserType.Vendor &&
    !doesSWUOpportunityStatusAllowGovToViewFullProposal(opportunity.status)
  ) {
    // Return anonymous proposal only
    return {
      id: raw.id,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      status: raw.status,
      submittedAt: raw.submittedAt,
      opportunity,
      teamQuestionResponses,
      questionsScore: raw.questionsScore || undefined,
      anonymousProponentName: raw.anonymousProponentName
    };
  }

  const {
    createdBy: createdById,
    updatedBy: updatedById,
    organization: organizationId,
    attachments: attachmentIds,
    inceptionPhase: inceptionPhaseId,
    prototypePhase: prototypePhaseId,
    implementationPhase: implementationPhaseId,
    ...restOfRaw
  } = raw;
  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), undefined)
    : undefined;
  const updatedBy = updatedById
    ? getValidValue(await readOneUserSlim(connection, updatedById), undefined)
    : undefined;
  const organization = organizationId
    ? getValidValue(
        await readOneOrganizationSlim(
          connection,
          organizationId,
          true,
          session
        ),
        undefined
      )
    : undefined;
  const inceptionPhase = inceptionPhaseId
    ? getValidValue(
        await readOneSWUProposalPhase(connection, inceptionPhaseId),
        undefined
      )
    : undefined;
  const prototypePhase = prototypePhaseId
    ? getValidValue(
        await readOneSWUProposalPhase(connection, prototypePhaseId),
        undefined
      )
    : undefined;
  const implementationPhase = getValidValue(
    await readOneSWUProposalPhase(connection, implementationPhaseId),
    undefined
  );
  const references = getValidValue(
    await readManyProposalReferences(connection, raw.id),
    undefined
  );
  if (!implementationPhase || !references) {
    throw new Error("unable to process proposal");
  }
  const attachments = await Promise.all(
    attachmentIds.map(async (id) => {
      const result = getValidValue(await readOneFileById(connection, id), null);
      if (!result) {
        throw new Error("unable to process proposal attachments");
      }
      return result;
    })
  );

  // Populate team member status for each phase
  for (const member of inceptionPhase?.members || []) {
    member.pending =
      (
        await connection("affiliations")
          .where({ user: member.member.id, organization: organizationId })
          .andWhereNot({ membershipStatus: MembershipStatus.Inactive })
          .select("membershipStatus")
          .first()
      )?.membershipStatus === MembershipStatus.Pending;
  }

  for (const member of prototypePhase?.members || []) {
    member.pending =
      (
        await connection("affiliations")
          .where({ user: member.member.id, organization: organizationId })
          .andWhereNot({ membershipStatus: MembershipStatus.Inactive })
          .select("membershipStatus")
          .first()
      )?.membershipStatus === MembershipStatus.Pending;
  }

  for (const member of implementationPhase.members) {
    member.pending =
      (
        await connection("affiliations")
          .where({ user: member.member.id, organization: organizationId })
          .andWhereNot({ membershipStatus: MembershipStatus.Inactive })
          .select("membershipStatus")
          .first()
      )?.membershipStatus === MembershipStatus.Pending;
  }

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined,
    opportunity,
    organization: organization || undefined,
    attachments,
    inceptionPhase: inceptionPhase ?? undefined,
    prototypePhase: prototypePhase ?? undefined,
    implementationPhase,
    references,
    teamQuestionResponses
  };
}

async function rawSWUProposalSlimToSWUProposalSlim(
  connection: Connection,
  raw: RawSWUProposalSlim,
  session: Session
): Promise<SWUProposalSlim> {
  // If the user if gov/admin and the opportunity status is anything before EvaluationCodeChallenge, keep the proposal anonymous
  const { opportunity: opportunityId } = raw;
  const opportunity = getValidValue(
    await readOneSWUOpportunitySlim(connection, opportunityId, session),
    null
  );
  if (!opportunity) {
    throw new Error("unable to process proposal");
  }
  if (
    session?.user.type !== UserType.Vendor &&
    !doesSWUOpportunityStatusAllowGovToViewFullProposal(opportunity.status)
  ) {
    // Return anonymous proposal only
    return {
      id: raw.id,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      status: raw.status,
      submittedAt: raw.submittedAt,
      questionsScore: raw.questionsScore || undefined,
      anonymousProponentName: raw.anonymousProponentName,
      opportunity
    };
  }
  const {
    createdBy: createdById,
    updatedBy: updatedById,
    organization: organizationId,
    ...restOfRaw
  } = raw;

  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), undefined)
    : undefined;
  const updatedBy = updatedById
    ? getValidValue(await readOneUserSlim(connection, updatedById), undefined)
    : undefined;
  const organization = organizationId
    ? getValidValue(
        await readOneOrganizationSlim(
          connection,
          organizationId,
          true,
          session
        ),
        undefined
      )
    : undefined;

  return {
    ...restOfRaw,
    opportunity,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined,
    organization: organization || undefined
  };
}

async function getSWUProposalSubmittedAt(
  connection: Connection,
  proposal: RawSWUProposal | RawSWUProposalSlim
): Promise<Date | undefined> {
  const conditions = {
    proposal: proposal.id,
    status: SWUProposalStatus.Submitted
  };
  return (
    await connection<{ submittedAt: Date }>("swuProposalStatuses")
      .where(conditions)
      .orderBy("createdAt", "desc")
      .select("createdAt as submittedAt")
      .first()
  )?.submittedAt;
}

async function createSWUProposalAttachments(
  trx: Transaction,
  proposalId: Id,
  attachments: FileRecord[]
) {
  // Delete existing and recreate
  await trx("swuProposalAttachments").where({ proposal: proposalId }).delete();
  for (const attachment of attachments) {
    const [attachmentResult] = await trx("swuProposalAttachments").insert(
      {
        proposal: proposalId,
        file: attachment.id
      },
      "*"
    );
    if (!attachmentResult) {
      throw new Error("Unable to create proposal attachment");
    }
  }
}

export const readManyTeamMembersByPhaseId = tryDb<
  [Id],
  SWUProposalTeamMember[]
>(async (connection, phaseId) => {
  const results = await connection<RawProposalTeamMember>(
    "swuProposalTeamMembers as members"
  )
    .join("users", "users.id", "=", "members.member")
    .where({ "members.phase": phaseId })
    .select<RawProposalTeamMember[]>(
      "members.member",
      "members.scrumMaster",
      "users.capabilities"
    );

  if (!results) {
    throw new Error("unable to read selected phase team members");
  }

  return valid(
    await Promise.all(
      results.map(
        async (raw) =>
          await rawProposalTeamMemberToProposalTeamMember(connection, raw)
      )
    )
  );
});

export const readOneSWUProposalPhase = tryDb<[Id], SWUProposalPhase>(
  async (connection, id) => {
    const result = await connection<RawProposalPhase>("swuProposalPhases")
      .where({ id })
      .first();

    if (!result) {
      throw new Error("unable to read proposal phase");
    }

    return valid(
      await rawSWUProposalPhaseToSWUProposalPhase(connection, result)
    );
  }
);

export const readManySWUProposals = tryDb<
  [AuthenticatedSession, Id],
  SWUProposalSlim[]
>(async (connection, session, id) => {
  const query = generateSWUProposalQuery(connection).where({ opportunity: id });

  // If user is vendor, scope results to those proposals they have authored
  if (session.user.type === UserType.Vendor) {
    query.andWhere({ "proposals.createdBy": session.user.id });
  }

  let results = await query;

  if (!results) {
    throw new Error("unable to read proposals");
  }

  // Read latest status for each proposal, and get submittedDate if it exists
  for (const proposal of results) {
    proposal.submittedAt = await getSWUProposalSubmittedAt(
      connection,
      proposal
    );
  }

  // Filter out any proposals not in UNDER_REVIEW or later status if admin/gov owner
  if (session.user && session.user.type !== UserType.Vendor) {
    results = results.filter((result) =>
      isSWUProposalStatusVisibleToGovernment(
        result.status,
        session.user.type as UserType.Admin | UserType.Government
      )
    );
  }

  // Calculate scores and rankings for proposals (helper function will limit based on role/status)
  await calculateScores(connection, session, id, results);

  return valid(
    await Promise.all(
      results.map(
        async (result) =>
          await rawSWUProposalSlimToSWUProposalSlim(connection, result, session)
      )
    )
  );
});

export const readOwnSWUProposals = tryDb<
  [AuthenticatedSession],
  SWUProposalSlim[]
>(async (connection, session) => {
  const proposals = await generateSWUProposalQuery(connection)
    .where({ "proposals.createdBy": session.user.id })
    .select<RawSWUProposalSlim[]>(
      "proposals.id",
      "statuses.status",
      "proposals.challengeScore",
      "proposals.scenarioScore",
      "proposals.priceScore"
    );

  for (const proposal of proposals) {
    if (
      proposal.status === SWUProposalStatus.Awarded ||
      proposal.status === SWUProposalStatus.NotAwarded
    ) {
      const opportunity = await generateSWUOpportunityQuery(connection)
        .where({ "opportunities.id": proposal.opportunity })
        .select(
          "questionsWeight",
          "codeChallengeWeight",
          "scenarioWeight",
          "priceWeight"
        )
        .first<
          RawSWUOpportunitySlim & {
            questionsWeight: number;
            codeChallengeWeight: number;
            scenarioWeight: number;
            priceWeight: number;
          }
        >();
      const chair = await connection<
        RawSWUEvaluationPanelMember,
        RawSWUEvaluationPanelMember["user"]
      >("swuEvaluationPanelMembers")
        .select("user")
        .where({
          opportunityVersion: opportunity.versionId,
          chair: true
        });
      const opportunityTeamQuestions = getValidValue(
        await readManyTeamQuestions(connection, opportunity.versionId),
        null
      );
      const consensusScores =
        getValidValue(
          await readOneSWUTeamQuestionResponseEvaluation(
            connection,
            proposal.id,
            chair.user,
            session,
            true
          ),
          null
        )?.scores ?? [];
      proposal.questionsScore =
        opportunityTeamQuestions && consensusScores.length
          ? calculateProposalTeamQuestionScore(
              consensusScores,
              opportunityTeamQuestions
            )
          : undefined;

      const includeTotalScore =
        proposal.questionsScore !== undefined &&
        proposal.challengeScore !== null &&
        proposal.scenarioScore !== null &&
        proposal.priceScore !== null;
      proposal.totalScore = includeTotalScore
        ? (opportunity.questionsWeight * (proposal.questionsScore || 0)) / 100 +
          (opportunity.codeChallengeWeight * (proposal.challengeScore || 0)) /
            100 +
          (opportunity.scenarioWeight * (proposal.scenarioScore || 0)) / 100 +
          (opportunity.priceWeight * (proposal.priceScore || 0)) / 100
        : undefined;
    } else {
      delete proposal.challengeScore;
      delete proposal.scenarioScore;
      delete proposal.priceScore;
    }
  }

  return valid(
    await Promise.all(
      proposals.map(
        async (result) =>
          await rawSWUProposalSlimToSWUProposalSlim(connection, result, session)
      )
    )
  );
});

/**
 * Should a request come from an organization Owner or organization Admin,
 * this modifies the CWU Proposal query to read the proposals for the
 * organizations that the requester has permission to access.
 */
export const readOrgSWUProposals = tryDb<
  [AuthenticatedSession],
  SWUProposalSlim[]
>(async (connection, session) => {
  const orgIds = await getOrgIdsForOwnerOrAdmin(connection, session.user.id);
  const query = generateSWUProposalQuery(connection);

  if (orgIds) {
    query.where("organization", "IN", orgIds).andWhereNot({
      "proposals.createdBy": session.user.id
    });
  }

  const results = await query;

  if (!results) {
    throw new Error("unable to read SWU org proposals");
  }

  return valid(
    await Promise.all(
      results.map(
        async (result) =>
          await rawSWUProposalSlimToSWUProposalSlim(connection, result, session)
      )
    )
  );
});

const readOneSWUProposalWithIdsQuery = (
  query: (
    connection: Connection,
    ...ids: Id[]
  ) => Promise<Pick<RawSWUProposal, "id"> | undefined>
) =>
  tryDb<[Session, ...Id[]], Id | null>(async (connection, session, ...ids) => {
    if (!session) {
      return valid(null);
    }

    const result = (await query(connection, session.user.id, ...ids))?.id;

    return valid(result ? result : null);
  });

export const readOneSWUProposalByOpportunityAndAuthor =
  readOneSWUProposalWithIdsQuery(
    async (connection, userId, opportunityId) =>
      await connection<RawSWUProposal, { id: Id }>("swuProposals")
        .where({ opportunity: opportunityId, createdBy: userId })
        .select("id")
        .first()
  );

export const readOneSWUProposalByOpportunityAndOrgAuthor =
  readOneSWUProposalWithIdsQuery(
    async (connection, userId, opportunityId, organizationId) =>
      await connection<RawSWUProposal, { id: Id }>("swuProposals")
        .where({ opportunity: opportunityId, organization: organizationId })
        .andWhereNot({ createdBy: userId })
        .select("id")
        .first()
  );

async function isSWUProposalAuthor(
  connection: Connection,
  user: User,
  id: Id
): Promise<boolean> {
  try {
    const result = await connection<RawSWUProposal>("swuProposals")
      .select("*")
      .where({ id, createdBy: user.id });
    return !!result && result.length > 0;
  } catch (exception) {
    return false;
  }
}

export async function isSWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
  connection: Connection,
  user: User,
  proposalId: Id,
  orgId: Id | null
) {
  return (
    (await isSWUProposalAuthor(connection, user, proposalId)) ||
    (!!orgId && (await isUserOwnerOrAdminOfOrg(connection, user, orgId)))
  );
}

export const readManyProposalReferences = tryDb<[Id], SWUProposalReference[]>(
  async (connection, proposalId) => {
    const results = await connection<SWUProposalReference>(
      "swuProposalReferences"
    )
      .where("proposal", proposalId)
      .select("name", "company", "phone", "email", "order");

    if (!results) {
      throw new Error("unable to read proposal references");
    }

    return valid(results);
  }
);

export const readManyProposalTeamQuestionResponses = tryDb<
  [Id, boolean?],
  RawSWUProposalTeamQuestionResponse[]
>(async (connection, proposalId, includeScores = false) => {
  const query = connection<RawSWUProposalTeamQuestionResponse>(
    "swuTeamQuestionResponses"
  ).where({ proposal: proposalId });

  if (includeScores) {
    query.select<RawSWUProposalTeamQuestionResponse[]>("*");
  } else {
    query.select<RawSWUProposalTeamQuestionResponse[]>("order", "response");
  }
  const results = await query;
  if (!results) {
    throw new Error("unable to read proposal team question responses");
  }

  return valid(results);
});

export const readOneSWUProposalSlim = tryDb<
  [Id, AuthenticatedSession],
  SWUProposalSlim | null
>(async (connection, id, session) => {
  const result = await generateSWUProposalQuery(connection)
    .where({ "proposals.id": id })
    .first();

  if (result) {
    // Fetch submittedAt date if applicable
    result.submittedAt = await getSWUProposalSubmittedAt(connection, result);

    // Fetch team questions (scores only included if admin/owner)
    const canReadScores = await readSWUProposalScore(
      connection,
      session,
      result.opportunity,
      result.id,
      result.status,
      result.organization
    );

    // Check for permissions on viewing scores and rank
    if (canReadScores) {
      // Set scores and rankings
      await calculateScores(connection, session, result.opportunity, [result]);
    }
  }

  return valid(
    result
      ? await rawSWUProposalSlimToSWUProposalSlim(connection, result, session)
      : null
  );
});

export const readOneSWUProposal = tryDb<
  [Id, AuthenticatedSession],
  SWUProposal | null
>(async (connection, id, session) => {
  const result = await generateSWUProposalQuery(connection)
    .where({ "proposals.id": id })
    .first<RawSWUProposal>();

  if (result) {
    // Fetch attachments
    result.attachments = (
      await connection<{ file: Id }>("swuProposalAttachments")
        .where("proposal", result.id)
        .select("file")
    ).map((row) => row.file);

    // Fetch history for admins/proposal owners
    if (
      await readSWUProposalHistory(
        connection,
        session,
        result.opportunity,
        result.id,
        result.organization
      )
    ) {
      const rawProposalStatuses = await connection<RawHistoryRecord>(
        "swuProposalStatuses"
      )
        .where("proposal", result.id)
        .orderBy("createdAt", "desc")
        .select("createdAt", "note", "createdBy", "status", "event");
      result.history = await Promise.all(
        rawProposalStatuses.map(
          async (raw) => await rawHistoryRecordToHistoryRecord(connection, raw)
        )
      );
    }

    // Fetch submittedAt date if applicable
    result.submittedAt = await getSWUProposalSubmittedAt(connection, result);

    // Fetch team questions (scores only included if admin/owner)
    const canReadScores = await readSWUProposalScore(
      connection,
      session,
      result.opportunity,
      result.id,
      result.status,
      result.organization
    );
    result.teamQuestionResponses =
      getValidValue(
        await readManyProposalTeamQuestionResponses(
          connection,
          result.id,
          canReadScores && session.user.type !== UserType.Vendor
        ),
        []
      ) ?? [];

    // Check for permissions on viewing scores and rank
    if (canReadScores) {
      // Set scores and rankings
      await calculateScores(connection, session, result.opportunity, [result]);
    }

    // Retrieve phases for proposal
    const inceptionConditions = {
      proposal: result.id,
      phase: SWUProposalPhaseType.Inception
    };
    result.inceptionPhase = (
      await connection<{ id: Id }>("swuProposalPhases")
        .where(inceptionConditions)
        .select("id")
        .first()
    )?.id;

    const prototypeConditions = {
      proposal: result.id,
      phase: SWUProposalPhaseType.Prototype
    };
    result.prototypePhase = (
      await connection<{ id: Id }>("swuProposalPhases")
        .where(prototypeConditions)
        .select("id")
        .first()
    )?.id;

    const implementationConditions = {
      proposal: result.id,
      phase: SWUProposalPhaseType.Implementation
    };
    const implementationPhaseId = (
      await connection<{ id: Id }>("swuProposalPhases")
        .where(implementationConditions)
        .select("id")
        .first()
    )?.id;

    if (!implementationPhaseId) {
      throw new Error("unable to retrieve phase for proposal");
    }
    result.implementationPhase = implementationPhaseId;
  }

  return valid(
    result
      ? await rawSWUProposalToSWUProposal(connection, session, result)
      : null
  );
});

const createSWUProposalPhase = tryDb<
  [Id, CreateSWUProposalPhaseBody, SWUProposalPhaseType, AuthenticatedSession],
  void
>(async (connection, proposalId, phase, type, _session) => {
  const { members, proposedCost } = phase;
  await connection.transaction(async (trx) => {
    const [phaseRecord] = await connection<
      RawProposalPhase & { id: Id; proposal: Id; phase: SWUProposalPhaseType }
    >("swuProposalPhases")
      .transacting(trx)
      .insert(
        {
          id: generateUuid(),
          proposedCost,
          phase: type,
          proposal: proposalId
        },
        "*"
      );

    if (!phaseRecord) {
      throw new Error("unable to create proposal phase");
    }

    for (const member of members) {
      await connection<RawProposalTeamMember & { phase: Id }>(
        "swuProposalTeamMembers"
      )
        .transacting(trx)
        .insert(
          {
            ...member,
            phase: phaseRecord.id
          },
          "*"
        );
    }
    return phaseRecord.id;
  });

  // We don't read and return the new phases here as it will be done when the full proposal is read (performance)
  return valid(undefined);
});

export const createSWUProposal = tryDb<
  [CreateSWUProposalParams, AuthenticatedSession],
  SWUProposal
>(async (connection, proposal, session) => {
  const now = new Date();
  const proposalId = await connection.transaction(async (trx) => {
    const {
      attachments,
      references,
      teamQuestionResponses,
      status,
      inceptionPhase,
      prototypePhase,
      implementationPhase,
      ...restOfProposal
    } = proposal;

    // Create root record for proposal
    const [proposalRootRecord] = await connection<RawSWUProposal>(
      "swuProposals"
    )
      .transacting(trx)
      .insert(
        {
          ...restOfProposal,
          id: generateUuid(),
          createdAt: now,
          createdBy: session.user.id,
          updatedAt: now,
          updatedBy: session.user.id
        },
        "*"
      );

    if (!proposalRootRecord) {
      throw new Error("unable to create proposal");
    }

    // Create a proposal status record
    const [proposalStatusRecord] = await connection<
      SWUProposalStatusRecord & { proposal: Id }
    >("swuProposalStatuses")
      .transacting(trx)
      .insert(
        {
          id: generateUuid(),
          proposal: proposalRootRecord.id,
          status,
          createdAt: now,
          createdBy: session.user.id,
          note: ""
        },
        "*"
      );

    if (!proposalStatusRecord) {
      throw new Error("unable to create proposal status");
    }

    // Create attachments
    await createSWUProposalAttachments(trx, proposalRootRecord.id, attachments);

    // Create phases
    if (inceptionPhase) {
      await createSWUProposalPhase(
        trx,
        proposalRootRecord.id,
        inceptionPhase,
        SWUProposalPhaseType.Inception,
        session
      );
    }
    if (prototypePhase) {
      await createSWUProposalPhase(
        trx,
        proposalRootRecord.id,
        prototypePhase,
        SWUProposalPhaseType.Prototype,
        session
      );
    }
    await createSWUProposalPhase(
      trx,
      proposalRootRecord.id,
      implementationPhase,
      SWUProposalPhaseType.Implementation,
      session
    );

    // Create team question responses
    for (const teamQuestionResponse of teamQuestionResponses) {
      await connection<SWUProposalTeamQuestionResponse & { proposal: Id }>(
        "swuTeamQuestionResponses"
      )
        .transacting(trx)
        .insert({
          ...teamQuestionResponse,
          proposal: proposalRootRecord.id
        });
    }

    // Create references
    for (const reference of references) {
      await connection<SWUProposalReference & { proposal: Id }>(
        "swuProposalReferences"
      )
        .transacting(trx)
        .insert({
          ...reference,
          proposal: proposalRootRecord.id
        });
    }

    return proposalRootRecord.id;
  });

  const dbResult = await readOneSWUProposal(connection, proposalId, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to create proposal");
  }
  return valid(dbResult.value);
});

export const updateSWUProposal = tryDb<
  [UpdateSWUProposalParams, AuthenticatedSession],
  SWUProposal
>(async (connection, proposal, session) => {
  const now = new Date();
  const {
    id,
    attachments,
    inceptionPhase,
    prototypePhase,
    implementationPhase,
    references,
    teamQuestionResponses,
    organization
  } = proposal;
  return valid(
    await connection.transaction(async (trx) => {
      // Update organization/timestamps
      const [result] = await connection<RawSWUProposal>("swuProposals")
        .transacting(trx)
        .where({ id })
        .update(
          {
            organization: organization || null,
            updatedAt: now,
            updatedBy: session.user.id
          },
          "*"
        );

      if (!result) {
        throw new Error("unable to update proposal");
      }

      // Update attachments
      await createSWUProposalAttachments(trx, result.id, attachments || []);

      // Update proposal phases
      await updateSWUProposalPhase(
        trx,
        result.id,
        SWUProposalPhaseType.Inception,
        inceptionPhase
      );
      await updateSWUProposalPhase(
        trx,
        result.id,
        SWUProposalPhaseType.Prototype,
        prototypePhase
      );
      await updateSWUProposalPhase(
        trx,
        result.id,
        SWUProposalPhaseType.Implementation,
        implementationPhase
      );

      // Update references
      await updateSWUProposalReferences(trx, result.id, references);

      // Update teamQuestionResponses
      await updateSWUProposalTeamQuestionResponses(
        trx,
        result.id,
        teamQuestionResponses
      );

      const dbResult = await readOneSWUProposal(trx, result.id, session);
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update proposal");
      }
      return dbResult.value;
    })
  );
});

async function updateSWUProposalPhase(
  connection: Transaction,
  proposalId: Id,
  type: SWUProposalPhaseType,
  phase?: CreateSWUProposalPhaseBody
): Promise<void> {
  const conditions = { proposal: proposalId, phase: type };
  // If no phase was passed in, remove any existing phase of that type (members will be handled by database cascade)
  if (!phase) {
    await connection<RawProposalPhase>("swuProposalPhases")
      .where(conditions)
      .delete("*");
    return;
  }
  const existingPhaseId = (
    await connection<{ id: Id }>("swuProposalPhases")
      .where(conditions)
      .select("id")
      .first()
  )?.id;

  let result: RawProposalPhase;
  const { members, ...restOfPhase } = phase;

  // If phase already exists, update, otherwise, create
  if (existingPhaseId) {
    // Remove existing team member records (we'll recreate)
    await connection("swuProposalTeamMembers")
      .where({ phase: existingPhaseId })
      .delete();

    [result] = await connection<RawProposalPhase>("swuProposalPhases")
      .where({ id: existingPhaseId })
      .update(
        {
          ...restOfPhase
        },
        "*"
      );
  } else {
    [result] = await connection<RawProposalPhase>("swuProposalPhases").insert(
      {
        ...restOfPhase,
        id: generateUuid()
      },
      "*"
    );
  }

  // Create/recreate team member records for this phase
  for (const member of members) {
    await connection<RawProposalTeamMember & { phase: Id }>(
      "swuProposalTeamMembers"
    ).insert({
      ...member,
      phase: result.id
    });
  }
}

async function updateSWUProposalReferences(
  connection: Transaction,
  proposalId: Id,
  references: CreateSWUProposalReferenceBody[]
): Promise<void> {
  // Remove existing and recreate
  await connection("swuProposalReferences")
    .where({ proposal: proposalId })
    .delete();

  for (const reference of references) {
    await connection<SWUProposalReference & { proposal: Id }>(
      "swuProposalReferences"
    ).insert({
      ...reference,
      proposal: proposalId
    });
  }
}

async function updateSWUProposalTeamQuestionResponses(
  connection: Transaction,
  proposalId: Id,
  teamQuestionResponses: CreateSWUProposalTeamQuestionResponseBody[]
): Promise<void> {
  // Remove existing and recreate
  await connection("swuTeamQuestionResponses")
    .where({ proposal: proposalId })
    .delete();

  for (const response of teamQuestionResponses) {
    await connection<SWUProposalTeamQuestionResponse & { proposal: Id }>(
      "swuTeamQuestionResponses"
    ).insert({
      ...response,
      proposal: proposalId
    });
  }
}

/**
 * Internal function that updates an SWU proposal status.
 */
async function _updateSWUProposalStatusInternal(
  trx: Transaction,
  proposalId: Id,
  status: SWUProposalStatus,
  note: string,
  session: AuthenticatedSession
): Promise<SWUProposal> {
  const now = new Date();

  const [statusRecord] = await trx<RawHistoryRecord & { id: Id; proposal: Id }>(
    "swuProposalStatuses"
  ).insert(
    {
      id: generateUuid(),
      proposal: proposalId,
      createdAt: now,
      createdBy: session.user.id,
      status,
      note
    },
    "*"
  );

  // Update proposal root record
  await trx<RawSWUProposal>("swuProposals").where({ id: proposalId }).update(
    {
      updatedAt: now,
      updatedBy: session.user.id
    },
    "*"
  );

  if (!statusRecord) {
    throw new Error("unable to update proposal");
  }

  const dbResult = await readOneSWUProposal(
    trx,
    statusRecord.proposal,
    session
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update proposal");
  }

  return dbResult.value;
}

export const updateSWUProposalStatus = tryDb<
  [Id, SWUProposalStatus, string, AuthenticatedSession],
  SWUProposal
>(async (connection, proposalId, status, note, session) => {
  return valid(
    await connection.transaction(async (trx) => {
      return await _updateSWUProposalStatusInternal(
        trx,
        proposalId,
        status,
        note,
        session
      );
    })
  );
});

/**
 * Disqualifies an SWU proposal and updates the opportunity processing status in a single transaction.
 * This ensures both operations succeed or fail together.
 */
export const disqualifySWUProposalAndUpdateOpportunity = tryDb<
  [Id, string, AuthenticatedSession],
  SWUProposal
>(async (connection, proposalId, disqualificationReason, session) => {
  return valid(
    await connection.transaction(async (trx) => {
      // Update proposal status to disqualified
      const updatedProposal = await _updateSWUProposalStatusInternal(
        trx,
        proposalId,
        SWUProposalStatus.Disqualified,
        disqualificationReason,
        session
      );

      // Check if opportunity should be moved to "Processing" status after disqualification
      const opportunityId = updatedProposal.opportunity.id;
      await checkAndUpdateSWUOpportunityProcessingStatus(
        trx,
        opportunityId,
        session
      );

      return updatedProposal;
    })
  );
});

export const updateSWUProposalCodeChallengeScore = tryDb<
  [Id, number, AuthenticatedSession],
  SWUProposal
>(async (connection, proposalId, score, session) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      // Update updatedAt/By stamp and score on proposal root record
      const numberUpdated = await connection<{
        challengeScore: number;
        updatedAt: Date;
        updatedBy: Id;
      }>("swuProposals")
        .transacting(trx)
        .where("id", proposalId)
        .update({
          challengeScore: score,
          updatedAt: now,
          updatedBy: session.user.id
        });

      if (!numberUpdated) {
        throw new Error("unable to update code challenge score");
      }

      // Create a history record for the score entry
      const [result] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("swuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: now,
            createdBy: session.user.id,
            event: SWUProposalEvent.ChallengeScoreEntered,
            note: `A code challenge score of "${score}" was entered.`
          },
          "*"
        );

      if (!result) {
        throw new Error("unable to update code challenge score");
      }

      // Change the status to EvaluatedCodeChallenge
      const [statusRecord] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("swuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: new Date(),
            createdBy: session.user.id,
            status: SWUProposalStatus.EvaluatedCodeChallenge,
            note: ""
          },
          "*"
        );

      if (!statusRecord) {
        throw new Error("unable to update code challenge score");
      }

      const dbResult = await readOneSWUProposal(trx, result.proposal, session);
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update proposal");
      }

      return dbResult.value;
    })
  );
});

export const updateSWUProposalScenarioAndPriceScores = tryDb<
  [Id, number, AuthenticatedSession],
  SWUProposal
>(async (connection, proposalId, scenarioScore, session) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      // Calculate price score prior to updating
      const priceScore = await calculatePriceScore(trx, proposalId);

      // Update updatedAt/By stamp and score on proposal root record
      const numberUpdated = await connection<{
        scenarioScore: number;
        priceScore: number;
        updatedAt: Date;
        updatedBy: Id;
      }>("swuProposals")
        .transacting(trx)
        .where("id", proposalId)
        .update({
          scenarioScore,
          priceScore,
          updatedAt: now,
          updatedBy: session.user.id
        });

      if (!numberUpdated) {
        throw new Error("unable to update proposal scores");
      }

      // Create a history record for the team scenario score entry
      const [scenarioScoreResult] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("swuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: now,
            createdBy: session.user.id,
            event: SWUProposalEvent.ScenarioScoreEntered,
            note: `A team scenario score of "${scenarioScore}" was entered.`
          },
          "*"
        );

      if (!scenarioScoreResult) {
        throw new Error("unable to update team scenario score");
      }

      // Create a history record for the price score entry
      const [priceScoreResult] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("swuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: new Date(), // New date so it appears after the previous updates
            event: SWUProposalEvent.PriceScoreEntered,
            note: `A price score of "${priceScore}" was calculated.`
          },
          "*"
        );

      if (!priceScoreResult) {
        throw new Error("unable to update team scenario score");
      }

      // Create a status record now that this proposal is fully evaluated
      const [evalStatusResult] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("swuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: new Date(), // New date so it appears after the previous updates
            createdBy: session.user.id,
            status: SWUProposalStatus.EvaluatedTeamScenario,
            note: ""
          },
          "*"
        );

      if (!evalStatusResult) {
        throw new Error("unable to update proposal");
      }

      const dbResult = await readOneSWUProposal(trx, proposalId, session);
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update proposal scores");
      }

      // updateSWUProposalScenarioAndPriceScores was invoked -
      // this proposal is now fully evaluated, check if we need to change the opportunity "Processing" status
      const opportunityId = dbResult.value.opportunity.id;
      await checkAndUpdateSWUOpportunityProcessingStatus(
        trx,
        opportunityId,
        session
      );

      return dbResult.value;
    })
  );
});

interface ProposalBidRecord {
  id: Id;
  bid: string; // Knex/Postgres returns results of aggregrate queries as strings instead of numbers for some reason, so we parse the result ourselves later.
}

async function calculatePriceScore(
  connection: Transaction,
  proposalId: Id
): Promise<number> {
  // Get the price score weight from the opportunity corresponding to this proposal
  const priceScoreWeight = (
    await connection<{ priceWeight: number }>("swuProposals as proposals")
      .where("proposals.id", proposalId)
      .join(
        "swuOpportunities as opportunities",
        "proposals.opportunity",
        "=",
        "opportunities.id"
      )
      .join("swuOpportunityVersions as versions", function () {
        this.on("versions.opportunity", "=", "opportunities.id").andOn(
          "versions.createdAt",
          "=",
          connection.raw(
            '(select max("createdAt") from "swuOpportunityVersions" as versions2 where \
            versions2.opportunity = opportunities.id)'
          )
        );
      })
      .select<{ priceWeight: number }>("versions.priceWeight")
      .first()
  )?.priceWeight;

  if (!priceScoreWeight) {
    throw new Error("unable to calculate price score");
  }

  // Select summed bids for each proposal in the same opportunity, order lowest to highest
  // Restrict to proposals that are in UnderReview/Evaluated
  const bids = await connection<ProposalBidRecord>("swuProposals as proposals")
    // Get latest status, so we can check to make sure proposal is under review/evaluated
    .join("swuProposalStatuses as statuses", function () {
      this.on("proposals.id", "=", "statuses.proposal")
        .andOnNotNull("statuses.status")
        .andOn(
          "statuses.createdAt",
          "=",
          connection.raw(
            '(select max("createdAt") from "swuProposalStatuses" as statuses2 where \
            statuses2.proposal = proposals.id and statuses2.status is not null)'
          )
        );
    })
    .join("swuProposalPhases as phases", "proposals.id", "=", "phases.proposal")
    .whereIn("proposals.opportunity", function () {
      this.where({ id: proposalId }).select("opportunity").from("swuProposals");
    })
    .whereIn("statuses.status", [
      SWUProposalStatus.UnderReviewTeamScenario,
      SWUProposalStatus.EvaluatedTeamScenario
    ])
    // Join to phases, sum the proposed costs, group by proposal, sort lowest to highest
    .sum("phases.proposedCost as bid")
    .groupBy("proposals.id")
    .select<ProposalBidRecord[]>("proposals.id")
    .orderBy("bid", "asc");

  if (!bids || !bids.length) {
    throw new Error("unable to calculate price scores");
  }

  const lowestBid = bids[0].bid;
  const proposal = bids.find((b) => b.id === proposalId);
  if (!proposal) {
    throw new Error("unable to calculate price score");
  }

  return (parseFloat(lowestBid) / parseFloat(proposal.bid)) * 100;
}

export const awardSWUProposal = tryDb<
  [Id, string, AuthenticatedSession],
  SWUProposal
>(async (connection, proposalId, note, session) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      // Update status for awarded proposal first
      await connection<RawHistoryRecord & { id: Id; proposal: Id }>(
        "swuProposalStatuses"
      )
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: now,
            createdBy: session.user.id,
            status: SWUProposalStatus.Awarded,
            note
          },
          "*"
        );

      // Update proposal root record
      const [proposalRecord] = await connection<RawSWUProposal>("swuProposals")
        .where({ id: proposalId })
        .update(
          {
            updatedAt: now,
            updatedBy: session.user.id
          },
          "*"
        );

      // Update all other proposals on opportunity to Not Awarded where their status is Evaluated/Awarded
      const otherProposalIds =
        (
          await connection<{ id: Id }>("swuProposals")
            .transacting(trx)
            .andWhere("opportunity", proposalRecord.opportunity)
            .andWhereNot({ id: proposalId })
            .select("id")
        )?.map((result) => result.id) || [];

      for (const id of otherProposalIds) {
        // Get latest status for proposal and check equal to Evaluated/Awarded
        const currentStatus = (
          await connection<{ status: SWUProposalStatus }>("swuProposalStatuses")
            .whereNotNull("status")
            .andWhere("proposal", id)
            .select("status")
            .orderBy("createdAt", "desc")
            .first()
        )?.status;

        if (
          currentStatus &&
          ![
            SWUProposalStatus.Disqualified,
            SWUProposalStatus.Draft,
            SWUProposalStatus.NotAwarded,
            SWUProposalStatus.Submitted,
            SWUProposalStatus.Withdrawn
          ].includes(currentStatus)
        ) {
          await connection<RawHistoryRecord & { id: Id; proposal: Id }>(
            "swuProposalStatuses"
          )
            .transacting(trx)
            .insert({
              id: generateUuid(),
              proposal: id,
              createdAt: now,
              createdBy: session.user.id,
              status: SWUProposalStatus.NotAwarded,
              note: ""
            });
        }

        await connection<RawSWUProposal>("swuProposals")
          .where({ id: id })
          .update(
            {
              updatedAt: now,
              updatedBy: session.user.id
            },
            "*"
          );
      }

      // Update opportunity
      await updateSWUOpportunityStatus(
        trx,
        proposalRecord.opportunity,
        SWUOpportunityStatus.Awarded,
        "",
        session
      );

      const dbResult = await readOneSWUProposal(
        trx,
        proposalRecord.id,
        session
      );
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update proposal");
      }

      return dbResult.value;
    })
  );
});

export const deleteSWUProposal = tryDb<[Id, AuthenticatedSession], SWUProposal>(
  async (connection, id, session) => {
    // Read the proposal first, so we can respond with it after deleting
    const proposal = getValidValue(
      await readOneSWUProposal(connection, id, session),
      undefined
    );
    if (!proposal) {
      throw new Error("unable to delete proposal");
    }

    // Delete root record
    const [result] = await connection<RawSWUProposal>("swuProposals")
      .where({ id })
      .delete("*");

    if (!result) {
      throw new Error("unable to delete proposal");
    }
    return valid(proposal);
  }
);

export const readSubmittedSWUProposalCount = tryDb<[Id], number>(
  async (connection, opportunity) => {
    // Retrieve the opportunity, since we need to see if any proposals were withdrawn after proposal deadline
    // and include them in the count.
    const [swuOpportunity] = await generateSWUOpportunityQuery(
      connection
    ).where({ "opportunities.id": opportunity });

    if (!swuOpportunity) {
      return valid(0);
    }

    const results = await generateSWUProposalQuery(connection)
      .where({
        "proposals.opportunity": opportunity
      })
      .andWhere((q1) =>
        q1
          .whereNotIn("statuses.status", [
            SWUProposalStatus.Draft,
            SWUProposalStatus.Withdrawn
          ])
          .orWhere((q) =>
            q
              .where("statuses.status", "=", SWUProposalStatus.Withdrawn)
              .andWhere(
                "statuses.createdAt",
                ">=",
                swuOpportunity.proposalDeadline
              )
          )
      );

    return valid(results?.length || 0);
  }
);

export const readOneSWUAwardedProposal = tryDb<
  [Id, Session],
  SWUProposalSlim | null
>(async (connection, opportunity, session) => {
  const result = await generateSWUProposalQuery(connection)
    .where({
      "proposals.opportunity": opportunity,
      "statuses.status": SWUProposalStatus.Awarded
    })
    .first();

  if (
    result &&
    isSignedIn(session) &&
    (await readSWUProposalScore(
      connection,
      session,
      opportunity,
      result.id,
      result.status,
      result.organization
    ))
  ) {
    await calculateScores(connection, session, opportunity, [result]);
  }

  return result
    ? valid(
        await rawSWUProposalSlimToSWUProposalSlim(connection, result, session)
      )
    : valid(null);
});

export const readManySWUProposalAuthors = tryDb<[Id], User[]>(
  async (connection, opportunity) => {
    const result = await connection<RawUser>("users")
      .join("swuProposals as proposals", "proposals.createdBy", "=", "users.id")
      .where({ "proposals.opportunity": opportunity })
      .select<RawUser[]>("users.*");

    if (!result) {
      throw new Error("unable to read proposal users");
    }

    return valid(
      await Promise.all(
        result.map(async (raw) => await rawUserToUser(connection, raw))
      )
    );
  }
);

function generateSWUProposalQuery(connection: Connection) {
  const query = connection("swuProposals as proposals")
    .join("swuProposalStatuses as statuses", function () {
      this.on("proposals.id", "=", "statuses.proposal")
        .andOnNotNull("statuses.status")
        .andOn(
          "statuses.createdAt",
          "=",
          connection.raw(
            '(select max("createdAt") from "swuProposalStatuses" as statuses2 where \
            statuses2.proposal = proposals.id and statuses2.status is not null)'
          )
        );
    })
    .select<RawSWUProposalSlim[]>(
      "proposals.id",
      "proposals.createdBy",
      "proposals.createdAt",
      connection.raw(
        '(CASE WHEN proposals."updatedAt" > statuses."createdAt" THEN proposals."updatedAt" ELSE statuses."createdAt" END) AS "updatedAt" '
      ),
      connection.raw(
        '(CASE WHEN proposals."updatedAt" > statuses."createdAt" THEN proposals."updatedBy" ELSE statuses."createdBy" END) AS "updatedBy" '
      ),
      "proposals.opportunity",
      "proposals.organization",
      "proposals.anonymousProponentName",
      "statuses.status",
      "statuses.createdAt"
    );

  return query;
}

interface ProposalScoring {
  id: Id;
  status: SWUProposalStatus;
  questionsScore: number | null;
  challengeScore: number | null;
  scenarioScore: number | null;
  priceScore: number | null;
  totalScore?: number;
  rank?: number;
}

async function calculateScores<T extends RawSWUProposal | RawSWUProposalSlim>(
  connection: Connection,
  session: AuthenticatedSession,
  opportunityId: Id,
  proposals: T[]
): Promise<T[]> {
  // Manually query opportunity and team questions
  const opportunity = await generateSWUOpportunityQuery(connection, true)
    .where({ "opportunities.id": opportunityId })
    .first<RawSWUOpportunity>();
  const opportunityTeamQuestions =
    opportunity &&
    getValidValue(
      await readManyTeamQuestions(connection, opportunity.versionId ?? ""),
      null
    );
  const chair = await connection<
    RawSWUEvaluationPanelMember,
    RawSWUEvaluationPanelMember["user"]
  >("swuEvaluationPanelMembers")
    .select("user")
    .where({
      opportunityVersion: opportunity.versionId,
      chair: true
    })
    .first();

  if (!opportunity || !opportunityTeamQuestions || !chair) {
    return proposals;
  }

  const proposalScorings = await generateSWUProposalQuery(connection)
    .where({ "proposals.opportunity": opportunityId })
    .select<ProposalScoring[]>(
      "proposals.id",
      "statuses.status",
      "proposals.challengeScore",
      "proposals.scenarioScore",
      "proposals.priceScore"
    );
  for (const scoring of proposalScorings) {
    const consensusScores =
      getValidValue(
        await readOneSWUTeamQuestionResponseEvaluation(
          connection,
          scoring.id,
          chair.user,
          session,
          true
        ),
        undefined
      )?.scores ?? [];

    scoring.questionsScore = calculateProposalTeamQuestionScore(
      consensusScores,
      opportunityTeamQuestions
    );
    scoring.totalScore =
      (opportunity.questionsWeight * (scoring.questionsScore || 0)) / 100 +
      (opportunity.codeChallengeWeight * (scoring.challengeScore || 0)) / 100 +
      (opportunity.scenarioWeight * (scoring.scenarioScore || 0)) / 100 +
      (opportunity.priceWeight * (scoring.priceScore || 0)) / 100;
  }

  // Only calculate rankings for proposals in rankable status
  const rankableProposalScorings = proposalScorings.filter((p) =>
    rankableSWUProposalStatuses.includes(p.status)
  );
  rankableProposalScorings.sort(
    (a, b) => (b.totalScore || 0) - (a.totalScore || 0)
  );
  rankableProposalScorings.forEach((v) => {
    v.rank =
      rankableProposalScorings
        .map((s) => s.totalScore)
        .indexOf(v.totalScore || 0) + 1;
  });

  proposals.forEach((proposal) => {
    // Vendors only see scores if in Awarded/Not Awarded state.
    const proposalScoring = proposalScorings.find((s) => s.id === proposal.id);
    if (proposalScoring) {
      const includeTotalScore =
        proposalScoring.questionsScore === null &&
        proposalScoring.challengeScore === null &&
        proposalScoring.scenarioScore === null &&
        proposalScoring.priceScore === null;
      if (
        session.user.type !== UserType.Vendor ||
        proposal.status === SWUProposalStatus.Awarded ||
        proposal.status === SWUProposalStatus.NotAwarded
      ) {
        proposal.questionsScore = proposalScoring.questionsScore || undefined;
        proposal.challengeScore = proposalScoring.challengeScore || undefined;
        proposal.scenarioScore = proposalScoring.scenarioScore || undefined;
        proposal.priceScore = proposalScoring.priceScore || undefined;
        proposal.rank = proposalScoring.rank || undefined;
        proposal.totalScore = includeTotalScore
          ? undefined
          : proposalScoring.totalScore || undefined;
      }
    }
  });

  return proposals;
}

/**
 * This function checks whether the user can read the file
 * via its association to BOTH the SWU opportunity or proposal.
 */
export async function hasSWUAttachmentPermission(
  connection: Connection,
  session: Session | null,
  id: string
): Promise<boolean> {
  // If file is an attachment on a publicly viewable opportunity, allow
  const query = generateSWUOpportunityQuery(connection)
    .join(
      "swuOpportunityAttachments as attachments",
      "versions.id",
      "=",
      "attachments.opportunityVersion"
    )
    .whereIn(
      "statuses.status",
      publicOpportunityStatuses as SWUOpportunityStatus[]
    )
    .andWhere({ "attachments.file": id })
    .clearSelect()
    .select("attachments.*");

  // If the opportunity was created by the current user, allow for private opportunity statuses as well
  if (session) {
    query.orWhere(function () {
      this.whereIn(
        "statuses.status",
        privateOpportunityStatuses as SWUOpportunityStatus[]
      ).andWhere({
        "opportunities.createdBy": session.user.id,
        "attachments.file": id
      });
    });
  }
  const results = await query;
  if (results.length > 0) {
    return true;
  }

  // If file is an attachment on a proposal, and requesting user has access to the proposal, allow
  if (session) {
    const rawProposals = await connection(
      "swuProposalAttachments as attachments"
    )
      .join(
        "swuProposals as proposals",
        "proposals.id",
        "=",
        "attachments.proposal"
      )
      .where({ "attachments.file": id })
      .select<RawSWUProposal[]>("proposals.*");

    for (const rawProposal of rawProposals) {
      const proposal = await rawSWUProposalToSWUProposal(
        connection,
        session,
        rawProposal
      );
      if (await hasReadPermissionSWUProposal(connection, session, proposal)) {
        return true;
      }
    }
  }
  return false;
}

export const readOneSWUProposalAuthor = tryDb<[Id], User | null>(
  async (connection, id) => {
    const authorId =
      (
        await connection<{ createdBy: Id }>("swuProposals as proposals")
          .where("id", id)
          .select<{ createdBy: Id }>("createdBy")
          .first()
      )?.createdBy || null;

    return authorId ? await readOneUser(connection, authorId) : valid(null);
  }
);

/**
 * This function checks if all proposals for an SWU opportunity are evaluated for the Team Scenario phase
 * If all proposals are evaluated, it automatically changes the opportunity status to Processing
 */
export async function checkAndUpdateSWUOpportunityProcessingStatus(
  connection: Connection,
  opportunityId: Id,
  session: AuthenticatedSession
): Promise<void> {
  // Get all active proposals
  const activeProposals = await generateSWUProposalQuery(connection)
    .where({ "proposals.opportunity": opportunityId })
    .whereNotIn("statuses.status", [
      SWUProposalStatus.Withdrawn,
      SWUProposalStatus.Disqualified,
      SWUProposalStatus.Draft,
      // Exclude proposals that didn't make it to the team scenario phase
      SWUProposalStatus.Submitted,
      SWUProposalStatus.UnderReviewTeamQuestions,
      SWUProposalStatus.DeprecatedEvaluatedTeamQuestions,
      SWUProposalStatus.UnderReviewCodeChallenge,
      SWUProposalStatus.EvaluatedCodeChallenge
    ]);

  // Get current opportunity status
  const currentOpportunity = await generateSWUOpportunityQuery(connection)
    .where({ "opportunities.id": opportunityId })
    .select("statuses.status")
    .first();

  const currentStatus = currentOpportunity.status;
  const totalProposalsCount = activeProposals.length;
  const evaluatedCount = activeProposals.filter(
    (p) => p.status === SWUProposalStatus.EvaluatedTeamScenario
  ).length;

  // All proposals are evaluated in team scenario phase and opportunity is in EVALUATION_TEAM_SCENARIO, change to PROCESSING
  if (
    totalProposalsCount > 0 &&
    evaluatedCount === totalProposalsCount &&
    currentStatus === SWUOpportunityStatus.EvaluationTeamScenario
  ) {
    await updateSWUOpportunityStatus(
      connection,
      opportunityId,
      SWUOpportunityStatus.Processing,
      "Automatically moved to Processing as all proposals have been evaluated in the Team Scenario phase.",
      session
    );
  }
}
export { RawHistoryRecord as RawSWUProposalHistoryRecord };
