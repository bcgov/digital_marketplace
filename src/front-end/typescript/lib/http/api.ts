import { prefixPath } from 'front-end/lib';
import * as RichMarkdownEditor from 'front-end/lib/components/form-field/rich-markdown-editor';
import { CrudApi, CrudClientAction, CrudClientActionWithBody, CrudResponse, makeCreate, makeCrudApi, makeRequest, makeSimpleCrudApi, OmitCrudApi, PickCrudApi, ReadManyActionTypes, SimpleResourceTypes, undefinedActions, UndefinedResourceTypes } from 'front-end/lib/http/crud';
import { compareDates, compareNumbers, prefix } from 'shared/lib';
import { invalid, isValid, ResponseValidation, valid } from 'shared/lib/http';
import * as AddendumResource from 'shared/lib/resources/addendum';
import * as AffiliationResource from 'shared/lib/resources/affiliation';
import * as ContentResource from 'shared/lib/resources/content';
import * as CounterResource from 'shared/lib/resources/counter';
import * as EmailNotificationsResource from 'shared/lib/resources/email-notifications';
import * as FileResource from 'shared/lib/resources/file';
import * as MetricsResource from 'shared/lib/resources/metrics';
import * as CWUOpportunityResource from 'shared/lib/resources/opportunity/code-with-us';
import * as SWUOpportunityResource from 'shared/lib/resources/opportunity/sprint-with-us';
import * as OrgResource from 'shared/lib/resources/organization';
import * as CWUProposalResource from 'shared/lib/resources/proposal/code-with-us';
import * as SWUProposalResource from 'shared/lib/resources/proposal/sprint-with-us';
import * as SessionResource from 'shared/lib/resources/session';
import * as CWUSubscriberResource from 'shared/lib/resources/subscribers/code-with-us';
import * as SWUSubscriberResource from 'shared/lib/resources/subscribers/sprint-with-us';
import * as UserResource from 'shared/lib/resources/user';
import { adt, ClientHttpMethod, Id } from 'shared/lib/types';

export { getValidValue, getInvalidValue, mapValid, mapInvalid, ResponseValidation, isValid, isInvalid, isUnhandled } from 'shared/lib/http';

export const apiNamespace = (p: string) => `/${prefix(prefixPath('api'))(p)}`;

// Metrics

interface MetricsResourceTypes extends Omit<UndefinedResourceTypes, 'readMany'> {
  readMany: {
    rawResponse: MetricsResource.OpportunityMetrics;
    validResponse: MetricsResource.OpportunityMetrics;
    invalidResponse: string[];
  };
}

const METRICS_ROUTE_NAMESPACE = apiNamespace('metrics');

export const metrics: CrudApi<MetricsResourceTypes> = makeCrudApi<MetricsResourceTypes>({
  routeNamespace: METRICS_ROUTE_NAMESPACE,
  readMany: { transformValid: a => a },
  create: undefined,
  readOne: undefined,
  update: undefined,
  delete: undefined
});

// Counters

interface CounterResourceTypes extends Pick<UndefinedResourceTypes, 'create' | 'readOne' | 'delete'> {
  readMany: ReadManyActionTypes<{
    rawResponse: CounterResource.Counter;
    validResponse: CounterResource.Counter;
    invalidResponse: CounterResource.UpdateValidationErrors;
  }>;
  update: {
    request: CounterResource.UpdateRequestBody;
    rawResponse: CounterResource.Counter;
    validResponse: CounterResource.Counter;
    invalidResponse: CounterResource.UpdateValidationErrors;
  };
}

interface CountersCrudApi extends Omit<CrudApi<CounterResourceTypes>, 'readMany'> {
  readMany(counters: string[]): ReturnType<CrudApi<CounterResourceTypes>['readMany']>;
}

const COUNTERS_ROUTE_NAMESPACE = apiNamespace('counters');

