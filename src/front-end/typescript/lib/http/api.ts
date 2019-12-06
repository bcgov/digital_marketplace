import { prefixRequest } from 'shared/lib/http';
import { Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { ClientHttpMethod } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

const request = prefixRequest('api');

function withCurrentSession(method: ClientHttpMethod): () => Promise<Validation<Session, null>> {
  return async () => {
    const response = await request(method, 'sessions/current');
    switch (response.status) {
      case 200:
        return valid(response.data as Session);
      default:
        return invalid(null);
    }
  };
}

export const readOneSession = withCurrentSession(ClientHttpMethod.Get);

export const deleteSession = withCurrentSession(ClientHttpMethod.Delete);

export async function readManyUsers(): Promise<User[]> {
  const response = await request(ClientHttpMethod.Get, 'users');
  switch (response.status) {
    case 200:
      return response.data as User[];
    default:
      return [];
  }
}
