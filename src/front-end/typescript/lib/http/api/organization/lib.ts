import { compareDates } from "shared/lib";
import * as Resource from "shared/lib/resources/organization";

interface RawOrganizationHistoryRecord
  extends Omit<Resource.OrganizationHistoryRecord, "createdAt"> {
  createdAt: string;
}

function rawCWUHistoryRecordToCWUHistoryRecord(
  raw: RawOrganizationHistoryRecord
): Resource.OrganizationHistoryRecord {
  return {
    ...raw,
    createdAt: new Date(raw.createdAt)
  };
}

export interface RawOrganization
  extends Omit<Resource.Organization, "acceptedSWUTerms" | "history"> {
  acceptedSWUTerms?: Date | null;
  history?: RawOrganizationHistoryRecord[];
}

export function rawOrganizationToOrganization(
  raw: RawOrganization
): Resource.Organization {
  return {
    ...raw,
    acceptedSWUTerms: raw.acceptedSWUTerms && new Date(raw.acceptedSWUTerms),
    history:
      raw.history &&
      raw.history
        .map((s) => rawCWUHistoryRecordToCWUHistoryRecord(s))
        .sort((a, b) => compareDates(a.createdAt, b.createdAt) * -1)
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
