import { MembershipType, parseMembershipType } from 'shared/lib/resources/affiliation';
import { invalid, valid, Validation } from 'shared/lib/validation';

export function validateMembershipType(raw: string): Validation<MembershipType> {
  const membershipType = parseMembershipType(raw);
  return membershipType ? valid(membershipType) : invalid(['Invalid membership type provided.']);
}