export const counters: CountersCrudApi = {

  ...makeCrudApi<Omit<CounterResourceTypes, 'readMany'> & Pick<UndefinedResourceTypes, 'readMany'>>({
    routeNamespace: COUNTERS_ROUTE_NAMESPACE,
    update: {},
    create: undefined,
    readOne: undefined,
    readMany: undefined,
    delete: undefined
  }),

  async readMany(counters: string[]) {
    return await makeRequest<ReadManyActionTypes<CounterResourceTypes['readMany']> & { request: null; }>({
      method: ClientHttpMethod.Get,
      url: `${COUNTERS_ROUTE_NAMESPACE}?counters=${window.encodeURIComponent(counters.join(','))}`,
      body: null
    });
  }

};

// Content

interface ContentSimpleResourceTypesParams {
  record: ContentResource.Content;
  create: {
    request: ContentResource.CreateRequestBody;
    invalidResponse: ContentResource.CreateValidationErrors;
  };
  update: {
    request: ContentResource.UpdateRequestBody;
    invalidResponse: ContentResource.UpdateValidationErrors;
  };
}

type ContentResourceTypes = SimpleResourceTypes<ContentSimpleResourceTypesParams>;

export const content: CrudApi<ContentResourceTypes> = makeSimpleCrudApi<ContentSimpleResourceTypesParams>(apiNamespace('content'));

// EmailNotifications

interface EmailNotificationsSimpleResourceTypesParams {
  record: null;
  create: {
    request: EmailNotificationsResource.CreateRequestBody;
    invalidResponse: EmailNotificationsResource.CreateValidationErrors;
  };
  update: {
    request: null;
    invalidResponse: null;
  };
}

type EmailNotificationsSimpleResourceTypes = SimpleResourceTypes<EmailNotificationsSimpleResourceTypesParams>;

type EmailNotificationsResourceTypes = PickCrudApi<EmailNotificationsSimpleResourceTypes, 'create'>;

export const emailNotifications: CrudApi<EmailNotificationsResourceTypes> = {
  ...makeSimpleCrudApi<EmailNotificationsSimpleResourceTypesParams>(apiNamespace('emailNotifications')),
  readMany: undefined,
  readOne: undefined,
  update: undefined,
  delete: undefined
};

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

// CWU Proposals

interface RawCWUProposalHistoryRecord extends Omit<CWUProposalResource.CWUProposalHistoryRecord, 'createdAt'> {
  createdAt: string;
}

function rawCWUProposalHistoryRecordToCWUProposalHistoryRecord(raw: RawCWUProposalHistoryRecord): CWUProposalResource.CWUProposalHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawCWUProposal extends Omit<CWUProposalResource.CWUProposal, 'createdAt' | 'updatedAt' | 'submittedAt' | 'history' | 'attachments'> {
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  attachments: RawFileRecord[];
  history?: RawCWUProposalHistoryRecord[];
}

function rawCWUProposalToCWUProposal(raw: RawCWUProposal): CWUProposalResource.CWUProposal {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    submittedAt: raw.submittedAt === undefined ? undefined : new Date(raw.submittedAt),
    attachments: raw.attachments
      .map(a => rawFileRecordToFileRecord(a))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt)),
    history: raw.history && raw.history
      .map(s => rawCWUProposalHistoryRecordToCWUProposalHistoryRecord(s))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1)
  };
}

interface RawCWUProposalSlim extends Omit<CWUProposalResource.CWUProposalSlim, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

function rawCWUProposalSlimToCWUProposalSlim(raw: RawCWUProposalSlim): CWUProposalResource.CWUProposalSlim {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt)
  };
}

