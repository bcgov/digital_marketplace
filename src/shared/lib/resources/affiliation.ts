import { Organization } from 'shared/lib/resources/organization';
import { User } from 'shared/lib/resources/user';
import { Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';

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
  user: string;
  organization: string;
  membershipType: string;
}

export interface CreateValidationErrors extends ErrorTypeFrom<CreateRequestBody> {
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

export function parseMembershipType(raw: string): MembershipType | null {
  switch (raw) {
    case MembershipType.Member:
      return MembershipType.Member;
    case MembershipType.Owner:
      return MembershipType.Owner;
    default:
      return null;
  }
}
