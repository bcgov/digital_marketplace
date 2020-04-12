import { FileRecord } from 'shared/lib/resources/file';
import { UserSlim } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

export interface Organization {
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
  owner: UserSlim;
  deactivatedOn?: Date;
  deactivatedBy?: Id;
  acceptedSWUTerms: Date | null;
  swuQualified: boolean;
  //TODO implement for owners/admins
  numTeamMembers?: number;
}

export interface OrganizationSlim {
  id: Id;
  legalName: string;
  logoImageFile?: FileRecord;
  owner?: UserSlim;       // Admin/owner only
  swuQualified?: boolean; // Admin/owner only
  //TODO implement for owners/admins
  numTeamMembers?: number;
}

export interface CreateRequestBody extends Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'logoImageFile' | 'active' | 'owner' | 'acceptedSWUTerms' | 'swuQualified' | 'numTeamMembers'> {
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
