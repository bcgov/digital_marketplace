import { generateUuid } from "back-end/lib";
import {
  Connection,
  getOrgIdsForOwnerOrAdmin,
  Transaction,
  isUserOwnerOrAdminOfOrg,
  tryDb,
  readOneTWUResourceQuestionResponseEvaluation
} from "back-end/lib/db";
import { readOneFileById } from "back-end/lib/db/file";
import {
  generateTWUOpportunityQuery,
  RawTWUEvaluationPanelMember,
  RawTWUOpportunity,
  RawTWUOpportunitySlim,
  readManyResourceQuestions,
  readOneTWUOpportunitySlim,
  updateTWUOpportunityStatus
} from "back-end/lib/db/opportunity/team-with-us";
import { readOneOrganizationSlim } from "back-end/lib/db/organization";
import {
  RawUser,
  rawUserToUser,
  readOneUser,
  readOneUserSlim
} from "back-end/lib/db/user";
import {
  isSignedIn,
  readTWUProposalHistory,
  readTWUProposalScore
} from "back-end/lib/permissions";
import { compareNumbers } from "shared/lib";
import { FileRecord } from "shared/lib/resources/file";
import {
  doesTWUOpportunityStatusAllowGovToViewFullProposal,
  TWUOpportunityStatus
} from "shared/lib/resources/opportunity/team-with-us";
import {
  calculateProposalResourceQuestionScore,
  CreateRequestBody,
  CreateTWUProposalResourceQuestionResponseBody,
  CreateTWUProposalStatus,
  CreateTWUProposalTeamMemberBody,
  isTWUProposalStatusVisibleToGovernment,
  rankableTWUProposalStatuses,
  TWUProposal,
  TWUProposalEvent,
  TWUProposalHistoryRecord,
  TWUProposalResourceQuestionResponse,
  TWUProposalSlim,
  TWUProposalStatus,
  TWUProposalTeamMember,
  UpdateEditRequestBody,
  UpdateResourceQuestionScoreBody
} from "shared/lib/resources/proposal/team-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { User, userToUserSlim, UserType } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { getValidValue, isInvalid, valid } from "shared/lib/validation";

interface CreateTWUProposalParams
  extends Omit<CreateRequestBody, "attachments" | "status"> {
  attachments: FileRecord[];
  status: CreateTWUProposalStatus;
}

interface UpdateTWUProposalParams
  extends Omit<
    UpdateEditRequestBody,
    "opportunity" | "attachments" | "status"
  > {
  id: Id;
  attachments: FileRecord[];
}

interface TWUProposalStatusRecord {
  id: Id;
  opportunity: Id;
  createdAt: Date;
  createdBy: Id;
  status: TWUProposalStatus;
  note: string;
}

export interface RawTWUProposal
  extends Omit<
    TWUProposal,
    | "createdBy"
    | "updatedBy"
    | "opportunity"
    | "organization"
    | "attachments"
    | "resourceQuestionResponses"
  > {
  createdBy?: Id;
  updatedBy?: Id;
  opportunity: Id;
  organization: Id | null;
  attachments: Id[];
  anonymousProponentName: string;
  resourceQuestionResponses: RawTWUProposalResourceQuestionResponse[];
}

export type RawTWUProposalResourceQuestionResponse =
  TWUProposal["resourceQuestionResponses"][number] & {
    proposal: Id;
  };

interface RawTWUProposalSlim
  extends Omit<
    TWUProposalSlim,
    "createdBy" | "updatedBy" | "organization" | "opportunity"
  > {
  createdBy?: Id;
  updatedBy?: Id;
  organization: Id;
  opportunity: Id;
}

interface RawHistoryRecord
  extends Omit<TWUProposalHistoryRecord, "id" | "createdBy" | "type"> {
  createdBy: Id | null;
  status?: TWUProposalStatus;
  event?: TWUProposalEvent;
}

interface RawProposalTeamMember
  extends Omit<TWUProposalTeamMember, "member" | "idpUsername"> {
  member: Id;
}

async function rawHistoryRecordToHistoryRecord(
  connection: Connection,
  raw: RawHistoryRecord
): Promise<TWUProposalHistoryRecord> {
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
      ? adt("status", status as TWUProposalStatus)
      : adt("event", event as TWUProposalEvent)
  };
}

/**
 * "raw" indicates reading data from the db and modifying the data to conform
 * to type declarations in the application. In this case, the db holds a memberID
 * which is then used to get a username 'idpUsername'.
 *
 * @param connection
 * @param raw
 */
