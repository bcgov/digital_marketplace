import * as Resource from "shared/lib/resources/organization";

export interface RawOrganization
  extends Omit<Resource.Organization, "acceptedSWUTerms"> {
  acceptedSWUTerms?: Date | null;
}

export function rawOrganizationToOrganization(
  raw: RawOrganization
): Resource.Organization {
  return {
    ...raw,
    acceptedSWUTerms: raw.acceptedSWUTerms && new Date(raw.acceptedSWUTerms)
  };
}

export interface RawOrganizationSlim
  extends Omit<Resource.OrganizationSlim, "acceptedSWUTerms"> {
  acceptedSWUTerms?: Date | null;
}

export function rawOrganizationSlimToOrganizationSlim(
  raw: RawOrganizationSlim
): Resource.OrganizationSlim {
  return {
    ...raw,
    acceptedSWUTerms: raw.acceptedSWUTerms && new Date(raw.acceptedSWUTerms)
  };
}

export interface RawOrganizationReadManyResponse
  extends Omit<Resource.ReadManyResponseBody, "items"> {
  items: RawOrganizationSlim[];
}
