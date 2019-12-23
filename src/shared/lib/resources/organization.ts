import { create, readOne, readMany, update } from 'shared/lib/http';
import { PublicFile } from 'shared/lib/resources/file';
import { User } from 'shared/lib/resources/user';
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
  return readOne<Organization>(`/api/organizations/${id}`);
}

export async function readAllOrganizations(): Promise<Organization[]> {
  return readMany<Organization>('/api/organizations');
}

export async function createOrganization(requestBody: CreateRequestBody): Promise<Organization | null> {
  return create<Organization, CreateRequestBody>('/api/organizations', requestBody);
}

export async function updateOrganization(requestBody: UpdateRequestBody): Promise<Organization | null> {
  return update<Organization, UpdateRequestBody>(`/api/organizations/${requestBody.id}`, requestBody);
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
