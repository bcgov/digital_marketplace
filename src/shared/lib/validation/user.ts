import { parseUserStatus, parseUserType, UserStatus, UserType } from 'shared/lib/resources/user';
import { invalid, valid, validateGenericString, Validation } from 'shared/lib/validation';

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

export function validateUserType(type: string): Validation<UserType> {
  const userType = parseUserType(type);
  return userType ? valid(userType) : invalid(['Invalid user type specified.']);
}

export function validateUserStatus(status: string): Validation<UserStatus> {
  const userStatus = parseUserStatus(status);
  return userStatus ? valid(userStatus) : invalid(['Invalid user status specified']);
}

export function validateIdpUsername(v: string): Validation<string> {
  return validateGenericString(v, 'Username');
}
