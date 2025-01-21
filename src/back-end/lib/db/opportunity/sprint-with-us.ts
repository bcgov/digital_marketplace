import { generateUuid } from "back-end/lib";
import {
  Connection,
  RawSWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationStatusRecord,
  Transaction,
  tryDb
} from "back-end/lib/db";
import { readOneFileById } from "back-end/lib/db/file";
import { readOneOrganizationContactEmail } from "back-end/lib/db/organization";
import {
  allIndividualSWUTeamQuestionResponseEvaluationsComplete,
  readManySWUProposals,
  readOneSWUAwardedProposal,
  readSubmittedSWUProposalCount,
  updateSWUProposalStatus
} from "back-end/lib/db/proposal/sprint-with-us";
import { RawSWUOpportunitySubscriber } from "back-end/lib/db/subscribers/sprint-with-us";
import { readOneUser, readOneUserSlim } from "back-end/lib/db/user";
import * as swuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/sprint-with-us";
import { Knex } from "knex";
import { valid } from "shared/lib/http";
import { Addendum } from "shared/lib/resources/addendum";
import { getSWUOpportunityViewsCounterName } from "shared/lib/resources/counter";
import { FileRecord } from "shared/lib/resources/file";
import {
  CreateSWUEvaluationPanelMemberBody,
  CreateSWUOpportunityPhaseBody,
  CreateSWUOpportunityStatus,
  CreateSWUTeamQuestionBody,
  privateOpportunityStatuses,
  publicOpportunityStatuses,
  SWUEvaluationPanelMember,
  SWUOpportunity,
  SWUOpportunityEvent,
  SWUOpportunityHistoryRecord,
  SWUOpportunityPhase,
  SWUOpportunityPhaseRequiredCapability,
  SWUOpportunityPhaseType,
  SWUOpportunitySlim,
  SWUOpportunityStatus,
  SWUTeamQuestion
} from "shared/lib/resources/opportunity/sprint-with-us";
import {
  SWUProposalSlim,
  SWUProposalStatus
} from "shared/lib/resources/proposal/sprint-with-us";
import {
  SWUTeamQuestionResponseEvaluation,
  SWUTeamQuestionResponseEvaluationStatus
} from "shared/lib/resources/question-evaluation/sprint-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { User, UserType } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { getValidValue, isInvalid, isValid } from "shared/lib/validation";

export interface CreateSWUOpportunityParams
  extends Omit<
    SWUOpportunity,
    | "createdBy"
    | "createdAt"
    | "updatedAt"
    | "updatedBy"
    | "status"
    | "id"
    | "addenda"
    | "inceptionPhase"
    | "prototypePhase"
    | "implementationPhase"
    | "teamQuestions"
    | "evaluationPanel"
  > {
  status: CreateSWUOpportunityStatus;
  inceptionPhase?: CreateSWUOpportunityPhaseParams;
  prototypePhase?: CreateSWUOpportunityPhaseParams;
  implementationPhase: CreateSWUOpportunityPhaseParams;
  teamQuestions: CreateSWUTeamQuestionBody[];
  evaluationPanel: CreateSWUEvaluationPanelMemberParams[];
}

interface UpdateSWUOpportunityParams
  extends Omit<CreateSWUOpportunityParams, "status"> {
  id: Id;
}

interface UpdateSWUOpportunityWithNoteParams {
  note: string;
  attachments: FileRecord[];
}

interface SubmitQuestionEvaluationsWithNoteParams {
  note: string;
  evaluations: SWUTeamQuestionResponseEvaluation[];
}

export interface CreateSWUOpportunityPhaseParams
  extends Omit<CreateSWUOpportunityPhaseBody, "startDate" | "completionDate"> {
  startDate: Date;
  completionDate: Date;
}

interface CreateSWUEvaluationPanelMemberParams
  extends Omit<CreateSWUEvaluationPanelMemberBody, "email"> {
  user: Id;
}

interface SWUOpportunityRootRecord {
  id: Id;
  createdAt: Date;
  createdBy: Id;
}

interface SWUOpportunityVersionRecord
  extends Omit<SWUOpportunity, "status" | "createdBy" | "minTeamMembers"> {
  createdBy: Id;
  opportunity: Id;
  minTeamMembers: number | null;
}

interface SWUOpportunityStatusRecord {
  id: Id;
  opportunity: Id;
  createdAt: Date;
  createdBy: Id;
  status: SWUOpportunityStatus;
  note: string;
}

export interface RawSWUOpportunity
  extends Omit<
    SWUOpportunity,
    | "createdBy"
    | "updatedBy"
    | "attachments"
    | "addenda"
    | "teamQuestions"
    | "inceptionPhase"
    | "prototypePhase"
    | "implementationPhase"
  > {
  createdBy?: Id;
  updatedBy?: Id;
  attachments: Id[];
  addenda: Id[];
  teamQuestions: Id[];
  inceptionPhase?: Id;
  prototypePhase?: Id;
  implementationPhase: Id;
  versionId?: Id;
}

export interface RawSWUOpportunitySlim
  extends Omit<SWUOpportunitySlim, "createdBy" | "updatedBy"> {
  createdBy?: Id;
  updatedBy?: Id;
  versionId: Id;
}

interface RawSWUOpportunityAddendum extends Omit<Addendum, "createdBy"> {
  createdBy?: Id;
}

interface RawSWUOpportunityPhase
  extends Omit<SWUOpportunityPhase, "createdBy" | "requiredCapabilities"> {
  id: Id;
  createdBy?: Id;
  requiredCapabilities: Id[];
  opportunityVersion: Id;
}

interface RawPhaseRequiredCapability
  extends Omit<SWUOpportunityPhaseRequiredCapability, "createdBy"> {
  phase: Id;
  createdBy?: Id;
}

