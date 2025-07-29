import { generateUuid } from "back-end/lib";
import { Connection, Transaction, tryDb } from "back-end/lib/db";
import { readOneFileById } from "back-end/lib/db/file";
import {
  readOneCWUAwardedProposal,
  readSubmittedCWUProposalCount
} from "back-end/lib/db/proposal/code-with-us";
import { RawCWUOpportunitySubscriber } from "back-end/lib/db/subscribers/code-with-us";
import { readOneUser, readOneUserSlim } from "back-end/lib/db/user";
import * as cwuOpportunityNotifications from "back-end/lib/mailer/notifications/opportunity/code-with-us";
import { Knex } from "knex";
import { valid } from "shared/lib/http";
import { getCWUOpportunityViewsCounterName } from "shared/lib/resources/counter";
import { FileRecord } from "shared/lib/resources/file";
import {
  Addendum,
  CreateCWUOpportunityStatus,
  CWUOpportunity,
  CWUOpportunityEvent,
  CWUOpportunityHistoryRecord,
  CWUOpportunitySlim,
  CWUOpportunityStatus,
  privateOpportunityStatuses,
  publicOpportunityStatuses
} from "shared/lib/resources/opportunity/code-with-us";
import {
  CWUProposalSlim,
  CWUProposalStatus,
  getCWUProponentEmail,
  getCWUProponentId,
  getCWUProponentName
} from "shared/lib/resources/proposal/code-with-us";
import { AuthenticatedSession, Session } from "shared/lib/resources/session";
import { User, UserType } from "shared/lib/resources/user";
import { adt, Id } from "shared/lib/types";
import { getValidValue, isInvalid } from "shared/lib/validation";

export interface CreateCWUOpportunityParams
  extends Omit<
    CWUOpportunity,
    | "createdBy"
    | "createdAt"
    | "updatedAt"
    | "updatedBy"
    | "status"
    | "id"
    | "addenda"
  > {
  status: CreateCWUOpportunityStatus;
}

type UpdateCWUOpportunityParams = Partial<CWUOpportunity>;

interface UpdateCWUOpportunityWithNoteParams {
  note: string;
  attachments: FileRecord[];
}

interface RootOpportunityRecord {
  id: Id;
  createdAt: Date;
  createdBy: Id;
}

interface OpportunityVersionRecord
  extends Omit<CreateCWUOpportunityParams, "status"> {
  id: Id;
  opportunity: Id;
  createdAt: Date;
  createdBy: Id;
}

interface RawCWUOpportunity
  extends Omit<
    CWUOpportunity,
    "createdBy" | "updatedBy" | "attachments" | "addenda"
  > {
  createdBy?: Id;
  updatedBy?: Id;
  attachments: Id[];
  addenda: Id[];
  versionId?: string;
}

interface RawCWUOpportunitySlim
  extends Omit<CWUOpportunitySlim, "createdBy" | "updatedBy"> {
  createdBy?: Id;
  updatedBy?: Id;
  versionId?: Id;
}

interface RawCWUOpportunityAddendum extends Omit<Addendum, "createdBy"> {
  createdBy?: Id;
}

interface RawCWUOpportunityHistoryRecord
  extends Omit<
    CWUOpportunityHistoryRecord,
    "createdBy" | "type" | "attachments"
  > {
  createdBy: Id | null;
  status?: CWUOpportunityStatus;
  event?: CWUOpportunityEvent;
  attachments: Id[];
}

async function rawCWUOpportunityToCWUOpportunity(
  connection: Connection,
  raw: RawCWUOpportunity
): Promise<CWUOpportunity> {
  const {
    createdBy: createdById,
    updatedBy: updatedById,
    attachments: attachmentIds,
    addenda: addendaIds,
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
        throw new Error("unable to process opportunity"); // to be caught by calling function
      }
      return result;
    })
  );
  const addenda = await Promise.all(
    addendaIds.map(async (id) => {
      const result = getValidValue(
        await readOneCWUOpportunityAddendum(connection, id),
        null
      );
      if (!result) {
        throw new Error("unable to retrieve addenda"); // to be caught by calling function
      }
      return result;
    })
  );

  return {
    ...restOfRaw,
    createdBy: createdBy || undefined,
    updatedBy: updatedBy || undefined,
    attachments,
    addenda
  };
}

