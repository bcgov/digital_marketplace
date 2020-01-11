import { get } from 'immutable';
import { FilePermissions } from 'shared/lib/resources/file';
import { parseUserType, UserType } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';
import { invalid, mapValid, valid, validateGenericString, validateUUID, Validation } from 'shared/lib/validation';
import { isString } from 'util';

export function validateFileName(name: string): Validation<string> {
  return validateGenericString(name, 'File name');
}

export function validateFilePath(path: string): Validation<string> {
  return validateGenericString(path, 'File path');
}

export function validateFilePermission(raw: any): Validation<FilePermissions<Id, UserType>> {
  switch (get(raw, 'tag')) {
    case 'any':
      return valid(adt('any'));
    case 'user':
      if (isString(raw.value)) {
        return mapValid(validateUUID(raw.value), v => adt('user', v));
      }
    case 'userType':
      const userType = parseUserType(raw.value);
      if (userType) {
        return valid(adt('userType', userType));
      } else {
        return invalid(['Not a valid user type.']);
      }
    default:
      return invalid(['Invalid file permission provided.']);
  }
}