interface RawTeamQuestion extends Omit<SWUTeamQuestion, "createdBy"> {
  opportunityVersion: Id;
  createdBy?: Id;
}

interface RawSWUOpportunityHistoryRecord
  extends Omit<
    SWUOpportunityHistoryRecord,
    "createdBy" | "type" | "attachments"
  > {
  createdBy: Id | null;
  status?: SWUOpportunityStatus;
  event?: SWUOpportunityEvent;
  attachments: Id[];
}

export interface RawSWUEvaluationPanelMember
  extends Omit<SWUEvaluationPanelMember, "user"> {
  id: Id;
  opportunityVersion: Id;
  user: Id;
}

async function rawSWUOpportunityToSWUOpportunity(
  connection: Connection,
  raw: RawSWUOpportunity
): Promise<SWUOpportunity> {
  const {
    createdBy: createdById,
    updatedBy: updatedById,
    attachments: attachmentIds,
    inceptionPhase: inceptionPhaseId,
    prototypePhase: prototypePhaseId,
    implementationPhase: implementationPhaseId,
    minTeamMembers,
    versionId,
    ...restOfRaw
  } = raw;

  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), undefined)
    : undefined;
  const updatedBy = updatedById
    ? getValidValue(await readOneUserSlim(connection, updatedById), undefined)
    : undefined;
  const attachments = await Promise.all(
    attachmentIds.map(async (id) => {
      const result = getValidValue(await readOneFileById(connection, id), null);
      if (!result) {
        throw new Error("unable to process opportunity");
      }
      return result;
    })
  );
  const addenda = getValidValue(
    await readManyAddendum(connection, raw.id),
    undefined
  );
  const teamQuestions = getValidValue(
    await readManyTeamQuestions(connection, raw.versionId ?? ""),
    undefined
  );
  const inceptionPhase = inceptionPhaseId
    ? getValidValue(
        await readOneSWUOpportunityPhase(connection, inceptionPhaseId),
        undefined
      )
    : undefined;
  const prototypePhase = prototypePhaseId
    ? getValidValue(
        await readOneSWUOpportunityPhase(connection, prototypePhaseId),
        undefined
      )
    : undefined;
  const implementationPhase = getValidValue(
    await readOneSWUOpportunityPhase(connection, implementationPhaseId),
    undefined
  );

  if (!addenda || !teamQuestions || !implementationPhase) {
    throw new Error("unable to process opportunity");
  }

  return {
    ...restOfRaw,
    minTeamMembers: minTeamMembers || undefined,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined,
    attachments,
    addenda,
    teamQuestions,
    inceptionPhase: inceptionPhase ?? undefined,
    prototypePhase: prototypePhase ?? undefined,
    implementationPhase
  };
}

async function rawSWUOpportunitySlimToSWUOpportunitySlim(
  connection: Connection,
  raw: RawSWUOpportunitySlim
): Promise<SWUOpportunitySlim> {
  const {
    createdBy: createdById,
    updatedBy: updatedById,
    versionId,
    ...restOfRaw
  } = raw;
  const createdBy =
    (createdById &&
      getValidValue(
        await readOneUserSlim(connection, createdById),
        undefined
      )) ||
    undefined;
  const updatedBy =
    (updatedById &&
      getValidValue(
        await readOneUserSlim(connection, updatedById),
        undefined
      )) ||
    undefined;

  return {
    ...restOfRaw,
    createdBy,
    updatedBy
  };
}

async function rawSWUOpportunityAddendumToSWUOpportunityAddendum(
  connection: Connection,
  raw: RawSWUOpportunityAddendum
): Promise<Addendum> {
  const { createdBy: createdById, ...restOfRaw } = raw;
  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), undefined)
    : undefined;

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined
  };
}

async function rawSWUOpportunityPhaseToSWUOpportunityPhase(
  connection: Connection,
  raw: RawSWUOpportunityPhase
): Promise<SWUOpportunityPhase> {
  const { createdBy: createdById, opportunityVersion, id, ...restOfRaw } = raw;

  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), undefined)
    : undefined;
  const requiredCapabilities = getValidValue(
    await readManyRequiredCapabilities(connection, raw.id),
    undefined
  );

  if (!createdBy || !requiredCapabilities) {
    throw new Error("unable to process opportunity phase");
  }

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    requiredCapabilities
  };
}

async function rawRequiredCapabilityToRequiredCapability(
  connection: Connection,
  raw: RawPhaseRequiredCapability
): Promise<SWUOpportunityPhaseRequiredCapability> {
  const { createdBy: createdById, phase, ...restOfRaw } = raw;

  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), undefined)
    : undefined;

  if (!createdBy) {
    throw new Error("unable to process phase required capability");
  }

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined
  };
}

async function rawTeamQuestionToTeamQuestion(
  connection: Connection,
  raw: RawTeamQuestion
): Promise<SWUTeamQuestion> {
  const { createdBy: createdById, opportunityVersion, ...restOfRaw } = raw;

  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), undefined)
    : undefined;

  if (!createdBy) {
    throw new Error("unable to process team question");
  }

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined
  };
}

async function rawHistoryRecordToHistoryRecord(
  connection: Connection,
  _session: Session,
  raw: RawSWUOpportunityHistoryRecord
): Promise<SWUOpportunityHistoryRecord> {
  const {
    createdBy: createdById,
    status,
    event,
    attachments: attachmentIds,
    ...restOfRaw
  } = raw;
  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), null)
    : null;
  const attachments = await Promise.all(
    attachmentIds.map(async (id) => {
      const result = getValidValue(await readOneFileById(connection, id), null);
      if (!result) {
        throw new Error(
          "unable to process opportunity status record attachments"
        );
      }
      return result;
    })
  );

  if (!status && !event) {
    throw new Error("unable to process opportunity status record");
  }

  return {
    ...restOfRaw,
    createdBy,
    type: status
      ? adt("status", status as SWUOpportunityStatus)
      : adt("event", event as SWUOpportunityEvent),
    attachments
  };
}