async function rawCWUOpportunitySlimToCWUOpportunitySlim(
  connection: Connection,
  raw: RawCWUOpportunitySlim
): Promise<CWUOpportunitySlim> {
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

async function rawCWUOpportunityAddendumToCWUOpportunityAddendum(
  connection: Connection,
  raw: RawCWUOpportunityAddendum
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

async function rawCWUOpportunityHistoryRecordToCWUOpportunityHistoryRecord(
  connection: Connection,
  _session: Session,
  raw: RawCWUOpportunityHistoryRecord
): Promise<CWUOpportunityHistoryRecord> {
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
      ? adt("status", status as CWUOpportunityStatus)
      : adt("event", event as CWUOpportunityEvent),
    attachments
  };
}

function processForRole<T extends RawCWUOpportunity | RawCWUOpportunitySlim>(
  result: T,
  session: Session
): T {
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

async function createCWUOpportunityAttachments(
  connection: Connection,
  trx: Transaction,
  oppVersionId: Id,
  attachments: FileRecord[]
) {
  for (const attachment of attachments) {
    const [attachmentResult] = await connection("cwuOpportunityAttachments")
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

async function createCWUOpportunityNoteAttachments(
  connection: Connection,
  trx: Transaction,
  eventId: Id,
  attachments: FileRecord[]
) {
  for (const attachment of attachments) {
    const [attachmentResult] = await connection("cwuOpportunityNoteAttachments")
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

export function generateCWUOpportunityQuery(
  connection: Connection,
  full = false
) {
  const query: Knex.QueryBuilder = connection<RawCWUOpportunity>(
    "cwuOpportunities as opp"
  )
    // Join on latest CWU status
    .join(
      connection.raw(
        `(SELECT DISTINCT ON (opportunity) * FROM "cwuOpportunityStatuses"
         WHERE status IS NOT NULL
         ORDER BY opportunity, "createdAt" DESC) as stat`
      ),
      "opp.id",
      "stat.opportunity"
    )
    // Join on latest CWU version
    .join(
      connection.raw(
        `(SELECT DISTINCT ON (opportunity) * FROM "cwuOpportunityVersions"
         ORDER BY opportunity, "createdAt" DESC) as version`
      ),
      "opp.id",
      "version.opportunity"
    )
    .select<RawCWUOpportunity[]>(
      "opp.id",
      "opp.createdAt",
      "opp.createdBy",
      "version.id as versionId",
      connection.raw(
        '(CASE WHEN version."createdAt" > stat."createdAt" THEN version."createdAt" ELSE stat."createdAt" END) AS "updatedAt" '
      ),
      connection.raw(
        '(CASE WHEN version."createdAt" > stat."createdAt" THEN version."createdBy" ELSE stat."createdBy" END) AS "updatedBy" '
      ),
      "version.title",
      "version.teaser",
      "version.remoteOk",
      "version.location",
      "version.reward",
      "version.proposalDeadline",
      "stat.status"
    );

  if (full) {
    query.select(
      "version.remoteDesc",
      "version.skills",
      "version.description",
      "version.assignmentDate",
      "version.startDate",
      "version.completionDate",
      "version.submissionInfo",
      "version.acceptanceCriteria",
      "version.evaluationCriteria"
    );
  }

  return query;
}

async function isSubscribed(
  connection: Connection,
  oppId: Id,
  userId: Id
): Promise<boolean> {
  return !!(await connection<RawCWUOpportunitySubscriber>(
    "cwuOpportunitySubscribers"
  )
    .where({ opportunity: oppId, user: userId })
    .first());
}

export const readOneCWUOpportunity = tryDb<
  [Id, Session],
  CWUOpportunity | null
>(async (connection, id, session) => {
  let query = generateCWUOpportunityQuery(connection, true).where({
    "opp.id": id
  });

  if (!session || session.user.type === UserType.Vendor) {
    // Anonymous users and vendors can only see public opportunities
    query = query.whereIn(
      "stat.status",
      publicOpportunityStatuses as CWUOpportunityStatus[]
    );
  } else if (session.user.type === UserType.Government) {
    // Gov users should only see private opportunities they own, and public opportunities
    query = query.andWhere(function () {
      this.whereIn(
        "stat.status",
        publicOpportunityStatuses as CWUOpportunityStatus[]
      ).orWhere(function () {
        this.whereIn(
          "stat.status",
          privateOpportunityStatuses as CWUOpportunityStatus[]
        ).andWhere({ "opp.createdBy": session.user?.id });
      });
    });
  } else {
    // Admin users can see both private and public opportunities
    query = query.whereIn("stat.status", [
      ...publicOpportunityStatuses,
      ...privateOpportunityStatuses
    ]);
  }

  let result = await query.first();

  // Query for attachment file ids
  if (result) {
    result = processForRole(result, session);
    result.attachments = (
      await connection<{ file: Id }>("cwuOpportunityAttachments")
        .where("opportunityVersion", result.versionId)
        .select("file")
    ).map((row) => row.file);
    result.addenda = (
      await connection<{ id: Id }>("cwuOpportunityAddenda")
        .where("opportunity", id)
        .select("id")
    ).map((row) => row.id);

    // Get published date if applicable
    const conditions = {
      opportunity: result.id,
      status: CWUOpportunityStatus.Published
    };
    const publishedDate = await connection<{ createdAt: Date }>(
      "cwuOpportunityStatuses"
    )
      .where(conditions)
      .select("createdAt")
      .orderBy("createdAt", "asc")
      .first();

    result.publishedAt = publishedDate?.createdAt;

    // Set awarded proponent flag if applicable
    let awardedProposal: CWUProposalSlim | null;
    if (result.status === CWUOpportunityStatus.Awarded) {
      awardedProposal = getValidValue(
        await readOneCWUAwardedProposal(connection, result.id, session),
        null
      );
      if (awardedProposal) {
        // Use the score to determine if session is user is permitted to see detailed
        // proponent information.
        const fullPermissions = !!awardedProposal.score;
        result.successfulProponent = {
          id: getCWUProponentId(awardedProposal),
          name: getCWUProponentName(awardedProposal),
          email: fullPermissions
            ? getCWUProponentEmail(awardedProposal)
            : undefined,
          score: awardedProposal.score,
          createdBy: fullPermissions ? awardedProposal.createdBy : undefined
        };
      }
    }

    // Add on subscription flag, if authenticated user
    if (session) {
      result.subscribed = await isSubscribed(
        connection,
        result.id,
        session.user.id
      );
    }

    // If admin/owner, add on list of change records and reporting metrics if public
    if (
      session?.user.type === UserType.Admin ||
      result.createdBy === session?.user.id
    ) {
      const rawStatusArray = await connection<RawCWUOpportunityHistoryRecord>(
        "cwuOpportunityStatuses"
      )
        .where("opportunity", result.id)
        .orderBy("createdAt", "desc");

      if (!rawStatusArray) {
        throw new Error("unable to read opportunity statuses");
      }

      // For reach status record, fetch any attachments and add their ids to the record as an array
      await Promise.all(
        rawStatusArray.map(
          async (raw) =>
            (raw.attachments = (
              await connection<{ file: Id }>("cwuOpportunityNoteAttachments")
                .where("event", raw.id)
                .select("file")
            ).map((row) => row.file))
        )
      );

      result.history = await Promise.all(
        rawStatusArray.map(
          async (raw) =>
            await rawCWUOpportunityHistoryRecordToCWUOpportunityHistoryRecord(
              connection,
              session,
              raw
            )
        )
      );

      if (publicOpportunityStatuses.includes(result.status)) {
        // Retrieve opportunity views
        const conditions = {
          name: getCWUOpportunityViewsCounterName(result.id)
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
            await connection("cwuOpportunitySubscribers").where({
              opportunity: result.id
            })
          )?.length || 0;

        // Retrieve number of submitted proposals (exclude draft/withdrawn)
        const numProposals = getValidValue(
          await readSubmittedCWUProposalCount(connection, result.id),
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
    result ? await rawCWUOpportunityToCWUOpportunity(connection, result) : null
  );
});

export const readOneCWUOpportunitySlim = tryDb<
  [Id, Session],
  CWUOpportunitySlim | null
>(async (connection, oppId, session) => {
  let result = await generateCWUOpportunityQuery(connection)
    .where({ "opp.id": oppId })
    .first<RawCWUOpportunitySlim>();

  if (result) {
    result = processForRole(result, session);
    // Add on subscription flag, if authenticated user
    if (session) {
      result.subscribed = await isSubscribed(
        connection,
        result.id,
        session.user.id
      );
    }
  }
  return valid(
    result
      ? await rawCWUOpportunitySlimToCWUOpportunitySlim(connection, result)
      : null
  );
});

export const readOneCWUOpportunityAddendum = tryDb<[Id], Addendum>(
  async (connection, id) => {
    const result = await connection<RawCWUOpportunityAddendum>(
      "cwuOpportunityAddenda"
    )
      .where({ id })
      .first();

    if (!result) {
      throw new Error("unable to read addendum");
    }

    return valid(
      await rawCWUOpportunityAddendumToCWUOpportunityAddendum(
        connection,
        result
      )
    );
  }
);

export const readManyCWUOpportunities = tryDb<[Session], CWUOpportunitySlim[]>(
  async (connection, session) => {
    let query = generateCWUOpportunityQuery(connection);

    if (!session || session.user.type === UserType.Vendor) {
      // Anonymous users and vendors can only see public opportunities
      query = query.whereIn(
        "stat.status",
        publicOpportunityStatuses as CWUOpportunityStatus[]
      );
    } else if (session.user.type === UserType.Government) {
      // Gov users should only see private opportunities they own, and public opportunities
      query = query
        .whereIn(
          "stat.status",
          publicOpportunityStatuses as CWUOpportunityStatus[]
        )
        .orWhere(function () {
          this.whereIn(
            "stat.status",
            privateOpportunityStatuses as CWUOpportunityStatus[]
          ).andWhere({ "opp.createdBy": session.user?.id });
        });
    }
    // Admins can see all opportunities, so no additional filter necessary if none of the previous conditions match
    // Process results to eliminate fields not viewable by the current role
    const results = await Promise.all(
      (
        await query
      ).map(async (result: RawCWUOpportunity | RawCWUOpportunitySlim) => {
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
            await rawCWUOpportunitySlimToCWUOpportunitySlim(connection, raw)
        )
      )
    );
  }
);

export const createCWUOpportunity = tryDb<
  [CreateCWUOpportunityParams, AuthenticatedSession],
  CWUOpportunity
>(async (connection, opportunity, session) => {
  // Create root opportunity record
  const now = new Date();
  const opportunityId = await connection.transaction(async (trx) => {
    const [rootOppRecord] = await connection<RootOpportunityRecord>(
      "cwuOpportunities"
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

    if (!rootOppRecord) {
      throw new Error("unable to create opportunity root record");
    }

    // Create initial opportunity version
    const { attachments, status, ...restOfOpportunity } = opportunity;
    const [oppVersionRecord] = await connection<OpportunityVersionRecord>(
      "cwuOpportunityVersions"
    )
      .transacting(trx)
      .insert(
        {
          ...restOfOpportunity,
          id: generateUuid(),
          opportunity: rootOppRecord.id,
          createdAt: now,
          createdBy: session.user.id
        },
        "*"
      );

    if (!oppVersionRecord) {
      throw new Error("unable to create opportunity version");
    }
    // Create initial opportunity status record (Draft)
    await connection("cwuOpportunityStatuses").transacting(trx).insert(
      {
        id: generateUuid(),
        opportunity: rootOppRecord.id,
        createdAt: now,
        createdBy: session.user.id,
        status,
        note: ""
      },
      "*"
    );

    // Create attachment records
    await createCWUOpportunityAttachments(
      connection,
      trx,
      oppVersionRecord.id,
      attachments
    );

    return rootOppRecord.id;
  });

  const dbResult = await readOneCWUOpportunity(
    connection,
    opportunityId,
    session
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to create opportunity");
  }
  return valid(dbResult.value);
});

export async function isCWUOpportunityAuthor(
  connection: Connection,
  user: User,
  id: Id
): Promise<boolean> {
  try {
    const result = await connection<RawCWUOpportunity>("cwuOpportunities")
      .select("*")
      .where({ id, createdBy: user.id });
    return !!result && result.length > 0;
  } catch (exception) {
    return false;
  }
}

export const updateCWUOpportunityVersion = tryDb<
  [UpdateCWUOpportunityParams, AuthenticatedSession],
  CWUOpportunity
>(async (connection, opportunity, session) => {
  const now = new Date();
  const { attachments, status, ...restOfOpportunity } = opportunity;
  const oppVersion = await connection.transaction(async (trx) => {
    const [oppVersion] = await connection<OpportunityVersionRecord>(
      "cwuOpportunityVersions"
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

    if (!oppVersion) {
      throw new Error("unable to update opportunity");
    }
    await createCWUOpportunityAttachments(
      connection,
      trx,
      oppVersion.id,
      attachments || []
    );

    // Add an 'edit' change record
    await connection<RawCWUOpportunityHistoryRecord & { opportunity: Id }>(
      "cwuOpportunityStatuses"
    ).insert({
      id: generateUuid(),
      opportunity: restOfOpportunity.id,
      createdAt: now,
      createdBy: session.user.id,
      event: CWUOpportunityEvent.Edited,
      note: ""
    });

    return oppVersion;
  });
  const dbResult = await readOneCWUOpportunity(
    connection,
    oppVersion.opportunity,
    session
  );
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update opportunity");
  }
  return valid(dbResult.value);
});

export const updateCWUOpportunityStatus = tryDb<
  [Id, CWUOpportunityStatus, string, AuthenticatedSession],
  CWUOpportunity
>(async (connection, id, status, note, session) => {
  const now = new Date();
  const [result] = await connection<
    RawCWUOpportunityHistoryRecord & { opportunity: Id }
  >("cwuOpportunityStatuses").insert(
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

  const dbResult = await readOneCWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to update opportunity");
  }

  return valid(dbResult.value);
});

export const addCWUOpportunityAddendum = tryDb<
  [Id, string, AuthenticatedSession],
  CWUOpportunity
>(async (connection, id, addendumText, session) => {
  const now = new Date();
  await connection.transaction(async (trx) => {
    const [addendum] = await connection<
      RawCWUOpportunityAddendum & { opportunity: Id }
    >("cwuOpportunityAddenda")
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
    await connection<RawCWUOpportunityHistoryRecord & { opportunity: Id }>(
      "cwuOpportunityStatuses"
    )
      .transacting(trx)
      .insert({
        id: generateUuid(),
        opportunity: id,
        createdAt: now,
        createdBy: session.user.id,
        event: CWUOpportunityEvent.AddendumAdded,
        note: ""
      });
  });

  const dbResult = await readOneCWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to add addendum");
  }
  return valid(dbResult.value);
});

export const deleteCWUOpportunity = tryDb<[Id], CWUOpportunity>(
  async (connection, id) => {
    // Delete root record - cascade relationships in database will cleanup versions/attachments/addenda automatically
    const [result] = await connection<RawCWUOpportunity>("cwuOpportunities")
      .where({ id })
      .delete("*");

    if (!result) {
      throw new Error("unable to delete opportunity");
    }
    result.addenda = [];
    result.attachments = [];
    return valid(await rawCWUOpportunityToCWUOpportunity(connection, result));
  }
);

export const closeCWUOpportunities = tryDb<[], number>(async (connection) => {
  const now = new Date();
  return valid(
    await connection.transaction(async (trx) => {
      const lapsedOpportunities = await generateCWUOpportunityQuery(trx, true)
        .where({ status: CWUOpportunityStatus.Published })
        .andWhere("proposalDeadline", "<=", now);

      for (const lapsedOpportunity of lapsedOpportunities) {
        // Set the opportunity to EVALUATION status
        await connection("cwuOpportunityStatuses").transacting(trx).insert({
          id: generateUuid(),
          createdAt: now,
          opportunity: lapsedOpportunity.id,
          status: CWUOpportunityStatus.Evaluation,
          note: "This opportunity has closed."
        });

        // Get a list of SUBMITTED proposals for this opportunity
        const proposalIds =
          (
            await connection<{ id: Id }>("cwuProposals as proposals")
              .transacting(trx)
              .join("cwuProposalStatuses as statuses", function () {
                this.on("proposals.id", "=", "statuses.proposal")
                  .andOnNotNull("statuses.status")
                  .andOn(
                    "statuses.createdAt",
                    "=",
                    connection.raw(
                      '(select max("createdAt") from "cwuProposalStatuses" as statuses2 where \
                statuses2.proposal = proposals.id and statuses2.status is not null)'
                    )
                  );
              })
              .where({
                "proposals.opportunity": lapsedOpportunity.id,
                "statuses.status": CWUProposalStatus.Submitted
              })
              .select<Array<{ id: Id }>>("proposals.id")
          )?.map((result) => result.id) || [];

        for (const proposalId of proposalIds) {
          // Set the proposal to UNDER_REVIEW status
          await connection("cwuProposalStatuses").transacting(trx).insert({
            id: generateUuid(),
            createdAt: now,
            proposal: proposalId,
            status: CWUProposalStatus.UnderReview,
            note: ""
          });
        }
      }
      // Generate notifications for each of the lapsed opportunities
      for (const rawOpportunity of lapsedOpportunities) {
        // We don't need attachments/addenda, but insert empty arrays so we can convert
        rawOpportunity.attachments = [];
        rawOpportunity.addenda = [];
        cwuOpportunityNotifications.handleCWUReadyForEvaluation(
          connection,
          await rawCWUOpportunityToCWUOpportunity(connection, rawOpportunity)
        );
      }
      return lapsedOpportunities.length;
    })
  );
});

export const readOneCWUOpportunityAuthor = tryDb<[Id], User | null>(
  async (connection, id) => {
    const authorId =
      (
        await connection<{ createdBy: Id }>("cwuOpportunities as opportunities")
          .where("id", id)
          .select<{ createdBy: Id }>("createdBy")
          .first()
      )?.createdBy || null;

    return authorId ? await readOneUser(connection, authorId) : valid(null);
  }
);

export const addCWUOpportunityNote = tryDb<
  [Id, UpdateCWUOpportunityWithNoteParams, AuthenticatedSession],
  CWUOpportunity
>(async (connection, id, noteParams, session) => {
  const now = new Date();
  await connection.transaction(async (trx) => {
    // Add a history record for the note addition
    const [event] = await connection<
      RawCWUOpportunityHistoryRecord & { opportunity: Id }
    >("cwuOpportunityStatuses")
      .transacting(trx)
      .insert(
        {
          id: generateUuid(),
          opportunity: id,
          createdAt: now,
          createdBy: session.user.id,
          event: CWUOpportunityEvent.NoteAdded,
          note: noteParams.note
        },
        "*"
      );

    if (!event) {
      throw new Error("unable to create note for opportunity");
    }

    await createCWUOpportunityNoteAttachments(
      connection,
      trx,
      event.id,
      noteParams.attachments
    );
  });

  const dbResult = await readOneCWUOpportunity(connection, id, session);
  if (isInvalid(dbResult) || !dbResult.value) {
    throw new Error("unable to add note");
  }
  return valid(dbResult.value);
});
