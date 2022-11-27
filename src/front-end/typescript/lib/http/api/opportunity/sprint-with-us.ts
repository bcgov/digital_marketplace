import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/opportunity/sprint-with-us";
import { compareDates, compareNumbers } from "shared/lib";
import {
  RawFileRecord,
  rawFileRecordToFileRecord
} from "front-end/lib/http/api/file/lib";
import {
  RawAddendum,
  rawAddendumToAddendum
} from "front-end/lib/http/api/addendum/lib";

const NAMESPACE = "opportunities/sprint-with-us";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.SWUOpportunity,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, rawSWUOpportunityToSWUOpportunity);

export const readMany: crud.ReadManyAction<
  Resource.SWUOpportunitySlim,
  string[],
  unknown
> = crud.makeReadManyAction(NAMESPACE, (a: Resource.SWUOpportunitySlim) => a);

export const readOne: crud.ReadOneAction<
  Resource.SWUOpportunity,
  string[],
  unknown
> = crud.makeReadOneAction(NAMESPACE, rawSWUOpportunityToSWUOpportunity);

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.SWUOpportunity,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, rawSWUOpportunityToSWUOpportunity);

export const delete_: crud.DeleteAction<
  Resource.SWUOpportunity,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(NAMESPACE, rawSWUOpportunityToSWUOpportunity);

// Raw Conversion

interface RawSWUOpportunityHistoryRecord
  extends Omit<Resource.SWUOpportunityHistoryRecord, "createdAt"> {
  createdAt: string;
}

function rawSWUHistoryRecordToSWUHistoryRecord(
  raw: RawSWUOpportunityHistoryRecord
): Resource.SWUOpportunityHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawSWUOpportunityPhase
  extends Omit<
    Resource.SWUOpportunityPhase,
    "startDate" | "completionDate" | "createdAt"
  > {
  startDate: string;
  completionDate: string;
  createdAt: string;
}

function rawSWUOpportunityPhaseToSWUOpportunityPhase(
  raw: RawSWUOpportunityPhase
): Resource.SWUOpportunityPhase {
  return {
    ...raw,
    startDate: new Date(raw.startDate),
    completionDate: new Date(raw.completionDate),
    createdAt: new Date(raw.createdAt)
  };
}

interface RawSWUTeamQuestion
  extends Omit<Resource.SWUTeamQuestion, "createdAt"> {
  createdAt: string;
}

function rawSWUTeamQuestionToSWUTeamQuestion(
  raw: RawSWUTeamQuestion
): Resource.SWUTeamQuestion {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawSWUOpportunity
  extends Omit<
    Resource.SWUOpportunity,
    | "proposalDeadline"
    | "assignmentDate"
    | "createdAt"
    | "updatedAt"
    | "publishedAt"
    | "addenda"
    | "history"
    | "inceptionPhase"
    | "prototypePhase"
    | "implementationPhase"
    | "teamQuestions"
    | "attachments"
  > {
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

function rawSWUOpportunityToSWUOpportunity(
  raw: RawSWUOpportunity
): Resource.SWUOpportunity {
  return {
    ...raw,
    proposalDeadline: new Date(raw.proposalDeadline),
    assignmentDate: new Date(raw.assignmentDate),
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    publishedAt:
      raw.publishedAt !== undefined ? new Date(raw.publishedAt) : undefined,
    attachments: raw.attachments
      .map((a) => rawFileRecordToFileRecord(a))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt)),
    addenda: raw.addenda
      .map((a) => rawAddendumToAddendum(a))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    history:
      raw.history &&
      raw.history
        .map((s) => rawSWUHistoryRecordToSWUHistoryRecord(s))
        .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    inceptionPhase:
      raw.inceptionPhase &&
      rawSWUOpportunityPhaseToSWUOpportunityPhase(raw.inceptionPhase),
    prototypePhase:
      raw.prototypePhase &&
      rawSWUOpportunityPhaseToSWUOpportunityPhase(raw.prototypePhase),
    implementationPhase: rawSWUOpportunityPhaseToSWUOpportunityPhase(
      raw.implementationPhase
    ),
    teamQuestions: raw.teamQuestions
      .map((tq) => rawSWUTeamQuestionToSWUTeamQuestion(tq))
      .sort((a, b) => compareNumbers(a.order, b.order))
  };
}
