import { get, isArray } from 'lodash';
import { megabytesToBytes } from 'shared/lib';
import { User, UserType } from 'shared/lib/resources/user';
import { ADT, Id } from 'shared/lib/types';
import { isString } from 'util';

export const MAX_MULTIPART_FILES_SIZE = megabytesToBytes(10);

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

export interface CreateRequestBody {
  name: string;
  path: string;
  metadata: Array<FilePermissions<Id, UserType>>;
}

export interface CreateValidationErrors {
  name?: string[];
  metadata?: string[];
}

export type FilePermissions<Id, UserType>
  = ADT<'any'>                    // Anyone can read this file
  | ADT<'user', Id>               // Id of the user who has permission
  | ADT<'userType', UserType>;    // User type that has permission

/**
 * Parses a `FilePermissions` from a plain object.
 * Returns `null` if the parse fails or no permissions are supplied in the metadata.
 */
export function parseFilePermissions<Id, UserType>(raw: any, parseOneUserType: (raw: string) => UserType | null): Array<FilePermissions<Id, UserType>> | null {
  const rawFilePermissions = isArray(raw) ? raw : [];
  const filePermissions: Array<FilePermissions<Id, UserType>> = [];
  rawFilePermissions.forEach(rawFilePermission => {
    switch (get(rawFilePermission, 'tag')) {
      case 'any':
        filePermissions.push({ tag: 'any', value: undefined });
        break;
      case 'user':
        if (isString(rawFilePermission.value)) {
          filePermissions.push({ tag: 'user', value: rawFilePermission.value });
        }
        break;
      case 'userType':
        const userType = parseOneUserType(rawFilePermission.value);
        if (userType) {
          filePermissions.push({ tag: 'userType', value: userType });
        }
        break;
    }
  });
  return filePermissions && filePermissions.length > 0 ? filePermissions : null;
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
  return `/api/fileBlobs/${file.fileBlob}`;
}
