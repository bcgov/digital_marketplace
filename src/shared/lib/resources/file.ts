import { get, isArray } from 'lodash';
import { megabytesToBytes } from 'shared/lib';
import { User, UserType } from 'shared/lib/resources/user';
import { adt, ADT, Id } from 'shared/lib/types';
import { isString } from 'util';

export const MAX_MULTIPART_FILES_SIZE = megabytesToBytes(10);

export const SUPPORTED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png'];

export interface FileRecord {
  id: Id;
  createdAt: Date;
  createdBy: User;
  fileBlob: Id;
  name: string;
  permissions: Array<FilePermissions<Id, UserType>>;
}

export interface FileBlob {
  hash: string;
  blob: any;
}

export type FileUploadMetadata = Array<FilePermissions<Id, UserType>> | null;

export interface CreateValidationErrors {
  name?: string[];
  metadata?: string[];
  permissions?: string[];
  requestBodyType?: string[];
}

export type FilePermissions<Id, UserType>
  = ADT<'any'>                    // Anyone can read this file
  | ADT<'user', Id>               // Id of the user who has permission
  | ADT<'userType', UserType>;    // User type that has permission

/**
 * Parses a `FilePermissions` from a plain object.
 * Returns `null` if the parse fails or no permissions are supplied in the metadata.
 */
// TODO this needs to be converted to a validation function using array combinators
// TODO need to reduce the raw permissions into a "set" of permissions that prevents duplicates.
export function parseFilePermissions(raw: any, parseOneUserType: (raw: string) => UserType | null): FileUploadMetadata {
  const rawFilePermissions = isArray(raw) ? raw : [];
  const filePermissions: Array<FilePermissions<Id, UserType>> = [];
  rawFilePermissions.forEach(rawFilePermission => {
    // TODO split this out into a validateFilePermission function
    switch (get(rawFilePermission, 'tag')) {
      case 'any':
        filePermissions.push(adt('any' as const));
        break;
      case 'user':
        if (isString(rawFilePermission.value)) {
          filePermissions.push(adt('user' as const, rawFilePermission.value));
        }
        break;
      case 'userType':
        const userType = parseOneUserType(rawFilePermission.value);
        if (userType) {
          filePermissions.push(adt('userType' as const, userType));
        }
        break;
      //TODO not an exhaustive switch statement... what if the user passes invalid permissions?
    }
  });
  // TODO what if the user passes an empty array? Technically that is valid.
  return filePermissions.length > 0 ? filePermissions : null;
}

export function parseUserType(raw: string): UserType | null {
  switch (raw.toUpperCase()) {
    case 'GOV':
      return UserType.Government;
    case 'VENDOR':
      return UserType.Vendor;
    case 'ADMIN':
      return UserType.Admin;
    default:
      return null;
  }
}

export function parseUserTypeList<UserType>(list: string[], parseOneUserType: (raw: string) => UserType | null): UserType[] | null {
  return list.reduce((acc: UserType[] | null, raw: string) => {
    const parsed = parseOneUserType(raw);
    if (acc && parsed) {
      acc.push(parsed);
    } else {
      acc = null;
    }
    return acc;
  }, []);
}

export function fileBlobPath(file: FileRecord) {
  return `/api/files/${file.id}?type=blob`;
}