interface CWUProposalResourceTypes {
  create: {
    request: CWUProposalResource.CreateRequestBody;
    rawResponse: RawCWUProposal;
    validResponse: CWUProposalResource.CWUProposal;
    invalidResponse: CWUProposalResource.CreateValidationErrors;
  };
  readMany: {
    rawResponse: RawCWUProposalSlim;
    validResponse: CWUProposalResource.CWUProposalSlim;
    invalidResponse: string[];
  };
  readOne: {
    rawResponse: RawCWUProposal;
    validResponse: CWUProposalResource.CWUProposal;
    invalidResponse: CWUProposalResource.UpdateValidationErrors;
  };
  update: {
    request: CWUProposalResource.UpdateRequestBody;
    rawResponse: RawCWUProposal;
    validResponse: CWUProposalResource.CWUProposal;
    invalidResponse: CWUProposalResource.UpdateValidationErrors;
  };
  delete: {
    rawResponse: RawCWUProposal;
    validResponse: CWUProposalResource.CWUProposal;
    invalidResponse: CWUProposalResource.DeleteValidationErrors;
  };
}

interface CWUProposalCrudApi extends Omit<CrudApi<CWUProposalResourceTypes>, 'readMany' | 'readOne'> {
  readMany(opportunityId?: Id): ReturnType<CrudApi<CWUProposalResourceTypes>['readMany']>;
  readOne(opportunityId: Id, proposalId: Id): ReturnType<CrudApi<CWUProposalResourceTypes>['readOne']>;
}

const CWU_PROPOSAL_ROUTE_NAMESPACE = apiNamespace('proposals/code-with-us');

const cwuProposalActionParams = {
  transformValid: rawCWUProposalToCWUProposal
};

const cwuProposals: CWUProposalCrudApi = {
  ...makeCrudApi<Omit<CWUProposalResourceTypes, 'readMany' | 'readOne'> & Pick<UndefinedResourceTypes, 'readMany' | 'readOne'>>({
    routeNamespace: CWU_PROPOSAL_ROUTE_NAMESPACE,
    create: cwuProposalActionParams,
    update: cwuProposalActionParams,
    delete: cwuProposalActionParams,
    readOne: undefined,
    readMany: undefined
  }),

  async readMany(opportunityId) {
    return await makeRequest<ReadManyActionTypes<CWUProposalResourceTypes['readMany']> & { request: null; }>({
      method: ClientHttpMethod.Get,
      url: `${CWU_PROPOSAL_ROUTE_NAMESPACE}${opportunityId !== undefined ? `?opportunity=${window.encodeURIComponent(opportunityId)}` : ''}`,
      body: null,
      transformValid: v => v.map(w => rawCWUProposalSlimToCWUProposalSlim(w))
    });
  },

  async readOne(opportunityId, proposalId) {
    return await makeRequest<CWUProposalResourceTypes['readOne'] & { request: null; }>({
      method: ClientHttpMethod.Get,
      url: `${CWU_PROPOSAL_ROUTE_NAMESPACE}/${window.encodeURIComponent(proposalId)}?opportunity=${window.encodeURIComponent(opportunityId)}`,
      body: null,
      transformValid: rawCWUProposalToCWUProposal
    });
  }
};

// SWU Proposals

interface RawSWUProposalHistoryRecord extends Omit<SWUProposalResource.SWUProposalHistoryRecord, 'createdAt'> {
  createdAt: string;
}

function rawSWUProposalHistoryRecordToSWUProposalHistoryRecord(raw: RawSWUProposalHistoryRecord): SWUProposalResource.SWUProposalHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawSWUProposal extends Omit<SWUProposalResource.SWUProposal, 'createdAt' | 'updatedAt' | 'submittedAt' | 'history'> {
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  history?: RawSWUProposalHistoryRecord[];
}

function rawSWUProposalToSWUProposal(raw: RawSWUProposal): SWUProposalResource.SWUProposal {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    submittedAt: raw.submittedAt === undefined ? undefined : new Date(raw.submittedAt),
    history: raw.history && raw.history
      .map(s => rawSWUProposalHistoryRecordToSWUProposalHistoryRecord(s))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    teamQuestionResponses: raw.teamQuestionResponses.sort((a, b) => compareNumbers(a.order, b.order)),
    references: raw.references?.sort((a, b) => compareNumbers(a.order, b.order))
  };
}

