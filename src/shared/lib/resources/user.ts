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

/*export interface UpdateRequestBody {
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
}*/

interface UpdateProfileRequestBody {
  name: string;
  email: string; // same as jobTitle - required but allow empty string
  jobTitle: string; // empty string removes, undefined leaves unchanged
}

export type UpdateRequestBody
  = ADT<'updateProfile', UpdateProfileRequestBody>
  | ADT<'acceptTerms'>
  | ADT<'updateNotifications', boolean>
  | ADT<'reactivateUser'>
  | ADT<'updateAdminPermissions', boolean>;

function parseUpdateRequestBody(raw: any): UpdateRequestBody | null {
  if (!raw) { return null; }
  switch (raw.tag) {
    case 'updateProfile':
      return adt('updateProfile', {
        name: getString(raw.value, 'name'),
        email: getString(raw.value, 'email'),
        jobTitle: getString(raw.value, 'jobTitle')
      });
    case 'acceptTerms':
      return adt('acceptTerms');
    case 'updateNotifications':
      if (isBoolean(raw.value)) {
        return adt('updateNotifications', raw.value);
      } else {
        return null;
      }
    case 'reactivateUser':
      return adt('reactivateUser');
    case 'updateAdminPermissions':
      if (isBoolean(raw.value)) {
        return adt('updateAdminPermissions', raw.value);
      } else {
        return null;
      }
    default:
      return null;
  }
}

type ValidatedUpdateRequestBody = UpdateRequestBody;

type UpdateProfileValidationErrors = ErrorTypeFrom<UpdateProfileRequestBody>;

export type UpdateValidationErrors
  = ADT<'updateProfile', UpdateProfileValidationErrors>
  | ADT<'acceptTerms', string[]>
  | ADT<'updateNotifications', string[]>
  | ADT<'parseFailure'>;

async function validateRequestBody(body: UpdateRequestBody | null): Promise<Validation<ValidatedUpdateRequestBody, UpdateValidationErrors>> {
  if (!body) { return invalid(adt('parseFailure')); }
  switch (body.tag) {
    case 'updateProfile':
      return invalid(adt('updateProfile', {
        name: ['some error']
      }));
    case 'acceptTerms':
      //Has the user already acceptedTerms?
      return invalid(adt('acceptTerms', []));
    case 'updateNotifications':
      return invalid(adt('updateNotifications', []));
    //TODO
  }
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
