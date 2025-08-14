import { FileRecord } from "shared/lib/resources/file";
import { UserSlim } from "shared/lib/resources/user";
import { TWUServiceAreaRecord } from "shared/lib/resources/service-area";
import {
  ADT,
  BodyWithErrors,
  Id,
  ReadManyResponseBodyBase
} from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation/index";
import {
  TWUResource,
  TWUServiceArea
} from "shared/lib/resources/opportunity/team-with-us";
import { AffiliationEvent } from "shared/lib/resources/affiliation";

export type { ReadManyResponseValidationErrors } from "shared/lib/types";

// Properties to include on Organization and OrganizationSlim
// for admins/owners only.
export interface OrganizationAdmin {
  owner?: UserSlim;
  acceptedSWUTerms?: Date | null;
  acceptedTWUTerms?: Date | null;
  possessAllCapabilities?: boolean;
  possessOneServiceArea?: boolean;
  numTeamMembers?: number;
  serviceAreas: TWUServiceAreaRecord[];
}

// Populate this as needed
export enum OrganizationEvent {}

export interface OrganizationHistoryRecord {
  createdAt: Date;
  createdBy: UserSlim;
  type: OrganizationEvent | AffiliationEvent;
  member?: UserSlim;
}

export interface Organization extends OrganizationAdmin {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  logoImageFile?: FileRecord;
  legalName: string;
  streetAddress1: string;
  streetAddress2: string;
  city: string;
  region: string;
  mailCode: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactTitle: string;
  contactPhone: string;
  websiteUrl: string;
  active: boolean;
  deactivatedOn?: Date;
  deactivatedBy?: Id;
  history?: OrganizationHistoryRecord[];
}

export interface OrganizationSlim extends OrganizationAdmin {
  id: Id;
  legalName: string;
  logoImageFile?: FileRecord;
  active: boolean;
}

export interface CreateRequestBody
  extends Omit<
    Organization,
    | "id"
    | "createdAt"
    | "updatedAt"
    | "logoImageFile"
    | "active"
    | "owner"
    | "acceptedSWUTerms"
    | "acceptedTWUTerms"
    | "possessAllCapabilities"
    | "possessOneServiceArea"
    | "numTeamMembers"
    | "serviceAreas"
  > {
  logoImageFile?: Id;
}

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> &
  BodyWithErrors;

export type UpdateRequestBody =
  | ADT<"updateProfile", UpdateProfileRequestBody>
  | ADT<"acceptSWUTerms">
  | ADT<"acceptTWUTerms">
  | ADT<"qualifyServiceAreas", TWUServiceArea[]>;

export type UpdateProfileRequestBody = CreateRequestBody;

export type UpdateProfileValidationErrors =
  ErrorTypeFrom<UpdateProfileRequestBody>;

type UpdateADTErrors =
  | ADT<"updateProfile", UpdateProfileValidationErrors>
  | ADT<"acceptSWUTerms", string[]>
  | ADT<"acceptTWUTerms", string[]>
  | ADT<"qualifyServiceAreas", string[][]>
  | ADT<"parseFailure">;

export interface UpdateValidationErrors extends BodyWithErrors {
  organization?: UpdateADTErrors;
}

export type DeleteValidationErrors = BodyWithErrors;

export type ReadManyResponseBody = ReadManyResponseBodyBase<OrganizationSlim>;

export function doesOrganizationHaveAdminInfo(
  organization: Organization | OrganizationSlim
): boolean {
  return organization.owner !== undefined;
}

export function doesOrganizationMeetSWUQualificationNumTeamMembers(
  organization: Organization | OrganizationSlim
): boolean {
  return (organization.numTeamMembers || 0) >= 2;
}

export function doesOrganizationMeetSWUQualification(
  organization: Organization | OrganizationSlim
): boolean {
  return (
    doesOrganizationMeetSWUQualificationNumTeamMembers(organization) &&
    !!organization.acceptedSWUTerms &&
    !!organization.possessAllCapabilities
  );
}

export function doesOrganizationMeetTWUQualification(
  organization: Organization | OrganizationSlim
): boolean {
  return (
    !!organization.possessOneServiceArea && !!organization.acceptedTWUTerms
  );
}

export function doesOrganizationProvideServiceArea(
  organization: Organization | OrganizationSlim,
  serviceArea: TWUServiceArea
): boolean {
  return organization.serviceAreas.some(
    (orgServiceArea) => orgServiceArea.serviceArea === serviceArea
  );
}

/**
 * Returns true if the organization provides all the service areas.
 *
 * @param organization
 * @param resources - array of TWUResources[]
 */
export function doesOrganizationProvideServiceAreas(
  organization: Organization | OrganizationSlim,
  resources: TWUResource[]
): boolean {
  return resources.every((serviceArea) =>
    doesOrganizationProvideServiceArea(organization, serviceArea.serviceArea)
  );
}
