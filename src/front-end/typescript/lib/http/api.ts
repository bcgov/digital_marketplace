import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import { CrudApi, CrudClientActionWithBody, makeCreate, makeCrudApi, makeReadMany, makeRequest, makeSimpleCrudApi, OmitCrudApi, PickCrudApi, SimpleResourceTypes, undefinedActions, UndefinedResourceTypes } from 'front-end/lib/http/crud';
import { invalid, isValid, ResponseValidation, valid } from 'shared/lib/http';
import * as AddendumResource from 'shared/lib/resources/addendum';
import * as AffiliationResource from 'shared/lib/resources/affiliation';
import * as FileResource from 'shared/lib/resources/file';
import * as CWUOpportunityResource from 'shared/lib/resources/opportunity/code-with-us';
import * as OrgResource from 'shared/lib/resources/organization';
import * as CWUProposalResource from 'shared/lib/resources/proposal/code-with-us';
import * as SessionResource from 'shared/lib/resources/session';
import * as UserResource from 'shared/lib/resources/user';
import { adt } from 'shared/lib/types';
import { ClientHttpMethod } from 'shared/lib/types';

export { getValidValue, getInvalidValue, mapValid, mapInvalid, ResponseValidation, isValid, isInvalid, isUnhandled } from 'shared/lib/http';