async function rawEvaluationPanelMemberToEvaluationPanelMember(
  connection: Connection,
  raw: RawSWUEvaluationPanelMember
): Promise<SWUEvaluationPanelMember> {
  const { opportunityVersion, user: userId, ...restOfRaw } = raw;
  const user = getValidValue(await readOneUser(connection, userId), null);

  if (!user) {
    throw new Error("unable to process evaluation panel member");
  }

  return {
    ...restOfRaw,
    user: {
      id: user.id,
      name: user.name,
      avatarImageFile: user.avatarImageFile,
      email: user.email
    }
  };
}

export function generateSWUOpportunityQuery(
  connection: Connection,
  full = false
) {
  const query: Knex.QueryBuilder = connection<RawSWUOpportunity>(
    "swuOpportunities as opportunities"
  )
    // Join on latest SWU status
    .join("swuOpportunityStatuses as statuses", function () {
      this.on("opportunities.id", "=", "statuses.opportunity").andOn(
        "statuses.createdAt",
        "=",
        connection.raw(
          '(select max("createdAt") from "swuOpportunityStatuses" as statuses2 where \
            statuses2.opportunity = opportunities.id and statuses2.status is not null)'
        )
      );
    })
    // Join on latest SWU version
    .join("swuOpportunityVersions as versions", function () {
      this.on("opportunities.id", "=", "versions.opportunity").andOn(
        "versions.createdAt",
        "=",
        connection.raw(
          '(select max("createdAt") from "swuOpportunityVersions" as versions2 where \
            versions2.opportunity = opportunities.id)'
        )
      );
    })
    .select<RawSWUOpportunitySlim[]>(
      "opportunities.id",
      "opportunities.createdAt",
      "opportunities.createdBy",
      "versions.id as versionId",
      connection.raw(
        '(CASE WHEN versions."createdAt" > statuses."createdAt" THEN versions."createdAt" ELSE statuses."createdAt" END) AS "updatedAt" '
      ),
      connection.raw(
        '(CASE WHEN versions."createdAt" > statuses."createdAt" THEN versions."createdBy" ELSE statuses."createdBy" END) AS "updatedBy" '
      ),
      "versions.title",
      "versions.teaser",
      "versions.remoteOk",
      "versions.location",
      "versions.totalMaxBudget",
      "versions.proposalDeadline",
      "statuses.status"
    );

  if (full) {
    query.select<RawSWUOpportunity[]>(
      "versions.remoteDesc",
      "versions.minTeamMembers",
      "versions.mandatorySkills",
      "versions.optionalSkills",
      "versions.description",
      "versions.assignmentDate",
      "versions.questionsWeight",
      "versions.codeChallengeWeight",
      "versions.scenarioWeight",
      "versions.priceWeight"
    );
  }

  return query;
}

async function createSWUOpportunityNoteAttachments(
  connection: Connection,
  trx: Transaction,
  eventId: Id,
  attachments: FileRecord[]
) {
  for (const attachment of attachments) {
    const [attachmentResult] = await connection("swuOpportunityNoteAttachments")
      .transacting(trx)
      .insert(
        {
          event: eventId,
          file: attachment.id
        },
        "*"
      );
    if (!attachmentResult) {
      throw new Error("Unable to create opportunity attachment");
    }
  }
}

export async function isSWUOpportunityAuthor(
  connection: Connection,
  user: User,
  id: Id
): Promise<boolean> {
  try {
    const result = await connection<RawSWUOpportunity>("swuOpportunities")
      .select("*")
      .where({ id, createdBy: user.id });
    return !!result && result.length > 0;
  } catch (exception) {
    return false;
  }
}

export const readManyAddendum = tryDb<[Id], Addendum[]>(
  async (connection, opportunityId) => {
    const results = await connection<RawSWUOpportunityAddendum>(
      "swuOpportunityAddenda"
    ).where("opportunity", opportunityId);

    if (!results) {
      throw new Error("unable to read addenda");
    }

    return valid(
      await Promise.all(
        results.map(
          async (raw) =>
            await rawSWUOpportunityAddendumToSWUOpportunityAddendum(
              connection,
              raw
            )
        )
      )
    );
  }
);

export const readManyRequiredCapabilities = tryDb<
  [Id],
  SWUOpportunityPhaseRequiredCapability[]
>(async (connection, phaseId) => {
  const results = await connection<RawPhaseRequiredCapability>(
    "swuPhaseCapabilities"
  ).where({ phase: phaseId });

  if (!results) {
    throw new Error("unable to read required capabilities");
  }

  return valid(
    await Promise.all(
      results.map(
        async (raw) =>
          await rawRequiredCapabilityToRequiredCapability(connection, raw)
      )
    )
  );
});

export const readManyTeamQuestions = tryDb<[Id], SWUTeamQuestion[]>(
  async (connection, opportunityVersionId) => {
    const results = await connection<RawTeamQuestion>("swuTeamQuestions")
      .where({ opportunityVersion: opportunityVersionId })
      .orderBy("order", "asc");

    if (!results) {
      throw new Error("unable to read team questions");
    }

    return valid(
      await Promise.all(
        results.map(
          async (raw) => await rawTeamQuestionToTeamQuestion(connection, raw)
        )
      )
    );
  }
);

