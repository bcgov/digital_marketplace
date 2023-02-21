import { generateUuid } from "back-end/lib";
import {
  Connection,
  RawTWUOpportunitySubscriber,
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
  TWUResourceQuestion
} from "shared/lib/resources/opportunity/team-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { User, UserType } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { getValidValue, isInvalid } from "shared/lib/validation";

/**
 * @remarks
 *
 * Summary: This file holds SQL queries for interacting with data associated
 * with Team With Us Opportunities
 */

interface CreateTWUOpportunityParams
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
  > {
  status: CreateTWUOpportunityStatus;
  resourceQuestions: CreateTWUResourceQuestionBody[];
}

interface UpdateTWUOpportunityParams
  extends Omit<CreateTWUOpportunityParams, "status"> {
  id: Id;
}

interface UpdateTWUOpportunityWithNoteParams {
  note: string;
  attachments: FileRecord[];
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

interface TWUOpportunityStatusRecord {
  id: Id;
  opportunity: Id;
  createdAt: Date;
  createdBy: Id;
  status: TWUOpportunityStatus;
  note: string;
}

export interface RawTWUOpportunity
  extends Omit<
    TWUOpportunity,
    "createdBy" | "updatedBy" | "attachments" | "addenda" | "resourceQuestions"
  > {
  createdBy?: Id;
  updatedBy?: Id;
  attachments: Id[];
  addenda: Id[];
  resourceQuestions: Id[];
  versionId?: Id;
}

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
}

interface RawTWUOpportunityHistoryRecord
  extends Omit<
    TWUOpportunityHistoryRecord,
    "createdBy" | "type" | "attachments"
  > {
  createdBy: Id | null;
  status?: TWUOpportunityStatus;
  event?: TWUOpportunityEvent;
}

/**
 * Safety check. Prior to putting data in the db, receives a TWU
 * opportunity from user input, ensures that values such as userId are
 * accurate and valid.
 *
 * @param connection
 * @param raw
 */
async function rawTWUOpportunityToTWUOpportunity(
  connection: Connection,
  raw: RawTWUOpportunity
): Promise<TWUOpportunity> {
  const {
    createdBy: createdById,
    updatedBy: updatedById,
    attachments: attachmentIds,
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

  if (!addenda || !resourceQuestions) {
    throw new Error("unable to process opportunity");
  }

  delete raw.versionId;

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined,
    attachments,
    addenda,
    resourceQuestions
  };
}