interface RawSWUProposalSlim extends Omit<SWUProposalResource.SWUProposalSlim, 'createdAt' | 'updatedAt'> {
  createdAt: string;
  updatedAt: string;
}

function rawSWUProposalSlimToSWUProposalSlim(raw: RawSWUProposalSlim): SWUProposalResource.SWUProposalSlim {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt)
  };
}

interface SWUProposalResourceTypes {
  create: {
    request: SWUProposalResource.CreateRequestBody;
    rawResponse: RawSWUProposal;
    validResponse: SWUProposalResource.SWUProposal;
    invalidResponse: SWUProposalResource.CreateValidationErrors;
  };
  readMany: {
    rawResponse: RawSWUProposalSlim;
    validResponse: SWUProposalResource.SWUProposalSlim;
    invalidResponse: string[];
  };
  readOne: {
    rawResponse: RawSWUProposal;
    validResponse: SWUProposalResource.SWUProposal;
    invalidResponse: SWUProposalResource.UpdateValidationErrors;
  };
  update: {
    request: SWUProposalResource.UpdateRequestBody;
    rawResponse: RawSWUProposal;
    validResponse: SWUProposalResource.SWUProposal;
    invalidResponse: SWUProposalResource.UpdateValidationErrors;
  };
  delete: {
    rawResponse: RawSWUProposal;
    validResponse: SWUProposalResource.SWUProposal;
    invalidResponse: SWUProposalResource.DeleteValidationErrors;
  };
}

interface SWUProposalCrudApi extends Omit<CrudApi<SWUProposalResourceTypes>, 'readMany' | 'readOne'> {
  readMany(opportunityId?: Id): ReturnType<CrudApi<SWUProposalResourceTypes>['readMany']>;
  readOne(opportunityId: Id, proposalId: Id): ReturnType<CrudApi<SWUProposalResourceTypes>['readOne']>;
}

const SWU_PROPOSAL_ROUTE_NAMESPACE = apiNamespace('proposals/sprint-with-us');

const swuProposalActionParams = {
  transformValid: rawSWUProposalToSWUProposal
};

const swuProposals: SWUProposalCrudApi = {
  ...makeCrudApi<Omit<SWUProposalResourceTypes, 'readMany' | 'readOne'> & Pick<UndefinedResourceTypes, 'readMany' | 'readOne'>>({
    routeNamespace: SWU_PROPOSAL_ROUTE_NAMESPACE,
    create: swuProposalActionParams,
    update: swuProposalActionParams,
    delete: swuProposalActionParams,
    readOne: undefined,
    readMany: undefined
  }),

  async readMany(opportunityId) {
    return await makeRequest<ReadManyActionTypes<SWUProposalResourceTypes['readMany']> & { request: null; }>({
      method: ClientHttpMethod.Get,
      url: `${SWU_PROPOSAL_ROUTE_NAMESPACE}${opportunityId !== undefined ? `?opportunity=${window.encodeURIComponent(opportunityId)}` : ''}`,
      body: null,
      transformValid: v => v.map(w => rawSWUProposalSlimToSWUProposalSlim(w))
    });
  },

  async readOne(opportunityId, proposalId) {
    return await makeRequest<SWUProposalResourceTypes['readOne'] & { request: null; }>({
      method: ClientHttpMethod.Get,
      url: `${SWU_PROPOSAL_ROUTE_NAMESPACE}/${window.encodeURIComponent(proposalId)}?opportunity=${window.encodeURIComponent(opportunityId)}`,
      body: null,
      transformValid: rawSWUProposalToSWUProposal
    });
  }
};

// Proposals

export const proposals = {
  cwu: {
    ...cwuProposals,
    async getExistingProposalForOpportunity(opportunityId: Id): Promise<CWUProposalResource.CWUProposalSlim | undefined> {
      const result = await cwuProposals.readMany(opportunityId);
      if (isValid(result) && result.value.length) {
        return result.value[0];
      }
      return undefined;
    }
  },
  swu: {
    ...swuProposals,
    async getExistingProposalForOpportunity(opportunityId: Id): Promise<SWUProposalResource.SWUProposalSlim | undefined> {
      const result = await swuProposals.readMany(opportunityId);
      if (isValid(result) && result.value.length) {
        return result.value[0];
      }
      return undefined;
    }
  }
};

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

