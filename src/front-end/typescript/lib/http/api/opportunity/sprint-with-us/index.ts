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
export * as teamQuestions from "front-end/lib/http/api/opportunity/sprint-with-us/team-questions";

const NAMESPACE = "opportunities/sprint-with-us";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.SWUOpportunity,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(NAMESPACE, rawSWUOpportunityToSWUOpportunity);
}

export function readMany<Msg>(
  query?: string
): crud.ReadManyAction<Resource.SWUOpportunitySlim, string[], Msg> {
  return crud.makeReadManyAction(
    query ? `${NAMESPACE}${query}` : NAMESPACE,
    (a: Resource.SWUOpportunitySlim) => a
  );
}

export function readOne<Msg>(): crud.ReadOneAction<
  Resource.SWUOpportunity,
  string[],
  Msg
> {
  return crud.makeReadOneAction(NAMESPACE, rawSWUOpportunityToSWUOpportunity);
}

export function update<Msg>(): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.SWUOpportunity,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(NAMESPACE, rawSWUOpportunityToSWUOpportunity);
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.SWUOpportunity,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(NAMESPACE, rawSWUOpportunityToSWUOpportunity);
}

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
