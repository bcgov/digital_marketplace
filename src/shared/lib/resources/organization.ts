import { FileRecord } from 'shared/lib/resources/file';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
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

export interface CreateValidationErrors extends ErrorTypeFrom<CreateRequestBody> {
  permissions?: string[];
  database?: string[];
}

export type UpdateRequestBody = CreateRequestBody;

export interface UpdateValidationErrors extends ErrorTypeFrom<UpdateRequestBody> {
  id?: string[];
  permissions?: string[];
  database?: string[];
}

export type DeleteValidationErrors = {
  id?: string[];
  permissions?: string[];
};
