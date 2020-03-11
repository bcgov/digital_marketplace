import { FileRecord } from 'shared/lib/resources/file';
import { UserSlim } from 'shared/lib/resources/user';
import { BodyWithErrors, Id } from 'shared/lib/types';
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
}

export interface OrganizationSlim {
  id: Id;
  legalName: string;
  logoImageFile?: FileRecord;
  owner?: UserSlim;       // Admin/owner only
  swuQualified?: boolean; // Admin/owner only
}

export interface CreateRequestBody extends Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'logoImageFile' | 'active' | 'owner' | 'acceptedSWUTerms' | 'swuQualified'> {
  logoImageFile?: Id;
}

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody> & BodyWithErrors;

export type UpdateRequestBody = CreateRequestBody;

export type UpdateValidationErrors = ErrorTypeFrom<UpdateRequestBody> & BodyWithErrors;

export type DeleteValidationErrors = BodyWithErrors;
