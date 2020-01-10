import { invalid, valid, validateGenericString, Validation } from 'shared/lib/validation';
import { UserType } from '../resources/user';

export { validateEmail } from 'shared/lib/validation';

export function validateName(name: string): Validation<string> {
  return validateGenericString(name, 'Name');
}

export function validateJobTitle(v: string): Validation<string> {
  return validateGenericString(v, 'Job Title', 0);
}

export function validateNotificationsOn(notificationsOn: boolean): Validation<Date|null> {
  return notificationsOn ? valid(new Date()) : valid(null);
}

export function validateAcceptedTerms(acceptedTerms: boolean): Validation<Date> {
  return acceptedTerms ? valid(new Date()) : invalid(['You cannot unaccept the terms and conditions.']);
}

export function validateUserType(userType: UserType): Validation<UserType> {
  if (userType === UserType.Admin ||
      userType === UserType.Government ||
      userType === UserType.Vendor) {
        return valid(userType);
      } else {
        return invalid(['Invalid user type specified.']);
      }
}
