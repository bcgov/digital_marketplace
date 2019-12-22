import { request } from 'shared/lib/http';
import { PublicFile } from 'shared/lib/resources/file';
import * as OrgResource from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { ClientHttpMethod } from 'shared/lib/types';
import { Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

export interface Organization extends Omit<CreateRequestBody, 'logoImageFile'> {
  id: Id;
  createdAt: Date;
  updatedAt: Date;
  logoImageFile?: PublicFile;
}

export interface OrganizationSlim {
  id: Id;
  legalName: string;
  logoImageFile?: PublicFile;
  owner?: Pick<User, 'id' | 'name'>;
}

export interface CreateRequestBody {
  legalName: string;
  streetAddress1: string;
  city: string;
  region: string;
  mailCode: string;
  country: string;
  contactName: string;
  contactEmail: string;

  contactTitle?: string;
  contactPhone?: string;
  logoImageFile?: string;
  streetAddress2?: string;
  websiteUrl?: string;
}

export type CreateValidationErrors = ErrorTypeFrom<CreateRequestBody>;

export type UpdateRequestBody      = Partial<CreateRequestBody> & { id: Id; };
export type UpdateValidationErrors = ErrorTypeFrom<UpdateRequestBody>;

export async function readOneOrganization(id: string): Promise<Organization | null> {
  const response = await request(ClientHttpMethod.Get, `/api/organizations/${id}`);
  switch (response.status) {
    case 304:
    case 200:
      return response.data as Organization;
    default:
      return null;
  }
}

export async function readAllOrganizations(): Promise<Organization[]> {
  const response = await request(ClientHttpMethod.Get, '/api/organizations');
  switch (response.status) {
    case 304:
    case 200:
      return response.data as Organization[];
    default:
      return [];
  }
}

export async function createOrganization(org: OrgResource.CreateRequestBody): Promise<OrgResource.Organization | null> {
  const response = await request(ClientHttpMethod.Post, '/api/organizations', org);
  switch (response.status) {
    case 304:
    case 200:
      return response.data as OrgResource.Organization;
    default:
      return null;
  }
}

export async function updateOrganization(org: OrgResource.UpdateRequestBody): Promise<OrgResource.Organization | null> {
  const response = await request(ClientHttpMethod.Put, `/api/organizations/${org.id}`, org);
  switch (response.status) {
    case 304:
    case 200:
      return response.data as OrgResource.Organization;
    default:
      return null;
  }
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
    contactEmail: ''
  });
}
