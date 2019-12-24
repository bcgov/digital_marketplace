import { prefixRequest } from 'shared/lib/http';
import { FileRecord } from 'shared/lib/resources/file';
import * as OrgResource from 'shared/lib/resources/organization';
import { Session } from 'shared/lib/resources/session';
import { User } from 'shared/lib/resources/user';
import { ClientHttpMethod, Id } from 'shared/lib/types';
import { invalid, valid, Validation } from 'shared/lib/validation';

export const apiRequest = prefixRequest('api');

export async function updateOrganization(id: Id, body: OrgResource.UpdateRequestBody): Promise<Validation<OrgResource.Organization, null>> {
    const response = await apiRequest(ClientHttpMethod.Put, `organizations/${id}`, body);
    switch (response.status) {
      case 200:
        return valid(response.data as OrgResource.Organization); // TODO(Jesse): Does this actually pass the result back?
      default:
        return invalid(null);
    }
}

function withCurrentSession(method: ClientHttpMethod): () => Promise<Validation<Session, null>> {
  return async () => {
    const response = await apiRequest(method, 'sessions/current');
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
  const response = await apiRequest(ClientHttpMethod.Get, 'users');
  switch (response.status) {
    case 200:
      return valid(response.data as User[]);
    default:
      return invalid([]);
  }
}

interface RawFileRecord extends Omit<FileRecord, 'createdAt'> {
  createdAt: string;
}

function rawFileRecordToFileRecord(raw: RawFileRecord): FileRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

export async function readOneFile(id: Id): Promise<Validation<FileRecord>> {
  const response = await apiRequest(ClientHttpMethod.Get, `files/${id}`);
  switch (response.status) {
    case 200:
      return valid(rawFileRecordToFileRecord(response.data as RawFileRecord));
    default:
      return invalid([]);
  }
}
