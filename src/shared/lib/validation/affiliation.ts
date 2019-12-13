import { MembershipType } from 'shared/lib/resources/affiliation';
import { invalid, valid, Validation } from 'shared/lib/validation';

export function validateMembershipType(membershipType: MembershipType): Validation<MembershipType | string[]> {
  if (Object.values(MembershipType).includes(membershipType)) {
    return valid(membershipType);
  } else {
    return invalid(['You must provide a valid membership type.']);
  }
}