// CWU Opportunities

interface RawCWUOpportunityHistoryRecord extends Omit<CWUOpportunityResource.CWUOpportunityHistoryRecord, 'createdAt'> {
  createdAt: string;
}

function rawCWUHistoryRecordToCWUHistoryRecord(raw: RawCWUOpportunityHistoryRecord): CWUOpportunityResource.CWUOpportunityHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawCWUOpportunity extends Omit<CWUOpportunityResource.CWUOpportunity, 'proposalDeadline' | 'assignmentDate' | 'startDate' | 'completionDate' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'addenda' | 'history' | 'attachments'> {
  proposalDeadline: string;
  assignmentDate: string;
  startDate: string;
  completionDate: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  attachments: RawFileRecord[];
  addenda: RawAddendum[];
  history?: RawCWUOpportunityHistoryRecord[];
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
    publishedAt: raw.publishedAt !== undefined ? new Date(raw.publishedAt) : undefined,
    attachments: raw.attachments
      .map(a => rawFileRecordToFileRecord(a))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt)),
    addenda: raw.addenda
      .map(a => rawAddendumToAddendum(a))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
      // brianna--what is happening here? history isn't stored in the cwu opp table
    history: raw.history && raw.history
      .map(s => rawCWUHistoryRecordToCWUHistoryRecord(s))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1)
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

//Brianna opportunity note
export const opportunityNote: CrudApi<CWUOpportunityResourceTypes> = makeCrudApi({
  routeNamespace: apiNamespace('opportunityNote'),
  create: cwuOpportunityActionParams,
  readOne: cwuOpportunityActionParams,
  update: cwuOpportunityActionParams,
  delete: cwuOpportunityActionParams,
  readMany: {
    transformValid: a => a
  }
});

// SWU Opportunities

interface RawSWUOpportunityHistoryRecord extends Omit<SWUOpportunityResource.SWUOpportunityHistoryRecord, 'createdAt'> {
  createdAt: string;
}

function rawSWUHistoryRecordToSWUHistoryRecord(raw: RawSWUOpportunityHistoryRecord): SWUOpportunityResource.SWUOpportunityHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawSWUOpportunityPhase extends Omit<SWUOpportunityResource.SWUOpportunityPhase, 'startDate' | 'completionDate' | 'createdAt'> {
  startDate: string;
  completionDate: string;
  createdAt: string;
}

function rawSWUOpportunityPhaseToSWUOpportunityPhase(raw: RawSWUOpportunityPhase): SWUOpportunityResource.SWUOpportunityPhase {
  return {
    ...raw,
    startDate: new Date(raw.startDate),
    completionDate: new Date(raw.completionDate),
    createdAt: new Date(raw.createdAt)
  };
}

interface RawSWUTeamQuestion extends Omit<SWUOpportunityResource.SWUTeamQuestion, 'createdAt'> {
  createdAt: string;
}

