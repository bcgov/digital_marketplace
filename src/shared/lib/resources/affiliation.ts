import {
  Organization,
  OrganizationSlim
} from "shared/lib/resources/organization";
import { User, usersHaveCapability } from "shared/lib/resources/user";
import { BodyWithErrors, Id } from "shared/lib/types";
import { ErrorTypeFrom } from "shared/lib/validation";

export enum MembershipType {
  Owner = "OWNER",
  Member = "MEMBER"
}

export enum MembershipStatus {
  Active = "ACTIVE",
  Inactive = "INACTIVE",
  Pending = "PENDING"
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
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  organization: OrganizationSlim;
}

export interface AffiliationMember {
  id: Id;
  membershipType: MembershipType;
  membershipStatus: MembershipStatus;
  user: Pick<User, "id" | "name" | "avatarImageFile" | "capabilities">;
}

export interface CreateRequestBody {
  userEmail: string;
  organization: Id;
  membershipType: MembershipType;
}

export interface CreateValidationErrors
  extends ErrorTypeFrom<CreateRequestBody>,
    BodyWithErrors {
  inviteeNotRegistered?: string[];
  affiliation?: string[];
}

export interface UpdateValidationErrors extends BodyWithErrors {
  affiliation?: string[];
}

export interface DeleteValidationErrors extends BodyWithErrors {
  affiliation?: string[];
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

export function membersHaveCapability(
  members: AffiliationMember[],
  capability: string
): boolean {
  return usersHaveCapability(
    members.map(({ user }) => user),
    capability
  );
}

export function memberIsPending(
  member: Pick<Affiliation, "membershipStatus">
): boolean {
  return member.membershipStatus === MembershipStatus.Pending;
}

export function memberIsOwner(
  member: Pick<Affiliation, "membershipType">
): boolean {
  return member.membershipType === MembershipType.Owner;
}
