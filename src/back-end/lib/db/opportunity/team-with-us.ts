import { generateUuid } from "back-end/lib";
import {
  allTWUResourceQuestionResponseEvaluatorEvaluationsSubmitted,
  Connection,
  RawTWUOpportunitySubscriber,
  RawTWUProposal,
  RawTWUProposalHistoryRecord,
  RawTWUResourceQuestionResponseEvaluation,
  readManyTWUProposals,
  readManyTWUResourceQuestionResponseEvaluations,
  readOneOrganizationContactEmail,
  readOneServiceAreaByServiceAreaId,
  readOneTWUAwardedProposal,
  readSubmittedTWUProposalCount,
  Transaction,
  tryDb,
  TWU_CHAIR_EVALUATION_STATUS_TABLE_NAME,
  TWU_CHAIR_EVALUATION_TABLE_NAME,
  TWU_EVALUATOR_EVALUATION_STATUS_TABLE_NAME,
  TWU_EVALUATOR_EVALUATION_TABLE_NAME,
  TWUResourceQuestionResponseEvaluationStatusRecord
} from "back-end/lib/db";
import { readOneFileById } from "back-end/lib/db/file";
import { readOneUser, readOneUserSlim } from "back-end/lib/db/user";
import { Knex } from "knex";
import { valid } from "shared/lib/http";
import { Addendum } from "shared/lib/resources/addendum";
import { getTWUOpportunityViewsCounterName } from "shared/lib/resources/counter";
import { FileRecord } from "shared/lib/resources/file";
import {
  CreateTWUEvaluationPanelMemberBody,
  CreateTWUOpportunityStatus,
  CreateTWUResourceQuestionBody,
  privateOpportunityStatuses,
  publicOpportunityStatuses,
  TWUEvaluationPanelMember,
  TWUOpportunity,
  TWUOpportunityEvent,
  TWUOpportunityHistoryRecord,
  TWUOpportunitySlim,
  TWUOpportunityStatus,
  TWUResource,
  TWUResourceQuestion,
  ValidatedCreateTWUResourceBody
} from "shared/lib/resources/opportunity/team-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { User, UserType } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { getValidValue, isInvalid, isValid } from "shared/lib/validation";
import {
  compareTWUProposalsForPublicSector,
  TWUProposalEvent,
  TWUProposalSlim,
  TWUProposalStatus
} from "shared/lib/resources/proposal/team-with-us";
import * as twuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/team-with-us";
import { ServiceAreaId } from "shared/lib/resources/service-area";
import {
  TWUResourceQuestionResponseEvaluation,
  TWUResourceQuestionResponseEvaluationStatus
} from "shared/lib/resources/evaluations/team-with-us/resource-questions";
import { TWU_CODE_CHALLENGE_SCREEN_IN_COUNT } from "shared/config";

/**
 * @remarks
 *
 * Summary: This file holds SQL queries for interacting with data associated
 * with Team With Us Opportunities
 */

/**
 * serviceArea is intentionally a number value for CreateTWUOpportunityParams, not an enum (backwards compatibility)
 */
export interface CreateTWUOpportunityParams
  extends Omit<
    TWUOpportunity,
    | "createdBy"
    | "createdAt"
    | "updatedAt"
    | "updatedBy"
    | "status"
    | "id"
    | "addenda"
    | "resourceQuestions"
    | "resources"
    | "evaluationPanel"
  > {
  status: CreateTWUOpportunityStatus;
  resourceQuestions: CreateTWUResourceQuestionBody[];
  resources: ValidatedCreateTWUResourceBody[];
  evaluationPanel: CreateTWUEvaluationPanelMemberParams[];
}

interface UpdateTWUOpportunityParams
  extends Omit<CreateTWUOpportunityParams, "status"> {
  id: Id;
}

interface SubmitQuestionEvaluationsWithNoteParams {
  note: string;
  evaluations: TWUResourceQuestionResponseEvaluation[];
}

interface CreateTWUEvaluationPanelMemberParams
  extends Omit<CreateTWUEvaluationPanelMemberBody, "email"> {
  user: Id;
}

interface TWUOpportunityRootRecord {
  id: Id;
  createdAt: Date;
  createdBy: Id;
}

interface TWUOpportunityVersionRecord
  extends Omit<TWUOpportunity, "status" | "createdBy"> {
  createdBy: Id;
  opportunity: Id;
}

/**
 * serviceArea is intentionally a number value here, not an enum (backwards compatibility)
 */
interface TWUResourceRecord {
  id: Id;
  serviceArea: ServiceAreaId;
  opportunityVersion: Id;
  mandatorySkills: string[];
  optionalSkills: string[];
  targetAllocation: number;
  order: number;
}

interface TWUOpportunityStatusRecord {
  id: Id;
  opportunity: Id;
  createdAt: Date;
  createdBy: Id;
  status: TWUOpportunityStatus;
  note: string;
}

/**
 * Raw is a naming convention typically used to indicate that it handles data
 * after a read action from the database
 *
 * @example
 * resources, for instance only needs to be an array of ids to feed a subsequent db query
 * for resources that match the array of ids passed to it.
 */
export interface RawTWUOpportunity
  extends Omit<
    TWUOpportunity,
    | "createdBy"
    | "updatedBy"
    | "attachments"
    | "addenda"
    | "resourceQuestions"
    | "resources"
  > {
  createdBy?: Id;
  updatedBy?: Id;
  attachments: Id[];
  addenda: Id[];
  resourceQuestions: Id[];
  resources: Id[];
  versionId?: Id;
}