function rawSWUTeamQuestionToSWUTeamQuestion(raw: RawSWUTeamQuestion): SWUOpportunityResource.SWUTeamQuestion {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawSWUOpportunity extends Omit<SWUOpportunityResource.SWUOpportunity, 'proposalDeadline' | 'assignmentDate' | 'createdAt' | 'updatedAt' | 'publishedAt' | 'addenda' | 'history' | 'inceptionPhase' | 'prototypePhase' | 'implementationPhase' | 'teamQuestions' | 'attachments'> {
  proposalDeadline: string;
  assignmentDate: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  attachments: RawFileRecord[];
  addenda: RawAddendum[];
  history?: RawSWUOpportunityHistoryRecord[];
  inceptionPhase?: RawSWUOpportunityPhase;
  prototypePhase?: RawSWUOpportunityPhase;
  implementationPhase: RawSWUOpportunityPhase;
  teamQuestions: RawSWUTeamQuestion[];
}

function rawSWUOpportunityToSWUOpportunity(raw: RawSWUOpportunity): SWUOpportunityResource.SWUOpportunity {
  return {
    ...raw,
    proposalDeadline: new Date(raw.proposalDeadline),
    assignmentDate: new Date(raw.assignmentDate),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    publishedAt: raw.publishedAt !== undefined ? new Date(raw.publishedAt) : undefined,
    attachments: raw.attachments
    /// brianna use this for new feature
      .map(a => rawFileRecordToFileRecord(a))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt)),
    addenda: raw.addenda
      .map(a => rawAddendumToAddendum(a))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    history: raw.history && raw
      .history.map(s => rawSWUHistoryRecordToSWUHistoryRecord(s))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    inceptionPhase: raw.inceptionPhase && rawSWUOpportunityPhaseToSWUOpportunityPhase(raw.inceptionPhase),
    prototypePhase: raw.prototypePhase && rawSWUOpportunityPhaseToSWUOpportunityPhase(raw.prototypePhase),
    implementationPhase: rawSWUOpportunityPhaseToSWUOpportunityPhase(raw.implementationPhase),
    teamQuestions: raw.teamQuestions
      .map(tq => rawSWUTeamQuestionToSWUTeamQuestion(tq))
      .sort((a, b) => compareNumbers(a.order, b.order))
  };
}

interface SWUOpportunityResourceTypes {
  create: {
    request: SWUOpportunityResource.CreateRequestBody;
    rawResponse: RawSWUOpportunity;
    validResponse: SWUOpportunityResource.SWUOpportunity;
    invalidResponse: SWUOpportunityResource.CreateValidationErrors;
  };
  readMany: {
    rawResponse: SWUOpportunityResource.SWUOpportunitySlim;
    validResponse: SWUOpportunityResource.SWUOpportunitySlim;
    invalidResponse: string[];
  };
  readOne: {
    rawResponse: RawSWUOpportunity;
    validResponse: SWUOpportunityResource.SWUOpportunity;
    invalidResponse: SWUOpportunityResource.UpdateValidationErrors;
  };
  update: {
    request: SWUOpportunityResource.UpdateRequestBody;
    rawResponse: RawSWUOpportunity;
    validResponse: SWUOpportunityResource.SWUOpportunity;
    invalidResponse: SWUOpportunityResource.UpdateValidationErrors;
  };
  delete: {
    rawResponse: RawSWUOpportunity;
    validResponse: SWUOpportunityResource.SWUOpportunity;
    invalidResponse: SWUOpportunityResource.DeleteValidationErrors;
  };
}

const swuOpportunityActionParams = {
  transformValid: rawSWUOpportunityToSWUOpportunity
};

export const swuOpportunities: CrudApi<SWUOpportunityResourceTypes> = makeCrudApi({
  routeNamespace: apiNamespace('opportunities/sprint-with-us'),
  create: swuOpportunityActionParams,
  readOne: swuOpportunityActionParams,
  update: swuOpportunityActionParams,
  delete: swuOpportunityActionParams,
  readMany: {
    transformValid: a => a
  }
});


// Opportunities

export const opportunities = {
  cwu: cwuOpportunities,
  swu: swuOpportunities
};

// CWU Subscribers

interface CWUSubscriberSimpleResourceTypesParams {
  record: CWUSubscriberResource.CWUOpportunitySubscriber;
  create: {
    request: CWUSubscriberResource.CreateRequestBody;
    invalidResponse: CWUSubscriberResource.CreateValidationErrors;
  };
  update: {
    request: null;
    invalidResponse: null;
  };
}

type CWUSubscriberSimpleResourceTypes = SimpleResourceTypes<CWUSubscriberSimpleResourceTypesParams>;

