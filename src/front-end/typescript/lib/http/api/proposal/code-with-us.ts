import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/proposal/code-with-us";
import { compareDates } from "shared/lib";
import { Id } from "shared/lib/types";
import { isValid, ResponseValidation } from "shared/lib/http";
import { component } from "front-end/lib/framework";
import {
  rawFileRecordToFileRecord,
  RawFileRecord
} from "front-end/lib/http/api/file/lib";

const NAMESPACE = "proposals/code-with-us";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.CWUProposal,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, rawCWUProposalToCWUProposal);

export function readMany<Msg>(
  opportunityId?: Id
): crud.ReadManyAction<Resource.CWUProposalSlim, string[], Msg> {
  return crud.makeReadManyAction(
    NAMESPACE,
    rawCWUProposalSlimToCWUProposalSlim,
    opportunityId !== undefined
      ? `opportunity=${window.encodeURIComponent(opportunityId)}`
      : ""
  );
}

export function readOne<Msg>(
  opportunityId: Id
): crud.ReadOneAction<Resource.CWUProposal, string[], Msg> {
  return crud.makeReadOneAction(
    NAMESPACE,
    rawCWUProposalToCWUProposal,
    `opportunity=${window.encodeURIComponent(opportunityId)}`
  );
}

export function readExistingProposalForOpportunity<Msg>(
  opportunityId: Id,
  handleResponse: (response: Resource.CWUProposalSlim | undefined) => Msg
): component.Cmd<Msg> {
  return readMany(opportunityId)(
    (result: ResponseValidation<Resource.CWUProposalSlim[], string[]>) => {
      return isValid(result) && result.value.length
        ? handleResponse(result.value[0])
        : handleResponse(undefined);
    }
  ) as component.Cmd<Msg>;
}

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.CWUProposal,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, rawCWUProposalToCWUProposal);

export const delete_: crud.DeleteAction<
  Resource.CWUProposal,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(NAMESPACE, rawCWUProposalToCWUProposal);

// Raw Conversion

interface RawCWUProposalHistoryRecord
  extends Omit<Resource.CWUProposalHistoryRecord, "createdAt"> {
  createdAt: string;
}

function rawCWUProposalHistoryRecordToCWUProposalHistoryRecord(
  raw: RawCWUProposalHistoryRecord
): Resource.CWUProposalHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawCWUProposal
  extends Omit<
    Resource.CWUProposal,
    "createdAt" | "updatedAt" | "submittedAt" | "history" | "attachments"
  > {
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  attachments: RawFileRecord[];
  history?: RawCWUProposalHistoryRecord[];
}

function rawCWUProposalToCWUProposal(
  raw: RawCWUProposal
): Resource.CWUProposal {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    submittedAt:
      raw.submittedAt === undefined ? undefined : new Date(raw.submittedAt),
    attachments: raw.attachments
      .map((a) => rawFileRecordToFileRecord(a))
      .sort((a, b) => compareDates(a.createdAt, b.createdAt)),
    history:
      raw.history &&
      raw.history
        .map((s) => rawCWUProposalHistoryRecordToCWUProposalHistoryRecord(s))
        .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1)
  };
}

interface RawCWUProposalSlim
  extends Omit<Resource.CWUProposalSlim, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

function rawCWUProposalSlimToCWUProposalSlim(
  raw: RawCWUProposalSlim
): Resource.CWUProposalSlim {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt)
  };
}
