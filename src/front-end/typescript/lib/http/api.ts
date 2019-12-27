import { CrudApi, makeCrudApi, makeSimpleCrudApi, OmitCrudApi, SimpleResourceTypes, SimpleResourceTypesParams, undefinedActions, UndefinedResourceTypes } from 'front-end/lib/http/crud';
import * as FileResource from 'shared/lib/resources/file';
import * as OrgResource from 'shared/lib/resources/organization';
import * as SessionResource from 'shared/lib/resources/session';
import * as UserResource from 'shared/lib/resources/user';

// Sessions

export const sessions: Pick<CrudApi, 'readOne' | 'delete'>
  = makeSimpleCrudApi<SimpleResourceTypesParams<SessionResource.Session>>('sessions');

// Users

interface UserSimpleResourceTypesParams {
  record: UserResource.User;
  create: {
    request: null;
    invalid: null;
  };
  update: {
    request: UserResource.UpdateRequestBody;
    invalid: UserResource.UpdateValidationErrors;
  };
}

type UserSimpleResourceTypes = SimpleResourceTypes<UserSimpleResourceTypesParams>;

type UserResourceTypes = OmitCrudApi<UserSimpleResourceTypes, 'create'>;

export const users: CrudApi<UserResourceTypes> = {
  ...makeSimpleCrudApi<UserSimpleResourceTypesParams>('users'),
  create: undefined
};

// Organizations

export const organizations = makeSimpleCrudApi<{
  record: OrgResource.Organization;
  create: {
    request: OrgResource.CreateRequestBody;
    invalid: OrgResource.CreateValidationErrors;
  };
  update: {
    request: OrgResource.UpdateRequestBody;
    invalid: OrgResource.UpdateValidationErrors;
  };
}>('organizations');

// Files

interface RawFileRecord extends Omit<FileResource.FileRecord, 'createdAt'> {
  createdAt: string;
}

function rawFileRecordToFileRecord(raw: RawFileRecord): FileResource.FileRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface FileResourceTypes extends Omit<UndefinedResourceTypes, 'readOne'> {
  readOne: {
    rawResponse: RawFileRecord;
    validResponse: FileResource.FileRecord;
    invalidResponse: string[];
  };
}

export const files = makeCrudApi<FileResourceTypes>({
  ...undefinedActions,
  routeNamespace: 'files',
  readOne: {
    transformValid: rawFileRecordToFileRecord
  }
});