type CWUSubscriberResourceTypes = PickCrudApi<CWUSubscriberSimpleResourceTypes, 'create' | 'delete'>;

const cwuSubscribers: CrudApi<CWUSubscriberResourceTypes> = {
  ...makeSimpleCrudApi<CWUSubscriberSimpleResourceTypesParams>(apiNamespace('subscribers/code-with-us')),
  readOne: undefined,
  readMany: undefined,
  update: undefined
};

// SWU Subscribers

interface SWUSubscriberSimpleResourceTypesParams {
  record: SWUSubscriberResource.SWUOpportunitySubscriber;
  create: {
    request: SWUSubscriberResource.CreateRequestBody;
    invalidResponse: SWUSubscriberResource.CreateValidationErrors;
  };
  update: {
    request: null;
    invalidResponse: null;
  };
}

type SWUSubscriberSimpleResourceTypes = SimpleResourceTypes<SWUSubscriberSimpleResourceTypesParams>;

type SWUSubscriberResourceTypes = PickCrudApi<SWUSubscriberSimpleResourceTypes, 'create' | 'delete'>;

const swuSubscribers: CrudApi<SWUSubscriberResourceTypes> = {
  ...makeSimpleCrudApi<SWUSubscriberSimpleResourceTypesParams>(apiNamespace('subscribers/sprint-with-us')),
  readOne: undefined,
  readMany: undefined,
  update: undefined
};

// Subscribers

export const subscribers = {
  cwu: cwuSubscribers,
  swu: swuSubscribers
};

// Organizations

interface RawOrganization extends Omit<OrgResource.Organization, 'acceptedSWUTerms'> {
  acceptedSWUTerms?: Date | null;
}

function rawOrganizationToOrganization(raw: RawOrganization): OrgResource.Organization {
  return {
    ...raw,
    acceptedSWUTerms: raw.acceptedSWUTerms && new Date(raw.acceptedSWUTerms)
  };
}

interface RawOrganizationSlim extends Omit<OrgResource.OrganizationSlim, 'acceptedSWUTerms'> {
  acceptedSWUTerms?: Date | null;
}

function rawOrganizationSlimToOrganizationSlim(raw: RawOrganizationSlim): OrgResource.OrganizationSlim {
  return {
    ...raw,
    acceptedSWUTerms: raw.acceptedSWUTerms && new Date(raw.acceptedSWUTerms)
  };
}

interface RawOrganizationReadManyResponse extends Omit<OrgResource.ReadManyResponseBody, 'items'> {
  items: RawOrganizationSlim[];
}

interface OrganizationResourceTypes {
  create: {
    request: OrgResource.CreateRequestBody;
    rawResponse: RawOrganization;
    validResponse: OrgResource.Organization;
    invalidResponse: OrgResource.CreateValidationErrors;
  };
  readOne: {
    rawResponse: RawOrganization;
    validResponse: OrgResource.Organization;
    invalidResponse: OrgResource.DeleteValidationErrors;
  };
  readMany: {
    rawResponse: RawOrganizationReadManyResponse;
    validResponse: OrgResource.ReadManyResponseBody;
    invalidResponse: OrgResource.ReadManyResponseValidationErrors;
  };
  update: {
    request: OrgResource.UpdateRequestBody;
    rawResponse: RawOrganization;
    validResponse: OrgResource.Organization;
    invalidResponse: OrgResource.UpdateValidationErrors;
  };
  delete: {
    rawResponse: RawOrganization;
    validResponse: OrgResource.Organization;
    invalidResponse: OrgResource.DeleteValidationErrors;
  };
}

const ORGANIZATIONS_ROUTE_NAMESPACE = apiNamespace('organizations');

const organizationActionParams = {
  transformValid: rawOrganizationToOrganization
};

interface OrganizationsApi extends Omit<CrudApi<OrganizationResourceTypes>, 'readMany'> {
  readMany(page: number, pageSize: number): Promise<CrudResponse<OrganizationResourceTypes['readMany']>>;
}

