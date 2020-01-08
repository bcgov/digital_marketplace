import { FileRecord } from 'shared/lib/resources/file';
import { Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';

export type KeyCloakIdentityProvider = 'github' | 'idir';

export enum UserType {
  Vendor = 'VENDOR',
  Government = 'GOV',
  Admin = 'ADMIN'
}

export function isPublicSectorUserType(userType: UserType): boolean {
  return userType === UserType.Admin || userType === UserType.Government;
}

export function userTypeToKeycloakIdentityProvider(userType: UserType): KeyCloakIdentityProvider {
  switch (userType) {
    case UserType.Vendor:
      return 'github';
    case UserType.Government:
    case UserType.Admin:
      return 'idir';
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
  avatarImageFile?: FileRecord;
  notificationsOn?: Date;
  acceptedTerms?: Date;
  idpUsername: string;
  deactivatedOn?: Date;
  deactivatedBy?: Id;
}

export function usersAreEquivalent(a: User, b: User): boolean {
  return a.id === b.id;
}

export function isAdmin(user: User): boolean {
  return user.type === UserType.Admin;
}

export function isPublicSectorEmployee(user: User): boolean {
  return isPublicSectorUserType(user.type);
}

export interface UpdateRequestBody {
  // id: Id;
  type: string; // could be own resource
  status: string; // could be own resource (including delete user)
  name: string;
  email: string; // same as jobTitle - required but allow empty string
  jobTitle: string; // empty string removes, undefined leaves unchanged
  avatarImageFile?: Id; // undefined indicates remove the avatar - separate resource
  notificationsOn: boolean; // separate
  acceptedTerms: boolean; // separate
  // idpUsername: string;
}

export interface UpdateValidationErrors extends ErrorTypeFrom<Omit<UpdateRequestBody, 'status'>> {
  id?: string[];
  permissions?: string[];
}

export function parseUserStatus(raw: string): UserStatus | null {
  switch (raw) {
    case UserStatus.Active:
      return UserStatus.Active;
    case UserStatus.InactiveByUser:
      return UserStatus.InactiveByUser;
    case UserStatus.InactiveByAdmin:
      return UserStatus.InactiveByAdmin;
    default:
      return null;
  }
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

export function emptyUser(): User {
  return {
    id: '',
    type: UserType.Government,
    status: UserStatus.Active,
    name: '',
    idpUsername: ''
  };
}
