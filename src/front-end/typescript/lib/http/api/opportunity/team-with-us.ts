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

const NAMESPACE = "opportunities/team-with-us";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.TWUOpportunity,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, rawTWUOpportunityToTWUOpportunity);

export const readMany: crud.ReadManyAction<
  Resource.TWUOpportunitySlim,
  string[],
  unknown
> = crud.makeReadManyAction(NAMESPACE, (a: Resource.TWUOpportunitySlim) => a);

export const readOne: crud.ReadOneAction<
  Resource.TWUOpportunity,
  string[],
  unknown
> = crud.makeReadOneAction(NAMESPACE, rawTWUOpportunityToTWUOpportunity);

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.TWUOpportunity,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, rawTWUOpportunityToTWUOpportunity);

export const delete_: crud.DeleteAction<
  Resource.TWUOpportunity,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(NAMESPACE, rawTWUOpportunityToTWUOpportunity);

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
    | "createdAt"
    | "updatedAt"
    | "publishedAt"
    | "addenda"
    | "history"
    | "serviceArea"
    | "resourceQuestions"
    | "attachments"
  > {
  proposalDeadline: string;
  assignmentDate: string;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  attachments: RawFileRecord[];
  addenda: RawAddendum[];
  history?: RawTWUOpportunityHistoryRecord[];
  serviceArea: string;
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
    completionDate: raw.completionDate ? new Date(raw.completionDate) : null,
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
      .sort((a, b) => compareNumbers(a.order, b.order))
  };
}