const deslash = (s: string) => s.replace(/^\/*/, '').replace(/\/*$/, '');
const prefix = (a: string) => (b: string) => `/${deslash(a)}/${deslash(b)}`;
const apiNamespace = prefix('api');

// Markdown files.

interface GetMarkdownFileActionTypes {
  request: undefined;
  rawResponse: never;
  validResponse: string;
  invalidResponse: null;
}

export const getMarkdownFile = (id: string) => makeRequest<GetMarkdownFileActionTypes>({
  method: ClientHttpMethod.Get,
  url: `/markdown/${id}.md`,
  body: undefined
});

// Sessions

interface SessionSimpleResourceTypesParams {
  record: SessionResource.Session;
  create: {
    request: null;
    invalidResponse: null;
  };
  update: {
    request: null;
    invalidResponse: null;
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
    invalidResponse: null;
  };
  update: {
    request: UserResource.UpdateRequestBody;
    invalidResponse: UserResource.UpdateValidationErrors;
  };
}

type UserSimpleResourceTypes = SimpleResourceTypes<UserSimpleResourceTypesParams>;

type UserResourceTypes = OmitCrudApi<UserSimpleResourceTypes, 'create'>;

export const users: CrudApi<UserResourceTypes> = {
  ...makeSimpleCrudApi<UserSimpleResourceTypesParams>(apiNamespace('users')),
  create: undefined
};

// CWUProposal

interface CWUProposalResourceSimpleResourceTypesParams {
  record: CWUProposalResource.CWUProposal;
  create: {
    request: CWUProposalResource.CreateRequestBody;
    invalidResponse: CWUProposalResource.CreateValidationErrors;
  };
  update: {
    request: CWUProposalResource.UpdateRequestBody;
    invalidResponse: CWUProposalResource.UpdateValidationErrors;
  };
}

interface CWUProposalResourceTypes extends Omit<SimpleResourceTypes<CWUProposalResourceSimpleResourceTypesParams>, 'readMany'> {
  readMany: {
    rawResponse: CWUProposalResource.CWUProposalSlim;
    validResponse: CWUProposalResource.CWUProposalSlim;
    invalidResponse: string[];
  };
}

const CWU_PROPOSAL_ROUTE_NAMESPACE = apiNamespace('proposals/code-with-us');

const cwuProposal: CrudApi<CWUProposalResourceTypes> = {
  ...makeSimpleCrudApi<CWUProposalResourceSimpleResourceTypesParams>(CWU_PROPOSAL_ROUTE_NAMESPACE),
  readMany: makeReadMany<CWUProposalResourceTypes['readMany']>({
    routeNamespace: CWU_PROPOSAL_ROUTE_NAMESPACE
  })
};

export const proposals = {
  cwu: cwuProposal
};

//
// Addenda

interface RawAddendum extends Omit<AddendumResource.Addendum, 'createdAt'> {
  createdAt: string;
}

function rawAddendumToAddendum(raw: RawAddendum): AddendumResource.Addendum {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

// CodeWithUs Opportunities

interface RawCWUOpportunityStatusRecord extends Omit<CWUOpportunityResource.CWUOpportunityStatusRecord, 'createdAt'> {
  createdAt: string;
}

function rawCWUStatusHistoryRecordToCWUStatusHistoryRecord(raw: RawCWUOpportunityStatusRecord): CWUOpportunityResource.CWUOpportunityStatusRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawCWUOpportunity extends Omit<CWUOpportunityResource.CWUOpportunity, 'proposalDeadline' | 'assignmentDate' | 'startDate' | 'completionDate' | 'createdAt' | 'updatedAt' | 'addenda' | 'statusHistory'> {
  proposalDeadline: string;
  assignmentDate: string;
  startDate: string;
  completionDate: string | null;
  createdAt: string;
  updatedAt: string;
  addenda: RawAddendum[];
  statusHistory?: RawCWUOpportunityStatusRecord[];
}

function rawCWUOpportunityToCWUOpportunity(raw: RawCWUOpportunity): CWUOpportunityResource.CWUOpportunity {
  return {
    ...raw,
    proposalDeadline: new Date(raw.proposalDeadline),
    assignmentDate: new Date(raw.assignmentDate),
    startDate: new Date(raw.startDate),
    completionDate: raw.completionDate ? new Date(raw.completionDate) : null,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    addenda: raw.addenda.map(a => rawAddendumToAddendum(a)),
    statusHistory: raw.statusHistory && raw.statusHistory.map(s => rawCWUStatusHistoryRecordToCWUStatusHistoryRecord(s))
  };
}

interface CWUOpportunityResourceTypes {
  create: {
    request: CWUOpportunityResource.CreateRequestBody;
    rawResponse: RawCWUOpportunity;
    validResponse: CWUOpportunityResource.CWUOpportunity;
    invalidResponse: CWUOpportunityResource.CreateValidationErrors;
  };
  readMany: {
    rawResponse: CWUOpportunityResource.CWUOpportunitySlim;
    validResponse: CWUOpportunityResource.CWUOpportunitySlim;
    invalidResponse: string[];
  };
  readOne: {
    rawResponse: RawCWUOpportunity;
    validResponse: CWUOpportunityResource.CWUOpportunity;
    invalidResponse: CWUOpportunityResource.UpdateValidationErrors;
  };
  update: {
    request: CWUOpportunityResource.UpdateRequestBody;
    rawResponse: RawCWUOpportunity;
    validResponse: CWUOpportunityResource.CWUOpportunity;
    invalidResponse: CWUOpportunityResource.UpdateValidationErrors;
  };
  delete: {
    rawResponse: RawCWUOpportunity;
    validResponse: CWUOpportunityResource.CWUOpportunity;
    invalidResponse: CWUOpportunityResource.DeleteValidationErrors;
  };
}

const cwuOpportunityActionParams = {
  transformValid: rawCWUOpportunityToCWUOpportunity
};

export const cwuOpportunities: CrudApi<CWUOpportunityResourceTypes> = makeCrudApi({
  routeNamespace: apiNamespace('opportunities/code-with-us'),
  create: cwuOpportunityActionParams,
  readOne: cwuOpportunityActionParams,
  update: cwuOpportunityActionParams,
  delete: cwuOpportunityActionParams,
  readMany: {
    transformValid: a => a
  }
});

// Opportunities

export const opportunities = {
  cwu: cwuOpportunities
};

// Organizations

interface OrganizationSimpleResourceTypesParams {
  record: OrgResource.Organization;
  create: {
    request: OrgResource.CreateRequestBody;
    invalidResponse: OrgResource.CreateValidationErrors;
  };
  update: {
    request: OrgResource.UpdateRequestBody;
    invalidResponse: OrgResource.UpdateValidationErrors;
  };
}

interface OrganizationResourceTypes extends Omit<SimpleResourceTypes<OrganizationSimpleResourceTypesParams>, 'readMany'> {
  readMany: {
    rawResponse: OrgResource.OrganizationSlim;
    validResponse: OrgResource.OrganizationSlim;
    invalidResponse: string[];
  };
}

const ORGANIZATIONS_ROUTE_NAMESPACE = apiNamespace('organizations');

export const organizations: CrudApi<OrganizationResourceTypes> = {
  ...makeSimpleCrudApi<OrganizationSimpleResourceTypesParams>(ORGANIZATIONS_ROUTE_NAMESPACE),
  readMany: makeReadMany<OrganizationResourceTypes['readMany']>({
    routeNamespace: ORGANIZATIONS_ROUTE_NAMESPACE
  })
};

// Affiliations

interface RawAffiliation extends Omit<AffiliationResource.Affiliation, 'createdAt'> {
  createdAt: string;
}

function rawAffiliationToAffiliation(raw: RawAffiliation): AffiliationResource.Affiliation {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface AffiliationResourceTypes extends Pick<UndefinedResourceTypes, 'readOne'> {
  create: {
    request: AffiliationResource.CreateRequestBody;
    rawResponse: RawAffiliation;
    validResponse: AffiliationResource.Affiliation;
    invalidResponse: AffiliationResource.CreateValidationErrors;
  };
  readMany: {
    rawResponse: AffiliationResource.AffiliationSlim;
    validResponse: AffiliationResource.AffiliationSlim;
    invalidResponse: string[];
  };
  update: {
    request: null;
    rawResponse: RawAffiliation;
    validResponse: AffiliationResource.Affiliation;
    invalidResponse: AffiliationResource.UpdateValidationErrors;
  };
  delete: {
    rawResponse: RawAffiliation;
    validResponse: AffiliationResource.Affiliation;
    invalidResponse: AffiliationResource.DeleteValidationErrors;
  };
}

const affiliationActionParams = {
  transformValid: rawAffiliationToAffiliation
};

export const affiliations: CrudApi<AffiliationResourceTypes> = makeCrudApi({
  routeNamespace: apiNamespace('affiliations'),
  create: affiliationActionParams,
  update: affiliationActionParams,
  delete: affiliationActionParams,
  readMany: {
    transformValid: a => a
  },
  readOne: undefined
});

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

export interface CreateFileRequestBody {
  name: string;
  file: File;
  metadata: FileResource.FileUploadMetadata;
}

interface FileResourceTypes extends Omit<UndefinedResourceTypes, 'create' | 'readOne'> {
  create: {
    request: CreateFileRequestBody;
    rawResponse: RawFileRecord;
    validResponse: FileResource.FileRecord;
    invalidResponse: FileResource.CreateValidationErrors;
  };
  readOne: {
    rawResponse: RawFileRecord;
    validResponse: FileResource.FileRecord;
    invalidResponse: string[];
  };
}

const FILES_ROUTE_NAMESPACE = apiNamespace('files');

const fileCrudApi = makeCrudApi<Omit<FileResourceTypes, 'create'> & { create: undefined }>({
  ...undefinedActions,
  routeNamespace: FILES_ROUTE_NAMESPACE,
  readOne: {
    transformValid: rawFileRecordToFileRecord
  }
});

function makeCreateFileAction(routeNamespace: string): CrudClientActionWithBody<FileResourceTypes['create']>  {
  return body => {
    const multipartBody = new FormData();
    multipartBody.append('name', body.name);
    multipartBody.append('file', body.file);
    multipartBody.append('metadata', JSON.stringify(body.metadata));
    return makeCreate<Omit<FileResourceTypes['create'], 'request'> & { request: FormData }>({
      routeNamespace,
      transformValid: rawFileRecordToFileRecord
    })(multipartBody);
  };
}

export const files: CrudApi<FileResourceTypes> = {
  ...fileCrudApi,
  create: makeCreateFileAction(FILES_ROUTE_NAMESPACE)
};

export async function uploadFiles(filesToUpload: CreateFileRequestBody[]): Promise<ResponseValidation<FileResource.FileRecord[], FileResource.CreateValidationErrors[]>> {
  const validResults: FileResource.FileRecord[] = [];
  let isInvalid = false;
  const invalidResults: FileResource.CreateValidationErrors[] = [];
  for (const file of filesToUpload) {
    if (isInvalid) {
      //Skip uploading files if a validation error has occurred.
      invalidResults.push({});
      continue;
    }
    const result = await files.create(file);
    switch (result.tag) {
      case 'valid':
        validResults.push(result.value);
        invalidResults.push({});
        break;
      case 'invalid':
        isInvalid = true;
        invalidResults.push(result.value);
        break;
      case 'unhandled':
        return result;
    }
  }
  if (isInvalid) {
    return invalid(invalidResults);
  } else {
    return valid(validResults);
  }
}

export const uploadMarkdownImage: RichMarkdownEditor.UploadImage = async file => {
  const result = await files.create({
    name: file.name,
    file,
    metadata: [adt('any')]
  });
  if (isValid(result)) {
    return valid({
      name: result.value.name,
      url: FileResource.fileBlobPath(result.value)
    });
  } else {
    return invalid([
      'Unable to upload file.'
    ]);
  }
};

// Avatars.

type AvatarResourceTypes
  = Pick<FileResourceTypes, 'create'>
  & Omit<UndefinedResourceTypes, 'create'>;

export const avatars: CrudApi<AvatarResourceTypes> = {
  ...undefinedActions,
  create: makeCreateFileAction(apiNamespace('avatars'))
};
