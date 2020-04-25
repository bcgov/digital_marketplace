import { FileRecord } from 'shared/lib/resources/file';
import { UserSlim } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

// Properties to include on Organization and OrganizationSlim
// for admins/owners only.
export interface OrganizationAdmin {
  owner?: UserSlim;
  acceptedSWUTerms?: Date | null;
  possessAllCapabilities?: boolean;
  numTeamMembers?: number;
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
}

export interface OrganizationSlim extends OrganizationAdmin {
  id: Id;
  legalName: string;
  logoImageFile?: FileRecord;
  active: boolean;
}

export interface CreateRequestBody extends Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'logoImageFile' | 'active' | 'owner' | 'acceptedSWUTerms' | 'possessAllCapabilities' | 'numTeamMembers'> {
  logoImageFile?: Id;
}

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> & BodyWithErrors;

export type UpdateRequestBody
  = ADT<'updateProfile', UpdateProfileRequestBody>
  | ADT<'acceptSWUTerms'>;

export type UpdateProfileRequestBody = CreateRequestBody;

export type UpdateProfileValidationErrors = ErrorTypeFrom<UpdateProfileRequestBody>;

type UpdateADTErrors
  = ADT<'updateProfile', UpdateProfileValidationErrors>
  | ADT<'acceptSWUTerms', string[]>
  | ADT<'parseFailure'>;

export interface UpdateValidationErrors extends BodyWithErrors {
  organization?: UpdateADTErrors;
}

export type DeleteValidationErrors = BodyWithErrors;

export function doesOrganizationMeetSWUQualificationNumTeamMembers(organization: Organization | OrganizationSlim): boolean {
  return (organization.numTeamMembers || 0) >= 2;
}

export function doesOrganizationMeetSWUQualification(organization: Organization): boolean {
  return doesOrganizationMeetSWUQualificationNumTeamMembers(organization) && !!organization.acceptedSWUTerms && !!organization.possessAllCapabilities;
}
