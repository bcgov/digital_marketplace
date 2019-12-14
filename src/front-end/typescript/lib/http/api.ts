import { prefixRequest } from 'shared/lib/http';
import { PublicFile } from 'shared/lib/resources/file';
import { Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { ClientHttpMethod, Id } from 'shared/lib/types';
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

export async function readManyUsers(): Promise<Validation<User[]>> {
  const response = await request(ClientHttpMethod.Get, 'users');
  switch (response.status) {
    case 200:
      return valid(response.data as User[]);
    default:
      return invalid([]);
  }
}

interface RawPublicFile extends Omit<PublicFile, 'createdAt'> {
  createdAt: string;
}

function rawPublicFileToPublicFile(raw: RawPublicFile): PublicFile {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

export async function readOneFile(id: Id): Promise<Validation<PublicFile>> {
  const response = await request(ClientHttpMethod.Get, `files/${id}`);
  switch (response.status) {
    case 200:
      return valid(rawPublicFileToPublicFile(response.data as RawPublicFile));
    default:
      return invalid([]);
  }
}
