import { PublicFile } from 'shared/lib/resources/file';
import { Id } from 'shared/lib/types';

export enum UserType {
  Vendor = 'VENDOR',
  Government = 'GOV',
  Admin = 'ADMIN'
}

export function parseUserType(raw: string): UserType | null {
  switch (raw) {
    case UserType.Vendor:
      return UserType.Vendor;
    case UserType.Government:
      return UserType.Government;
    case UserType.Admin:
      return UserType.Admin;
    default:
      return null;
  }
}

export enum UserStatus {
  Active = 'ACTIVE',
  InactiveByUser = 'INACTIVE_USER',
  InactiveByAdmin = 'INACTIVE_ADMIN'
}

export interface User {
  id: Id;
  type: UserType;
  status: UserStatus;
  name: string;
  email?: string;
  jobTitle?: string;
  avatarImageFile?: PublicFile;
  notificationsOn: boolean;
  acceptedTerms: boolean;
  idpUsername: string;
  deactivatedOn?: Date;
  deactivatedBy?: Id;
}

export interface UpdateRequestBody {
  id: Id;
  status?: UserStatus;
  name?: string;
  email?: string;
  avatarImageFile?: Id;
  notificationsOn?: boolean;
  acceptedTerms?: boolean;
}

export interface UpdateValidationErrors {
  id?: string[];
  name?: string[];
  email?: string[];
  avatarImageFile?: string[];
  notificationsOn?: string[];
  acceptedTerms?: string[];
  permissions?: string[];
}
