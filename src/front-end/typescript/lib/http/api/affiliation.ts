import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/affiliation";
import { Id } from "shared/lib/types";

const NAMESPACE = "affiliations";

export function create<Msg>(): crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.Affiliation,
  Resource.CreateValidationErrors,
  Msg
> {
  return crud.makeCreateAction(NAMESPACE, rawAffiliationToAffiliation);
}

export function readMany<Msg>(): crud.ReadManyAction<
  Resource.AffiliationSlim,
  string[],
  Msg
> {
  return crud.makeReadManyAction(NAMESPACE, (a: Resource.AffiliationSlim) => a);
}

export function readManyForOrganization<Msg>(
  organizationId: Id
): crud.ReadManyAction<Resource.AffiliationMember, string[], Msg> {
  return crud.makeReadManyAction(
    NAMESPACE,
    (a: Resource.AffiliationMember) => a,
    `organization=${window.encodeURIComponent(organizationId)}`
  );
}

export function update<Msg>(): crud.UpdateAction<
  Resource.UpdateRequestBody,
  Resource.Affiliation,
  Resource.UpdateValidationErrors,
  Msg
> {
  return crud.makeUpdateAction(NAMESPACE, rawAffiliationToAffiliation);
}

export function delete_<Msg>(): crud.DeleteAction<
  Resource.Affiliation,
  Resource.DeleteValidationErrors,
  Msg
> {
  return crud.makeDeleteAction(NAMESPACE, rawAffiliationToAffiliation);
}

// Raw Conversion

interface RawAffiliation extends Omit<Resource.Affiliation, "createdAt"> {
  createdAt: string;
}

function rawAffiliationToAffiliation(
  raw: RawAffiliation
): Resource.Affiliation {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}
