import { Connection, tryDb } from 'back-end/lib/db';
import { readOneSWUOpportunitySlim } from 'back-end/lib/db/opportunity/sprint-with-us';
import { RawUser, rawUserToUser, readOneUserSlim } from 'back-end/lib/db/user';
import { Session } from 'shared/lib/resources/session';
import { SWUOpportunitySubscriber } from 'shared/lib/resources/subscribers/sprint-with-us';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { getValidValue, valid } from 'shared/lib/validation';

interface CreateSWUOpportunitySubscriberParams {
  opportunity: Id;
  user: Id;
}

type DeleteSWUOpportunitySubscriberParams = CreateSWUOpportunitySubscriberParams;

export interface RawSWUOpportunitySubscriber {
  opportunity: Id;
  user: Id;
  createdAt: Date;
}

async function rawSWUOpportunitySubscriberToSWUOpportunitySubscriber(connection: Connection, session: Session, raw: RawSWUOpportunitySubscriber): Promise<SWUOpportunitySubscriber> {
  const { opportunity: opportunityId, user: userId, ...restOfRaw } = raw;
  const opportunity = getValidValue(await readOneSWUOpportunitySlim(connection, opportunityId, session), null);
  const user = getValidValue(await readOneUserSlim(connection, userId), null);
  if (!opportunity || !user) {
    throw new Error('unable to process subscription');
  }
  return {
    ...restOfRaw,
    opportunity,
    user
  };
}

export const readOneSWUSubscriberByOpportunityAndUser = tryDb<[Id, Id, Session], SWUOpportunitySubscriber | null>(async (connection, opportunityId, userId, session) => {
  const result = await connection<RawSWUOpportunitySubscriber>('swuOpportunitySubscribers')
    .where({ opportunity: opportunityId, user: userId})
    .first();

  return valid(result ? await rawSWUOpportunitySubscriberToSWUOpportunitySubscriber(connection, session, result) : null);
});

export const readManySWUSubscribedUsers = tryDb<[Id], User[]>(async (connection, opportunity) => {
  const results = await connection<RawUser>('users')
    .join('swuOpportunitySubscribers as subscribers', 'users.id', '=', 'subscribers.user')
    .where({ opportunity })
    .select('users.*');

  return valid(await Promise.all(results.map(async raw => await rawUserToUser(connection, raw))));
});

export const createSWUOpportunitySubscriber = tryDb<[CreateSWUOpportunitySubscriberParams, Session], SWUOpportunitySubscriber>(async (connection, subscriber, session) => {
  const now = new Date();
  const [result] = await connection<RawSWUOpportunitySubscriber>('swuOpportunitySubscribers')
    .insert({
      ...subscriber,
      createdAt: now
    }, '*');

  if (!result) {
    throw new Error('unable to create subscription');
  }

  return valid(await rawSWUOpportunitySubscriberToSWUOpportunitySubscriber(connection, session, result));
});

export const deleteSWUOpportunitySubscriber = tryDb<[DeleteSWUOpportunitySubscriberParams, Session], SWUOpportunitySubscriber>(async (connection, subscriber, session) => {
  const [result] = await connection<RawSWUOpportunitySubscriber>('swuOpportunitySubscribers')
    .where({ opportunity: subscriber.opportunity, user: subscriber.user })
    .delete('*');

  if (!result) {
    throw new Error('unable to delete subscription');
  }

  return valid(await rawSWUOpportunitySubscriberToSWUOpportunitySubscriber(connection, session, result));
});
