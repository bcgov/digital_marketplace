import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export enum MembershipType {
  Owner = 'OWNER',
  Member = 'MEMBER'
}

export enum MembershipStatus {
  Active = 'ACTIVE',
  Inactive = 'INACTIVE',
  Pending = 'PENDING'
}

export interface Affiliation {
  id: Id;
  createdAt: Date;
  user: User;
  organization: Organization;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
}

// Used when returning a list of the current user's affiliations
export interface AffiliationSlim {
  id: Id;
  organization: Pick<Organization, 'id' | 'legalName'>;
  membershipType: MembershipType;
}

export interface CreateRequestBody {
  user: Id;
  organization: Id;
  membershipType: MembershipType;
}

export interface CreateValidationErrors {
  user?: string[];
  organization?: string[];
  membershipType?: string[];
  permissions?: string[];
}

export interface UpdateValidationErrors {
  membershipStatus?: string[];
  permissions?: string[];
}

export interface DeleteValidationErrors {
  affiliation?: string[];
  permissions?: string[];
}
