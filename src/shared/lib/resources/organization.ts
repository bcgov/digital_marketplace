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

export async function readOneOrganization(id: string): Promise<Organization> {
  const orgs: Organization[] = await readAllOrganizations();
  return orgs[0];
}

export async function readAllOrganizations(): Promise<Organization[]> {
  return new Promise( (resolve) => {
    return resolve([
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
    ]);
  });

}
