import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';

export enum MembershipType {
  Owner = 'OWNER',
  Member = 'MEMBER',
  Pending = 'PENDING'
}

export interface Affiliation {
  createdAt: Date;
  updatedAt: Date;
  user: User;
  organization: Organization;
  membershipType: MembershipType;
}

// Used when returning a list of the current user's affiliations
export interface AffiliationSlim {
  organizationName: string;
  membershipType: MembershipType;
}

export interface CreateRequestBody {
  user: Id;
  organization: Id;
  membershipType?: MembershipType;
}

export interface CreateValidationErrors {
  user?: string[];
  organization?: string[];
}

export interface UpdateRequestBody {
  user: Id;
  organization: Id;
  membershipType: MembershipType;
}

export interface UpdateValidationErrors extends CreateValidationErrors {
  membershipType?: string[];
}

export type DeleteValidationErrors = CreateValidationErrors;
