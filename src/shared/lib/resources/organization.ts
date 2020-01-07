import { FileRecord } from 'shared/lib/resources/file';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

export interface Organization {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  logoImageFile?: FileRecord;
  legalName: string;
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  region: string;
  mailCode: string;
  country: string;
  contactName: string;
  contactEmail: string;
  contactTitle?: string;
  contactPhone?: string;
  websiteUrl?: string;
  active: boolean;
}

export interface OrganizationSlim {
  id: Id;
  legalName: string;
  logoImageFile?: FileRecord;
  owner?: Pick<User, 'id' | 'name'>;
}

export interface CreateRequestBody extends Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'logoImageFile' | 'active'> {
  logoImageFile?: Id;
}

export interface CreateValidationErrors extends ErrorTypeFrom<CreateRequestBody> {
  permissions?: string[];
}

export type UpdateRequestBody = Partial<CreateRequestBody>;

export interface UpdateValidationErrors extends ErrorTypeFrom<UpdateRequestBody> {
  id?: string[];
  permissions?: string[];
}

export function Empty(): Organization {
  return ({
    id: '',
    createdAt: new Date(),
    updatedAt: new Date(),
    legalName: '',
    streetAddress1: '',
    city: '',
    region: '',
    mailCode: '',
    country: '',
    contactName: '',
    contactEmail: '',
    active: true
  });
}
