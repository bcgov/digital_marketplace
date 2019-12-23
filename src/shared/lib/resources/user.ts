import { PublicFile } from 'shared/lib/resources/file';
import { Id } from 'shared/lib/types';
import { ErrorTypeFrom } from 'shared/lib/validation/index';
import { readOne, readMany, update } from 'shared/lib/http';

export type KeyCloakIdentityProvider = 'github' | 'idir';

export enum UserType {
  Vendor = 'VENDOR',
  Government = 'GOV',
  Admin = 'ADMIN'
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
  avatarImageFile?: PublicFile;
  notificationsOn: boolean;
  acceptedTerms: boolean;
  idpUsername: string;
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

export type UpdateValidationErrors = ErrorTypeFrom<UpdateRequestBody>;

export async function updateUser(requestBody: UpdateRequestBody): Promise<User | null> {
  return update<User, UpdateRequestBody>(`/api/users/${requestBody.id}`, requestBody);
}

export async function readOneUser(id: string): Promise<User | null> {
  return readOne<User>('/api/users');
}

export async function readAllUsers(): Promise<User[]> {
  return readMany<User>('/api/users');
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
    notificationsOn: false,
    acceptedTerms: false,
    idpUsername: '',
  }
}
