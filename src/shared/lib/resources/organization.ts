import { create, readMany, readOne, update } from 'shared/lib/http';
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
  logoImageFile?: string;
}

export interface CreateValidationErrors extends ErrorTypeFrom<CreateRequestBody> {
  permissions?: string[];
}

export type UpdateRequestBody = Partial<CreateRequestBody>;

export interface UpdateValidationErrors extends ErrorTypeFrom<UpdateRequestBody> {
  id?: string[];
  permissions?: string[];
}

export async function readOneOrganization(id: string): Promise<Organization | null> {
  return readOne<Organization>(`/api/organizations/${id}`);
}

export async function readAllOrganizations(): Promise<Organization[]> {
  return readMany<Organization>('/api/organizations');
}

export async function createOrganization(requestBody: CreateRequestBody): Promise<Organization | null> {
  return create<Organization, CreateRequestBody>('/api/organizations', requestBody);
}

export async function updateOrganization(id: Id, requestBody: UpdateRequestBody): Promise<Organization | null> {
  return update<Organization, UpdateRequestBody>(`/api/organizations/${id}`, requestBody);
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
