import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/proposal/sprint-with-us";
import { compareNumbers, compareDates } from "shared/lib";
import { Id } from "shared/lib/types";
import { isValid, ResponseValidation } from "shared/lib/http";
import { component } from "front-end/lib/framework";
export * as teamQuestions from "front-end/lib/http/api/proposal/sprint-with-us/";

const NAMESPACE = "proposals/sprint-with-us";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.SWUProposal,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(NAMESPACE, rawSWUProposalToSWUProposal);
}

/**
 * Parses URL parameters prior to creating a read request for many SWU proposals
 *
 * @param opportunityId
 * @param orgProposals
 */
export function readMany<Msg>(
  opportunityId?: Id,
  orgProposals?: Id
): crud.ReadManyAction<Resource.SWUProposalSlim, string[], Msg> {
  const params = new URLSearchParams({
    opportunity:
      opportunityId !== undefined
        ? window.encodeURIComponent(opportunityId)
        : "",
    organizationProposals:
      orgProposals !== undefined ? encodeURIComponent(orgProposals) : ""
  });
  return crud.makeReadManyAction(
    NAMESPACE,
    rawSWUProposalSlimToSWUProposalSlim,
    params.toString()
  );
}

export function readOne<Msg>(
  opportunityId: Id
): crud.ReadOneAction<Resource.SWUProposal, string[], Msg> {
  return crud.makeReadOneAction(
    NAMESPACE,
    rawSWUProposalToSWUProposal,
    `opportunity=${window.encodeURIComponent(opportunityId)}`
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

export function update<Msg>(): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.SWUProposal,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(NAMESPACE, rawSWUProposalToSWUProposal);
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.SWUProposal,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(NAMESPACE, rawSWUProposalToSWUProposal);
}

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
