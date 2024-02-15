import { generateUuid } from "back-end/lib";
import {
  Connection,
  RawTWUOpportunitySubscriber,
  readOneOrganizationContactEmail,
  readOneServiceAreaByServiceAreaId,
  readOneTWUAwardedProposal,
  readSubmittedTWUProposalCount,
  Transaction,
  tryDb
} from "back-end/lib/db";
import { readOneFileById } from "back-end/lib/db/file";
import { readOneUser, readOneUserSlim } from "back-end/lib/db/user";
import { QueryBuilder } from "knex";
import { valid } from "shared/lib/http";
import { Addendum } from "shared/lib/resources/addendum";
import { getTWUOpportunityViewsCounterName } from "shared/lib/resources/counter";
import { FileRecord } from "shared/lib/resources/file";
import {
  CreateTWUOpportunityStatus,
  CreateTWUResourceQuestionBody,
  privateOpportunityStatuses,
  publicOpportunityStatuses,
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
  TWUProposalSlim,
  TWUProposalStatus
} from "shared/lib/resources/proposal/team-with-us";
import * as twuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/team-with-us";
import { ServiceAreaId } from "shared/lib/resources/service-area";

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
  > {
  status: CreateTWUOpportunityStatus;
  resourceQuestions: CreateTWUResourceQuestionBody[];
  resources: ValidatedCreateTWUResourceBody[];
}

interface UpdateTWUOpportunityParams
  extends Omit<CreateTWUOpportunityParams, "status"> {
  id: Id;
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
  const query: QueryBuilder = connection<RawTWUOpportunity>(
    "twuOpportunities as opportunities"
  )
    // Join on latest TWU status
    .join("twuOpportunityStatuses as statuses", function () {
      this.on("opportunities.id", "=", "statuses.opportunity").andOn(
        "statuses.createdAt",
        "=",
        connection.raw(
          '(select max("createdAt") from "twuOpportunityStatuses" as statuses2 where \
            statuses2.opportunity = opportunities.id and statuses2.status is not null)'
        )
      );
    })
    // Join on latest TWU version
    .join("twuOpportunityVersions as versions", function () {
      this.on("opportunities.id", "=", "versions.opportunity").andOn(
        "versions.createdAt",
        "=",
        connection.raw(
          '(select max("createdAt") from "twuOpportunityVersions" as versions2 where \
            versions2.opportunity = opportunities.id)'
        )
      );
    })
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

// TODO - Unlike SWU, TWU does not currently have the ability to add attachments to Notes
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
  } catch (exception) {
    return false;
  }
}