export const readManySWUOpportunities = tryDb<[Session], SWUOpportunitySlim[]>(
  async (connection, session) => {
    let query = generateSWUOpportunityQuery(connection);

    if (!session || session.user.type === UserType.Vendor) {
      // Anonymous users and vendors can only see public opportunities
      query = query.whereIn(
        "statuses.status",
        publicOpportunityStatuses as SWUOpportunityStatus[]
      );
    } else if (session.user.type === UserType.Government) {
      // Gov basic users should only see private opportunities that they own, and public opportunities
      query = query
        .whereIn(
          "statuses.status",
          publicOpportunityStatuses as SWUOpportunityStatus[]
        )
        .orWhere(function () {
          this.whereIn(
            "statuses.status",
            privateOpportunityStatuses as SWUOpportunityStatus[]
          ).andWhere({ "opportunities.createdBy": session.user?.id });
        });
    }
    // Admins can see all opportunities, so no additional filter necessary if none of the previous conditions match
    // Process results to eliminate fields not viewable by the current role
    const results = await Promise.all(
      (
        await query
      ).map(async (result: RawSWUOpportunity | RawSWUOpportunitySlim) => {
        if (session) {
          result.subscribed = await isSubscribed(
            connection,
            result.id,
            session.user.id
          );
        }
        return processForRole(result, session);
      })
    );

    return valid(
      await Promise.all(
        results.map(
          async (raw) =>
            await rawSWUOpportunitySlimToSWUOpportunitySlim(connection, raw)
        )
      )
    );
  }
);

export const readOneSWUOpportunityPhase = tryDb<[Id], SWUOpportunityPhase>(
  async (connection, id) => {
    const result = await connection<RawSWUOpportunityPhase>(
      "swuOpportunityPhases"
    )
      .where({ id })
      .first();

    if (!result) {
      throw new Error("unable to read opportunity phase");
    }

    return valid(
      await rawSWUOpportunityPhaseToSWUOpportunityPhase(connection, result)
    );
  }
);

async function createSWUOpportunityAttachments(
  connection: Connection,
  trx: Transaction,
  oppVersionId: Id,
  attachments: FileRecord[]
) {
  for (const attachment of attachments) {
    const [attachmentResult] = await connection("swuOpportunityAttachments")
      .transacting(trx)
      .insert(
        {
          opportunityVersion: oppVersionId,
          file: attachment.id
        },
        "*"
      );
    if (!attachmentResult) {
      throw new Error("Unable to create opportunity attachment");
    }
  }
}

function processForRole<T extends RawSWUOpportunity | RawSWUOpportunitySlim>(
  result: T,
  session: Session
) {
  // Remove createdBy/updatedBy for non-admin or non-author
  if (
    !session ||
    (session.user.type !== UserType.Admin &&
      session.user.id !== result.createdBy &&
      session.user.id !== result.updatedBy)
  ) {
    delete result.createdBy;
    delete result.updatedBy;
  }
  return result;
}

export const readOneSWUOpportunitySlim = tryDb<
  [Id, Session],
  SWUOpportunitySlim | null
>(async (connection, id, session) => {
  let result = await generateSWUOpportunityQuery(connection)
    .where({ "opportunities.id": id })
    .first();

  if (result) {
    result = processForRole(result, session);
  }

  return result
    ? valid(await rawSWUOpportunitySlimToSWUOpportunitySlim(connection, result))
    : valid(null);
});

async function isSubscribed(
  connection: Connection,
  oppId: Id,
  userId: Id
): Promise<boolean> {
  return !!(await connection<RawSWUOpportunitySubscriber>(
    "swuOpportunitySubscribers"
  )
    .where({ opportunity: oppId, user: userId })
    .first());
}

export const readOneSWUOpportunity = tryDb<
  [Id, Session],
  SWUOpportunity | null
