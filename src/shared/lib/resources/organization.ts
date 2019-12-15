import { PublicFile } from 'shared/lib/resources/file';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export interface Organization {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  legalName: string;
  logoImageFile?: PublicFile;
  websiteUrl?: string;
  streetAddress1: string;
  streetAddress2?: string;
  city: string;
  region: string;
  mailCode: string;
  country: string;
  contactName: string;
  contactTitle?: string;
  contactEmail: string;
  contactPhone?: string;
  active: boolean;
}

export interface OrganizationSlim {
  id: Id;
  legalName: string;
  logoImageFile?: PublicFile;
  owner?: Pick<User, 'id' | 'name'>;
}

export interface UpdateRequestBody {
  id: Id;
  legalName?: string;
  logoImageFile?: Id;
  websiteUrl?: string;
  streetAddress1?: string;
  streetAddress2?: string;
  city?: string;
  region?: string;
  mailCode?: string;
  country?: string;
  contactName?: string;
  contactTitle?: string;
  contactEmail?: string;
  contactPhone?: string;
}

export interface CreateRequestBody extends Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'logoImageFile'> {
  logoImageFile?: Id;
}

export interface CreateValidationErrors {
  legalName?: string[];
  logoImageFile?: string[];
  websiteUrl?: string[];
  contactName?: string[];
  contactTitle?: string[];
  contactEmail?: string[];
  contactPhone?: string[];
  streetAddress1?: string[];
  streetAddress2?: string[];
  city?: string[];
  region?: string[];
  mailCode?: string[];
  country?: string[];
}

export interface UpdateValidationErrors extends CreateValidationErrors {
  id?: string[];
}