export const readManyTWUAddendum = tryDb<[Id], Addendum[]>(
  async (connection, opportunityId) => {
    const results = await connection<RawTWUOpportunityAddendum>(
      "twuOpportunityAddenda"
    ).where({ opportunity: opportunityId });

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
      .where({ opportunityVersion: opportunityVersionId })
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

export const readManyTWUOpportunities = tryDb<[Session], TWUOpportunitySlim[]>(
  async (connection, session) => {
    // broad query returning many TWU Opportunities
    let query = generateTWUOpportunityQuery(connection);

    // gets further refined with WHERE clauses
    if (!session || session.user.type === UserType.Vendor) {
      // Anonymous users and vendors can only see public opportunities
      query = query.whereIn(
        "statuses.status",
        publicOpportunityStatuses as TWUOpportunityStatus[]
      );
    } else if (session.user.type === UserType.Government) {
      // Gov basic users should only see private opportunities that they own, and public opportunities
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
    // Admins can see all opportunities, so no additional filter necessary if none of the previous conditions match
    // Process results to eliminate fields not viewable by the current role
    const results = await Promise.all(
      (
        await query
      ).map(async (result) => {
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
            await rawTWUOpportunitySlimToTWUOpportunitySlim(connection, raw)
        )
      )
    );
  }
);

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
    // Gov users should only see private opportunities they own, and public opportunities
    query = query.andWhere(function () {
      this.whereIn(
        "statuses.status",
        publicOpportunityStatuses as TWUOpportunityStatus[]
      ).orWhere(function () {
        this.whereIn(
          "statuses.status",
          privateOpportunityStatuses as TWUOpportunityStatus[]
        ).andWhere({ "opportunities.createdBy": session.user?.id });
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
  // console.log("LINE 708 readOneTWUOpporutunity after query: ", result)
  if (result) {
    // Process based on user type
    result = processForRole(result, session);

    // Query for attachment file ids
    result.attachments = (
      await connection<{ file: Id }>("twuOpportunityAttachments")
        .where({ opportunityVersion: result.versionId })
        .select("file")
    ).map((row) => row.file);

    // Query for resources
    result.resources = (
      await connection("twuResources")
        .where({ opportunityVersion: result.versionId })
        .select("id")
    ).map((row) => row.id);

    // Get published date if applicable
    result.publishedAt = (
      await connection<{ createdAt: Date }>("twuOpportunityStatuses")
        .where({
          opportunity: result.id,
          status: TWUOpportunityStatus.Published
        })
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

    // If admin/owner, add on history, reporting metrics, and successful proponent if applicable
    if (
      session?.user.type === UserType.Admin ||
      result.createdBy === session?.user.id
    ) {
      const rawHistory = await connection<RawTWUOpportunityHistoryRecord>(
        "twuOpportunityStatuses"
      )
        .where({ opportunity: result.id })
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
      //           .where({ event: raw.id })
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

      if (publicOpportunityStatuses.includes(result.status)) {
        // Retrieve opportunity views
        const numViews =
          (
            await connection<{ count: number }>("viewCounters")
              .where({ name: getTWUOpportunityViewsCounterName(result.id) })
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
  // console.log("LINE 793 readOneTwuOpportunity after initial query: ",result)
  /**
   * LINE 793 readOneTwuOpportunity after initial query:  {
   *   id: '962e8ac7-1ebf-48c3-80c7-6329ee4fd361',
   *   createdAt: 2024-01-18T23:48:09.782Z,
   *   createdBy: '5a5db155-0d29-4bb6-abe3-545ac3166dea',
   *   versionId: 'd79b79e8-438b-4c0b-8c2a-11d62458de9f',
   *   updatedAt: 2024-01-18T23:48:09.782Z,
   *   updatedBy: '5a5db155-0d29-4bb6-abe3-545ac3166dea',
   *   title: 'testing many Team questions for data structure',
   *   teaser: 'fdsa',
   *   remoteOk: false,
   *   location: 'Victoria',
   *   maxBudget: 1234,
   *   proposalDeadline: 2024-02-02T00:00:00.000Z,
   *   status: 'DRAFT',
   *   remoteDesc: '',
   *   description: 'fdsa',
   *   assignmentDate: 2024-02-03T00:00:00.000Z,
   *   questionsWeight: 25,
   *   challengeWeight: 50,
   *   priceWeight: 25,
   *   startDate: 2024-02-04T00:00:00.000Z,
   *   completionDate: 2024-02-05T00:00:00.000Z,
   *   attachments: [],
   *   resources: [
   *     '33210a8f-e352-494e-94f5-763909940d05',
   *     '70b924dd-b1a5-4fef-9e53-5759f6728456'
   *   ],
   *   publishedAt: undefined,
   *   subscribed: false,
   *   history: [
   *     {
   *       id: '171d0f08-f9ff-47ca-a1da-a841386cfbbe',
   *       createdAt: 2024-01-18T23:48:09.782Z,
   *       opportunity: '962e8ac7-1ebf-48c3-80c7-6329ee4fd361',
   *       note: null,
   *       createdBy: [Object],
   *       type: [Object]
   *     }
   *   ]
   * }
   */
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
  const { attachments, resourceQuestions, resources, ...restOfOpportunity } =
    opportunity;
  const opportunityVersion = await connection.transaction(async (trx) => {
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
      await connection<TWUResourceRecord & { opportunityVersion: Id }>(
        "twuResources"
      )
        .transacting(trx)
        .insert(
          {
            ...twuResourceRecord,
            id: generateUuid(),
            opportunityVersion: versionRecord.id
          },
          "*"
        );
      if (!twuResourceRecord) {
        throw new Error("unable to update resource");
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
          status: TWUOpportunityStatus.EvaluationResourceQuestions,
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
          .where({ id })
          .select<{ createdBy: Id }>("createdBy")
          .first()
      )?.createdBy || null;

    return authorId ? await readOneUser(connection, authorId) : valid(null);
  }
);
