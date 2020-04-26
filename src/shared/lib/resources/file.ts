import { megabytesToBytes } from 'shared/lib';
import { UserType } from 'shared/lib/resources/user';
import { ADT, BodyWithErrors, Id } from 'shared/lib/types';
import { isValid } from 'shared/lib/validation';
import { validateFilePermissions } from 'shared/lib/validation/file';

export const MAX_MULTIPART_FILES_SIZE = megabytesToBytes(10);

export const SUPPORTED_IMAGE_EXTENSIONS: readonly string[] = ['.jpg', '.jpeg', '.png'];

export interface FileRecord {
  id: Id;
  createdAt: Date;
  fileBlob: Id;
  name: string;
}

export interface FileBlob {
  hash: string;
  blob: any;
}

export interface CreateValidationErrors extends BodyWithErrors {
  name?: string[];
  metadata?: string[];
  requestBodyType?: string[];
}

export type FilePermissions<Id, UserType>
  = ADT<'any'>                    // Anyone can read this file
  | ADT<'user', Id>               // Id of the user who has permission
  | ADT<'userType', UserType>;    // User type that has permission

export type FileUploadMetadata = Array<FilePermissions<Id, UserType>>;

/**
 * Parses a `FilePermissions` from a plain object.
 * Returns `null` if the parse fails or no permissions are supplied in the metadata.
 */
export function parseFilePermissions(raw: any): FileUploadMetadata | null {
  const validatedFilePermissions = validateFilePermissions(raw);
  if (isValid(validatedFilePermissions)) {
    return validatedFilePermissions.value;
  }
  return null;
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

//TODO move to front-end and use apiNamespace
export function fileBlobPath(file: FileRecord) {
  return `/api/files/${file.id}?type=blob`;
}

export function getExtension(name: string): string {
  const match = name.match(/\.([^.\s]+)$/);
  return match ? match[1] : '';
}

export function enforceExtension(name: string, extension: string): string {
  if (!name.match(new RegExp(`\\.${extension}$`))) {
    return `${name}.${extension}`;
  } else {
    return name;
  }
}
