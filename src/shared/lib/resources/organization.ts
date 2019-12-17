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
}

export interface OrganizationSlim {
  id: Id;
  legalName: string;
  logoImageFile?: PublicFile;
  owner?: Pick<User, 'id' | 'name'>;
}

export interface CreateRequestBody extends Omit<Organization, 'id' | 'createdAt' | 'updatedAt' | 'logoImageFile'> {
  logoImageFile?: Id;
}

export interface UpdateRequestBody extends Partial<CreateRequestBody> {
  id: Id;
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

export function GetAllOrganizations(): Organization[] {
  return [
    {
      id: '1',
      createdAt: new Date(),
      updatedAt: new Date(),
      legalName: 'Org1',
      streetAddress1: 'address',
      city: 'city',
      region: 'region',
      mailCode: 'mailCode',
      country: 'country',
      contactName: 'Shangalong',
      contactEmail: 'contactEmail'
    },
    {
      id: '2',
      createdAt: new Date(),
      updatedAt: new Date(),
      legalName: 'Org2',
      streetAddress1: 'address',
      city: 'city',
      region: 'region',
      mailCode: 'mailCode',
      country: 'country',
      contactName: 'Crackhead Paul',
      contactEmail: 'contactEmail'
    },
    {
      id: '3',
      createdAt: new Date(),
      updatedAt: new Date(),
      legalName: 'Org3',
      streetAddress1: 'address',
      city: 'city',
      region: 'region',
      mailCode: 'mailCode',
      country: 'country',
      contactName: 'Jim Gordon',
      contactEmail: 'contactEmail'
    },
    {
      id: '4',
      createdAt: new Date(),
      updatedAt: new Date(),
      legalName: 'Org4',
      streetAddress1: 'address',
      city: 'city',
      region: 'region',
      mailCode: 'mailCode',
      country: 'country',
      contactName: 'Barry Allen',
      contactEmail: 'contactEmail'
    }
  ];
}
