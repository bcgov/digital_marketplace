import { uniq } from 'lodash';
import SKILLS from 'shared/lib/data/skills';
import { parseUserStatus, parseUserType, UserStatus, UserType } from 'shared/lib/resources/user';
import { ArrayValidation, invalid, mapValid, valid, validateArray, validateGenericString, Validation } from 'shared/lib/validation';

export { validateEmail } from 'shared/lib/validation';

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

export function validateCapability(raw: string): Validation<string> {
  return SKILLS.includes(raw) ? valid(raw) : invalid(['Invalid capability specified.']);
}

export function validateCapabilities(raw: string[]): ArrayValidation<string> {
  const validatedArray = validateArray(raw, validateCapability);
  return mapValid(validatedArray, v => uniq(v));
}
