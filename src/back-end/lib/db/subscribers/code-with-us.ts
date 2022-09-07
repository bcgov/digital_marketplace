import { Connection, tryDb } from "back-end/lib/db";
import { readOneCWUOpportunitySlim } from "back-end/lib/db/opportunity/code-with-us";
import { RawUser, rawUserToUser, readOneUserSlim } from "back-end/lib/db/user";
import { Session } from "shared/lib/resources/session";
import { CWUOpportunitySubscriber } from "shared/lib/resources/subscribers/code-with-us";
import { User } from "shared/lib/resources/user";
import { Id } from "shared/lib/types";
import { getValidValue, valid } from "shared/lib/validation";

interface CreateCWUOpportunitySubscriberParams {
  opportunity: Id;
  user: Id;
}

type DeleteCWUOpportunitySubscriberParams =
  CreateCWUOpportunitySubscriberParams;

export interface RawCWUOpportunitySubscriber {
  opportunity: Id;
  user: Id;
  createdAt: Date;
}

async function rawCWUOpportunitySubscriberToCWUOpportunitySubscriber(
  connection: Connection,
  session: Session,
  raw: RawCWUOpportunitySubscriber
): Promise<CWUOpportunitySubscriber> {
  const { opportunity: opportunityId, user: userId, ...restOfRaw } = raw;
  const opportunity = getValidValue(
    await readOneCWUOpportunitySlim(connection, opportunityId, session),
    null
  );
  const user = getValidValue(await readOneUserSlim(connection, userId), null);
  if (!opportunity || !user) {
    throw new Error("unable to process subscription");
  }
  return {
    ...restOfRaw,
    opportunity,
    user
  };
}

export const readOneCWUSubscriberByOpportunityAndUser = tryDb<
  [Id, Id, Session],
  CWUOpportunitySubscriber | null
>(async (connection, opportunityId, userId, session) => {
  const result = await connection<RawCWUOpportunitySubscriber>(
    "cwuOpportunitySubscribers"
  )
    .where({ opportunity: opportunityId, user: userId })
    .first();

  return valid(
    result
      ? await rawCWUOpportunitySubscriberToCWUOpportunitySubscriber(
          connection,
          session,
          result
        )
      : null
  );
});

export const readManyCWUSubscribedUsers = tryDb<[Id], User[]>(
  async (connection, opportunity) => {
    const results = await connection<RawUser>("users")
      .join(
        "cwuOpportunitySubscribers as subscribers",
        "users.id",
        "=",
        "subscribers.user"
      )
      .where({ opportunity })
      .select("users.*");

    return valid(
      await Promise.all(
        results.map(async (raw) => await rawUserToUser(connection, raw))
      )
    );
  }
);

export const createCWUOpportunitySubscriber = tryDb<
  [CreateCWUOpportunitySubscriberParams, Session],
  CWUOpportunitySubscriber
>(async (connection, subscriber, session) => {
  const now = new Date();
  const [result] = await connection<RawCWUOpportunitySubscriber>(
    "cwuOpportunitySubscribers"
  ).insert(
    {
      ...subscriber,
      createdAt: now
    },
    "*"
  );

  if (!result) {
    throw new Error("unable to create subscription");
  }

  return valid(
    await rawCWUOpportunitySubscriberToCWUOpportunitySubscriber(
      connection,
      session,
      result
    )
  );
});

export const deleteCWUOpportunitySubscriber = tryDb<
  [DeleteCWUOpportunitySubscriberParams, Session],
  CWUOpportunitySubscriber
>(async (connection, subscriber, session) => {
  const [result] = await connection<RawCWUOpportunitySubscriber>(
    "cwuOpportunitySubscribers"
  )
    .where({ opportunity: subscriber.opportunity, user: subscriber.user })
    .delete("*");

  if (!result) {
    throw new Error("unable to delete subscription");
  }

  return valid(
    await rawCWUOpportunitySubscriberToCWUOpportunitySubscriber(
      connection,
      session,
      result
    )
  );
});