>(async (connection, id, session) => {
  let query = generateSWUOpportunityQuery(connection, true).where({
    "opportunities.id": id
  });

  if (!session || session.user.type === UserType.Vendor) {
    // Anonymous users and vendors can only see public opportunities
    query = query.whereIn(
      "statuses.status",
      publicOpportunityStatuses as SWUOpportunityStatus[]
    );
  } else if (session.user.type === UserType.Government) {
    // Gov users should only see private opportunities they own or are on the
    // evaluation panel for, and public opportunities
    query = query.andWhere(function () {
      this.whereIn(
        "statuses.status",
        publicOpportunityStatuses as SWUOpportunityStatus[]
      ).orWhere(function () {
        this.whereIn(
          "statuses.status",
          privateOpportunityStatuses as SWUOpportunityStatus[]
        ).andWhere(function () {
          this.where({ "opportunities.createdBy": session.user.id }).orWhereIn(
            "versions.id",
            function () {
              this.select("opportunityVersion")
                .from("swuEvaluationPanelMembers")
                .where("user", "=", session.user.id);
            }
          );
        });
      });
    });
  } else {
    // Admin users can see both private and public opportunities
    query = query.whereIn("statuses.status", [
      ...publicOpportunityStatuses,
      ...privateOpportunityStatuses
    ]);
  }

  let result = await query.first<RawSWUOpportunity>();

  if (result) {
    // Process based on user type
    result = processForRole(result, session);

    // Query for attachment file ids
    result.attachments = (
      await connection<{ file: Id }>("swuOpportunityAttachments")
        .where("opportunityVersion", result.versionId)
        .select("file")
    ).map((row) => row.file);

    // Get published date if applicable
    const conditions = {
      opportunity: result.id,
      status: SWUOpportunityStatus.Published
    };
    result.publishedAt = (
      await connection<{ createdAt: Date }>("swuOpportunityStatuses")
        .where(conditions)
        .select("createdAt")
        .orderBy("createdAt", "desc")
        .first()
    )?.createdAt;

    // Set awarded proponent flag if applicable
    let awardedProposal: SWUProposalSlim | null;
    if (result.status === SWUOpportunityStatus.Awarded) {
      awardedProposal = getValidValue(
        await readOneSWUAwardedProposal(connection, result.id, session),
        null
      );
      if (
        awardedProposal &&
        awardedProposal.organization &&
        awardedProposal.createdBy
      ) {
        // Use the score to determine if session is user is permitted to see detailed
        // proponent information.
        const fullPermissions = !!awardedProposal.totalScore;
        let email: string | undefined;
        if (fullPermissions) {
          const result = await readOneOrganizationContactEmail(
            connection,
            awardedProposal.organization.id
          );
          email = isValid(result) && result.value ? result.value : undefined;
        }
        result.successfulProponent = {
          id: awardedProposal.organization.id,
          name: awardedProposal.organization.legalName,
          email,
          totalScore: awardedProposal.totalScore,
          createdBy: fullPermissions ? awardedProposal.createdBy : undefined
        };
      }
    }

    // If authenticated, add on subscription status flag
    if (session) {
      result.subscribed = await isSubscribed(
        connection,
        result.id,
        session.user.id
      );
    }

    const rawEvaluationPanelMembers =
      await connection<RawSWUEvaluationPanelMember>("swuEvaluationPanelMembers")
        .where("opportunityVersion", result.versionId)
        .orderBy("order");

    // If admin/owner/evaluation panel member, add on history,
    // evaluation panel, reporting metrics, and successful proponent if
    // applicable
    if (
      session?.user.type === UserType.Admin ||
      result.createdBy === session?.user.id ||
      rawEvaluationPanelMembers.find(({ user }) => user === session?.user.id)
    ) {
      const rawHistory = await connection<RawSWUOpportunityHistoryRecord>(
        "swuOpportunityStatuses"
      )
        .where("opportunity", result.id)
        .orderBy("createdAt", "desc");

      if (!rawHistory) {
        throw new Error("unable to read opportunity statuses");
      }

      // For reach status record, fetch any attachments and add their ids to the record as an array
      await Promise.all(
        rawHistory.map(
          async (raw) =>
            (raw.attachments = (
              await connection<{ file: Id }>("swuOpportunityNoteAttachments")
                .where("event", raw.id)
                .select("file")
            ).map((row) => row.file))
        )
      );

      result.history = await Promise.all(
        rawHistory.map(
          async (raw) =>
            await rawHistoryRecordToHistoryRecord(connection, session, raw)
        )
      );

      result.evaluationPanel = await Promise.all(
        rawEvaluationPanelMembers.map(
          async (raw) =>
            await rawEvaluationPanelMemberToEvaluationPanelMember(
              connection,
              raw
            )
        )
      );

      if (publicOpportunityStatuses.includes(result.status)) {
        // Retrieve opportunity views
        const conditions = {
          name: getSWUOpportunityViewsCounterName(result.id)
        };
        const numViews =
          (
            await connection<{ count: number }>("viewCounters")
              .where(conditions)
              .first()
          )?.count || 0;

        // Retrieve watchers/subscribers
        const numWatchers =
          (
            await connection("swuOpportunitySubscribers").where({
              opportunity: result.id
            })
          )?.length || 0;

        // Retrieve number of submitted proposals (exclude draft/withdrawn)
        const numProposals = getValidValue(
          await readSubmittedSWUProposalCount(connection, result.id),
          0
        );

        result.reporting = {
          numViews,
          numWatchers,
          numProposals: numProposals ?? 0
        };
      }
    }

    // Retrieve phases for the opportunity version
    const inceptionConditions = {
      opportunityVersion: result.versionId,
      phase: SWUOpportunityPhaseType.Inception
    };
    result.inceptionPhase = (
      await connection<{ id: Id }>("swuOpportunityPhases")
        .where(inceptionConditions)
        .select("id")
        .first()
    )?.id;

    const prototypeConditions = {
      opportunityVersion: result.versionId,
      phase: SWUOpportunityPhaseType.Prototype
    };
    result.prototypePhase = (
      await connection<{ id: Id }>("swuOpportunityPhases")
        .where(prototypeConditions)
        .select("id")
        .first()
    )?.id;

    const implementationConditions = {
      opportunityVersion: result.versionId,
      phase: SWUOpportunityPhaseType.Implementation
    };
    const implementationPhaseId = (
      await connection<{ id: Id }>("swuOpportunityPhases")
        .where(implementationConditions)
        .select("id")
        .first()
    )?.id;

    if (!implementationPhaseId) {
      throw new Error("unable to retrieve phase for opportunity");
    }
    result.implementationPhase = implementationPhaseId;
  }

  return valid(
    result ? await rawSWUOpportunityToSWUOpportunity(connection, result) : null
  );
});

export const createSWUOpportunity = tryDb<
  [CreateSWUOpportunityParams, AuthenticatedSession],
  SWUOpportunity
