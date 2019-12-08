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

export interface CreateRequestBody {
  user: Id;
  organization: Id;
  membershipType: MembershipType;
}
