import { Connection, tryDb } from "back-end/lib/db";
import { readOneTWUOpportunitySlim } from "back-end/lib/db/opportunity/team-with-us";
import { RawUser, rawUserToUser, readOneUserSlim } from "back-end/lib/db/user";
import { Session } from "shared/lib/resources/session";
import { TWUOpportunitySubscriber } from "shared/lib/resources/subscribers/team-with-us";
import { User } from "shared/lib/resources/user";
import { Id } from "shared/lib/types";
import { getValidValue, valid } from "shared/lib/validation";

interface CreateTWUOpportunitySubscriberParams {
  opportunity: Id;
  user: Id;
}

type DeleteTWUOpportunitySubscriberParams =
  CreateTWUOpportunitySubscriberParams;

export interface RawTWUOpportunitySubscriber {
  opportunity: Id;
  user: Id;
  createdAt: Date;
}

async function rawTWUOpportunitySubscriberToTWUOpportunitySubscriber(
  connection: Connection,
  session: Session,
  raw: RawTWUOpportunitySubscriber
): Promise<TWUOpportunitySubscriber> {
  const { opportunity: opportunityId, user: userId, ...restOfRaw } = raw;
  const opportunity = getValidValue(
    await readOneTWUOpportunitySlim(connection, opportunityId, session),
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

export const readOneTWUSubscriberByOpportunityAndUser = tryDb<
  [Id, Id, Session],
  TWUOpportunitySubscriber | null
>(async (connection, opportunityId, userId, session) => {
  const result = await connection<RawTWUOpportunitySubscriber>(
    "twuOpportunitySubscribers"
  )
    .where({ opportunity: opportunityId, user: userId })
    .first();

  return valid(
    result
      ? await rawTWUOpportunitySubscriberToTWUOpportunitySubscriber(
          connection,
          session,
          result
        )
      : null
  );
});

export const readManyTWUSubscribedUsers = tryDb<[Id], User[]>(
  async (connection, opportunity) => {
    const results = await connection<RawUser>("users")
      .join(
        "twuOpportunitySubscribers as subscribers",
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

export const createTWUOpportunitySubscriber = tryDb<
  [CreateTWUOpportunitySubscriberParams, Session],
  TWUOpportunitySubscriber
>(async (connection, subscriber, session) => {
  const now = new Date();
  const [result] = await connection<RawTWUOpportunitySubscriber>(
    "twuOpportunitySubscribers"
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
    await rawTWUOpportunitySubscriberToTWUOpportunitySubscriber(
      connection,
      session,
      result
    )
  );
});

export const deleteTWUOpportunitySubscriber = tryDb<
  [DeleteTWUOpportunitySubscriberParams, Session],
  TWUOpportunitySubscriber
>(async (connection, subscriber, session) => {
  const [result] = await connection<RawTWUOpportunitySubscriber>(
    "twuOpportunitySubscribers"
  )
    .where({ opportunity: subscriber.opportunity, user: subscriber.user })
    .delete("*");

  if (!result) {
    throw new Error("unable to delete subscription");
  }

  return valid(
    await rawTWUOpportunitySubscriberToTWUOpportunitySubscriber(
      connection,
      session,
      result
    )
  );
});