>(async (connection, opportunity, session) => {
  // Create the opportunity root record
  const now = new Date();
  const opportunityId = await connection.transaction(async (trx) => {
    const [opportunityRootRecord] = await connection<SWUOpportunityRootRecord>(
      "swuOpportunities"
    )
      .transacting(trx)
      .insert(
        {
          id: generateUuid(),
          createdAt: now,
          createdBy: session.user.id
        },
        "*"
      );

    if (!opportunityRootRecord) {
      throw new Error("unable to create opportunity root record");
    }

    // Create initial opportunity version
    const {
      attachments,
      status,
      inceptionPhase,
      prototypePhase,
      implementationPhase,
      teamQuestions,
      evaluationPanel,
      ...restOfOpportunity
    } = opportunity;
    const [opportunityVersionRecord] =
      await connection<SWUOpportunityVersionRecord>("swuOpportunityVersions")
        .transacting(trx)
        .insert(
          {
            ...restOfOpportunity,
            id: generateUuid(),
            opportunity: opportunityRootRecord.id,
            createdAt: now,
            createdBy: session.user.id
          },
          "*"
        );

    if (!opportunityVersionRecord) {
      throw new Error("unable to create opportunity version");
    }

    // Create initial opportunity status
    const [opportunityStatusRecord] =
      await connection<SWUOpportunityStatusRecord>("swuOpportunityStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            opportunity: opportunityRootRecord.id,
            createdAt: now,
            createdBy: session.user.id,
            status,
            note: ""
          },
          "*"
        );

    if (!opportunityStatusRecord) {
      throw new Error("unable to create opportunity status");
    }

    // Create attachments
    await createSWUOpportunityAttachments(
      connection,
      trx,
      opportunityVersionRecord.id,
      attachments
    );

    // Create phases
    if (inceptionPhase) {
      await createSWUOpportunityPhase(
        trx,
        opportunityVersionRecord.id,
        inceptionPhase,
        SWUOpportunityPhaseType.Inception,
        session
      );
    }
    if (prototypePhase) {
      await createSWUOpportunityPhase(
        trx,
        opportunityVersionRecord.id,
        prototypePhase,
        SWUOpportunityPhaseType.Prototype,
        session
      );
    }
    await createSWUOpportunityPhase(
      trx,
      opportunityVersionRecord.id,
      implementationPhase,
      SWUOpportunityPhaseType.Implementation,
      session
    );

    // Create team questions
    for (const teamQuestion of teamQuestions) {
      await connection<RawTeamQuestion & { opportunityVersion: Id }>(
        "swuTeamQuestions"
      )
        .transacting(trx)
        .insert({
          ...teamQuestion,
          createdAt: now,
          createdBy: session.user.id,
          opportunityVersion: opportunityVersionRecord.id
        });
    }

    // Create evaluation panel
    for (const member of evaluationPanel) {
      await connection<RawSWUEvaluationPanelMember>("swuEvaluationPanelMembers")
        .transacting(trx)
        .insert({
          ...member,
          id: generateUuid(),
          opportunityVersion: opportunityVersionRecord.id
        });
    }

    return opportunityRootRecord.id;
  });

  const dbResult = await readOneSWUOpportunity(
    connection,
    opportunityId,
    session
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to create opportunity");
  }
  return valid(dbResult.value);
});

export const createSWUOpportunityPhase = tryDb<
  [
    Id,
    CreateSWUOpportunityPhaseParams,
    SWUOpportunityPhaseType,
    AuthenticatedSession
  ],
  SWUOpportunityPhase
>(async (connection, opportunityVersionId, phase, type, session) => {
  const now = new Date();
  const { requiredCapabilities, ...restOfRaw } = phase;
  const phaseId = await connection.transaction(async (trx) => {
    const [phaseRecord] = await connection<
      RawSWUOpportunityPhase & { opportunityVersion: Id }
    >("swuOpportunityPhases")
      .transacting(trx)
      .insert(
        {
          ...restOfRaw,
          id: generateUuid(),
          phase: type,
          opportunityVersion: opportunityVersionId,
          createdAt: now,
          createdBy: session.user.id
        },
        "*"
      );

    if (!phaseRecord) {
      throw new Error("unable to create opportunity phase");
    }

    for (const requiredCapability of requiredCapabilities) {
      await connection<RawPhaseRequiredCapability & { phase: Id }>(
        "swuPhaseCapabilities"
      )
        .transacting(trx)
        .insert(
          {
            ...requiredCapability,
            phase: phaseRecord.id,
            createdAt: now,
            createdBy: session.user.id
          },
          "*"
        );
    }
    return phaseRecord.id;
  });

  return await readOneSWUOpportunityPhase(connection, phaseId);
});

export const updateSWUOpportunityVersion = tryDb<
  [UpdateSWUOpportunityParams, AuthenticatedSession],
  SWUOpportunity
>(async (connection, opportunity, session) => {
  const now = new Date();
  const {
    attachments,
    inceptionPhase,
    prototypePhase,
    implementationPhase,
    teamQuestions,
    evaluationPanel,
    ...restOfOpportunity
  } = opportunity;
  const opportunityVersion = await connection.transaction(async (trx) => {
    const [versionRecord] = await connection<SWUOpportunityVersionRecord>(
      "swuOpportunityVersions"
    )
      .transacting(trx)
      .insert(
        {
          ...restOfOpportunity,
          opportunity: restOfOpportunity.id,
          id: generateUuid(),
          createdAt: now,
          createdBy: session.user.id
        },
        "*"
      );

    if (!versionRecord) {
      throw new Error("unable to update opportunity");
    }

    // Create attachments
    await createSWUOpportunityAttachments(
      connection,
      trx,
      versionRecord.id,
      attachments || []
    );

    // Create phases
    if (inceptionPhase) {
      await createSWUOpportunityPhase(
        trx,
        versionRecord.id,
        inceptionPhase,
        SWUOpportunityPhaseType.Inception,
        session
      );
    }
    if (prototypePhase) {
      await createSWUOpportunityPhase(
        trx,
        versionRecord.id,
        prototypePhase,
        SWUOpportunityPhaseType.Prototype,
        session
      );
    }
    await createSWUOpportunityPhase(
      trx,
      versionRecord.id,
      implementationPhase,
      SWUOpportunityPhaseType.Implementation,
      session
    );

    // Create team questions
    for (const teamQuestion of teamQuestions) {
      await connection<RawTeamQuestion & { opportunityVersion: Id }>(
        "swuTeamQuestions"
      )
        .transacting(trx)
        .insert({
          ...teamQuestion,
          createdAt: now,
          createdBy: session.user.id,
          opportunityVersion: versionRecord.id
        });
    }

    // Create evaluation panel
    for (const member of evaluationPanel) {
      await connection<RawSWUEvaluationPanelMember>("swuEvaluationPanelMembers")
        .transacting(trx)
        .insert({
          ...member,
          id: generateUuid(),
          opportunityVersion: versionRecord.id
        });
    }

    // Add an 'edit' change record
    await connection<RawSWUOpportunityHistoryRecord & { opportunity: Id }>(
      "swuOpportunityStatuses"
    ).insert({
      id: generateUuid(),
      opportunity: restOfOpportunity.id,
      createdAt: now,
      createdBy: session.user.id,
      event: SWUOpportunityEvent.Edited,
      note: ""
    });

    return versionRecord;
  });
  const dbResult = await readOneSWUOpportunity(
    connection,
    opportunityVersion.opportunity,
    session
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update opportunity");
  }
  return valid(dbResult.value);
});

