import { Id } from "shared/lib/types";
import * as Resource from "shared/lib/resources/proposal/team-with-us";
import { isValid, ResponseValidation } from "shared/lib/http";
import { component } from "front-end/lib/framework";
import * as crud from "front-end/lib/http/crud";
import {
  RawFileRecord,
  rawFileRecordToFileRecord
} from "front-end/lib/http/api/file/lib";
import { compareDates, compareNumbers } from "shared/lib";

/**
 * reflects the path for the CRUD request being made
 */
const NAMESPACE = "proposals/team-with-us";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.TWUProposal,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(NAMESPACE, rawTWUProposalToTWUProposal);
}

export function readOne<Msg>(
  opportunityId: Id
): crud.ReadOneAction<Resource.TWUProposal, string[], Msg> {
  return crud.makeReadOneAction(
    NAMESPACE,
    rawTWUProposalToTWUProposal,
    `opportunity=${window.encodeURIComponent(opportunityId)}`
  );
}

/**
 * Parses URL parameters prior to creating a read request for many TWU proposals
 *
 * @param opportunityId
 * @param orgProposals
 */
export function readMany<Msg>(
  opportunityId?: Id,
  orgProposals?: Id
): crud.ReadManyAction<Resource.TWUProposalSlim, string[], Msg> {
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
    rawTWUProposalSlimToTWUProposalSlim,
    params.toString()
  );
}

export function update<Msg>(): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.TWUProposal,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(NAMESPACE, rawTWUProposalToTWUProposal);
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.TWUProposal,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(NAMESPACE, rawTWUProposalToTWUProposal);
}

interface RawTWUProposal
  extends Omit<
    Resource.TWUProposal,
    "createdAt" | "updatedAt" | "submittedAt" | "history" | "attachments"
  > {
  createdAt: string;
  updatedAt: string;
  submittedAt?: string;
  attachments: RawFileRecord[];
  history?: RawTWUProposalHistoryRecord[];
}

interface RawTWUProposalHistoryRecord
  extends Omit<Resource.TWUProposalHistoryRecord, "createdAt"> {
  createdAt: string;
}

function rawTWUProposalToTWUProposal(
  raw: RawTWUProposal
): Resource.TWUProposal {
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
        .map((s) => rawTWUProposalHistoryRecordToTWUProposalHistoryRecord(s))
        .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1),
    resourceQuestionResponses: raw.resourceQuestionResponses.sort((a, b) =>
      compareNumbers(a.order, b.order)
    )
  };
}

function rawTWUProposalHistoryRecordToTWUProposalHistoryRecord(
  raw: RawTWUProposalHistoryRecord
): Resource.TWUProposalHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

/**
 *
 */
interface RawTWUProposalSlim
  extends Omit<Resource.TWUProposalSlim, "createdAt" | "updatedAt"> {
  createdAt: string;
  updatedAt: string;
}

/**
 * Proposals have a relationship to opportunities. Can be used when a vendor views
 * an opportunity, and relevant, previously saved proposals are returned.
 *
 * opportunity
 *
 * @param opportunityId
 * @param handleResponse
 */
export function readExistingProposalForOpportunity<Msg>(
  opportunityId: Id,
  handleResponse: (response: Resource.TWUProposalSlim | undefined) => Msg
): component.Cmd<Msg> {
  return readMany(opportunityId)(
    (result: ResponseValidation<Resource.TWUProposalSlim[], string[]>) => {
      return isValid(result) && result.value.length
        ? handleResponse(result.value[0])
        : handleResponse(undefined);
    }
  ) as component.Cmd<Msg>;
}

/**
 * Takes raw user input from a proposal form, prepares it to make a request while
 * modifying date fields to the current date.
 *
 * @param raw
 */
function rawTWUProposalSlimToTWUProposalSlim(
  raw: RawTWUProposalSlim
): Resource.TWUProposalSlim {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt),
    updatedAt: new Date(raw.updatedAt)
  };
}
