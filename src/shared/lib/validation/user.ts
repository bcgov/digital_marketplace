import { parseUserStatus, parseUserType, UserStatus, UserType } from 'shared/lib/resources/user';
import { ArrayValidation, invalid, valid, validateCapabilities as validateCapabilitiesShared, validateGenericString, Validation } from 'shared/lib/validation';

export { validateEmail } from 'shared/lib/validation';

export function validateCapabilities(raw: string[]): ArrayValidation<string> {
  return validateCapabilitiesShared(raw, 0);
}

export function validateName(name: string): Validation<string> {
  return validateGenericString(name, 'Name');
}

export function validateJobTitle(v: string): Validation<string> {
  return validateGenericString(v, 'Job Title', 0);
}

export function validateUserType(type: string): Validation<UserType> {
  const userType = parseUserType(type);
  return userType ? valid(userType) : invalid(['Invalid user type specified.']);
}

export function validateUserStatus(status: string): Validation<UserStatus> {
  const userStatus = parseUserStatus(status);
  return userStatus ? valid(userStatus) : invalid(['Invalid user status specified']);
}
