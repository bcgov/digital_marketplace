import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/opportunity/code-with-us";
import { compareDates } from "shared/lib";
import {
  RawFileRecord,
  rawFileRecordToFileRecord
} from "front-end/lib/http/api/file/lib";
import {
  RawAddendum,
  rawAddendumToAddendum
} from "front-end/lib/http/api/addendum/lib";

const NAMESPACE = "opportunities/code-with-us";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.CWUOpportunity,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, rawCWUOpportunityToCWUOpportunity);

export const readMany: crud.ReadManyAction<
  Resource.CWUOpportunitySlim,
  string[],
  unknown
> = crud.makeReadManyAction(NAMESPACE, (a: Resource.CWUOpportunitySlim) => a);

export const readOne: crud.ReadOneAction<
  Resource.CWUOpportunity,
  string[],
  unknown
> = crud.makeReadOneAction(NAMESPACE, rawCWUOpportunityToCWUOpportunity);

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.CWUOpportunity,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, rawCWUOpportunityToCWUOpportunity);

export const delete_: crud.DeleteAction<
  Resource.CWUOpportunity,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(NAMESPACE, rawCWUOpportunityToCWUOpportunity);

// Raw Conversion

interface RawCWUOpportunityHistoryRecord
  extends Omit<Resource.CWUOpportunityHistoryRecord, "createdAt"> {
  createdAt: string;
}

function rawCWUHistoryRecordToCWUHistoryRecord(
  raw: RawCWUOpportunityHistoryRecord
): Resource.CWUOpportunityHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawCWUOpportunity
  extends Omit<
    Resource.CWUOpportunity,
    | "proposalDeadline"
    | "assignmentDate"
    | "startDate"
    | "completionDate"
    | "createdAt"
    | "updatedAt"
    | "publishedAt"
    | "addenda"
    | "history"
    | "attachments"
  > {
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

function rawCWUOpportunityToCWUOpportunity(
  raw: RawCWUOpportunity
): Resource.CWUOpportunity {
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
        .map((s) => rawCWUHistoryRecordToCWUHistoryRecord(s))
        .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1)
  };
}
