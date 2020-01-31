import { FileRecord } from 'shared/lib/resources/file';
import { User } from 'shared/lib/resources/user';
import { BodyWithErrors, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

export type OrganizationOwner = Pick<User, 'id' | 'name'>;

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
  owner: OrganizationOwner;
  deactivatedOn?: Date;
  deactivatedBy?: Id;
}

export interface OrganizationSlim {
  id: Id;
  legalName: string;
  logoImageFile?: FileRecord;
  owner?: OrganizationOwner;
}

export interface CreateRequestBody extends Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'logoImageFile' | 'active' | 'owner'> {
  logoImageFile?: Id;
}

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> & BodyWithErrors;

export type UpdateRequestBody = CreateRequestBody;

export type UpdateValidationErrors = ErrorTypeFrom<UpdateRequestBody> & BodyWithErrors;

export type DeleteValidationErrors = BodyWithErrors;
