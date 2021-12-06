import { get } from 'immutable';
import { FilePermissions, SUPPORTED_IMAGE_EXTENSIONS } from 'shared/lib/resources/file';
import { parseUserType, UserType } from 'shared/lib/resources/user';
import { adt, Id } from 'shared/lib/types';
import { ArrayValidation, invalid, isValid, mapValid, valid, validateArray, validateGenericString, validateUUID, Validation } from 'shared/lib/validation';
import { isArray, isString } from 'util';

export function validateAvatarFilename(name: string): Validation<string> {
  return validateFileName(name, SUPPORTED_IMAGE_EXTENSIONS);
}

export function validateFileName(name: string, validExtensions: readonly string[] = []): Validation<string> {
  const validatedName = validateGenericString(name, 'File name');
  if (isValid(validatedName) && validExtensions.length > 0) {
    const extension = name.match(/\.([a-zA-Z0-9]+)$/);
    if (extension && validExtensions.map(ext => ext.toLowerCase()).includes(extension[0].toLowerCase())) {
      return validatedName;
    } else {
      return invalid(['Invalid file extension.']);
    }
  } else {
    return validatedName;
  }
}

export function validateFilePermissions(raw: any): ArrayValidation<FilePermissions<Id, UserType>> {
  raw = isArray(raw) ? raw : [raw];
  const validatedFilePermissions = validateArray(raw, validateFilePermission);
  return mapValid(validatedFilePermissions, perms => {
    return Array
      .from(new Set(perms.map(v => JSON.stringify(v))))
      .map(v => JSON.parse(v) as FilePermissions<Id, UserType>);
  });
}

export function validateFilePermission(raw: any): Validation<FilePermissions<Id, UserType>> {
  switch (get(raw, 'tag')) {
    case 'any':
      return valid<FilePermissions<Id, UserType>>(adt('any'));
    case 'user':
      if (isString(raw.value)) {
        return mapValid(validateUUID(raw.value), v => adt('user', v));
      }
      return invalid(['Invalid file permission provided.']);
    case 'userType':
      const userType = parseUserType(raw.value);
      if (userType) {
        return valid<FilePermissions<Id, UserType>>(adt('userType', userType));
      } else {
        return invalid(['Not a valid user type.']);
      }
    default:
      return invalid(['Invalid file permission provided.']);
  }
}