export const updateSWUOpportunityStatus = tryDb<
  [Id, SWUOpportunityStatus, string, AuthenticatedSession],
  SWUOpportunity
>(async (connection, id, status, note, session) => {
  const now = new Date();
  const [result] = await connection<
    RawSWUOpportunityHistoryRecord & { opportunity: Id }
  >("swuOpportunityStatuses").insert(
    {
      id: generateUuid(),
      opportunity: id,
      createdAt: now,
      createdBy: session.user.id,
      status,
      note
    },
    "*"
  );

  if (!result) {
    throw new Error("unable to update opportunity");
  }

  const dbResult = await readOneSWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update opportunity");
  }

  return valid(dbResult.value);
});

export const addSWUOpportunityAddendum = tryDb<
  [Id, string, AuthenticatedSession],
  SWUOpportunity
>(async (connection, id, addendumText, session) => {
  const now = new Date();
  await connection.transaction(async (trx) => {
    const [addendum] = await connection<
      RawSWUOpportunityAddendum & { opportunity: Id }
    >("swuOpportunityAddenda")
      .transacting(trx)
      .insert(
        {
          id: generateUuid(),
          opportunity: id,
          description: addendumText,
          createdBy: session.user.id,
          createdAt: now
        },
        "*"
      );

    if (!addendum) {
      throw new Error("unable to add addendum");
    }

    // Add a history record for the addendum addition
    await connection<RawSWUOpportunityHistoryRecord & { opportunity: Id }>(
      "swuOpportunityStatuses"
    )
      .transacting(trx)
      .insert({
        id: generateUuid(),
        opportunity: id,
        createdAt: now,
        createdBy: session.user.id,
        event: SWUOpportunityEvent.AddendumAdded,
        note: ""
      });
  });

  const dbResult = await readOneSWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to add addendum");
  }
  return valid(dbResult.value);
});

export const deleteSWUOpportunity = tryDb<[Id, Session], SWUOpportunity>(
  async (connection, id, session) => {
    // Read the opportunity first, so we can respond with it after deleting
    const opportunity = getValidValue(
      await readOneSWUOpportunity(connection, id, session),
      undefined
    );
    if (!opportunity) {
      throw new Error("unable to delete opportunity");
    }
    // Delete root record - cascade relationships in database will cleanup versions/attachments/addenda automatically
    const [result] = await connection<RawSWUOpportunity>("swuOpportunities")
      .where({ id })
      .delete("*");

    if (!result) {
      throw new Error("unable to delete opportunity");
    }
    result.addenda = [];
    result.attachments = [];
    return valid(opportunity);
  }
);

export const closeSWUOpportunities = tryDb<[], number>(async (connection) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      const lapsedOpportunities = (await generateSWUOpportunityQuery(trx, true)
        .where({ status: SWUOpportunityStatus.Published })
        .andWhere(
          "versions.proposalDeadline",
          "<=",
          now
        )) as RawSWUOpportunity[];

      for (const lapsedOpportunity of lapsedOpportunities) {
        // Set the opportunity to EVAL_QUESTIONS_INDIVIDUAL status
        await connection("swuOpportunityStatuses").transacting(trx).insert({
          id: generateUuid(),
          createdAt: now,
          opportunity: lapsedOpportunity.id,
          status: SWUOpportunityStatus.EvaluationTeamQuestionsIndividual,
          note: "This opportunity has closed."
        });

        // Get a list of SUBMITTED proposals for this opportunity
        const proposalIds =
          (
            await connection<{ id: Id }>("swuProposals as proposals")
              .transacting(trx)
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
              .where({
                "proposals.opportunity": lapsedOpportunity.id,
                "statuses.status": SWUProposalStatus.Submitted
              })
              .select<Array<{ id: Id }>>("proposals.id")
          )?.map((result) => result.id) || [];

        for (const [index, proposalId] of proposalIds.entries()) {
          // Set the proposal to EVALUATION_QUESTIONS_INDIVIDUAL status
          await connection("swuProposalStatuses").transacting(trx).insert({
            id: generateUuid(),
            createdAt: now,
            proposal: proposalId,
            status: SWUProposalStatus.EvaluationTeamQuestionsIndividual,
            note: ""
          });

          // And generate anonymized name
          await connection("swuProposals")
            .transacting(trx)
            .where({ id: proposalId })
            .update({
              anonymousProponentName: `Proponent ${index + 1}`
            });
        }
      }
      // Generate notifications for each of the lapsed opportunities
      for (const rawOpportunity of lapsedOpportunities) {
        // We don't need attachments/addenda, but insert empty arrays so we can convert
        rawOpportunity.attachments = [];
        rawOpportunity.addenda = [];
        rawOpportunity.teamQuestions = [];
        const conditions = {
          opportunityVersion: rawOpportunity.versionId,
          phase: SWUOpportunityPhaseType.Implementation
        };
        // We also need to get the implementation phase for this opportunity to convert it from raw
        rawOpportunity.implementationPhase =
          (
            await connection<{ id: Id }>("swuOpportunityPhases")
              .where(conditions)
              .select("id")
              .first()
          )?.id || "";
        swuOpportunityNotifications.handleSWUReadyForEvaluation(
          connection,
          await rawSWUOpportunityToSWUOpportunity(connection, rawOpportunity)
        );
      }
      return lapsedOpportunities.length;
    })
  );
});

export const countScreenedInSWUCodeChallenge = tryDb<[Id], number>(
  async (connection, opportunity) => {
    return valid(
      (
        await connection("swuProposals as proposals")
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
          .where({
            "proposals.opportunity": opportunity,
            "statuses.status": SWUProposalStatus.UnderReviewCodeChallenge
          })
      )?.length || 0
    );
  }
);

