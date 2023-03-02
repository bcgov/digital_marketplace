import { Id } from "shared/lib/types";
import * as Resource from "shared/lib/resources/proposal/team-with-us";
import { isValid, ResponseValidation } from "shared/lib/http";
import { component } from "front-end/lib/framework";
import * as crud from "front-end/lib/http/crud";
import {
  RawFileRecord,
  rawFileRecordToFileRecord
} from "front-end/lib/http/api/file/lib";
import { compareDates } from "shared/lib";

/**
 *
 */
const NAMESPACE = "proposals/team-with-us";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.TWUProposal,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, rawTWUProposalToTWUProposal);

export const update: crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.TWUProposal,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, rawTWUProposalToTWUProposal);

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
        .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1)
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
 *
 * @param opportunityId
 */
export function readMany<Msg>(
  opportunityId?: Id
): crud.ReadManyAction<Resource.TWUProposalSlim, string[], Msg> {
  return crud.makeReadManyAction(
    NAMESPACE,
    rawTWUProposalSlimToTWUProposalSlim,
    opportunityId !== undefined
      ? `opportunity=${window.encodeURIComponent(opportunityId)}`
      : ""
  );
}

/**
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