async function rawTWUOpportunitySlimToTWUOpportunitySlim(
  connection: Connection,
  raw: RawTWUOpportunitySlim
): Promise<TWUOpportunitySlim> {
  const { createdBy: createdById, updatedBy: updatedById, ...restOfRaw } = raw;
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

async function rawResourceQuestionToResourceQuestion(
  connection: Connection,
  raw: RawResourceQuestion
): Promise<TWUResourceQuestion> {
  const { createdBy: createdById, ...restOfRaw } = raw;

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
      "statuses.status",
      "versions.serviceArea"
    );

  if (full) {
    query.select<RawTWUOpportunity[]>(
      "versions.remoteDesc",
      "versions.maxBudget",
      "versions.targetAllocation",
      "versions.mandatorySkills",
      "versions.optionalSkills",
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

export const readManyTWUOpportunities = tryDb<[Session], TWUOpportunitySlim[]>(
  async (connection, session) => {
    let query = generateTWUOpportunityQuery(connection);

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
  let query = generateTWUOpportunityQuery(connection, true).where({
    "opportunities.id": id
  });

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

  let result = await query.first<RawTWUOpportunity>();

  if (result) {
    // Process based on user type
    result = processForRole(result, session);

    // Query for attachment file ids
    result.attachments = (
      await connection<{ file: Id }>("twuOpportunityAttachments")
        .where({ opportunityVersion: result.versionId })
        .select("file")
    ).map((row) => row.file);

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
        // const numProposals = getValidValue(
        //   await readSubmittedTWUProposalCount(connection, result.id),
        //   0
        // );

        // TODO - delete line below, uncomment code block above
        const numProposals = 0;

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
    const { attachments, status, resourceQuestions, ...restOfOpportunity } =
      opportunity;
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
  const { attachments, resourceQuestions, ...restOfOpportunity } = opportunity;
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
      event: TWUOpportunityEvent.Edited
      // note: ""
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
      status
      // note
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

// export const deleteTWUOpportunity = tryDb<[Id, Session], TWUOpportunity>(
//   async (connection, id, session) => {
//     // Read the opportunity first, so we can respond with it after deleting
//     const opportunity = getValidValue(
//       await readOneTWUOpportunity(connection, id, session),
//       undefined
//     );
//     if (!opportunity) {
//       throw new Error("unable to delete opportunity");
//     }
//     // Delete root record - cascade relationships in database will cleanup versions/attachments/addenda automatically
//     const [result] = await connection<RawTWUOpportunity>("twuOpportunities")
//       .where({ id })
//       .delete("*");
//
//     if (!result) {
//       throw new Error("unable to delete opportunity");
//     }
//     result.addenda = [];
//     result.attachments = [];
//     return valid(opportunity);
//   }
// );

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
          status: TWUOpportunityStatus.EvaluationResourceQuestions
          // note: "This opportunity has closed."
        });
        //     // Get a list of SUBMITTED proposals for this opportunity
        //     const proposalIds =
        //       (
        //         await connection<{ id: Id }>("twuProposals as proposals")
        //           .transacting(trx)
        //           .join("twuProposalStatuses as statuses", function () {
        //             this.on("proposals.id", "=", "statuses.proposal")
        //               .andOnNotNull("statuses.status")
        //               .andOn(
        //                 "statuses.createdAt",
        //                 "=",
        //                 connection.raw(
        //                   '(select max("createdAt") from "twuProposalStatuses" as statuses2 where \
        //             statuses2.proposal = proposals.id and statuses2.status is not null)'
        //                 )
        //               );
        //           })
        //           .where({
        //             "proposals.opportunity": lapsedOpportunity.id,
        //             "statuses.status": TWUProposalStatus.Submitted
        //           })
        //           .select<Array<{ id: Id }>>("proposals.id")
        //       )?.map((result) => result.id) || [];

        //     for (const [index, proposalId] of proposalIds.entries()) {
        //       // Set the proposal to UNDER_REVIEW status
        //       await connection("twuProposalStatuses").transacting(trx).insert({
        //         id: generateUuid(),
        //         createdAt: now,
        //         proposal: proposalId,
        //         status: TWUProposalStatus.UnderReviewResourceQuestions,
        //         note: ""
        //       });

        //       // And generate anonymized name
        //       await connection("twuProposals")
        //         .transacting(trx)
        //         .where({ id: proposalId })
        //         .update({
        //           anonymousProponentName: `Proponent ${index + 1}`
        //         });
        //     }
      }
      // Generate notifications for each of the lapsed opportunities
      for (const rawOpportunity of lapsedOpportunities) {
        // We don't need attachments/addenda, but insert empty arrays so we can convert
        rawOpportunity.attachments = [];
        rawOpportunity.addenda = [];
        rawOpportunity.resourceQuestions = [];

        // twuOpportunityNotifications.handleTWUReadyForEvaluation(
        //   connection,
        //   await rawTWUOpportunityToTWUOpportunity(connection, rawOpportunity)
        // );
      }
      return lapsedOpportunities.length;
    })
  );
});

export const countScreenedInTWUChallenge = tryDb<[Id], number>(async () => {
  // async (connection, opportunity) => {
  return valid(0);
  // (
  //   await connection("twuProposals as proposals")
  //     .join("twuProposalStatuses as statuses", function () {
  //       this.on("proposals.id", "=", "statuses.proposal")
  //         .andOnNotNull("statuses.status")
  //         .andOn(
  //           "statuses.createdAt",
  //           "=",
  //           connection.raw(
  //             '(select max("createdAt") from "twuProposalStatuses" as statuses2 where \
  //       statuses2.proposal = proposals.id and statuses2.status is not null)'
  //           )
  //         );
  //     })
  //     .where({
  //       "proposals.opportunity": opportunity,
  //       "statuses.status": TWUProposalStatus.UnderReviewChallenge
  //     })
  // )?.length || 0
  // );
});

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

export const addTWUOpportunityNote = tryDb<
  [Id, UpdateTWUOpportunityWithNoteParams, AuthenticatedSession],
  TWUOpportunity
>(async (connection, id, noteParams, session) => {
  const now = new Date();
  await connection.transaction(async (trx) => {
    // Add a history record for the note addition
    const [event] = await connection<
      RawTWUOpportunityHistoryRecord & { opportunity: Id }
    >("twuOpportunityStatuses")
      .transacting(trx)
      .insert(
        {
          id: generateUuid(),
          opportunity: id,
          createdAt: now,
          createdBy: session.user.id,
          event: TWUOpportunityEvent.NoteAdded,
          note: noteParams.note
        },
        "*"
      );

    if (!event) {
      throw new Error("unable to create note for opportunity");
    }

    // await createTWUOpportunityNoteAttachments(
    //   connection,
    //   trx,
    //   event.id,
    //   noteParams.attachments
    // );
  });

  const dbResult = await readOneTWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to add note");
  }
  return valid(dbResult.value);
});