export const countScreenInSWUTeamScenario = tryDb<[Id], number>(
  async (connection, opportunity) => {
    return valid(
      (
        await connection("swuProposals as proposals")
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
          .where({
            "proposals.opportunity": opportunity,
            "statuses.status": SWUProposalStatus.UnderReviewTeamScenario
          })
      )?.length || 0
    );
  }
);

export const readOneSWUOpportunityAuthor = tryDb<[Id], User | null>(
  async (connection, id) => {
    const authorId =
      (
        await connection<{ createdBy: Id }>("swuOpportunities as opportunities")
          .where("id", id)
          .select<{ createdBy: Id }>("createdBy")
          .first()
      )?.createdBy || null;

    return authorId ? await readOneUser(connection, authorId) : valid(null);
  }
);

// TODO: add indexes
export const readOneSWUEvaluationPanelMemberWithId = tryDb<
  [Id, Id],
  (SWUEvaluationPanelMember & { id: Id }) | null
>(async (connection, user, opportunity) => {
  const raw = await connection<RawSWUEvaluationPanelMember>(
    "swuEvaluationPanelMembers"
  )
    .join(
      "swuOpportunityVersions",
      "swuEvaluationPanelMembers.opportunityVersion",
      "=",
      "swuOpportunityVersions.id"
    )
    .where({
      "swuOpportunityVersions.opportunity": opportunity,
      "swuEvaluationPanelMembers.user": user
    })
    .select("swuEvaluationPanelMembers.*")
    .first();

  return valid(
    raw
      ? {
          ...(await rawEvaluationPanelMemberToEvaluationPanelMember(
            connection,
            raw
          )),
          id: raw.id
        }
      : null
  );
});

export const readOneSWUEvaluationPanelMemberById = tryDb<
  [Id],
  SWUEvaluationPanelMember | null
>(async (connection, id) => {
  const raw = await connection<RawSWUEvaluationPanelMember>(
    "swuEvaluationPanelMembers"
  )
    .where("id", id)
    .first();

  return valid(
    raw
      ? await rawEvaluationPanelMemberToEvaluationPanelMember(connection, raw)
      : null
  );
});

export const addSWUOpportunityNote = tryDb<
  [Id, UpdateSWUOpportunityWithNoteParams, AuthenticatedSession],
  SWUOpportunity
>(async (connection, id, noteParams, session) => {
  const now = new Date();
  await connection.transaction(async (trx) => {
    // Add a history record for the note addition
    const [event] = await connection<
      RawSWUOpportunityHistoryRecord & { opportunity: Id }
    >("swuOpportunityStatuses")
      .transacting(trx)
      .insert(
        {
          id: generateUuid(),
          opportunity: id,
          createdAt: now,
          createdBy: session.user.id,
          event: SWUOpportunityEvent.NoteAdded,
          note: noteParams.note
        },
        "*"
      );

    if (!event) {
      throw new Error("unable to create note for opportunity");
    }

    await createSWUOpportunityNoteAttachments(
      connection,
      trx,
      event.id,
      noteParams.attachments
    );
  });

  const dbResult = await readOneSWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to add note");
  }
  return valid(dbResult.value);
});

export const submitIndividualQuestionEvaluations = tryDb<
  [Id, SubmitQuestionEvaluationsWithNoteParams, AuthenticatedSession],
  SWUOpportunity
>(async (connection, id, evaluationParams, session) => {
  const now = new Date();
  await connection.transaction(async (trx) => {
    await Promise.all(
      evaluationParams.evaluations.map(
        async ({ id: evaluationId, proposal: { id: proposalId } }) => {
          const [statusRecord] =
            await connection<SWUTeamQuestionResponseEvaluationStatusRecord>(
              "swuTeamQuestionResponseEvaluationStatuses"
            )
              .transacting(trx)
              .insert(
                {
                  id: generateUuid(),
                  teamQuestionResponseEvaluation: evaluationId,
                  createdAt: now,
                  createdBy: session.user.id,
                  status: SWUTeamQuestionResponseEvaluationStatus.Submitted,
                  note: evaluationParams.note
                },
                "*"
              );

          // Update evaluation root record
          await connection<RawSWUTeamQuestionResponseEvaluation>(
            "swuTeamQuestionResponseEvaluations"
          )
            .transacting(trx)
            .where({ id: evaluationId })
            .update(
              {
                updatedAt: now
              },
              "*"
            );

          if (!statusRecord) {
            throw new Error("unable to update team question evaluation");
          }

          if (
            await allIndividualSWUTeamQuestionResponseEvaluationsComplete(
              connection,
              trx,
              proposalId,
              id
            )
          ) {
            const result = await updateSWUProposalStatus(
              connection,
              proposalId,
              SWUProposalStatus.EvaluationTeamQuestionsConsensus,
              "",
              session
            );
            if (isInvalid(result)) {
              throw new Error("unable to update proposal");
            }
          }
        }
      )
    );

    // Update opportunity status if all evaluations complete for proposal
    const updatedSWUProposals = getValidValue(
      await readManySWUProposals(connection, session, id),
      undefined
    );
    if (!updatedSWUProposals) {
      throw new Error("unable to read proposals");
    }

    if (
      updatedSWUProposals.every(
        (proposal) =>
          proposal.status !==
          SWUProposalStatus.EvaluationTeamQuestionsIndividual
      )
    ) {
      const result = await updateSWUOpportunityStatus(
        connection,
        id,
        SWUOpportunityStatus.EvaluationTeamQuestionsConsensus,
        "",
        session
      );

      if (!result) {
        throw new Error("unable to update opportunity");
      }
    }
  });

  const dbResult = await readOneSWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to add note");
  }
  return valid(dbResult.value);
});
