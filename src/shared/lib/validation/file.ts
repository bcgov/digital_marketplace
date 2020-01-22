import { get } from 'immutable';
import { FilePermissions } from 'shared/lib/resources/file';
import { parseUserType, UserType } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';
import { invalid, isValid, mapValid, valid, validateGenericString, validateUUID, Validation } from 'shared/lib/validation';
import { isString } from 'util';

export function validateAvatarFilename(name: string): Validation<string> {
  return validateFileName(name, ['png', 'jpg', 'jpeg']);
}

export function validateFileName(name: string, validExtensions: string[] = []): Validation<string> {
  const validatedName = validateGenericString(name, 'File name');
  if (isValid(validatedName) && validExtensions.length > 0) {
    const extension = name.substr(name.lastIndexOf('.') + 1);
    if (validExtensions.map(ext => ext.toLowerCase()).includes(extension.toLowerCase())) {
      return validatedName;
    } else {
      return invalid(['Invalid file extension.']);
    }
  } else {
    return validatedName;
  }
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
