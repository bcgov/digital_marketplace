import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/proposal/sprint-with-us";
import { compareNumbers, compareDates } from "shared/lib";
import { Id } from "shared/lib/types";
import { isValid, ResponseValidation } from "shared/lib/http";
import { component } from "front-end/lib/framework";

const NAMESPACE = "proposals/sprint-with-us";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.SWUProposal,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, rawSWUProposalToSWUProposal);

export function readMany<Msg>(
  opportunityId?: Id
): crud.ReadManyAction<Resource.SWUProposalSlim, string[], Msg> {
  return crud.makeReadManyAction(
    `${NAMESPACE}${
      opportunityId !== undefined
        ? `?opportunity=${window.encodeURIComponent(opportunityId)}`
        : ""
    }`,
    rawSWUProposalSlimToSWUProposalSlim
  );
}

export function readOne<Msg>(
  opportunityId: Id
): crud.ReadOneAction<Resource.SWUProposal, string[], Msg> {
  return crud.makeReadOneAction(
    `${NAMESPACE}?opportunity=${window.encodeURIComponent(opportunityId)}`,
    rawSWUProposalToSWUProposal
  );
}

export function readExistingProposalForOpportunity<Msg>(
  opportunityId: Id,
  handleResponse: (response: Resource.SWUProposalSlim | undefined) => Msg
): component.Cmd<Msg> {
  return readMany(opportunityId)(
    (result: ResponseValidation<Resource.SWUProposalSlim[], string[]>) => {
      return isValid(result) && result.value.length
        ? handleResponse(result.value[0])
        : handleResponse(undefined);
    }
  ) as component.Cmd<Msg>;
}

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.SWUProposal,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, rawSWUProposalToSWUProposal);

export const delete_: crud.DeleteAction<
  Resource.SWUProposal,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(NAMESPACE, rawSWUProposalToSWUProposal);

// Raw Conversion

interface RawSWUProposalHistoryRecord
  extends Omit<Resource.SWUProposalHistoryRecord, "createdAt"> {
  createdAt: string;
}

function rawSWUProposalHistoryRecordToSWUProposalHistoryRecord(
  raw: RawSWUProposalHistoryRecord
): Resource.SWUProposalHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

interface RawSWUProposal
  extends Omit<
    Resource.SWUProposal,
    "createdAt" | "updatedAt" | "submittedAt" | "history"
  > {
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  history?: RawSWUProposalHistoryRecord[];
}

function rawSWUProposalToSWUProposal(
  raw: RawSWUProposal
): Resource.SWUProposal {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt),
    submittedAt:
      raw.submittedAt === undefined ? undefined : new Date(raw.submittedAt),
    history:
      raw.history &&
      raw.history
        .map((s) => rawSWUProposalHistoryRecordToSWUProposalHistoryRecord(s))
        .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    teamQuestionResponses: raw.teamQuestionResponses.sort((a, b) =>
      compareNumbers(a.order, b.order)
    ),
    references: raw.references?.sort((a, b) => compareNumbers(a.order, b.order))
  };
}

interface RawSWUProposalSlim
  extends Omit<Resource.SWUProposalSlim, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

function rawSWUProposalSlimToSWUProposalSlim(
  raw: RawSWUProposalSlim
): Resource.SWUProposalSlim {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt)
  };
}
