import { Id } from "shared/lib/types";
import * as Resource from "shared/lib/resources/proposal/team-with-us";
import { isValid, ResponseValidation } from "shared/lib/http";
import { component } from "front-end/lib/framework";
import * as crud from "front-end/lib/http/crud";

/**
 *
 */
const NAMESPACE = "proposals/team-with-us";

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
