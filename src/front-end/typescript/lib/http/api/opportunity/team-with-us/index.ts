import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/opportunity/team-with-us";
import { compareDates, compareNumbers } from "shared/lib";
import {
  RawFileRecord,
  rawFileRecordToFileRecord
} from "front-end/lib/http/api/file/lib";
import {
  RawAddendum,
  rawAddendumToAddendum
} from "front-end/lib/http/api/addendum/lib";
export * as resourceQuestions from "front-end/lib/http/api/opportunity/team-with-us/resource-questions";

const NAMESPACE = "opportunities/team-with-us";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.TWUOpportunity,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(NAMESPACE, rawTWUOpportunityToTWUOpportunity);
}

export function readMany<Msg>({
  panelMember
}: {
  panelMember?: true;
} = {}): crud.ReadManyAction<Resource.TWUOpportunitySlim, string[], Msg> {
  const params = new URLSearchParams({
    ...(panelMember !== undefined ? { panelMember: "true" } : {})
  });
  return crud.makeReadManyAction(
    NAMESPACE,
    (a: Resource.TWUOpportunitySlim) => a,
    params.toString()
  );
}

export function readOne<Msg>(): crud.ReadOneAction<
  Resource.TWUOpportunity,
  string[],
  Msg
> {
  return crud.makeReadOneAction(NAMESPACE, rawTWUOpportunityToTWUOpportunity);
}

export function update<Msg>(): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.TWUOpportunity,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(NAMESPACE, rawTWUOpportunityToTWUOpportunity);
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.TWUOpportunity,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(NAMESPACE, rawTWUOpportunityToTWUOpportunity);
}

// Raw Conversion

interface RawTWUOpportunityHistoryRecord
  extends Omit<Resource.TWUOpportunityHistoryRecord, "createdAt"> {
  createdAt: string;
}

function rawTWUHistoryRecordToTWUHistoryRecord(
  raw: RawTWUOpportunityHistoryRecord
): Resource.TWUOpportunityHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawTWUResourceQuestion
  extends Omit<Resource.TWUResourceQuestion, "createdAt"> {
  createdAt: string;
}

function rawTWUResourceQuestionToTWUResourceQuestion(
  raw: RawTWUResourceQuestion
): Resource.TWUResourceQuestion {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawTWUOpportunity
  extends Omit<
    Resource.TWUOpportunity,
    | "proposalDeadline"
    | "assignmentDate"
    | "startDate"
    | "completionDate"
    | "createdAt"
    | "updatedAt"
    | "publishedAt"
    | "addenda"
    | "history"
    | "resourceQuestions"
    | "attachments"
  > {
  proposalDeadline: string;
  assignmentDate: string;
  startDate: string;
  completionDate: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  attachments: RawFileRecord[];
  addenda: RawAddendum[];
  history?: RawTWUOpportunityHistoryRecord[];
  resourceQuestions: RawTWUResourceQuestion[];
}

/**
 * Used for parsing/modifying JSON encoded values in a
 * request/response scenario. For instance, where Dates are
 * stored in the db as a timestamp and needs to be
 * converted to a Date object for processing in the application
 *
 * @param raw - json object from db
 */
function rawTWUOpportunityToTWUOpportunity(
  raw: RawTWUOpportunity
): Resource.TWUOpportunity {
  return {
    ...raw,
    proposalDeadline: new Date(raw.proposalDeadline),
    assignmentDate: new Date(raw.assignmentDate),
    startDate: new Date(raw.startDate),
    completionDate: new Date(raw.completionDate),
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
        .map((s) => rawTWUHistoryRecordToTWUHistoryRecord(s))
        .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    resourceQuestions: raw.resourceQuestions
      .map((tq) => rawTWUResourceQuestionToTWUResourceQuestion(tq))
      .sort((a, b) => compareNumbers(a.order, b.order)),
    resources: raw.resources.sort((a, b) => compareNumbers(a.order, b.order))
  };
}
