import * as crud from "front-end/lib/http/crud";
import * as Resource from "shared/lib/resources/affiliation";
import { Id } from "shared/lib/types";

const NAMESPACE = "affiliations";

export const create: crud.CreateAction<
  Resource.CreateRequestBody,
  Resource.Affiliation,
  Resource.CreateValidationErrors,
  unknown
> = crud.makeCreateAction(NAMESPACE, rawAffiliationToAffiliation);

export const readMany: crud.ReadManyAction<
  Resource.AffiliationSlim,
  string[],
  unknown
> = crud.makeReadManyAction(NAMESPACE, (a: Resource.AffiliationSlim) => a);

export function readManyForOrganization(
  organizationId: Id
): crud.ReadManyAction<Resource.AffiliationMember, string[], unknown> {
  return crud.makeReadManyAction(
    NAMESPACE,
    (a: Resource.AffiliationMember) => a,
    `organization=${window.encodeURIComponent(organizationId)}`
  );
}

export const update: crud.UpdateAction<
  null,
  Resource.Affiliation,
  Resource.UpdateValidationErrors,
  unknown
> = crud.makeUpdateAction(NAMESPACE, rawAffiliationToAffiliation);

export const delete_: crud.DeleteAction<
  Resource.Affiliation,
  Resource.DeleteValidationErrors,
  unknown
> = crud.makeDeleteAction(NAMESPACE, rawAffiliationToAffiliation);

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
