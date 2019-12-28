import { CrudApi, makeCrudApi, makeSimpleCrudApi, OmitCrudApi, PickCrudApi, SimpleResourceTypes, undefinedActions, UndefinedResourceTypes } from 'front-end/lib/http/crud';
import * as FileResource from 'shared/lib/resources/file';
import * as OrgResource from 'shared/lib/resources/organization';
import * as SessionResource from 'shared/lib/resources/session';
import * as UserResource from 'shared/lib/resources/user';

export { getValid, getInvalid, ResponseValidation, isValid, isInvalid, isUnhandled } from 'shared/lib/http';

const deslash = (s: string) => s.replace(/^\/*/, '').replace(/\/*$/, '');
const prefix = (a: string) => (b: string) => `/${deslash(a)}/${deslash(b)}`;
const apiNamespace = prefix('api');

// Sessions

interface SessionSimpleResourceTypesParams {
  record: SessionResource.Session;
  create: {
    request: null;
    invalid: null;
  };
  update: {
    request: null;
    invalid: null;
  };
}

type SessionSimpleResourceTypes = SimpleResourceTypes<SessionSimpleResourceTypesParams>;

type SessionResourceTypes = PickCrudApi<SessionSimpleResourceTypes, 'readOne' | 'delete'>;

export const sessions: CrudApi<SessionResourceTypes> = {
  ...makeSimpleCrudApi<SessionSimpleResourceTypesParams>(apiNamespace('sessions')),
  create: undefined,
  readMany: undefined,
  update: undefined
};

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
  ...makeSimpleCrudApi<UserSimpleResourceTypesParams>(apiNamespace('users')),
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
}>(apiNamespace('organizations'));

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
  routeNamespace: apiNamespace('files'),
  readOne: {
    transformValid: rawFileRecordToFileRecord
  }
});