async function rawProposalTeamMemberToProposalTeamMember(
  connection: Connection,
  raw: RawProposalTeamMember
): Promise<TWUProposalTeamMember> {
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

/**
 * Will take a Proposal object, created from db query and massages it into
 * one of two responses, depending on the status of the Opportunity.
 *
 * @see {@link readOneTWUProposal}
 *
 * @param connection
 * @param session
 * @param raw - RawTWUProposal
 */
async function rawTWUProposalToTWUProposal(
  connection: Connection,
  session: Session,
  raw: RawTWUProposal
): Promise<TWUProposal> {
  const { opportunity: opportunityId } = raw;
  const opportunity = getValidValue(
    await readOneTWUOpportunitySlim(connection, opportunityId, session),
    null
  );
  if (!opportunity) {
    throw new Error("unable to process proposal");
  }
  /**
   *   If the user is gov/admin and the opportunity status is anything prior to
   *   EvaluationChallenge, keep the proposal anonymous
   */
  const resourceQuestionResponses = raw.resourceQuestionResponses.map(
    ({ proposal, ...resourceQuestionResponses }) => resourceQuestionResponses
  );
  if (
    session?.user.type !== UserType.Vendor &&
    !doesTWUOpportunityStatusAllowGovToViewFullProposal(opportunity.status)
  ) {
    return {
      id: raw.id,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
      status: raw.status,
      submittedAt: raw.submittedAt,
      opportunity,
      resourceQuestionResponses,
      questionsScore: raw.questionsScore || undefined,
      anonymousProponentName: raw.anonymousProponentName,
      attachments: []
    };
  }

  const {
    createdBy: createdById,
    updatedBy: updatedById,
    organization: organizationId,
    attachments: attachmentIds,
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

  const attachments = await Promise.all(
    attachmentIds.map(async (id) => {
      const result = getValidValue(await readOneFileById(connection, id), null);
      if (!result) {
        throw new Error("unable to process proposal attachments");
      }
      return result;
    })
  );

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined,
    opportunity,
    organization: organization || undefined,
    attachments,
    resourceQuestionResponses
  };
}

/**
 * Similar to `rawTWUProposalTOTWUProposal` but does not include
 * "history" | "attachments" | "resourceQuestionResponses"
 *
 * @see {@link rawTWUProposalToTWUProposal}
 *
 * @param connection
 * @param raw
 * @param session
 */
async function rawTWUProposalSlimToTWUProposalSlim(
  connection: Connection,
  raw: RawTWUProposalSlim,
  session: Session
): Promise<TWUProposalSlim> {
  const { opportunity: opportunityId } = raw;
  const opportunity = getValidValue(
    await readOneTWUOpportunitySlim(connection, opportunityId, session),
    null
  );
  if (!opportunity) {
    throw new Error("unable to process proposal");
  }
  /**
   * If the user is gov/admin and the opportunity status is anything before
   * EvaluationChallenge, keep the proposal anonymous
   */
  if (
    session?.user.type !== UserType.Vendor &&
    !doesTWUOpportunityStatusAllowGovToViewFullProposal(opportunity.status)
  ) {
    return {
      challengeScore: 0,
      createdBy: undefined,
      organization: undefined,
      priceScore: 0,
      rank: 0,
      totalScore: 0,
      updatedBy: undefined,
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

async function getTWUProposalSubmittedAt(
  connection: Connection,
  proposal: RawTWUProposal | RawTWUProposalSlim
): Promise<Date | undefined> {
  const conditions = {
    proposal: proposal.id,
    status: TWUProposalStatus.Submitted
  };
  return (
    await connection<{ submittedAt: Date }>("twuProposalStatuses")
      .where(conditions)
      .orderBy("createdAt", "desc")
      .select("createdAt as submittedAt")
      .first()
  )?.submittedAt;
}

async function createTWUProposalAttachments(
  trx: Transaction,
  proposalId: Id,
  attachments: FileRecord[]
) {
  // Delete existing and recreate
  await trx("twuProposalAttachments").where({ proposal: proposalId }).delete();
  for (const attachment of attachments) {
    const [attachmentResult] = await trx("twuProposalAttachments").insert(
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

export const readManyTWUProposals = tryDb<
  [AuthenticatedSession, Id],
  TWUProposalSlim[]
>(async (connection, session, id) => {
  const query = generateTWUProposalQuery(connection).where({ opportunity: id });

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
    proposal.submittedAt = await getTWUProposalSubmittedAt(
      connection,
      proposal
    );
  }

  // Filter out any proposals not in UNDER_REVIEW or later status if admin/gov owner
  if (session.user && session.user.type !== UserType.Vendor) {
    results = results.filter((result) =>
      isTWUProposalStatusVisibleToGovernment(
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
          await rawTWUProposalSlimToTWUProposalSlim(connection, result, session)
      )
    )
  );
});

export const readOwnTWUProposals = tryDb<
  [AuthenticatedSession],
  TWUProposalSlim[]
>(async (connection, session) => {
  const proposals = await generateTWUProposalQuery(connection)
    .where({ "proposals.createdBy": session.user.id })
    .select<RawTWUProposalSlim[]>(
      "proposals.id",
      "statuses.status",
      "proposals.challengeScore",
      "proposals.priceScore"
    );

  for (const proposal of proposals) {
    if (
      proposal.status === TWUProposalStatus.Awarded ||
      proposal.status === TWUProposalStatus.NotAwarded
    ) {
      const opportunity = await generateTWUOpportunityQuery(connection)
        .where({ "opportunities.id": proposal.opportunity })
        .select("questionsWeight", "challengeWeight", "priceWeight")
        .first<
          RawTWUOpportunitySlim & {
            questionsWeight: number;
            challengeWeight: number;
            priceWeight: number;
          }
        >();
      const chair = await connection<
        RawTWUEvaluationPanelMember,
        RawTWUEvaluationPanelMember["user"]
      >("twuEvaluationPanelMembers")
        .select("user")
        .where({
          opportunityVersion: opportunity.versionId,
          chair: true
        });
      const opportunityResourceQuestions = getValidValue(
        await readManyResourceQuestions(connection, opportunity.versionId),
        null
      );
      const consensusScores =
        getValidValue(
          await readOneTWUResourceQuestionResponseEvaluation(
            connection,
            proposal.id,
            chair.user,
            session,
            true
          ),
          null
        )?.scores ?? [];
      proposal.questionsScore =
        opportunityResourceQuestions && consensusScores.length
          ? calculateProposalResourceQuestionScore(
              consensusScores,
              opportunityResourceQuestions
            )
          : undefined;

      const includeTotalScore =
        proposal.questionsScore !== undefined &&
        proposal.challengeScore !== null &&
        proposal.priceScore !== null;
      proposal.totalScore = includeTotalScore
        ? (opportunity.questionsWeight * (proposal.questionsScore || 0)) / 100 +
          (opportunity.challengeWeight * (proposal.challengeScore || 0)) / 100 +
          (opportunity.priceWeight * (proposal.priceScore || 0)) / 100
        : undefined;
    } else {
      delete proposal.challengeScore;
      delete proposal.priceScore;
    }
  }

  return valid(
    await Promise.all(
      proposals.map(
        async (result) =>
          await rawTWUProposalSlimToTWUProposalSlim(connection, result, session)
      )
    )
  );
});

const readOneTWUProposalWithIdsQuery = (
  query: (
    connection: Connection,
    ...ids: Id[]
  ) => Promise<Pick<RawTWUProposal, "id"> | undefined>
) =>
  tryDb<[Session, ...Id[]], Id | null>(async (connection, session, ...ids) => {
    if (!session) {
      return valid(null);
    }

    const result = (await query(connection, session.user.id, ...ids))?.id;

    return valid(result ? result : null);
  });

/**
 * Should a request come from an organization Owner or organization Admin,
 * this modifies the TWU Proposal query to read the proposals for the
 * organizations that the requester has permission to access.
 */
export const readOrgTWUProposals = tryDb<
  [AuthenticatedSession],
  TWUProposalSlim[]
>(async (connection, session) => {
  const orgIds = await getOrgIdsForOwnerOrAdmin(connection, session.user.id);
  const query = generateTWUProposalQuery(connection);

  if (orgIds) {
    query.where("organization", "IN", orgIds).andWhereNot({
      "proposals.createdBy": session.user.id
    });
  }

  const results = await query;

  if (!results) {
    throw new Error("unable to read TWU org proposals");
  }

  return valid(
    await Promise.all(
      results.map(
        async (results) =>
          await rawTWUProposalSlimToTWUProposalSlim(
            connection,
            results,
            session
          )
      )
    )
  );
});

/**
 * Used as confirmation that the person creating a proposal is not the same
 * person as who created the opportunity. Returns `valid(null)` on success.
 */
export const readOneTWUProposalByOpportunityAndAuthor =
  readOneTWUProposalWithIdsQuery(
    async (connection, userId, opportunityId) =>
      await connection<RawTWUProposal, { id: Id }>("twuProposals")
        .where({ opportunity: opportunityId, createdBy: userId })
        .select("id")
        .first()
  );

/**
 * Used as confirmation that the organization does not have more than one
 * proposal associated with the opportunity. Returns `valid(null)` on success.
 */
export const readOneTWUProposalByOpportunityAndOrgAuthor =
  readOneTWUProposalWithIdsQuery(
    async (connection, userId, opportunityId, organizationId) =>
      await connection<RawTWUProposal, { id: Id }>("twuProposals")
        .where({ opportunity: opportunityId, organization: organizationId })
        .andWhereNot({ createdBy: userId })
        .select("id")
        .first()
  );

async function isTWUProposalAuthor(
  connection: Connection,
  user: User,
  id: Id
): Promise<boolean> {
  try {
    const result = await connection<RawTWUProposal>("twuProposals")
      .select("*")
      .where({ id, createdBy: user.id });
    return !!result && result.length > 0;
  } catch (exception) {
    return false;
  }
}

export async function isTWUProposalAuthorOrIsUserOwnerOrAdminOfOrg(
  connection: Connection,
  user: User,
  proposalId: Id,
  orgId: Id | null
) {
  return (
    (await isTWUProposalAuthor(connection, user, proposalId)) ||
    (!!orgId && (await isUserOwnerOrAdminOfOrg(connection, user, orgId)))
  );
}

export const readManyProposalResourceQuestionResponses = tryDb<
  [Id, boolean?],
  RawTWUProposalResourceQuestionResponse[]
>(async (connection, proposalId, includeScores = false) => {
  const query = connection<RawTWUProposalResourceQuestionResponse>(
    "twuResourceQuestionResponses"
  ).where({ proposal: proposalId });

  if (includeScores) {
    query.select<RawTWUProposalResourceQuestionResponse[]>("*");
  } else {
    query.select<RawTWUProposalResourceQuestionResponse[]>("order", "response");
  }
  const results = await query;
  if (!results) {
    throw new Error("unable to read proposal resource question responses");
  }

  return valid(results);
});

/**
 * Fetches members from the db, associated with a Proposal
 */
const readTWUProposalMembers = tryDb<[Id], RawProposalTeamMember[]>(
  async (connection, proposalId) => {
    const query = connection<RawProposalTeamMember>("twuProposalMember").where(
      "proposal",
      proposalId
    );

    query.select<RawProposalTeamMember[]>("member", "hourlyRate", "resource");

    const results = await query;

    if (!results) {
      throw new Error("unable to read proposal team member");
    }
    return valid(results);
  }
);

/**
 * Retrieves one database record for a TWU Proposal
 */
export const readOneTWUProposal = tryDb<
  [Id, AuthenticatedSession],
  TWUProposal | null
>(async (connection, id, session) => {
  const result = await generateTWUProposalQuery(connection)
    .where({ "proposals.id": id })
    .first<RawTWUProposal>();

  /**
   * @privateRemarks
   *
   * As of 04/2023 TWU Proposals do NOT have attachments, however discussions
   * about the potential for a future use case warrants leaving this in
   * (even if empty)
   */
  if (result) {
    // Fetch attachments
    result.attachments = (
      await connection<{ file: Id }>("twuProposalAttachments")
        .where("proposal", result.id)
        .select("file")
    ).map((row) => row.file);

    // Fetch history for admins/proposal owners
    if (
      await readTWUProposalHistory(
        connection,
        session,
        result.opportunity,
        result.id,
        result.organization
      )
    ) {
      const rawProposalStatuses = await connection<RawHistoryRecord>(
        "twuProposalStatuses"
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
    result.submittedAt = await getTWUProposalSubmittedAt(connection, result);

    // Fetch team questions (scores only included if admin/owner)
    const canReadScores = await readTWUProposalScore(
      connection,
      session,
      result.opportunity,
      result.id,
      result.status,
      result.organization
    );
    result.resourceQuestionResponses =
      getValidValue(
        await readManyProposalResourceQuestionResponses(
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
  }

  // Read the members associated with the proposal from the db
  const teamMembers =
    getValidValue(await readTWUProposalMembers(connection, result.id), []) ??
    [];

  // redefine the shape of the members object to `TWUProposalTeamMembers`
  result.team = await Promise.all(
    teamMembers.map(
      async (raw) =>
        await rawProposalTeamMemberToProposalTeamMember(connection, raw)
    )
  );

  return valid(
    result
      ? await rawTWUProposalToTWUProposal(connection, session, result)
      : null
  );
});

export const createTWUProposal = tryDb<
  [CreateTWUProposalParams, AuthenticatedSession],
  TWUProposal
>(async (connection, proposal, session) => {
  const now = new Date();
  const proposalId = await connection.transaction(async (trx) => {
    const {
      attachments,
      resourceQuestionResponses,
      team,
      status,
      ...restOfProposal
    } = proposal;

    // Create root record for proposal
    const [proposalRootRecord] = await connection<RawTWUProposal>(
      "twuProposals"
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
      TWUProposalStatusRecord & { proposal: Id }
    >("twuProposalStatuses")
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
    await createTWUProposalAttachments(trx, proposalRootRecord.id, attachments);

    // Create resource question responses
    for (const resourceQuestionResponse of resourceQuestionResponses) {
      await connection<TWUProposalResourceQuestionResponse & { proposal: Id }>(
        "twuResourceQuestionResponses"
      )
        .transacting(trx)
        .insert({
          ...resourceQuestionResponse,
          proposal: proposalRootRecord.id
        });
    }

    // Create team members
    await createTWUProposalTeamMembers(trx, proposalRootRecord.id, team);

    return proposalRootRecord.id;
  });

  const dbResult = await readOneTWUProposal(connection, proposalId, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to create proposal");
  }
  return valid(dbResult.value);
});

/**
 * Creates an entry in a link table 'twuProposalMembers' when an existing member
 * is added to a TWU Proposal.
 *
 * @param trx
 * @param proposalId
 * @param teamMembers
 */
async function createTWUProposalTeamMembers(
  trx: Transaction,
  proposalId: Id,
  teamMembers: CreateTWUProposalTeamMemberBody[]
) {
  // delete existing and recreate
  await trx("twuProposalMember").where({ proposal: proposalId }).delete();
  for (const teamMember of teamMembers) {
    const [teamMemberResult] = await trx("twuProposalMember").insert(
      {
        proposal: proposalId,
        member: teamMember.member,
        hourlyRate: teamMember.hourlyRate,
        resource: teamMember.resource
      },
      "*"
    );
    if (!teamMemberResult) {
      throw new Error(
        "unable to insert team members into the db for a TWU proposal"
      );
    }
  }
}

export const updateTWUProposal = tryDb<
  [UpdateTWUProposalParams, AuthenticatedSession],
  TWUProposal
>(async (connection, proposal, session) => {
  const now = new Date();
  const { id, attachments, resourceQuestionResponses, organization, team } =
    proposal;
  return valid(
    await connection.transaction(async (trx) => {
      // Update organization/timestamps
      const [result] = await connection<RawTWUProposal>("twuProposals")
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
      await createTWUProposalAttachments(trx, result.id, attachments || []);

      // Update Team Members
      await createTWUProposalTeamMembers(trx, result.id, team);

      // Update resourceQuestionResponses
      await updateTWUProposalResourceQuestionResponses(
        trx,
        result.id,
        resourceQuestionResponses
      );

      const dbResult = await readOneTWUProposal(trx, result.id, session);
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update proposal");
      }
      return dbResult.value;
    })
  );
});

async function updateTWUProposalResourceQuestionResponses(
  connection: Transaction,
  proposalId: Id,
  resourceQuestionResponses: CreateTWUProposalResourceQuestionResponseBody[]
): Promise<void> {
  // Remove existing and recreate
  await connection("twuResourceQuestionResponses")
    .where({ proposal: proposalId })
    .delete();

  for (const response of resourceQuestionResponses) {
    await connection<TWUProposalResourceQuestionResponse & { proposal: Id }>(
      "twuResourceQuestionResponses"
    ).insert({
      ...response,
      proposal: proposalId
    });
  }
}

/**
 * Internal function that updates a TWU proposal status.
 */
async function _updateTWUProposalStatusInternal(
  trx: Transaction,
  proposalId: Id,
  status: TWUProposalStatus,
  note: string,
  session: AuthenticatedSession
): Promise<TWUProposal> {
  const now = new Date();

  const [statusRecord] = await trx<RawHistoryRecord & { id: Id; proposal: Id }>(
    "twuProposalStatuses"
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
  await trx<RawTWUProposal>("twuProposals").where({ id: proposalId }).update(
    {
      updatedAt: now,
      updatedBy: session.user.id
    },
    "*"
  );

  if (!statusRecord) {
    throw new Error("unable to update proposal");
  }

  const dbResult = await readOneTWUProposal(
    trx,
    statusRecord.proposal,
    session
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update proposal");
  }

  return dbResult.value;
}

export const updateTWUProposalStatus = tryDb<
  [Id, TWUProposalStatus, string, AuthenticatedSession],
  TWUProposal
>(async (connection, proposalId, status, note, session) => {
  return valid(
    await connection.transaction(async (trx) => {
      return await _updateTWUProposalStatusInternal(
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
 * Disqualifies a TWU proposal and updates the opportunity processing status in a single transaction.
 * This ensures both operations succeed or fail together.
 */
export const disqualifyTWUProposalAndUpdateOpportunity = tryDb<
  [Id, string, AuthenticatedSession],
  TWUProposal
>(async (connection, proposalId, disqualificationReason, session) => {
  return valid(
    await connection.transaction(async (trx) => {
      // Update proposal status to disqualified
      const updatedProposal = await _updateTWUProposalStatusInternal(
        trx,
        proposalId,
        TWUProposalStatus.Disqualified,
        disqualificationReason,
        session
      );

      // Check if opportunity should be moved to "Processing" status after disqualification
      const opportunityId = updatedProposal.opportunity.id;
      await checkAndUpdateTWUOpportunityProcessingStatus(
        trx,
        opportunityId,
        session
      );

      return updatedProposal;
    })
  );
});

export const updateTWUProposalResourceQuestionScores = tryDb<
  [Id, UpdateResourceQuestionScoreBody[], AuthenticatedSession],
  TWUProposal
>(async (connection, proposalId, scores, session) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      // Update updatedAt/By on proposal root record
      const numberUpdated = await connection<{
        updatedAt: Date;
        updatedBy: Id;
      }>("twuProposals")
        .transacting(trx)
        .where("id", proposalId)
        .update({
          updatedAt: now,
          updatedBy: session.user.id
        });

      if (!numberUpdated) {
        throw new Error("unable to update resource question scores");
      }

      // Update the score on each question in the proposal
      for (const score of scores) {
        const [result] = await connection("twuResourceQuestionResponses")
          .transacting(trx)
          .where({
            proposal: proposalId,
            order: score.order
          })
          .update(
            {
              score: score.score
            },
            "*"
          );

        if (!result) {
          throw new Error("unable to update resource question scores");
        }
      }

      scores = scores.sort((a, b) => compareNumbers(a.order, b.order));

      // Create a history record for the score entry
      const [result] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("twuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: now,
            createdBy: session.user.id,
            event: TWUProposalEvent.QuestionsScoreEntered,
            note: `Resource question scores were entered. ${scores
              .map((s, i) => `Q${i + 1}: ${s.score}`)
              .join("; ")}.`
          },
          "*"
        );

      if (!result) {
        throw new Error("unable to update resource question scores");
      }

      // Change the status to EvaluatedResourceQuestions
      const [statusRecord] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("twuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: new Date(),
            createdBy: session.user.id,
            status: TWUProposalStatus.EvaluatedResourceQuestions,
            note: ""
          },
          "*"
        );

      if (!statusRecord) {
        throw new Error("unable to update resource questions score");
      }

      const dbResult = await readOneTWUProposal(trx, result.proposal, session);
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update proposal");
      }

      return dbResult.value;
    })
  );
});

/**
 * Updates the Challenge Score, the Price Score, creates a history record
 * (challenge), creates a history record (price), changes status to
 * EVALUATED_CHALLENGE, reads a proposal record (sanity check)
 */
export const updateTWUProposalChallengeAndPriceScores = tryDb<
  [Id, number, AuthenticatedSession],
  TWUProposal
>(async (connection, proposalId, challengeScore, session) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      // Calculate price score prior to updating

      const priceScore = await calculatePriceScore(trx, proposalId);

      // Update updatedAt/By stamp and score on proposal root record
      const numberUpdated = await connection<{
        challengeScore: number;
        priceScore: number;
        updatedAt: Date;
        updatedBy: Id;
      }>("twuProposals")
        .transacting(trx)
        .where("id", proposalId)
        .update({
          challengeScore,
          priceScore,
          updatedAt: now,
          updatedBy: session.user.id
        });

      if (!numberUpdated) {
        throw new Error("unable to update proposal score");
      }

      // Create a history record for the score entry
      const [challengeScoreResult] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("twuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: now,
            createdBy: session.user.id,
            event: TWUProposalEvent.ChallengeScoreEntered,
            note: `A challenge score of "${challengeScore}" was entered.`
          },
          "*"
        );

      if (!challengeScoreResult) {
        throw new Error("unable to update challenge score");
      }

      // Create a history record for the price score entry
      const [priceScoreResult] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("twuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: new Date(), // New date so it appears after the previous updates
            event: TWUProposalEvent.PriceScoreEntered,
            note: `A price score of "${priceScore}" was calculated.`
          },
          "*"
        );

      if (!priceScoreResult) {
        throw new Error("unable to update team price score");
      }

      // Create a status record now that this proposal is fully evaluated
      const [evalStatusResult] = await connection<
        RawHistoryRecord & { id: Id; proposal: Id }
      >("twuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: new Date(), // New date so it appears after the previous updates
            createdBy: session.user.id,
            status: TWUProposalStatus.EvaluatedChallenge,
            note: ""
          },
          "*"
        );

      if (!evalStatusResult) {
        throw new Error("unable to update proposal");
      }

      const dbResult = await readOneTWUProposal(trx, proposalId, session);
      if (isInvalid(dbResult) || !dbResult.value) {
        throw new Error("unable to update proposal scores");
      }

      // updateTWUProposalChallengeAndPriceScores was invoked
      // - this proposal is now fully evaluated, check if we need to change the opportunity "Processing" status
      const opportunityId = dbResult.value.opportunity.id;
      await checkAndUpdateTWUOpportunityProcessingStatus(
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
    await connection<{ priceWeight: number }>("twuProposals as proposals")
      .where("proposals.id", proposalId)
      .join(
        "twuOpportunities as opportunities",
        "proposals.opportunity",
        "=",
        "opportunities.id"
      )
      .join("twuOpportunityVersions as versions", function () {
        this.on("versions.opportunity", "=", "opportunities.id").andOn(
          "versions.createdAt",
          "=",
          connection.raw(
            '(select max("createdAt") from "twuOpportunityVersions" as versions2 where \
            versions2.opportunity = opportunities.id)'
          )
        );
      })
      .select<{ priceWeight: number }>("versions.priceWeight")
      .first()
  )?.priceWeight;

  if (!priceScoreWeight) {
    throw new Error("unable to calculate price score weight");
  }

  // Select summed bids for each proposal in the same opportunity, order lowest to highest
  // Restrict to proposals that are in UnderReview/Evaluated
  const bids = await connection<ProposalBidRecord>("twuProposals as proposals")
    // Get latest status, so we can check to make sure proposal is under review/evaluated
    .join("twuProposalStatuses as statuses", function () {
      this.on("proposals.id", "=", "statuses.proposal")
        .andOnNotNull("statuses.status")
        .andOn(
          "statuses.createdAt",
          "=",
          connection.raw(
            '(select max("createdAt") from "twuProposalStatuses" as statuses2 where \
            statuses2.proposal = proposals.id and statuses2.status is not null)'
          )
        );
    })
    .join(
      "twuProposalMember as members",
      "proposals.id",
      "=",
      "members.proposal"
    )
    .join("twuResources as resources", "members.resource", "=", "resources.id")
    .whereIn("proposals.opportunity", function () {
      this.where({ id: proposalId }).select("opportunity").from("twuProposals");
    })
    .whereIn("statuses.status", [
      TWUProposalStatus.UnderReviewChallenge,
      TWUProposalStatus.EvaluatedChallenge
    ])
    // multiple resources requires matching the hourly rate of the team member
    // with the targetAllocation for the opportunity
    .select(
      connection.raw(
        'SUM(members."hourlyRate" * resources."targetAllocation" / 100) AS bid'
      )
    )
    .groupBy("proposals.id")
    .select<ProposalBidRecord[]>("proposals.id")
    .orderBy("bid", "asc");

  if (!bids || !bids.length) {
    throw new Error("unable to calculate price score bids");
  }

  const lowestBid = bids[0].bid;
  const proposal = bids.find((b) => b.id === proposalId);
  if (!proposal) {
    throw new Error("unable to calculate price score");
  }

  return (parseFloat(lowestBid) / parseFloat(proposal.bid)) * 100;
}

export const awardTWUProposal = tryDb<
  [Id, string, AuthenticatedSession],
  TWUProposal
>(async (connection, proposalId, note, session) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      // Update status for awarded proposal first
      await connection<RawHistoryRecord & { id: Id; proposal: Id }>(
        "twuProposalStatuses"
      )
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: proposalId,
            createdAt: now,
            createdBy: session.user.id,
            status: TWUProposalStatus.Awarded,
            note
          },
          "*"
        );

      // Update proposal root record
      const [proposalRecord] = await connection<RawTWUProposal>("twuProposals")
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
          await connection<{ id: Id }>("twuProposals")
            .transacting(trx)
            .andWhere("opportunity", proposalRecord.opportunity)
            .andWhereNot({ id: proposalId })
            .select("id")
        )?.map((result) => result.id) || [];

      for (const id of otherProposalIds) {
        // Get latest status for proposal and check equal to Evaluated/Awarded
        const currentStatus = (
          await connection<{ status: TWUProposalStatus }>("twuProposalStatuses")
            .whereNotNull("status")
            .andWhere("proposal", id)
            .select("status")
            .orderBy("createdAt", "desc")
            .first()
        )?.status;

        if (
          currentStatus &&
          ![
            TWUProposalStatus.Disqualified,
            TWUProposalStatus.Draft,
            TWUProposalStatus.NotAwarded,
            TWUProposalStatus.Submitted,
            TWUProposalStatus.Withdrawn
          ].includes(currentStatus)
        ) {
          await connection<RawHistoryRecord & { id: Id; proposal: Id }>(
            "twuProposalStatuses"
          )
            .transacting(trx)
            .insert({
              id: generateUuid(),
              proposal: id,
              createdAt: now,
              createdBy: session.user.id,
              status: TWUProposalStatus.NotAwarded,
              note: ""
            });
        }

        await connection<RawTWUProposal>("twuProposals")
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
      await updateTWUOpportunityStatus(
        trx,
        proposalRecord.opportunity,
        TWUOpportunityStatus.Awarded,
        "",
        session
      );

      const dbResult = await readOneTWUProposal(
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

export const deleteTWUProposal = tryDb<[Id, AuthenticatedSession], TWUProposal>(
  async (connection, id, session) => {
    // Read the proposal first, so we can respond with it after deleting
    const proposal = getValidValue(
      await readOneTWUProposal(connection, id, session),
      undefined
    );
    if (!proposal) {
      throw new Error("unable to delete proposal");
    }

    // Delete root record
    const [result] = await connection<RawTWUProposal>("twuProposals")
      .where({ id })
      .delete("*");

    if (!result) {
      throw new Error("unable to delete proposal");
    }
    return valid(proposal);
  }
);

export const readSubmittedTWUProposalCount = tryDb<[Id], number>(
  async (connection, opportunity) => {
    // Retrieve the opportunity, since we need to see if any proposals were withdrawn after proposal deadline
    // and include them in the count.
    const [twuOpportunity] = await generateTWUOpportunityQuery(
      connection
    ).where({ "opportunities.id": opportunity });

    if (!twuOpportunity) {
      return valid(0);
    }

    const results = await generateTWUProposalQuery(connection)
      .where({
        "proposals.opportunity": opportunity
      })
      .andWhere((q1) =>
        q1
          .whereNotIn("statuses.status", [
            TWUProposalStatus.Draft,
            TWUProposalStatus.Withdrawn
          ])
          .orWhere((q) =>
            q
              .where("statuses.status", "=", TWUProposalStatus.Withdrawn)
              .andWhere(
                "statuses.createdAt",
                ">=",
                twuOpportunity.proposalDeadline
              )
          )
      );

    return valid(results?.length || 0);
  }
);

export const readOneTWUAwardedProposal = tryDb<
  [Id, Session],
  TWUProposalSlim | null
>(async (connection, opportunity, session) => {
  const result = await generateTWUProposalQuery(connection)
    .where({
      "proposals.opportunity": opportunity,
      "statuses.status": TWUProposalStatus.Awarded
    })
    .first();

  if (
    result &&
    isSignedIn(session) &&
    (await readTWUProposalScore(
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
        await rawTWUProposalSlimToTWUProposalSlim(connection, result, session)
      )
    : valid(null);
});

export const readManyTWUProposalAuthors = tryDb<[Id], User[]>(
  async (connection, opportunity) => {
    const result = await connection<RawUser>("users")
      .join("twuProposals as proposals", "proposals.createdBy", "=", "users.id")
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

function generateTWUProposalQuery(connection: Connection) {
  const query = connection("twuProposals as proposals")
    .join("twuProposalStatuses as statuses", function () {
      this.on("proposals.id", "=", "statuses.proposal")
        .andOnNotNull("statuses.status")
        .andOn(
          "statuses.createdAt",
          "=",
          connection.raw(
            '(select max("createdAt") from "twuProposalStatuses" as statuses2 where \
            statuses2.proposal = proposals.id and statuses2.status is not null)'
          )
        );
    })
    .select<RawTWUProposalSlim[]>(
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
  status: TWUProposalStatus;
  questionsScore: number | null;
  challengeScore: number | null;
  priceScore: number | null;
  totalScore?: number;
  rank?: number;
}

async function calculateScores<T extends RawTWUProposal | RawTWUProposalSlim>(
  connection: Connection,
  session: AuthenticatedSession,
  opportunityId: Id,
  proposals: T[]
): Promise<T[]> {
  // Manually query opportunity and team questions
  const opportunity = await generateTWUOpportunityQuery(connection, true)
    .where({ "opportunities.id": opportunityId })
    .first<RawTWUOpportunity>();
  const opportunityResourceQuestions =
    opportunity &&
    getValidValue(
      await readManyResourceQuestions(connection, opportunity.versionId ?? ""),
      null
    );
  const chair = await connection<
    RawTWUEvaluationPanelMember,
    RawTWUEvaluationPanelMember["user"]
  >("twuEvaluationPanelMembers")
    .select("user")
    .where({
      opportunityVersion: opportunity.versionId,
      chair: true
    })
    .first();
  if (!opportunity || !opportunityResourceQuestions || !chair) {
    return proposals;
  }

  const proposalScorings = await generateTWUProposalQuery(connection)
    .where({ "proposals.opportunity": opportunityId })
    .select<ProposalScoring[]>(
      "proposals.id",
      "statuses.status",
      "proposals.challengeScore",
      "proposals.priceScore"
    );

  for (const scoring of proposalScorings) {
    const consensusScores =
      getValidValue(
        await readOneTWUResourceQuestionResponseEvaluation(
          connection,
          scoring.id,
          chair.user,
          session,
          true
        ),
        undefined
      )?.scores ?? [];

    scoring.questionsScore = calculateProposalResourceQuestionScore(
      consensusScores,
      opportunityResourceQuestions
    );
    scoring.totalScore =
      (opportunity.questionsWeight * (scoring.questionsScore || 0)) / 100 +
      (opportunity.challengeWeight * (scoring.challengeScore || 0)) / 100 +
      (opportunity.priceWeight * (scoring.priceScore || 0)) / 100;
  }

  // Only calculate rankings for proposals in rankable status
  const rankableProposalScorings = proposalScorings.filter((p) =>
    rankableTWUProposalStatuses.includes(p.status)
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
        proposalScoring.priceScore === null;
      if (
        session.user.type !== UserType.Vendor ||
        proposal.status === TWUProposalStatus.Awarded ||
        proposal.status === TWUProposalStatus.NotAwarded
      ) {
        proposal.questionsScore = proposalScoring.questionsScore || undefined;
        proposal.challengeScore = proposalScoring.challengeScore || undefined;
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

export const readOneTWUProposalAuthor = tryDb<[Id], User | null>(
  async (connection, id) => {
    const authorId =
      (
        await connection<{ createdBy: Id }>("twuProposals as proposals")
          .where("id", id)
          .select<{ createdBy: Id }>("createdBy")
          .first()
      )?.createdBy || null;

    return authorId ? await readOneUser(connection, authorId) : valid(null);
  }
);

/**
 * Checks if all proposals for a TWU opportunity that have reached the Challenge phase are evaluated
 * and updates the opportunity status accordingly.
 */
export async function checkAndUpdateTWUOpportunityProcessingStatus(
  connection: Connection,
  opportunityId: Id,
  session: AuthenticatedSession
): Promise<void> {
  // Get all active proposals
  const activeProposals = await generateTWUProposalQuery(connection)
    .where({ "proposals.opportunity": opportunityId })
    .whereNotIn("statuses.status", [
      TWUProposalStatus.Withdrawn,
      TWUProposalStatus.Disqualified,
      TWUProposalStatus.Draft,
      // Exclude proposals that didn't make it to the challenge phase
      TWUProposalStatus.Submitted,
      TWUProposalStatus.UnderReviewResourceQuestions,
      TWUProposalStatus.EvaluatedResourceQuestions
    ]);

  // Get current opportunity status
  const currentOpportunity = await generateTWUOpportunityQuery(connection)
    .where({ "opportunities.id": opportunityId })
    .select("statuses.status")
    .first();

  const currentStatus = currentOpportunity.status;
  const totalProposalsCount = activeProposals.length;
  const evaluatedCount = activeProposals.filter(
    (p) => p.status === TWUProposalStatus.EvaluatedChallenge
  ).length;

  // All proposals are evaluated in challenge phase and opportunity is in EVALUATION_CHALLENGE, change to PROCESSING
  if (
    totalProposalsCount > 0 &&
    evaluatedCount === totalProposalsCount &&
    currentStatus === TWUOpportunityStatus.EvaluationChallenge
  ) {
    await updateTWUOpportunityStatus(
      connection,
      opportunityId,
      TWUOpportunityStatus.Processing,
      "Automatically moved to Processing as all proposals have been evaluated in the Challenge phase.",
      session
    );
  }
}
export { RawHistoryRecord as RawTWUProposalHistoryRecord };