/**
 * @privateRemarks
 * removed serviceArea 01/01/2024
 */
export interface RawTWUOpportunitySlim
  extends Omit<TWUOpportunitySlim, "createdBy" | "updatedBy"> {
  createdBy?: Id;
  updatedBy?: Id;
  versionId: Id;
}

interface RawTWUOpportunityAddendum extends Omit<Addendum, "createdBy"> {
  createdBy?: Id;
}

interface RawResourceQuestion extends Omit<TWUResourceQuestion, "createdBy"> {
  createdBy?: Id;
  opportunityVersion: Id;
}

/**
 * Raw is a naming convention that references data that's read from the db and has yet to be massaged into a relevant
 * type or interface
 * object
 * @TODO - seems too slim
 */
interface RawResource {
  id: Id;
}

interface RawTWUOpportunityHistoryRecord
  extends Omit<
    TWUOpportunityHistoryRecord,
    "createdBy" | "type" | "attachments"
  > {
  createdBy: Id | null;
  status?: TWUOpportunityStatus;
  event?: TWUOpportunityEvent;
  attachments: Id[];
}

export interface RawTWUEvaluationPanelMember
  extends Omit<TWUEvaluationPanelMember, "user"> {
  opportunityVersion: Id;
  user: Id;
}

/**
 * Safety check. Prior to putting data in the db, receives a TWU
 * opportunity from user input, ensures that values such as userId are
 * accurate and valid.
 *
 * @param connection
 * @param raw - raw user input
 * @returns TWUOpportunity
 */
async function rawTWUOpportunityToTWUOpportunity(
  connection: Connection,
  raw: RawTWUOpportunity
): Promise<TWUOpportunity> {
  const {
    createdBy: createdById,
    updatedBy: updatedById,
    attachments: attachmentIds,
    resources: resourceIds,
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
    await readManyTWUAddendum(connection, raw.id),
    undefined
  );
  const resourceQuestions = getValidValue(
    await readManyResourceQuestions(connection, raw.versionId ?? ""),
    undefined
  );

  const resources = getValidValue(
    await readManyResources(connection, raw.versionId ?? ""),
    undefined
  );

  if (!addenda || !resourceQuestions || !resources) {
    throw new Error("unable to process opportunity");
  }

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined,
    attachments,
    addenda,
    resourceQuestions,
    resources
  };
}

/**
 * Safety Check. Prior to putting data in the db, receives a so-called slim TWU
 * opportunity from user input, ensures that values such as userId are
 * accurate and valid.
 *
 * @param connection
 * @param raw - raw user input
 * @returns TWUOpportunitySlim
 */
async function rawTWUOpportunitySlimToTWUOpportunitySlim(
  connection: Connection,
  raw: RawTWUOpportunitySlim
): Promise<TWUOpportunitySlim> {
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

/**
 * Safety Check. Prior to putting data in the db, receives a TWU
 * opportunity Addendum from user input, ensures that values such as userId are
 * accurate and valid.
 *
 * @param connection
 * @param raw - raw user input
 * @returns Addendum
 */
async function rawTWUOpportunityAddendumToTWUOpportunityAddendum(
  connection: Connection,
  raw: RawTWUOpportunityAddendum
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

/**
 * Safety Check. Prior to putting data in the db, receives a TWU
 * resource question from user input, ensures that values such as userId are
 * accurate and valid.
 *
 * @param connection
 * @param raw - raw user input
 * @returns TWUResourceQuestion
 */
async function rawResourceQuestionToResourceQuestion(
  connection: Connection,
  raw: RawResourceQuestion
): Promise<TWUResourceQuestion> {
  const { createdBy: createdById, opportunityVersion, ...restOfRaw } = raw;

  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), undefined)
    : undefined;

  if (!createdBy) {
    throw new Error("unable to process resource question");
  }

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined
  };
}

/**
 * Reads a TWU resource from the database, if given id of the resource
 */
export const readOneResource = tryDb<[Id], TWUResourceRecord | null>(
  async (connection, id) => {
    const result = await connection<TWUResourceRecord>("twuResources")
      .where({ id })
      .select(
        "id",
        "serviceArea",
        "targetAllocation",
        "opportunityVersion",
        "mandatorySkills",
        "optionalSkills",
        "order"
      )
      .first();
    return valid(result ? result : null);
  }
);

/**
 * `Raw` naming convention typically indicates data that's been derived from a read action on the db,
 * in this particular case, the 'raw' data is the `id` or primary key of a TWUResource obtained from
 * a previous query.
 *
 * @param connection
 * @param raw
 * @returns TWUResourceRecord - the shape of the database table
 */
async function rawResourceToResource(
  connection: Connection,
  raw: RawResource
): Promise<TWUResource> {
  const { id } = raw;
  const resource = id
    ? getValidValue(await readOneResource(connection, id), undefined)
    : undefined;

  if (!resource) {
    throw new Error("unable to process resource");
  }

  // convert the serviceAreaId number back to an enumerated value
  const serviceArea = resource.serviceArea
    ? getValidValue(
        await readOneServiceAreaByServiceAreaId(
          connection,
          resource.serviceArea
        ),
        undefined
      )
    : undefined;

  if (!serviceArea) {
    throw new Error("unable to process resource");
  }

  return {
    id,
    serviceArea,
    targetAllocation: resource.targetAllocation,
    mandatorySkills: resource.mandatorySkills,
    optionalSkills: resource.optionalSkills,
    order: resource.order
  };
}