export const organizations: OrganizationsApi = {
  ...makeCrudApi<Omit<OrganizationResourceTypes, 'readMany'> & Pick<UndefinedResourceTypes, 'readMany'>>({
    routeNamespace: ORGANIZATIONS_ROUTE_NAMESPACE,
    create: organizationActionParams,
    readOne: organizationActionParams,
    update: organizationActionParams,
    delete: organizationActionParams,
    readMany: undefined
  }),
  readMany(page, pageSize) {
    return makeRequest<OrganizationResourceTypes['readMany'] & { request: null; }>({
      method: ClientHttpMethod.Get,
      url: `${ORGANIZATIONS_ROUTE_NAMESPACE}?page=${window.encodeURIComponent(page)}&pageSize=${window.encodeURIComponent(pageSize)}`,
      body: null,
      transformValid(raw) {
        return {
          ...raw,
          items: raw.items.map(i => rawOrganizationSlimToOrganizationSlim(i))
        };
      }
    });
  }
};

// Owned Organizations
interface OwnedOrganizationResourceTypes extends Omit<UndefinedResourceTypes, 'readMany'> {
  readMany: {
    rawResponse: RawOrganizationSlim;
    validResponse: OrgResource.OrganizationSlim;
    invalidResponse: string[];
  };
}

const OWNED_ORGANIZATIONS_ROUTE_NAMESPACE = apiNamespace('ownedOrganizations');

export const ownedOrganizations: CrudApi<OwnedOrganizationResourceTypes> = makeCrudApi({
  ...undefinedActions,
  routeNamespace: OWNED_ORGANIZATIONS_ROUTE_NAMESPACE,
  readMany: {
    transformValid: rawOrganizationSlimToOrganizationSlim
  }
});

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

type AffiliationReadManyForOrganizationActionTypes = ReadManyActionTypes<{
  rawResponse: AffiliationResource.AffiliationMember;
  validResponse: AffiliationResource.AffiliationMember;
  invalidResponse: string[];
}>;

interface AffiliationsApi extends CrudApi<AffiliationResourceTypes> {
  readManyForOrganization(organizationId: Id): ReturnType<CrudClientAction<AffiliationReadManyForOrganizationActionTypes>>;
}

const affiliationActionParams = {
  transformValid: rawAffiliationToAffiliation
};

const AFFILIATIONS_ROUTE_NAMESPACE = apiNamespace('affiliations');

//brianna
export const affiliations: AffiliationsApi = {
  ...makeCrudApi<AffiliationResourceTypes>({
    routeNamespace: AFFILIATIONS_ROUTE_NAMESPACE,
    create: affiliationActionParams,
    update: affiliationActionParams,
    delete: affiliationActionParams,
    readMany: {
      transformValid: a => a
    },
    readOne: undefined
  }),

  async readManyForOrganization(organizationId) {
    return await makeRequest<AffiliationReadManyForOrganizationActionTypes & { request: null; }>({
      method: ClientHttpMethod.Get,
      url: `${AFFILIATIONS_ROUTE_NAMESPACE}?organization=${window.encodeURIComponent(organizationId)}`,
      body: null
    });
  }
};

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
// brianna
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

export function makeUploadMarkdownImage(metadata: FileResource.FileUploadMetadata = [adt('any')]): RichMarkdownEditor.UploadImage {
  return async file => {
    const result = await files.create({
      name: file.name,
      file,
      metadata
    });
    if (isValid(result)) {
      return valid({
        name: result.value.name,
        url: FileResource.encodeFileIdToMarkdownImageUrl(result.value.id)
      });
    } else {
      return invalid([
        'Unable to upload file.'
      ]);
    }
  };
}

// Avatars.

type AvatarResourceTypes
  = Pick<FileResourceTypes, 'create'>
  & Omit<UndefinedResourceTypes, 'create'>;

export const avatars: CrudApi<AvatarResourceTypes> = {
  ...undefinedActions,
  create: makeCreateFileAction(apiNamespace('avatars'))
};
