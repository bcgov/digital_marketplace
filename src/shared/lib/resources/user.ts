import { FileRecord } from 'shared/lib/resources/file';
import { ADT, Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation';
import { DatabaseError } from 'shared/lib/validation/db';

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
  email: string;
  jobTitle: string;
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

export interface UpdateProfileRequestBody {
  name: string;
  email: string;
  jobTitle: string;
  avatarImageFile: Id;
}

export type UpdateRequestBody
  = ADT<'updateProfile', UpdateProfileRequestBody>
  | ADT<'acceptTerms'>
  | ADT<'updateNotifications', boolean>
  | ADT<'reactivateUser'>
  | ADT<'updateAdminPermissions', boolean>;

export type UpdateProfileValidationErrors = ErrorTypeFrom<UpdateProfileRequestBody>;

export type UpdateValidationErrors
  = ADT<'updateProfile', UpdateProfileValidationErrors>
  | ADT<'acceptTerms', string[]>
  | ADT<'updateNotifications', string[]>
  | ADT<'updateAdminPermissions', string[]>
  | ADT<'parseFailure'>
  | ADT<'permissions', string[]>
  | ADT<'userNotFound', string[]>
  | DatabaseError;

export type DeleteValidationErrors
  = ADT<'userNotFound', string[]>
  | ADT<'userNotActive', string[]>
  | ADT<'permissions', string[]>
  | DatabaseError;

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

export function adminPermissionsToUserType(admin: boolean): UserType {
  return admin ? UserType.Admin : UserType.Government;
}

export function parseNotificationsFlag(notificationsOn: boolean): Date | null {
  return notificationsOn ? new Date() : null;
}

export function emptyUser(): User {
  return {
    id: '',
    type: UserType.Government,
    status: UserStatus.Active,
    name: '',
    email: '',
    jobTitle: '',
    idpUsername: ''
  };
}