/**
 * Safety Check. Prior to putting data in the db, receives a TWU
 * opportunity history record from user input, ensures that values such as
 * userId are accurate and valid.
 *
 * @param connection - connection to the database
 * @param _session - to ensure authenticated users
 * @param raw - raw user input
 * @returns TWUOpportunityHistoryRecord
 */
async function rawHistoryRecordToHistoryRecord(
  connection: Connection,
  _session: Session,
  raw: RawTWUOpportunityHistoryRecord
): Promise<TWUOpportunityHistoryRecord> {
  const { createdBy: createdById, status, event, ...restOfRaw } = raw;
  const createdBy = createdById
    ? getValidValue(await readOneUserSlim(connection, createdById), null)
    : null;

  if (!status && !event) {
    throw new Error("unable to process opportunity status record");
  }

  return {
    ...restOfRaw,
    createdBy,
    type: status
      ? adt("status", status as TWUOpportunityStatus)
      : adt("event", event as TWUOpportunityEvent)
  };
}

async function rawEvaluationPanelMemberToEvaluationPanelMember(
  connection: Connection,
  raw: RawTWUEvaluationPanelMember
): Promise<TWUEvaluationPanelMember> {
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

/**
 * Retrieves the latest versions of a TWU opportunities from the db. Will return
 * either a query for the full record of a TWU opp, or a query that retrieves a
 * slimmed down version of it
 *
 * @param connection
 * @param full - boolean, either a full record or a slimmed down record
 * @returns query
 */
export function generateTWUOpportunityQuery(
  connection: Connection,
  full = false
) {
  const query: Knex.QueryBuilder = connection<RawTWUOpportunity>(
    "twuOpportunities as opportunities"
  )
    // Join on latest TWU status
    .join(
      connection.raw(
        `(SELECT DISTINCT ON (opportunity) * FROM "twuOpportunityStatuses"
         WHERE status IS NOT NULL
         ORDER BY opportunity, "createdAt" DESC) as statuses`
      ),
      "opportunities.id",
      "statuses.opportunity"
    )
    // Join on latest TWU version
    .join(
      connection.raw(
        `(SELECT DISTINCT ON (opportunity) * FROM "twuOpportunityVersions"
         ORDER BY opportunity, "createdAt" DESC) as versions`
      ),
      "opportunities.id",
      "versions.opportunity"
    )
    .select<RawTWUOpportunitySlim[]>(
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
      "versions.maxBudget",
      "versions.proposalDeadline",
      "statuses.status"
    );

  if (full) {
    query.select<RawTWUOpportunity[]>(
      "versions.remoteDesc",
      "versions.maxBudget",
      "versions.description",
      "versions.assignmentDate",
      "versions.questionsWeight",
      "versions.challengeWeight",
      "versions.priceWeight",
      "versions.startDate",
      "versions.completionDate"
    );
  }
  return query;
}

// TODO - Unlike TWU, TWU does not currently have the ability to add attachments to Notes
// async function createTWUOpportunityNoteAttachments(
//   connection: Connection,
//   trx: Transaction,
//   eventId: Id,
//   attachments: FileRecord[]
// ) {
//   for (const attachment of attachments) {
//     const [attachmentResult] = await connection("twuOpportunityNoteAttachments")
//       .transacting(trx)
//       .insert(
//         {
//           event: eventId,
//           file: attachment.id
//         },
//         "*"
//       );
//     if (!attachmentResult) {
//       throw new Error("Unable to create opportunity attachment");
//     }
//   }
// }

/**
 * Checks to see if an opportunity was created by a user for the purpose of
 * permissions and what might be granted to them.
 *
 * @see {@link editTWUOpportunity} in '/src/back-end/lib/permissions.ts'
 *
 * @param connection
 * @param user - the user
 * @param id - the opportunity id
 */
export async function isTWUOpportunityAuthor(
  connection: Connection,
  user: User,
  id: Id
): Promise<boolean> {
  try {
    const result = await connection<RawTWUOpportunity>("twuOpportunities")
      .select("*")
      .where({ id, createdBy: user.id });
    return !!result && result.length > 0;
  } catch {
    return false;
  }
}

export const readManyTWUAddendum = tryDb<[Id], Addendum[]>(
  async (connection, opportunityId) => {
    const results = await connection<RawTWUOpportunityAddendum>(
      "twuOpportunityAddenda"
    ).where("opportunity", opportunityId);

    if (!results) {
      throw new Error("unable to read addenda");
    }

    return valid(
      await Promise.all(
        results.map(
          async (raw) =>
            await rawTWUOpportunityAddendumToTWUOpportunityAddendum(
              connection,
              raw
            )
        )
      )
    );
  }
);

export const readManyResourceQuestions = tryDb<[Id], TWUResourceQuestion[]>(
  async (connection, opportunityVersionId) => {
    const results = await connection<RawResourceQuestion>(
      "twuResourceQuestions"
    )
      .where({ opportunityVersion: opportunityVersionId })
      .orderBy("order", "asc");

    if (!results) {
      throw new Error("unable to read resource questions");
    }

    return valid(
      await Promise.all(
        results.map(
          async (raw) =>
            await rawResourceQuestionToResourceQuestion(connection, raw)
        )
      )
    );
  }
);

/**
 * Reads TWUResources from the database, when given opportunityVersion id that's connected to the Resources
 */
export const readManyResources = tryDb<[Id], TWUResource[]>(
  async (connection, opportunityVersionId) => {
    const results = await connection<RawResource>("twuResources")
      .where("opportunityVersion", opportunityVersionId)
      .orderBy("order", "asc");
    if (!results) {
      throw new Error("unable to read resources");
    }
    return valid(
      await Promise.all(
        results.map(async (raw) => await rawResourceToResource(connection, raw))
      )
    );
  }
);

export const readManyTWUOpportunities = tryDb<
  [Session, boolean?],
  TWUOpportunitySlim[]
>(async (connection, session, isPanelMember = false) => {
  // broad query returning many TWU Opportunities
  let query = generateTWUOpportunityQuery(connection);

  // gets further refined with WHERE clauses
  if (!session || session.user.type === UserType.Vendor) {
    // Anonymous users and vendors can only see public opportunities
    query = query.whereIn(
      "statuses.status",
      publicOpportunityStatuses as TWUOpportunityStatus[]
    );
  } else if (
    session.user.type === UserType.Government ||
    session.user.type === UserType.Admin
  ) {
    if (isPanelMember) {
      // When isPanelMember=true, ONLY include opportunities where user is on evaluation panel
      // works for admin and gov basic users
      query = query.whereIn("versions.id", function () {
        this.select("opportunityVersion")
          .from("twuEvaluationPanelMembers")
          .where("user", "=", session.user.id);
      });
    } else if (session.user.type === UserType.Government) {
      // Regular behavior - show public opportunities and private ones the user created
      // works for gov basic users only
      query = query
        .whereIn(
          "statuses.status",
          publicOpportunityStatuses as TWUOpportunityStatus[]
        )
        .orWhere(function () {
          this.whereIn(
            "statuses.status",
            privateOpportunityStatuses as TWUOpportunityStatus[]
          ).andWhere({ "opportunities.createdBy": session.user?.id });
        });
    }
  }
  // Admins can see all opportunities, so no additional filter necessary if none of the previous conditions match
  // Process results to eliminate fields not viewable by the current role
  const results = await Promise.all(
    (
      await query
    ).map(async (result: RawTWUOpportunity | RawTWUOpportunitySlim) => {
      if (session) {
        result.subscribed = await isSubscribed(
          connection,
          result.id,
          session.user.id
        );
      }
      return processForRole(result, session, isPanelMember);
    })
  );
  return valid(
    await Promise.all(
      results.map(
        async (raw) =>
          await rawTWUOpportunitySlimToTWUOpportunitySlim(connection, raw)
      )
    )
  );
});

async function createTWUOpportunityAttachments(
  connection: Connection,
  trx: Transaction,
  oppVersionId: Id,
  attachments: FileRecord[]
) {
  for (const attachment of attachments) {
    const [attachmentResult] = await connection("twuOpportunityAttachments")
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

function processForRole<T extends RawTWUOpportunity | RawTWUOpportunitySlim>(
  result: T,
  session: Session,
  isPanelMember = false
) {
  // Remove createdBy/updatedBy for non-admin or non-author
  if (
    !session ||
    (session.user.type !== UserType.Admin &&
      session.user.id !== result.createdBy &&
      session.user.id !== result.updatedBy &&
      !isPanelMember)
  ) {
    delete result.createdBy;
    delete result.updatedBy;
  }
  return result;
}

export const readOneTWUOpportunitySlim = tryDb<
  [Id, Session],
  TWUOpportunitySlim | null
>(async (connection, id, session) => {
  let result = await generateTWUOpportunityQuery(connection)
    .where({ "opportunities.id": id })
    .first();

  if (result) {
    result = processForRole(result, session);
  }

  return result
    ? valid(await rawTWUOpportunitySlimToTWUOpportunitySlim(connection, result))
    : valid(null);
});

async function isSubscribed(
  connection: Connection,
  oppId: Id,
  userId: Id
): Promise<boolean> {
  return !!(await connection<RawTWUOpportunitySubscriber>(
    "twuOpportunitySubscribers"
  )
    .where({ opportunity: oppId, user: userId })
    .first());
}

export const readOneTWUOpportunity = tryDb<
  [Id, Session],
  TWUOpportunity | null
>(async (connection, id, session) => {
  // returns one row based on opportunity id
  let query = generateTWUOpportunityQuery(connection, true).where({
    "opportunities.id": id
  });

  // further refines query with where conditions
  if (!session || session.user.type === UserType.Vendor) {
    // Anonymous users and vendors can only see public opportunities
    query = query.whereIn(
      "statuses.status",
      publicOpportunityStatuses as TWUOpportunityStatus[]
    );
  } else if (session.user.type === UserType.Government) {
    // Gov users should only see private opportunities they own or are on the
    // evaluation panel for, and public opportunities
    query = query.andWhere(function () {
      this.whereIn(
        "statuses.status",
        publicOpportunityStatuses as TWUOpportunityStatus[]
      ).orWhere(function () {
        this.whereIn(
          "statuses.status",
          privateOpportunityStatuses as TWUOpportunityStatus[]
        ).andWhere(function () {
          this.where({ "opportunities.createdBy": session.user.id }).orWhereIn(
            "versions.id",
            function () {
              this.select("opportunityVersion")
                .from("twuEvaluationPanelMembers")
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
  // 'First' is similar to select, but only retrieves & resolves with the first record from the query
  let result = await query.first<RawTWUOpportunity>();
  if (result) {
    // Process based on user type
    result = processForRole(result, session);

    // Query for attachment file ids
    result.attachments = (
      await connection<{ file: Id }>("twuOpportunityAttachments")
        .where("opportunityVersion", result.versionId)
        .select("file")
    ).map((row) => row.file);

    // Query for resources
    result.resources = (
      await connection("twuResources")
        .where({ opportunityVersion: result.versionId })
        .select("id")
    ).map((row) => row.id);

    // Get published date if applicable
    const conditions = {
      opportunity: result.id,
      status: TWUOpportunityStatus.Published
    };
    result.publishedAt = (
      await connection<{ createdAt: Date }>("twuOpportunityStatuses")
        .where(conditions)
        .select("createdAt")
        .orderBy("createdAt", "desc")
        .first()
    )?.createdAt;

    // Set awarded proponent flag if applicable
    let awardedProposal: TWUProposalSlim | null;
    if (result.status === TWUOpportunityStatus.Awarded) {
      awardedProposal = getValidValue(
        await readOneTWUAwardedProposal(connection, result.id, session),
        null
      );
      if (
        awardedProposal &&
        awardedProposal.organization &&
        awardedProposal.createdBy
      ) {
        /**
         * Use the score to determine if session of user is permitted to see detailed
         * proponent information.
         */
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
      await connection<RawTWUEvaluationPanelMember>("twuEvaluationPanelMembers")
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
      const rawHistory = await connection<RawTWUOpportunityHistoryRecord>(
        "twuOpportunityStatuses"
      )
        .where("opportunity", result.id)
        .orderBy("createdAt", "desc");

      if (!rawHistory) {
        throw new Error("unable to read opportunity statuses");
      }

      // For reach status record, fetch any attachments and add their ids to the record as an array
      // TODO - Unlike SWU, TWU does not currently have a db table for NoteAttachments
      // await Promise.all(
      //   rawHistory.map(
      //     async (raw) =>
      //       (raw.attachments = (
      //         await connection<{ file: Id }>("twuOpportunityNoteAttachments")
      //           .where("event", raw.id)
      //           .select("file")
      //       ).map((row) => row.file))
      //   )
      // );

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
        const conditions = {
          name: getTWUOpportunityViewsCounterName(result.id)
        };
        // Retrieve opportunity views
        const numViews =
          (
            await connection<{ count: number }>("viewCounters")
              .where(conditions)
              .first()
          )?.count || 0;

        // Retrieve watchers/subscribers
        const numWatchers =
          (
            await connection("twuOpportunitySubscribers").where({
              opportunity: result.id
            })
          )?.length || 0;

        // Retrieve number of submitted proposals (exclude draft/withdrawn)
        const numProposals = getValidValue(
          await readSubmittedTWUProposalCount(connection, result.id),
          0
        );

        result.reporting = {
          numViews,
          numWatchers,
          numProposals: numProposals ?? 0
        };
      }
    }
  }

  return valid(
    result ? await rawTWUOpportunityToTWUOpportunity(connection, result) : null
  );
});

export const createTWUOpportunity = tryDb<
  [CreateTWUOpportunityParams, AuthenticatedSession],
  TWUOpportunity
>(async (connection, opportunity, session) => {
  // Create the opportunity root record
  const now = new Date();
  const opportunityId = await connection.transaction(async (trx) => {
    const [opportunityRootRecord] = await connection<TWUOpportunityRootRecord>(
      "twuOpportunities"
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
      resourceQuestions,
      resources,
      evaluationPanel,
      ...restOfOpportunity
    } = opportunity;
    const [opportunityVersionRecord] =
      await connection<TWUOpportunityVersionRecord>("twuOpportunityVersions")
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

    // Create resources
    for (const twuResource of opportunity.resources) {
      await connection<TWUResourceRecord & { opportunityVersion: Id }>(
        "twuResources"
      )
        .transacting(trx)
        .insert({
          ...twuResource,
          id: generateUuid(),
          opportunityVersion: opportunityVersionRecord.id
        });
    }

    // Create initial opportunity status
    const [opportunityStatusRecord] =
      await connection<TWUOpportunityStatusRecord>("twuOpportunityStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            opportunity: opportunityRootRecord.id,
            createdAt: now,
            createdBy: session.user.id,
            status
          },
          "*"
        );

    if (!opportunityStatusRecord) {
      throw new Error("unable to create opportunity status");
    }

    // Create attachments
    await createTWUOpportunityAttachments(
      connection,
      trx,
      opportunityVersionRecord.id,
      attachments
    );

    // Create resource questions
    for (const resourceQuestion of resourceQuestions) {
      await connection<RawResourceQuestion & { opportunityVersion: Id }>(
        "twuResourceQuestions"
      )
        .transacting(trx)
        .insert({
          ...resourceQuestion,
          createdAt: now,
          createdBy: session.user.id,
          opportunityVersion: opportunityVersionRecord.id
        });
    }

    // Create evaluation panel
    for (const member of evaluationPanel) {
      await connection<RawTWUEvaluationPanelMember>("twuEvaluationPanelMembers")
        .transacting(trx)
        .insert({
          ...member,
          opportunityVersion: opportunityVersionRecord.id
        });
    }

    return opportunityRootRecord.id;
  });

  const dbResult = await readOneTWUOpportunity(
    connection,
    opportunityId,
    session
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to create opportunity");
  }
  return valid(dbResult.value);
});

export const updateTWUOpportunityVersion = tryDb<
  [UpdateTWUOpportunityParams, AuthenticatedSession],
  TWUOpportunity
>(async (connection, opportunity, session) => {
  const now = new Date();
  const {
    attachments,
    resourceQuestions,
    resources,
    evaluationPanel,
    ...restOfOpportunity
  } = opportunity;
  const opportunityVersion = await connection.transaction(async (trx) => {
    const prevResources: TWUResourceRecord[] = await connection<
      TWUResourceRecord & { opportunityVersion: Id }
    >("twuResources as tr")
      .select("tr.*")
      .join(
        "twuOpportunityVersions as tov",
        "tr.opportunityVersion",
        "=",
        "tov.id"
      )
      .where(
        "tov.createdAt",
        "=",
        connection<Date>("twuOpportunityVersions as tov2")
          .max("createdAt")
          .where("tov2.opportunity", "=", restOfOpportunity.id)
      );

    if (prevResources.length === 0) {
      throw new Error("could not fetch previous resources");
    }

    const [versionRecord] = await connection<TWUOpportunityVersionRecord>(
      "twuOpportunityVersions"
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

    for (const twuResourceRecord of resources) {
      const id = generateUuid();
      await connection<TWUResourceRecord & { opportunityVersion: Id }>(
        "twuResources"
      )
        .transacting(trx)
        .insert(
          {
            ...twuResourceRecord,
            id,
            opportunityVersion: versionRecord.id
          },
          "*"
        );
      if (!twuResourceRecord) {
        throw new Error("unable to update resource");
      }

      /**
       * If any of the previous resources have the same properties
       * update team members that referred to that resource so that
       * they point to the new resource.
       */
      for (const pr of prevResources) {
        if (
          pr.serviceArea === twuResourceRecord.serviceArea &&
          pr.targetAllocation === twuResourceRecord.targetAllocation &&
          pr.mandatorySkills.every(
            (skill, index) => skill === twuResourceRecord.mandatorySkills[index]
          ) &&
          pr.optionalSkills.every(
            (skill, index) => skill === twuResourceRecord.optionalSkills[index]
          ) &&
          pr.order === twuResourceRecord.order
        ) {
          const [{ memberCount }] = await connection("twuProposalMember")
            .count("member", { as: "memberCount" })
            .where("resource", "=", pr.id);
          const result = await connection("twuProposalMember")
            .transacting(trx)
            .where("resource", "=", pr.id)
            .update({ resource: id });

          if (result !== Number(memberCount)) {
            throw new Error(
              "unable to port new resource to proposal team members"
            );
          }
        }
      }
    }

    // Create attachments
    await createTWUOpportunityAttachments(
      connection,
      trx,
      versionRecord.id,
      attachments || []
    );

    // Create resource questions
    for (const resourceQuestion of resourceQuestions) {
      await connection<RawResourceQuestion & { opportunityVersion: Id }>(
        "twuResourceQuestions"
      )
        .transacting(trx)
        .insert({
          ...resourceQuestion,
          createdAt: now,
          createdBy: session.user.id,
          opportunityVersion: versionRecord.id
        });
    }

    // Create evaluation panel
    for (const member of evaluationPanel) {
      await connection<RawTWUEvaluationPanelMember>("twuEvaluationPanelMembers")
        .transacting(trx)
        .insert({
          ...member,
          opportunityVersion: versionRecord.id
        });
    }

    // Add an 'edit' change record
    await connection<RawTWUOpportunityHistoryRecord & { opportunity: Id }>(
      "twuOpportunityStatuses"
    ).insert({
      id: generateUuid(),
      opportunity: restOfOpportunity.id,
      createdAt: now,
      createdBy: session.user.id,
      event: TWUOpportunityEvent.Edited,
      note: ""
    });

    return versionRecord;
  });
  const dbResult = await readOneTWUOpportunity(
    connection,
    opportunityVersion.opportunity,
    session
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update opportunity");
  }
  return valid(dbResult.value);
});

export const updateTWUOpportunityStatus = tryDb<
  [Id, TWUOpportunityStatus, string, AuthenticatedSession],
  TWUOpportunity
>(async (connection, id, status, note, session) => {
  const now = new Date();
  const [result] = await connection<
    RawTWUOpportunityHistoryRecord & { opportunity: Id }
  >("twuOpportunityStatuses").insert(
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

  const dbResult = await readOneTWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update opportunity");
  }

  return valid(dbResult.value);
});

export const addTWUOpportunityAddendum = tryDb<
  [Id, string, AuthenticatedSession],
  TWUOpportunity
>(async (connection, id, addendumText, session) => {
  const now = new Date();
  await connection.transaction(async (trx) => {
    const [addendum] = await connection<
      RawTWUOpportunityAddendum & { opportunity: Id }
    >("twuOpportunityAddenda")
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
    await connection<RawTWUOpportunityHistoryRecord & { opportunity: Id }>(
      "twuOpportunityStatuses"
    )
      .transacting(trx)
      .insert({
        id: generateUuid(),
        opportunity: id,
        createdAt: now,
        createdBy: session.user.id,
        event: TWUOpportunityEvent.AddendumAdded,
        note: ""
      });
  });

  const dbResult = await readOneTWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to add addendum");
  }
  return valid(dbResult.value);
});

export const deleteTWUOpportunity = tryDb<[Id, Session], TWUOpportunity>(
  async (connection, id, session) => {
    // Read the opportunity first, so we can respond with it after deleting
    const opportunity = getValidValue(
      await readOneTWUOpportunity(connection, id, session),
      undefined
    );
    if (!opportunity) {
      throw new Error("unable to delete opportunity");
    }
    // Delete root record - cascade relationships in database will cleanup versions/attachments/addenda automatically
    const [result] = await connection<RawTWUOpportunity>("twuOpportunities")
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

export const closeTWUOpportunities = tryDb<[], number>(async (connection) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      const lapsedOpportunities = (await generateTWUOpportunityQuery(trx, true)
        .where({ status: TWUOpportunityStatus.Published })
        .andWhere(
          "versions.proposalDeadline",
          "<=",
          now
        )) as RawTWUOpportunity[];

      for (const lapsedOpportunity of lapsedOpportunities) {
        // Set the opportunity to EVAL_RESOURCE_QUESTIONS status
        await connection("twuOpportunityStatuses").transacting(trx).insert({
          id: generateUuid(),
          createdAt: now,
          opportunity: lapsedOpportunity.id,
          status: TWUOpportunityStatus.EvaluationResourceQuestionsIndividual,
          note: "This opportunity has closed."
        });
        // Get a list of SUBMITTED proposals for this opportunity
        const proposalIds =
          (
            await connection<{ id: Id }>("twuProposals as proposals")
              .transacting(trx)
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
              .where({
                "proposals.opportunity": lapsedOpportunity.id,
                "statuses.status": TWUProposalStatus.Submitted
              })
              .select<Array<{ id: Id }>>("proposals.id")
          )?.map((result) => result.id) || [];

        for (const [index, proposalId] of proposalIds.entries()) {
          // Set the proposal to UNDER_REVIEW status
          await connection("twuProposalStatuses").transacting(trx).insert({
            id: generateUuid(),
            createdAt: now,
            proposal: proposalId,
            status: TWUProposalStatus.UnderReviewResourceQuestions,
            note: ""
          });

          // And generate anonymized name
          await connection("twuProposals")
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
        rawOpportunity.resourceQuestions = [];

        twuOpportunityNotifications.handleTWUReadyForEvaluation(
          connection,
          await rawTWUOpportunityToTWUOpportunity(connection, rawOpportunity)
        );
      }
      return lapsedOpportunities.length;
    })
  );
});

export const countScreenedInTWUChallenge = tryDb<[Id], number>(
  async (connection, opportunity) => {
    return valid(
      (
        await connection("twuProposals as proposals")
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
          .where({
            "proposals.opportunity": opportunity,
            "statuses.status": TWUProposalStatus.UnderReviewChallenge
          })
      )?.length || 0
    );
  }
);

export const readOneTWUOpportunityAuthor = tryDb<[Id], User | null>(
  async (connection, id) => {
    const authorId =
      (
        await connection<{ createdBy: Id }>("twuOpportunities as opportunities")
          .where("id", id)
          .select<{ createdBy: Id }>("createdBy")
          .first()
      )?.createdBy || null;

    return authorId ? await readOneUser(connection, authorId) : valid(null);
  }
);

export const readOneTWUEvaluationPanelMember = tryDb<
  [Id, Id],
  TWUEvaluationPanelMember | null
>(async (connection, user, opportunity) => {
  const raw = await connection<RawTWUEvaluationPanelMember>(
    "twuEvaluationPanelMembers"
  )
    .join(
      "twuOpportunityVersions",
      "twuEvaluationPanelMembers.opportunityVersion",
      "=",
      "twuOpportunityVersions.id"
    )
    .where({
      "twuOpportunityVersions.opportunity": opportunity,
      "twuEvaluationPanelMembers.user": user
    })
    .select("twuEvaluationPanelMembers.*")
    .first();

  return valid(
    raw
      ? await rawEvaluationPanelMemberToEvaluationPanelMember(connection, raw)
      : null
  );
});

export const submitIndividualTWUQuestionEvaluations = tryDb<
  [Id, SubmitQuestionEvaluationsWithNoteParams, AuthenticatedSession],
  TWUOpportunity
>(async (connection, id, evaluationParams, session) => {
  const now = new Date();
  const notify = await connection.transaction(async (trx) => {
    await Promise.all(
      evaluationParams.evaluations.map(
        async ({ evaluationPanelMember, proposal }) => {
          const [statusRecord] =
            await connection<TWUResourceQuestionResponseEvaluationStatusRecord>(
              TWU_EVALUATOR_EVALUATION_STATUS_TABLE_NAME
            )
              .transacting(trx)
              .insert(
                {
                  evaluationPanelMember,
                  proposal,
                  createdAt: now,
                  status: TWUResourceQuestionResponseEvaluationStatus.Submitted,
                  note: evaluationParams.note
                },
                "*"
              );

          // Update evaluation root record
          await connection<RawTWUResourceQuestionResponseEvaluation>(
            TWU_EVALUATOR_EVALUATION_TABLE_NAME
          )
            .transacting(trx)
            .where({
              proposal,
              evaluationPanelMember
            })
            .update(
              {
                updatedAt: now
              },
              "*"
            );

          if (!statusRecord) {
            throw new Error("unable to update resource question evaluation");
          }
        }
      )
    );

    // Update opportunity status if all evaluations complete
    if (
      await allTWUResourceQuestionResponseEvaluatorEvaluationsSubmitted(
        connection,
        trx,
        id,
        evaluationParams.evaluations.map(({ proposal }) => proposal)
      )
    ) {
      const result = await updateTWUOpportunityStatus(
        connection,
        id,
        TWUOpportunityStatus.EvaluationResourceQuestionsConsensus,
        "",
        session
      );

      if (!result) {
        throw new Error("unable to update opportunity");
      }

      // Notify chair and author
      return true;
    }
    // Some evaluations are incomplete
    return false;
  });

  const dbResult = await readOneTWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update opportunity");
  }

  if (notify) {
    const opportunity = getValidValue(dbResult, null);
    if (opportunity) {
      twuOpportunityNotifications.handleTWUReadyForQuestionConsensus(
        connection,
        opportunity
      );
    }
  }

  return valid(dbResult.value);
});

export const submitConsensusTWUQuestionEvaluations = tryDb<
  [Id, SubmitQuestionEvaluationsWithNoteParams, AuthenticatedSession],
  TWUOpportunity
>(async (connection, id, evaluationParams, session) => {
  const now = new Date();
  await connection.transaction(async (trx) => {
    await Promise.all(
      evaluationParams.evaluations.map(
        async ({ evaluationPanelMember, proposal }) => {
          const [statusRecord] =
            await connection<TWUResourceQuestionResponseEvaluationStatusRecord>(
              TWU_CHAIR_EVALUATION_STATUS_TABLE_NAME
            )
              .transacting(trx)
              .insert(
                {
                  evaluationPanelMember,
                  proposal,
                  createdAt: now,
                  status: TWUResourceQuestionResponseEvaluationStatus.Submitted,
                  note: evaluationParams.note
                },
                "*"
              );

          // Update evaluation root record
          await connection<RawTWUResourceQuestionResponseEvaluation>(
            TWU_CHAIR_EVALUATION_TABLE_NAME
          )
            .transacting(trx)
            .where({
              proposal,
              evaluationPanelMember
            })
            .update(
              {
                updatedAt: now
              },
              "*"
            );

          if (!statusRecord) {
            throw new Error("unable to update resource question evaluation");
          }
        }
      )
    );
  });

  const dbResult = await readOneTWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update opportunity");
  }
  return valid(dbResult.value);
});

export const finalizeTWUQuestionConsensus = tryDb<
  [Id, string, AuthenticatedSession],
  TWUOpportunity
>(async (connection, id, note, session) => {
  const now = new Date();
  return await connection.transaction(async (trx) => {
    const opportunity = getValidValue(
      await readOneTWUOpportunity(connection, id, session),
      null
    );
    if (!opportunity) {
      throw new Error("unable to read opportunity");
    }
    const proposals = getValidValue<TWUProposalSlim[]>(
      await readManyTWUProposals(connection, session, id),
      []
    );
    const consensuses = getValidValue<TWUResourceQuestionResponseEvaluation[]>(
      await readManyTWUResourceQuestionResponseEvaluations(
        connection,
        session,
        id,
        true
      ),
      []
    );
    const consensusesWithProposals = consensuses.map((consensus) => {
      const proposal = proposals.find(
        (proposal) => proposal.id === consensus.proposal
      );
      if (!proposal) {
        throw new Error("unable to read consensuses");
      }
      return {
        ...consensus,
        proposal
      };
    });

    // Log scores
    for (const consensusWithProposal of consensusesWithProposals) {
      const [eventRecord] = await connection<
        RawTWUProposalHistoryRecord & { id: Id; proposal: Id }
      >("twuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: consensusWithProposal.proposal.id,
            createdAt: now,
            createdBy: session.user.id,
            event: TWUProposalEvent.QuestionsScoreEntered,
            note: `Resource question scores were entered. ${consensusWithProposal.scores
              .map((s, i) => `Q${i + 1}: ${s.score}`)
              .join("; ")}.`
          },
          "*"
        );

      // Update proposal root record
      await connection<RawTWUProposal>("twuProposals")
        .transacting(trx)
        .where({ id: consensusWithProposal.proposal.id })
        .update(
          {
            updatedAt: now,
            updatedBy: session.user.id
          },
          "*"
        );

      if (!eventRecord) {
        throw new Error("unable to log consensus scores");
      }
    }

    // Filter candidates that are below the minimum score or that have the wrong status
    const candidates = consensusesWithProposals.reduce<TWUProposalSlim[]>(
      (candidates, consensusWithProposal) => {
        if (
          consensusWithProposal.proposal.status !==
          TWUProposalStatus.UnderReviewResourceQuestions
        ) {
          return candidates;
        }
        const suitable = opportunity.resourceQuestions.every((question) => {
          if (!question.minimumScore) {
            return true;
          }
          const consensusScore = consensusWithProposal.scores.find(
            (score) => score.order === question.order
          );
          return (
            consensusScore && consensusScore.score >= question.minimumScore
          );
        });
        return suitable
          ? [...candidates, consensusWithProposal.proposal]
          : candidates;
      },
      []
    );

    // Screen in top candidates
    candidates.sort((a, b) =>
      compareTWUProposalsForPublicSector(a, b, "questionsScore")
    );
    for (const candidate of candidates.slice(
      0,
      TWU_CODE_CHALLENGE_SCREEN_IN_COUNT
    )) {
      const [statusRecord] = await connection<
        RawTWUProposalHistoryRecord & { id: Id; proposal: Id }
      >("twuProposalStatuses")
        .transacting(trx)
        .insert(
          {
            id: generateUuid(),
            proposal: candidate.id,
            createdAt: now,
            createdBy: session.user.id,
            status: TWUProposalStatus.UnderReviewChallenge,
            note
          },
          "*"
        );

      if (!statusRecord) {
        throw new Error("unable to screen in proponents");
      }
    }

    const result = await updateTWUOpportunityStatus(
      connection,
      id,
      TWUOpportunityStatus.EvaluationChallenge,
      note,
      session
    );

    if (!result) {
      throw new Error("unable to finalize consensus scores");
    }

    return result;
  });
});
